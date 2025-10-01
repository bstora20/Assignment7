import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { AIService } from '../services/ai/AIService';
import { EmailService } from '../services/email/EmailService';
import { FileWatcherService } from '../services/fileWatcher/FileWatcherService';

const router = express.Router();
const aiService = AIService.getInstance();
const emailService = new EmailService();
const fileWatcher = new FileWatcherService();

// Validation rules
const createAssistantValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('slug').trim().isLength({ min: 2, max: 50 }).matches(/^[a-z0-9-]+$/),
  body('description').optional().trim().isLength({ max: 500 }),
  body('greeting').trim().isLength({ min: 10, max: 1000 }),
  body('branding').optional().isObject(),
];

// Get all assistants for current user
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const assistants = await prisma.assistant.findMany({
    where: { userId: req.user!.id },
    include: {
      documents: {
        select: { id: true, originalName: true, isProcessed: true, createdAt: true }
      },
      _count: {
        select: {
          documents: true,
          conversations: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ assistants });
}));

// Get single assistant
router.get('/:id', authenticate, [
  param('id').isString()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Invalid assistant ID');
  }

  const assistant = await prisma.assistant.findFirst({
    where: {
      id: req.params.id,
      userId: req.user!.id,
    },
    include: {
      documents: {
        select: {
          id: true,
          filename: true,
          originalName: true,
          mimeType: true,
          size: true,
          metadata: true,
          isProcessed: true,
          lastModified: true,
          createdAt: true,
        }
      },
      _count: {
        select: {
          documents: true,
          conversations: true,
          testRuns: true,
        }
      }
    }
  });

  if (!assistant) {
    throw new NotFoundError('Assistant not found');
  }

  res.json({ assistant });
}));

// Create new assistant
router.post('/', authenticate, createAssistantValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { name, slug, description, greeting, branding } = req.body;

  // Check if slug is unique
  const existingAssistant = await prisma.assistant.findUnique({
    where: { slug }
  });

  if (existingAssistant) {
    throw new ValidationError('Assistant with this slug already exists');
  }

  // Create assistant
  const assistant = await prisma.assistant.create({
    data: {
      name,
      slug,
      description,
      greeting,
      branding: branding || {
        primaryColor: '#007bff',
        secondaryColor: '#6c757d',
        logo: null,
        theme: 'light',
      },
      userId: req.user!.id,
    },
    include: {
      _count: {
        select: {
          documents: true,
          conversations: true,
        }
      }
    }
  });

  // Send notification
  const assistantUrl = `${process.env.NEXT_PUBLIC_APP_URL}/chat/${slug}`;
  await emailService.sendAssistantCreatedNotification(
    req.user!.email,
    req.user!.name,
    assistant.name,
    assistantUrl
  );

  res.status(201).json({
    message: 'Assistant created successfully',
    assistant,
  });
}));

// Update assistant
router.put('/:id', authenticate, [
  param('id').isString(),
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('greeting').optional().trim().isLength({ min: 10, max: 1000 }),
  body('branding').optional().isObject(),
  body('isActive').optional().isBoolean(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { name, description, greeting, branding, isActive } = req.body;

  // Check assistant exists and belongs to user
  const existingAssistant = await prisma.assistant.findFirst({
    where: {
      id: req.params.id,
      userId: req.user!.id,
    }
  });

  if (!existingAssistant) {
    throw new NotFoundError('Assistant not found');
  }

  const updateData: any = {};
  if (name) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (greeting) updateData.greeting = greeting;
  if (branding) updateData.branding = branding;
  if (isActive !== undefined) updateData.isActive = isActive;

  const assistant = await prisma.assistant.update({
    where: { id: req.params.id },
    data: updateData,
    include: {
      _count: {
        select: {
          documents: true,
          conversations: true,
        }
      }
    }
  });

  res.json({
    message: 'Assistant updated successfully',
    assistant,
  });
}));

