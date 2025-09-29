import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';
import { optionalAuth } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { AIService } from '../services/ai/AIService';
import { logger } from '../utils/logger';

const router = express.Router();
const aiService = AIService.getInstance();

// Validation rules
const sendMessageValidation = [
  body('message').trim().isLength({ min: 1, max: 2000 }),
  body('sessionId').optional().isString(),
];

// Start a new chat session or get existing one
router.post('/:slug/session', [
  param('slug').isString(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Invalid assistant slug');
  }

  // Find assistant by slug
  const assistant = await prisma.assistant.findUnique({
    where: { 
      slug: req.params.slug,
    },
    select: {
      id: true,
      name: true,
      greeting: true,
      branding: true,
      isActive: true,
    }
  });

  if (!assistant || !assistant.isActive) {
    throw new NotFoundError('Assistant not found or inactive');
  }

  // Create new conversation session
  const sessionId = uuidv4();
  const conversation = await prisma.conversation.create({
    data: {
      sessionId,
      assistantId: assistant.id,
      metadata: {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        startedAt: new Date().toISOString(),
      }
    }
  });

  // Create greeting message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      content: assistant.greeting,
      role: 'ASSISTANT',
      metadata: {
        isGreeting: true,
        timestamp: new Date().toISOString(),
      }
    }
  });

  res.status(201).json({
    sessionId,
    assistant: {
      name: assistant.name,
      greeting: assistant.greeting,
      branding: assistant.branding,
    }
  });
}));

// Send a message in chat
router.post('/:slug/message', sendMessageValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { message, sessionId } = req.body;

  // Find assistant by slug
  const assistant = await prisma.assistant.findUnique({
    where: { slug: req.params.slug },
    select: { id: true, isActive: true }
  });

  if (!assistant || !assistant.isActive) {
    throw new NotFoundError('Assistant not found or inactive');
  }

  // Find or create conversation
  let conversation;
  if (sessionId) {
    conversation = await prisma.conversation.findFirst({
      where: {
        sessionId,
        assistantId: assistant.id,
      }
    });
  }

  if (!conversation) {
    // Create new conversation if session not found
    const newSessionId = sessionId || uuidv4();
    conversation = await prisma.conversation.create({
      data: {
        sessionId: newSessionId,
        assistantId: assistant.id,
        metadata: {
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          startedAt: new Date().toISOString(),
        }
      }
    });
  }

  // Save user message
  const userMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      content: message,
      role: 'USER',
      metadata: {
        timestamp: new Date().toISOString(),
      }
    }
  });

  try {
    // Get conversation history (last 10 messages for context)
    const messageHistory = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    const conversationHistory = messageHistory
      .filter(msg => !msg.metadata || !(msg.metadata as any).isGreeting)
      .map(msg => ({
        role: msg.role.toLowerCase() as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));

    // Generate AI response
    const aiResponse = await aiService.generateChatResponse(
      assistant.id,
      message,
      conversationHistory
    );

    // Save assistant message
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        content: aiResponse.message,
        role: 'ASSISTANT',
        processingTime: aiResponse.processingTime,
        metadata: {
          confidence: aiResponse.confidence,
          citations: aiResponse.citations,
          tokenUsage: aiResponse.tokenUsage,
          timestamp: new Date().toISOString(),
        }
      }
    });

    // Update conversation as active
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { 
        isActive: true,
        updatedAt: new Date(),
      }
    });

    // Record analytics (async, don't wait)
    recordAnalytics(assistant.id, aiResponse.processingTime, message)
      .catch(error => logger.error('Failed to record analytics:', error));

    res.json({
      sessionId: conversation.sessionId,
      message: {
        id: assistantMessage.id,
        content: aiResponse.message,
        confidence: aiResponse.confidence,
        citations: aiResponse.citations,
        processingTime: aiResponse.processingTime,
        timestamp: assistantMessage.createdAt,
      }
    });

  } catch (error) {
    logger.error(`Failed to generate response for message "${message}":`, error);
    
    // Save error message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        content: "I apologize, but I'm having trouble generating a response right now. Please try again later or contact support if the problem persists.",
        role: 'ASSISTANT',
        metadata: {
          isError: true,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }
      }
    });

    throw error;
  }
}));

