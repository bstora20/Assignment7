import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { AIService } from '../services/ai/AIService';
import { EmailService } from '../services/email/EmailService';
import { logger } from '../utils/logger';

const router = express.Router();
const aiService = AIService.getInstance();
const emailService = new EmailService();

// Validation rules
const createTestValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('testCases').isArray({ min: 1, max: 50 }),
  body('testCases.*.question').trim().isLength({ min: 5, max: 500 }),
  body('testCases.*.expectedType').optional().isString(),
];

// Get test runs for assistant
router.get('/:assistantId', authenticate, [
  param('assistantId').isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { assistantId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  // Verify assistant belongs to user
  const assistant = await prisma.assistant.findFirst({
    where: {
      id: assistantId,
      userId: req.user!.id,
    }
  });

  if (!assistant) {
    throw new NotFoundError('Assistant not found');
  }

  const [testRuns, total] = await Promise.all([
    prisma.testRun.findMany({
      where: { assistantId },
      include: {
        testCases: {
          select: {
            id: true,
            question: true,
            passed: true,
            score: true,
          }
        },
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.testRun.count({
      where: { assistantId }
    })
  ]);

  const testRunsWithStats = testRuns.map(run => {
    const totalCases = run.testCases.length;
    const passedCases = run.testCases.filter(tc => tc.passed).length;
    const averageScore = totalCases > 0 
      ? run.testCases.reduce((sum, tc) => sum + (tc.score || 0), 0) / totalCases
      : 0;

    return {
      ...run,
      testCases: undefined, // Don't include full test cases in list
      stats: {
        totalCases,
        passedCases,
        failedCases: totalCases - passedCases,
        averageScore,
        passRate: totalCases > 0 ? passedCases / totalCases : 0,
      }
    };
  });

  const totalPages = Math.ceil(total / limit);

  res.json({
    testRuns: testRunsWithStats,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    }
  });
}));

// Get single test run with full details
router.get('/:assistantId/:testRunId', authenticate, [
  param('assistantId').isString(),
  param('testRunId').isString(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed');
  }

  const { assistantId, testRunId } = req.params;

  // Verify assistant belongs to user
  const assistant = await prisma.assistant.findFirst({
    where: {
      id: assistantId,
      userId: req.user!.id,
    }
  });

  if (!assistant) {
    throw new NotFoundError('Assistant not found');
  }

  const testRun = await prisma.testRun.findFirst({
    where: {
      id: testRunId,
      assistantId,
    },
    include: {
      testCases: true,
      user: {
        select: {
          name: true,
          email: true,
        }
      }
    }
  });

  if (!testRun) {
    throw new NotFoundError('Test run not found');
  }

  const totalCases = testRun.testCases.length;
  const passedCases = testRun.testCases.filter(tc => tc.passed).length;
  const averageScore = totalCases > 0 
    ? testRun.testCases.reduce((sum, tc) => sum + (tc.score || 0), 0) / totalCases
    : 0;

  const testRunWithStats = {
    ...testRun,
    stats: {
      totalCases,
      passedCases,
      failedCases: totalCases - passedCases,
      averageScore,
      passRate: totalCases > 0 ? passedCases / totalCases : 0,
    }
  };

  res.json({ testRun: testRunWithStats });
}));

// Create and run new test
router.post('/:assistantId', authenticate, createTestValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { assistantId } = req.params;
  const { name, description, testCases } = req.body;

  // Verify assistant belongs to user
  const assistant = await prisma.assistant.findFirst({
    where: {
      id: assistantId,
      userId: req.user!.id,
    }
  });

  if (!assistant) {
    throw new NotFoundError('Assistant not found');
  }

  // Create test run
  const testRun = await prisma.testRun.create({
    data: {
      name,
      description,
      assistantId,
      userId: req.user!.id,
      status: 'RUNNING',
      results: {},
    }
  });

  // Run test in background
  runTestAsync(testRun.id, assistantId, testCases, req.user!)
    .catch(error => {
      logger.error(`Failed to run test ${testRun.id}:`, error);
    });

  res.status(201).json({
    message: 'Test created and started',
    testRun: {
      id: testRun.id,
      name: testRun.name,
      description: testRun.description,
      status: testRun.status,
      createdAt: testRun.createdAt,
    }
  });
}));

// Delete test run
router.delete('/:assistantId/:testRunId', authenticate, [
  param('assistantId').isString(),
  param('testRunId').isString(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed');
  }

  const { assistantId, testRunId } = req.params;

  // Verify assistant belongs to user and test run exists
  const testRun = await prisma.testRun.findFirst({
    where: {
      id: testRunId,
      assistantId,
      userId: req.user!.id,
    }
  });

  if (!testRun) {
    throw new NotFoundError('Test run not found');
  }

  // Delete test run (cascades to test cases)
  await prisma.testRun.delete({
    where: { id: testRunId }
  });

  res.json({
    message: 'Test run deleted successfully',
  });
}));

