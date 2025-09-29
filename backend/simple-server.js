// Simple Express server to demonstrate the Student Support Assistant
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: '../.env' });

console.log('🚀 Starting Student Support Assistant Backend...');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Student Support Assistant Backend is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    features: {
      database: 'Connected',
      uploads: 'Ready',
      fileWatcher: 'Active',
      ai: 'Configured (Vanderbilt Amplify)'
    }
  });
});

// Demo API endpoints
app.get('/api/assistants', (req, res) => {
  res.json({
    assistants: [
      {
        id: 1,
        name: 'Academic Support',
        description: 'Help with tutoring, writing center, study groups',
        slug: 'academic-support',
        status: 'active',
        isActive: true,
        documentCount: 5,
        chatCount: 0,
        createdAt: '2024-09-28T09:00:00Z',
        lastUpdated: '2024-09-29T15:30:00Z'
      },
      {
        id: 2,
        name: 'Financial Aid',
        description: 'FAFSA, scholarships, emergency funds',
        slug: 'financial-aid', 
        status: 'active',
        isActive: true,
        documentCount: 8,
        chatCount: 0,
        createdAt: '2024-09-27T14:20:00Z',
        lastUpdated: '2024-09-29T12:15:00Z'
      },
      {
        id: 3,
        name: 'Student Life',
        description: 'Campus recreation, counseling, career services',
        slug: 'student-life',
        status: 'active',
        isActive: true,
        documentCount: 12,
        chatCount: 0,
        createdAt: '2024-09-26T11:45:00Z',
        lastUpdated: '2024-09-29T16:00:00Z'
      }
    ]
  });
});

app.get('/api/documents', (req, res) => {
  res.json({
    documents: [
      {
        id: 1,
        filename: 'academic-support-guide.pdf',
        title: 'Academic Support Services Guide',
        type: 'application/pdf',
        size: 1024000,
        uploadedAt: '2024-09-29T10:00:00Z',
        status: 'processed',
        assistant: 'Academic Support'
      },
      {
        id: 2,
        filename: 'financial-aid-handbook.docx',
        title: 'Financial Aid Handbook 2024-2025',
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 2048000,
        uploadedAt: '2024-09-29T11:00:00Z',
        status: 'processed',
        assistant: 'Financial Aid'
      },
      {
        id: 3,
        filename: 'student-life-services.xlsx',
        title: 'Student Life Services Directory',
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 512000,
        uploadedAt: '2024-09-29T12:00:00Z',
        status: 'processing',
        assistant: 'Student Life'
      }
    ]
  });
});

app.get('/api/analytics', (req, res) => {
  res.json({
    totalAssistants: 3,
    totalDocuments: 15,
    totalChats: 0,
    todayChats: 0,
    topAssistant: 'Financial Aid',
    recentActivity: [
      {
        type: 'document_uploaded',
        message: 'New document uploaded: student-life-services.xlsx',
        timestamp: '2024-09-29T12:00:00Z'
      },
      {
        type: 'assistant_created',
        message: 'Assistant "Student Life" created',
        timestamp: '2024-09-29T11:30:00Z'
      }
    ]
  });
});

app.get('/api/analytics/dashboard', (req, res) => {
  res.json({
    overview: {
      totalAssistants: 3,
      activeAssistants: 3,
      totalDocuments: 25,
      totalChats: 0,
      todayChats: 0
    },
    recentActivity: [
      {
        type: 'document_uploaded',
        message: 'New document uploaded: student-life-services.xlsx',
        timestamp: '2024-09-29T16:00:00Z',
        user: 'System'
      },
      {
        type: 'assistant_created',
        message: 'Assistant "Student Life" created',
        timestamp: '2024-09-29T11:30:00Z',
        user: 'Admin'
      },
      {
        type: 'document_processed',
        message: 'Processed academic-support-guide.pdf',
        timestamp: '2024-09-29T15:45:00Z',
        user: 'System'
      }
    ],
    topAssistants: [
      { name: 'Financial Aid', chatCount: 0, documentCount: 8 },
      { name: 'Student Life', chatCount: 0, documentCount: 12 },
      { name: 'Academic Support', chatCount: 0, documentCount: 5 }
    ]
  });
});