// Get chat history
router.get('/:slug/history', [
  param('slug').isString(),
  query('sessionId').isString(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { sessionId } = req.query;

  // Find assistant by slug
  const assistant = await prisma.assistant.findUnique({
    where: { slug: req.params.slug },
    select: { id: true, name: true, branding: true }
  });

  if (!assistant) {
    throw new NotFoundError('Assistant not found');
  }

  // Find conversation
  const conversation = await prisma.conversation.findFirst({
    where: {
      sessionId: sessionId as string,
      assistantId: assistant.id,
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          content: true,
          role: true,
          metadata: true,
          processingTime: true,
          createdAt: true,
        }
      }
    }
  });

  if (!conversation) {
    return res.json({
      messages: [],
      assistant: {
        name: assistant.name,
        branding: assistant.branding,
      }
    });
  }

  const messages = conversation.messages.map(msg => ({
    id: msg.id,
    content: msg.content,
    role: msg.role.toLowerCase(),
    confidence: (msg.metadata as any)?.confidence,
    citations: (msg.metadata as any)?.citations || [],
    processingTime: msg.processingTime,
    timestamp: msg.createdAt,
    isGreeting: (msg.metadata as any)?.isGreeting || false,
    isError: (msg.metadata as any)?.isError || false,
  }));

  res.json({
    messages,
    assistant: {
      name: assistant.name,
      branding: assistant.branding,
    }
  });
}));

// End chat session
router.delete('/:slug/session/:sessionId', [
  param('slug').isString(),
  param('sessionId').isString(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed');
  }

  // Find assistant by slug
  const assistant = await prisma.assistant.findUnique({
    where: { slug: req.params.slug },
    select: { id: true }
  });

  if (!assistant) {
    throw new NotFoundError('Assistant not found');
  }

  // Mark conversation as inactive
  await prisma.conversation.updateMany({
    where: {
      sessionId: req.params.sessionId,
      assistantId: assistant.id,
    },
    data: {
      isActive: false,
      updatedAt: new Date(),
    }
  });

  res.json({
    message: 'Chat session ended successfully',
  });
}));

// Rate a message (optional feedback)
router.post('/:slug/rate', [
  param('slug').isString(),
  body('messageId').isString(),
  body('rating').isIn(['helpful', 'not_helpful']),
  body('feedback').optional().trim().isLength({ max: 500 }),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { messageId, rating, feedback } = req.body;

  // Find message and verify it belongs to this assistant
  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      conversation: {
        assistant: {
          slug: req.params.slug,
        }
      }
    }
  });

  if (!message) {
    throw new NotFoundError('Message not found');
  }

  // Update message metadata with rating
  const currentMetadata = message.metadata as any || {};
  await prisma.message.update({
    where: { id: messageId },
    data: {
      metadata: {
        ...currentMetadata,
        rating,
        feedback,
        ratedAt: new Date().toISOString(),
      }
    }
  });

  logger.info(`Message rated: ${messageId} - ${rating}`);

  res.json({
    message: 'Rating submitted successfully',
  });
}));

// Helper function to record analytics
async function recordAnalytics(assistantId: string, processingTime: number, userMessage: string): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get or create today's analytics record
    const analytics = await prisma.analytics.findUnique({
      where: {
        assistantId_date: {
          assistantId,
          date: today,
        }
      }
    });

    if (analytics) {
      // Update existing record
      const currentTopQuestions = (analytics.topQuestions as any[]) || [];
      
      // Simple question tracking (first 10 words)
      const questionKey = userMessage.split(' ').slice(0, 10).join(' ').toLowerCase();
      const existingQuestion = currentTopQuestions.find(q => q.question === questionKey);
      
      let updatedQuestions;
      if (existingQuestion) {
        updatedQuestions = currentTopQuestions.map(q => 
          q.question === questionKey 
            ? { ...q, count: q.count + 1 }
            : q
        );
      } else {
        updatedQuestions = [...currentTopQuestions, { question: questionKey, count: 1 }]
          .sort((a, b) => b.count - a.count)
          .slice(0, 20); // Keep top 20
      }

      const newAvgResponseTime = analytics.totalMessages > 0 
        ? ((analytics.avgResponseTime || 0) * analytics.totalMessages + processingTime) / (analytics.totalMessages + 1)
        : processingTime;

      await prisma.analytics.update({
        where: {
          assistantId_date: {
            assistantId,
            date: today,
          }
        },
        data: {
          totalChats: analytics.totalChats + 1,
          totalMessages: analytics.totalMessages + 1,
          avgResponseTime: newAvgResponseTime,
          topQuestions: updatedQuestions,
        }
      });
    } else {
      // Create new record
      await prisma.analytics.create({
        data: {
          assistantId,
          date: today,
          totalChats: 1,
          totalMessages: 1,
          avgResponseTime: processingTime,
          topQuestions: [{ question: userMessage.split(' ').slice(0, 10).join(' ').toLowerCase(), count: 1 }],
          metadata: {},
        }
      });
    }
  } catch (error) {
    logger.error('Failed to record analytics:', error);
  }
}

export default router;