// Delete assistant
router.delete('/:id', authenticate, [
  param('id').isString()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Invalid assistant ID');
  }

  // Check assistant exists and belongs to user
  const assistant = await prisma.assistant.findFirst({
    where: {
      id: req.params.id,
      userId: req.user!.id,
    }
  });

  if (!assistant) {
    throw new NotFoundError('Assistant not found');
  }

  // Remove file watches
  const watches = await fileWatcher.getWatches(assistant.id);
  for (const watch of watches) {
    await fileWatcher.removeWatch(watch.id);
  }

  // Delete assistant (cascades to related records)
  await prisma.assistant.delete({
    where: { id: req.params.id }
  });

  res.json({
    message: 'Assistant deleted successfully',
  });
}));

// Get assistant analytics
router.get('/:id/analytics', authenticate, [
  param('id').isString(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  // Check assistant exists and belongs to user
  const assistant = await prisma.assistant.findFirst({
    where: {
      id: req.params.id,
      userId: req.user!.id,
    }
  });

  if (!assistant) {
    throw new NotFoundError('Assistant not found');
  }

  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

  const analytics = await prisma.analytics.findMany({
    where: {
      assistantId: req.params.id,
      date: {
        gte: startDate,
        lte: endDate,
      }
    },
    orderBy: { date: 'asc' }
  });

  // Get recent conversations
  const recentConversations = await prisma.conversation.findMany({
    where: {
      assistantId: req.params.id,
      createdAt: {
        gte: startDate,
        lte: endDate,
      }
    },
    include: {
      messages: {
        select: { id: true, role: true, createdAt: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  // Calculate summary statistics
  const totalChats = analytics.reduce((sum, a) => sum + a.totalChats, 0);
  const totalMessages = analytics.reduce((sum, a) => sum + a.totalMessages, 0);
  const avgResponseTime = analytics.length > 0 
    ? analytics.reduce((sum, a) => sum + (a.avgResponseTime || 0), 0) / analytics.length
    : 0;

  // Get top questions
  const allTopQuestions = analytics.flatMap(a => (a.topQuestions as any[]) || []);
  const questionCounts = allTopQuestions.reduce((acc, q) => {
    acc[q.question] = (acc[q.question] || 0) + q.count;
    return acc;
  }, {} as Record<string, number>);
  
  const topQuestions = Object.entries(questionCounts)
    .map(([question, count]) => ({ question, count }))
    .sort((a, b) =>  Number(b.count) - Number(a.count))
    .slice(0, 10);

  res.json({
    analytics: {
      summary: {
        totalChats,
        totalMessages,
        avgResponseTime: Math.round(avgResponseTime),
        dateRange: { startDate, endDate }
      },
      daily: analytics,
      topQuestions,
      recentConversations: recentConversations.map(conv => ({
        id: conv.id,
        messageCount: conv.messages.length,
        createdAt: conv.createdAt,
        lastActivity: conv.messages.length > 0 
          ? conv.messages[conv.messages.length - 1].createdAt
          : conv.createdAt,
      }))
    }
  });
}));

// Get assistant by slug (public route for students)
router.get('/public/:slug', [
  param('slug').isString()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Invalid assistant slug');
  }

  const assistant = await prisma.assistant.findUnique({
    where: { 
      slug: req.params.slug,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      greeting: true,
      branding: true,
      isActive: true,
    }
  });

  if (!assistant || !assistant.isActive) {
    throw new NotFoundError('Assistant not found or inactive');
  }

  res.json({ assistant });
}));

// Summarize documents for assistant
router.post('/:id/summarize', authenticate, [
  param('id').isString()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Invalid assistant ID');
  }

  // Check assistant exists and belongs to user
  const assistant = await prisma.assistant.findFirst({
    where: {
      id: req.params.id,
      userId: req.user!.id,
    },
    include: {
      documents: {
        where: { isProcessed: true },
        select: { content: true, originalName: true, metadata: true }
      }
    }
  });

  if (!assistant) {
    throw new NotFoundError('Assistant not found');
  }

  if (assistant.documents.length === 0) {
    return res.json({
      summary: {
        summary: 'No documents have been uploaded yet.',
        keyTopics: [],
        suggestedQuestions: ['Upload some documents to get started!']
      }
    });
  }

  const summary = await aiService.summarizeDocuments(assistant.documents);

  res.json({ summary });
}));

export default router;