// Authentication endpoints
app.post('/api/auth/register', (req, res) => {
  console.log('Registration request received:', req.body); // Debug log
  
  const { firstName, lastName, email, password, institution, acceptTerms } = req.body;
  
  // Basic validation
  if (!firstName || !lastName || !email || !password || !institution) {
    console.log('Missing fields:', { firstName: !!firstName, lastName: !!lastName, email: !!email, password: !!password, institution: !!institution });
    return res.status(400).json({
      error: 'All fields are required',
      missing: {
        firstName: !firstName,
        lastName: !lastName,
        email: !email,
        password: !password,
        institution: !institution
      }
    });
  }

  // Check terms acceptance (optional but recommended)
  if (!acceptTerms) {
    return res.status(400).json({
      error: 'You must accept the terms and conditions'
    });
  }

  // In a real app, you'd hash the password and save to database
  // For demo purposes, we'll just return a success response
  res.json({
    success: true,
    message: 'Account created successfully! You can now log in.',
    user: {
      id: Math.floor(Math.random() * 1000),
      firstName,
      lastName,
      email,
      institution,
      role: 'staff',
      createdAt: new Date().toISOString()
    },
    token: 'demo-jwt-token-' + Math.random().toString(36).substr(2, 9)
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Basic validation
  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required'
    });
  }

  // In a real app, you'd verify credentials against database
  // For demo purposes, accept any valid email format
  const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Invalid email format'
    });
  }

  res.json({
    success: true,
    message: 'Login successful!',
    user: {
      id: 1,
      firstName: 'Demo',
      lastName: 'User',
      email: email,
      institution: 'Vanderbilt University',
      role: 'staff',
      createdAt: '2024-09-29T10:00:00Z'
    },
    token: 'demo-jwt-token-' + Math.random().toString(36).substr(2, 9)
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

app.get('/api/auth/me', (req, res) => {
  // In a real app, you'd verify the JWT token
  // For demo, only accept tokens that start with 'demo-jwt-token-'
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'No token provided'
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  // Simple token validation - only accept our demo tokens
  if (!token.startsWith('demo-jwt-token-')) {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }

  res.json({
    success: true,
    user: {
      id: 1,
      firstName: 'Demo',
      lastName: 'User',
      email: 'demo@university.edu',
      institution: 'Vanderbilt University',
      role: 'staff',
      createdAt: '2024-09-29T10:00:00Z'
    }
  });
});

// Chat endpoint (will show Vanderbilt API status)
app.post('/api/chat', (req, res) => {
  const { message, assistantSlug } = req.body;
  
  res.json({
    response: `Thank you for your message: "${message}". The ${assistantSlug} assistant is configured but currently cannot respond due to Vanderbilt Amplify API authentication requirements. Please contact your IT department to enable institutional API access.`,
    status: 'ai_unavailable',
    assistantSlug,
    timestamp: new Date().toISOString()
  });
});

// Database test endpoint
app.get('/api/database/test', async (req, res) => {
  try {
    // Use our existing database test
    const { execSync } = require('child_process');
    const result = execSync('node test-db.js', { encoding: 'utf-8' });
    
    res.json({
      status: 'success',
      message: 'Database connection successful',
      details: result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// File upload demo endpoint
app.post('/api/documents/upload', (req, res) => {
  res.json({
    message: 'File upload endpoint ready. In production, this would handle multipart/form-data uploads.',
    supportedTypes: ['pdf', 'docx', 'xlsx', 'txt', 'csv'],
    maxSize: '10MB',
    uploadPath: './uploads',
    processingSteps: [
      'File validation',
      'Content extraction', 
      'Metadata generation',
      'AI training data preparation',
      'Database storage'
    ]
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    availableRoutes: [
      'GET /health',
      'GET /api/assistants', 
      'GET /api/documents',
      'GET /api/analytics',
      'GET /api/analytics/dashboard',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/auth/logout',
      'GET /api/auth/me',
      'POST /api/chat',
      'GET /api/database/test',
      'POST /api/documents/upload'
    ]
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`\n🎯 Student Support Assistant Backend`);
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 Frontend URL: http://localhost:3001`);
  console.log(`📊 Features: Database ✅ | File Upload ✅ | AI Config ✅`);
  console.log(`⚠️  Note: Vanderbilt Amplify API needs authentication setup\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server shut down gracefully');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  server.close(() => {
    process.exit(0);
  });
});