// Get common test questions
router.get('/:assistantId/templates', authenticate, [
  param('assistantId').isString(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed');
  }

  const { assistantId } = req.params;

  // Verify assistant belongs to user
  const assistant = await prisma.assistant.findFirst({
    where: {
      id: assistantId,
      userId: req.user!.id,
    }
  });

  if (!assistant) {
    throw new NotFoundError('Assistant not found');
  }

  // Get common questions from analytics
  const analytics = await prisma.analytics.findMany({
    where: { assistantId },
    orderBy: { date: 'desc' },
    take: 30, // Last 30 days
  });

  const allQuestions = analytics.flatMap(a => (a.topQuestions as any[]) || []);
  const questionCounts = allQuestions.reduce((acc, q) => {
    acc[q.question] = (acc[q.question] || 0) + q.count;
    return acc;
  }, {} as Record<string, number>);

  const commonQuestions = Object.entries(questionCounts)
    .map(([question, count]) => ({ question, count }))
    .sort((a, b) => Number(b.count) - Number(a.count))
    .slice(0, 20);

  // Default test templates
  const templates = [
    {
      category: 'Basic Information',
      questions: [
        'What services do you provide?',
        'How can I get help?',
        'What are your office hours?',
        'Where is your office located?',
        'How do I contact support?',
      ]
    },
    {
      category: 'Common Procedures',
      questions: [
        'How do I apply for financial aid?',
        'What documents do I need?',
        'What are the deadlines?',
        'How do I check my application status?',
        'Who can I talk to for help?',
      ]
    },
    {
      category: 'Policies',
      questions: [
        'What is your refund policy?',
        'Can I appeal a decision?',
        'What are the eligibility requirements?',
        'How do I file a complaint?',
        'What are the academic requirements?',
      ]
    }
  ];

  res.json({
    templates,
    commonQuestions: commonQuestions.slice(0, 10),
  });
}));

// Async function to run tests
async function runTestAsync(
  testRunId: string, 
  assistantId: string, 
  testCases: any[], 
  user: any
): Promise<void> {
  try {
    logger.info(`Starting test run ${testRunId} with ${testCases.length} test cases`);

    const results = [];
    let totalScore = 0;
    let passedCount = 0;

    // Run each test case
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      
      try {
        logger.info(`Running test case ${i + 1}/${testCases.length}: "${testCase.question}"`);

        const result = await aiService.testResponse(testCase.question, assistantId);
        
        const passed = result.score >= 0.7; // 70% threshold for passing
        if (passed) passedCount++;

        totalScore += result.score;

        // Save test case result
        await prisma.testCase.create({
          data: {
            testRunId,
            question: testCase.question,
            expectedType: testCase.expectedType,
            response: result.response,
            score: result.score,
            passed,
            metadata: {
              confidence: result.confidence,
              citations: result.citations,
              timestamp: new Date().toISOString(),
            }
          }
        });

        results.push({
          question: testCase.question,
          response: result.response,
          score: result.score,
          passed,
          confidence: result.confidence,
          citations: result.citations,
        });

        logger.info(`Test case ${i + 1} completed: ${passed ? 'PASSED' : 'FAILED'} (score: ${(result.score * 100).toFixed(1)}%)`);

      } catch (error) {
        logger.error(`Test case ${i + 1} failed:`, error);

        // Save failed test case
        await prisma.testCase.create({
          data: {
            testRunId,
            question: testCase.question,
            expectedType: testCase.expectedType,
            response: 'Error generating response',
            score: 0,
            passed: false,
            metadata: {
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
            }
          }
        });

        results.push({
          question: testCase.question,
          response: 'Error generating response',
          score: 0,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const averageScore = testCases.length > 0 ? totalScore / testCases.length : 0;
    const failedCount = testCases.length - passedCount;

    // Update test run with results
    await prisma.testRun.update({
      where: { id: testRunId },
      data: {
        status: 'COMPLETED',
        results: {
          summary: {
            total: testCases.length,
            passed: passedCount,
            failed: failedCount,
            averageScore,
            completedAt: new Date().toISOString(),
          },
          details: results,
        }
      }
    });

    // Get assistant for notification
    const assistant = await prisma.assistant.findUnique({
      where: { id: assistantId },
      select: { name: true }
    });

    // Get test run for notification
    const testRun = await prisma.testRun.findUnique({
      where: { id: testRunId },
      select: { name: true }
    });

    // Send completion notification
    await emailService.sendTestCompletedNotification(
      user.email,
      user.name,
      assistant?.name || 'Unknown Assistant',
      testRun?.name || 'Test Run',
      {
        total: testCases.length,
        passed: passedCount,
        failed: failedCount,
        averageScore,
      }
    );

    logger.info(`Test run ${testRunId} completed: ${passedCount}/${testCases.length} passed (${(averageScore * 100).toFixed(1)}% avg score)`);

  } catch (error) {
    logger.error(`Test run ${testRunId} failed:`, error);

    // Mark test run as failed
    await prisma.testRun.update({
      where: { id: testRunId },
      data: {
        status: 'FAILED',
        results: {
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString(),
        }
      }
    });
  }
}

export default router;