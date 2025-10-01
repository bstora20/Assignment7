import express from 'express';
import { param, query, validationResult } from 'express-validator';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { prisma } from '../utils/prisma';

const router = express.Router();

// Get analytics dashboard data for user's assistants
router.get('/dashboard', authenticate, [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

  // Get user's assistants
  const assistants = await prisma.assistant.findMany({
    where: { userId: req.user!.id },
    select: { 
      id: true, 
      name: true, 
      slug: true,
      isActive: true,
      createdAt: true,
    }
  });

  if (assistants.length === 0) {
    return res.json({
      overview: {
        totalAssistants: 0,
        activeAssistants: 0,
        totalChats: 0,
        totalMessages: 0,
        avgResponseTime: 0,
      },
      assistantStats: [],
      trends: [],
      topQuestions: [],
    });
  }

  const assistantIds = assistants.map(a => a.id);

  // Get analytics data for the date range
  const analytics = await prisma.analytics.findMany({
    where: {
      assistantId: { in: assistantIds },
      date: {
        gte: startDate,
        lte: endDate,
      }
    },
    include: {
      assistant: {
        select: { name: true, slug: true }
      }
    },
    orderBy: { date: 'asc' }
  });

  // Calculate overview stats
  const totalChats = analytics.reduce((sum, a) => sum + a.totalChats, 0);
  const totalMessages = analytics.reduce((sum, a) => sum + a.totalMessages, 0);
  const avgResponseTime = analytics.length > 0 
    ? analytics.reduce((sum, a) => sum + (a.avgResponseTime || 0), 0) / analytics.length
    : 0;

  const activeAssistants = assistants.filter(a => a.isActive).length;

  // Calculate per-assistant stats
  const assistantStatsMap = new Map<string, any>();
  
  for (const assistant of assistants) {
    assistantStatsMap.set(assistant.id, {
      id: assistant.id,
      name: assistant.name,
      slug: assistant.slug,
      isActive: assistant.isActive,
      createdAt: assistant.createdAt,
      totalChats: 0,
      totalMessages: 0,
      avgResponseTime: 0,
      trend: 'stable',
    });
  }

  for (const analytic of analytics) {
    const assistantStat = assistantStatsMap.get(analytic.assistantId);
    if (assistantStat) {
      assistantStat.totalChats += analytic.totalChats;
      assistantStat.totalMessages += analytic.totalMessages;
    }
  }

  // Calculate average response times per assistant
  const assistantResponseTimes = analytics.reduce((acc, a) => {
    if (!acc[a.assistantId]) {
      acc[a.assistantId] = { total: 0, count: 0 };
    }
    acc[a.assistantId].total += a.avgResponseTime || 0;
    acc[a.assistantId].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  for (const [assistantId, data] of Object.entries(assistantResponseTimes)) {
    const assistantStat = assistantStatsMap.get(assistantId);
    if (assistantStat) {
      assistantStat.avgResponseTime = data.count > 0 ? data.total / data.count : 0;
    }
  }

  const assistantStats = Array.from(assistantStatsMap.values())
    .sort((a, b) => b.totalChats - a.totalChats);

  // Generate daily trends
  const dailyTrends = new Map<string, any>();
  
  for (const analytic of analytics) {
    const dateKey = analytic.date.toISOString().split('T')[0];
    if (!dailyTrends.has(dateKey)) {
      dailyTrends.set(dateKey, {
        date: dateKey,
        totalChats: 0,
        totalMessages: 0,
        avgResponseTime: 0,
        responseTimeCount: 0,
      });
    }
    
    const trend = dailyTrends.get(dateKey)!;
    trend.totalChats += analytic.totalChats;
    trend.totalMessages += analytic.totalMessages;
    
    if (analytic.avgResponseTime) {
      trend.avgResponseTime = (trend.avgResponseTime * trend.responseTimeCount + analytic.avgResponseTime) / (trend.responseTimeCount + 1);
      trend.responseTimeCount += 1;
    }
  }

  const trends = Array.from(dailyTrends.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(trend => ({
      date: trend.date,
      totalChats: trend.totalChats,
      totalMessages: trend.totalMessages,
      avgResponseTime: Math.round(trend.avgResponseTime),
    }));

  // Aggregate top questions across all assistants
  const allTopQuestions = analytics.flatMap(a => (a.topQuestions as any[]) || []);
  const questionCounts = allTopQuestions.reduce((acc, q) => {
    acc[q.question] = (acc[q.question] || 0) + q.count;
    return acc;
  }, {} as Record<string, number>);
  
  const topQuestions = Object.entries(questionCounts)
    .map(([question, count]) => ({ question, count }))
    .sort((a, b) => Number(b.count) - Number(a.count))
    .slice(0, 10);

  res.json({
    overview: {
      totalAssistants: assistants.length,
      activeAssistants,
      totalChats,
      totalMessages,
      avgResponseTime: Math.round(avgResponseTime),
    },
    assistantStats,
    trends,
    topQuestions,
    dateRange: { startDate, endDate },
  });
}));

// Get detailed analytics for specific assistant
router.get('/:assistantId', authenticate, [
  param('assistantId').isString(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('granularity').optional().isIn(['daily', 'weekly', 'monthly']),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
  }

  const { assistantId } = req.params;
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
  const granularity = req.query.granularity as string || 'daily';

  // Verify assistant belongs to user
  const assistant = await prisma.assistant.findFirst({
    where: {
      id: assistantId,
      userId: req.user!.id,
    },
    include: {
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

  // Get analytics data
  const analytics = await prisma.analytics.findMany({
    where: {
      assistantId,
      date: {
        gte: startDate,
        lte: endDate,
      }
    },
    orderBy: { date: 'asc' }
  });

  // Get recent conversations for detailed analysis
  const recentConversations = await prisma.conversation.findMany({
    where: {
      assistantId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      }
    },
    include: {
      messages: {
        select: {
          id: true,
          role: true,
          metadata: true,
          processingTime: true,
          createdAt: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  // Get recent test runs
  const testRuns = await prisma.testRun.findMany({
    where: {
      assistantId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      }
    },
    include: {
      testCases: {
        select: {
          passed: true,
          score: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  // Process analytics based on granularity
  let processedAnalytics;
  
  if (granularity === 'weekly') {
    processedAnalytics = aggregateByWeek(analytics);
  } else if (granularity === 'monthly') {
    processedAnalytics = aggregateByMonth(analytics);
  } else {
    processedAnalytics = analytics.map(a => ({
      date: a.date.toISOString().split('T')[0],
      totalChats: a.totalChats,
      totalMessages: a.totalMessages,
      avgResponseTime: a.avgResponseTime || 0,
      topQuestions: a.topQuestions || [],
    }));
  }

  // Calculate conversation metrics
  const conversationMetrics = recentConversations.map(conv => {
    const userMessages = conv.messages.filter(m => m.role === 'USER');
    const assistantMessages = conv.messages.filter(m => m.role === 'ASSISTANT');
    
    const avgResponseTime = assistantMessages.length > 0
      ? assistantMessages.reduce((sum, m) => sum + (m.processingTime || 0), 0) / assistantMessages.length
      : 0;

    const avgConfidence = assistantMessages.length > 0
      ? assistantMessages.reduce((sum, m) => sum + ((m.metadata as any)?.confidence || 0), 0) / assistantMessages.length
      : 0;

    return {
      id: conv.id,
      messageCount: conv.messages.length,
      userMessageCount: userMessages.length,
      avgResponseTime: Math.round(avgResponseTime),
      avgConfidence,
      createdAt: conv.createdAt,
      lastActivity: conv.messages.length > 0 
        ? conv.messages[conv.messages.length - 1].createdAt
        : conv.createdAt,
    };
  });

  // Calculate test metrics
  const testMetrics = testRuns.map(run => {
    const totalCases = run.testCases.length;
    const passedCases = run.testCases.filter(tc => tc.passed).length;
    const averageScore = totalCases > 0 
      ? run.testCases.reduce((sum, tc) => sum + (tc.score || 0), 0) / totalCases
      : 0;

    return {
      id: run.id,
      name: run.name,
      status: run.status,
      totalCases,
      passedCases,
      passRate: totalCases > 0 ? passedCases / totalCases : 0,
      averageScore,
      createdAt: run.createdAt,
    };
  });

  // Overall summary
  const totalChats = analytics.reduce((sum, a) => sum + a.totalChats, 0);
  const totalMessages = analytics.reduce((sum, a) => sum + a.totalMessages, 0);
  const avgResponseTime = analytics.length > 0 
    ? analytics.reduce((sum, a) => sum + (a.avgResponseTime || 0), 0) / analytics.length
    : 0;

  // Top questions across time period
  const allTopQuestions = analytics.flatMap(a => (a.topQuestions as any[]) || []);
  const questionCounts = allTopQuestions.reduce((acc, q) => {
    acc[q.question] = (acc[q.question] || 0) + q.count;
    return acc;
  }, {} as Record<string, number>);
  
  const topQuestions = Object.entries(questionCounts)
    .map(([question, count]) => ({ question, count }))
    .sort((a, b) => Number(b.count) - Number(a.count))
    .slice(0, 15);

  res.json({
    assistant: {
      id: assistant.id,
      name: assistant.name,
      slug: assistant.slug,
      isActive: assistant.isActive,
      documentCount: assistant._count.documents,
      conversationCount: assistant._count.conversations,
      testRunCount: assistant._count.testRuns,
    },
    summary: {
      totalChats,
      totalMessages,
      avgResponseTime: Math.round(avgResponseTime),
      dateRange: { startDate, endDate },
    },
    analytics: processedAnalytics,
    topQuestions,
    conversationMetrics,
    testMetrics,
    granularity,
  });
}));

// Get conversation details
router.get('/:assistantId/conversations/:conversationId', authenticate, [
  param('assistantId').isString(),
  param('conversationId').isString(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed');
  }

  const { assistantId, conversationId } = req.params;

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

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      assistantId,
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!conversation) {
    throw new NotFoundError('Conversation not found');
  }

  const messages = conversation.messages.map(msg => ({
    id: msg.id,
    content: msg.content,
    role: msg.role.toLowerCase(),
    confidence: (msg.metadata as any)?.confidence,
    citations: (msg.metadata as any)?.citations || [],
    processingTime: msg.processingTime,
    rating: (msg.metadata as any)?.rating,
    feedback: (msg.metadata as any)?.feedback,
    timestamp: msg.createdAt,
    isGreeting: (msg.metadata as any)?.isGreeting || false,
    isError: (msg.metadata as any)?.isError || false,
  }));

  res.json({
    conversation: {
      id: conversation.id,
      sessionId: conversation.sessionId,
      isActive: conversation.isActive,
      metadata: conversation.metadata,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    },
    messages,
  });
}));

// Helper functions for data aggregation
function aggregateByWeek(analytics: any[]): any[] {
  const weeklyData = new Map<string, any>();
  
  analytics.forEach(a => {
    const date = new Date(a.date);
    const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, {
        date: weekKey,
        totalChats: 0,
        totalMessages: 0,
        avgResponseTime: 0,
        responseTimeCount: 0,
        topQuestions: [],
      });
    }
    
    const week = weeklyData.get(weekKey)!;
    week.totalChats += a.totalChats;
    week.totalMessages += a.totalMessages;
    
    if (a.avgResponseTime) {
      week.avgResponseTime = (week.avgResponseTime * week.responseTimeCount + a.avgResponseTime) / (week.responseTimeCount + 1);
      week.responseTimeCount += 1;
    }
    
    week.topQuestions.push(...(a.topQuestions || []));
  });
  
  return Array.from(weeklyData.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(week => ({
      date: week.date,
      totalChats: week.totalChats,
      totalMessages: week.totalMessages,
      avgResponseTime: Math.round(week.avgResponseTime),
      topQuestions: aggregateQuestions(week.topQuestions).slice(0, 5),
    }));
}

function aggregateByMonth(analytics: any[]): any[] {
  const monthlyData = new Map<string, any>();
  
  analytics.forEach(a => {
    const date = new Date(a.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, {
        date: monthKey,
        totalChats: 0,
        totalMessages: 0,
        avgResponseTime: 0,
        responseTimeCount: 0,
        topQuestions: [],
      });
    }
    
    const month = monthlyData.get(monthKey)!;
    month.totalChats += a.totalChats;
    month.totalMessages += a.totalMessages;
    
    if (a.avgResponseTime) {
      month.avgResponseTime = (month.avgResponseTime * month.responseTimeCount + a.avgResponseTime) / (month.responseTimeCount + 1);
      month.responseTimeCount += 1;
    }
    
    month.topQuestions.push(...(a.topQuestions || []));
  });
  
  return Array.from(monthlyData.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(month => ({
      date: month.date,
      totalChats: month.totalChats,
      totalMessages: month.totalMessages,
      avgResponseTime: Math.round(month.avgResponseTime),
      topQuestions: aggregateQuestions(month.topQuestions).slice(0, 5),
    }));
}

function aggregateQuestions(questions: any[]): any[] {
  const questionCounts = questions.reduce((acc, q) => {
    acc[q.question] = (acc[q.question] || 0) + q.count;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(questionCounts)
    .map(([question, count]) => ({ question, count }))
    .sort((a, b) => Number(b.count) - Number(a.count));
}

export default router;