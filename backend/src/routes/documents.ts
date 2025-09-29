import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { param, query, validationResult } from 'express-validator';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import { DocumentProcessor } from '../services/documents/DocumentProcessor';
import { FileWatcherService } from '../services/fileWatcher/FileWatcherService';
import { logger } from '../utils/logger';

const router = express.Router();
const fileWatcher = new FileWatcherService();

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_PATH || './uploads';

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (DocumentProcessor.isSupported(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError(`Unsupported file type: ${file.mimetype}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
    files: 10, // Max 10 files per request
  }
});

// Upload documents
router.post('/upload/:assistantId', authenticate, upload.array('documents', 10), asyncHandler(async (req, res) => {
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

  const files = req.files as Express.Multer.File[];
  
  if (!files || files.length === 0) {
    throw new ValidationError('No files uploaded');
  }

  const results = [];

  for (const file of files) {
    try {
      logger.info(`Processing uploaded file: ${file.originalname}`);

      // Process document
      const processedDoc = await DocumentProcessor.processDocument(file.path, file.mimetype);
      
      // Save to database
      const documentId = await DocumentProcessor.saveProcessedDocument(
        assistantId,
        file.filename,
        file.originalname,
        file.mimetype,
        file.size,
        processedDoc
      );

      results.push({
        id: documentId,
        filename: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        wordCount: processedDoc.metadata.wordCount,
        processingTime: processedDoc.metadata.processingTime,
        status: 'success'
      });

      logger.info(`Successfully processed and saved: ${file.originalname}`);

    } catch (error) {
      logger.error(`Failed to process file ${file.originalname}:`, error);
      
      // Clean up file
      try {
        await fs.unlink(file.path);
      } catch (unlinkError) {
        logger.error(`Failed to clean up file ${file.path}:`, unlinkError);
      }

      results.push({
        filename: file.originalname,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  res.status(201).json({
    message: `Processed ${files.length} file(s)`,
    results
  });
}));

// Get documents for assistant
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

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where: { assistantId },
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
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.document.count({
      where: { assistantId }
    })
  ]);

  const totalPages = Math.ceil(total / limit);

  res.json({
    documents,
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

// Get single document
router.get('/:assistantId/:documentId', authenticate, [
  param('assistantId').isString(),
  param('documentId').isString(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed');
  }

  const { assistantId, documentId } = req.params;

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

  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      assistantId,
    }
  });

  if (!document) {
    throw new NotFoundError('Document not found');
  }

  res.json({ document });
}));

// Delete document
router.delete('/:assistantId/:documentId', authenticate, [
  param('assistantId').isString(),
  param('documentId').isString(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed');
  }

  const { assistantId, documentId } = req.params;

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

  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      assistantId,
    }
  });

  if (!document) {
    throw new NotFoundError('Document not found');
  }

  // Delete from database
  await DocumentProcessor.deleteDocument(documentId);

  // Try to delete physical file
  try {
    const filePath = path.join(uploadDir, document.filename);
    await fs.unlink(filePath);
    logger.info(`Deleted file: ${filePath}`);
  } catch (error) {
    logger.warn(`Could not delete file ${document.filename}:`, error);
  }

  res.json({
    message: 'Document deleted successfully',
  });
}));

// Bulk delete documents
router.delete('/:assistantId/bulk', authenticate, [
  param('assistantId').isString(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed');
  }

  const { assistantId } = req.params;
  const { documentIds } = req.body;

  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    throw new ValidationError('Document IDs array is required');
  }

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

  // Get documents to delete
  const documents = await prisma.document.findMany({
    where: {
      id: { in: documentIds },
      assistantId,
    }
  });

  const results = [];

  for (const document of documents) {
    try {
      await DocumentProcessor.deleteDocument(document.id);
      
      // Try to delete physical file
      try {
        const filePath = path.join(uploadDir, document.filename);
        await fs.unlink(filePath);
      } catch (fileError) {
        logger.warn(`Could not delete file ${document.filename}:`, fileError);
      }

      results.push({
        id: document.id,
        filename: document.originalName,
        status: 'deleted'
      });
    } catch (error) {
      results.push({
        id: document.id,
        filename: document.originalName,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  res.json({
    message: `Processed ${documentIds.length} document(s)`,
    results
  });
}));

// Add file watch for directory
router.post('/:assistantId/watch', authenticate, [
  param('assistantId').isString(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed');
  }

  const { assistantId } = req.params;
  const { path: watchPath } = req.body;

  if (!watchPath) {
    throw new ValidationError('Path is required');
  }

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

  try {
    const watchId = await fileWatcher.addWatch(watchPath, assistantId);

    res.status(201).json({
      message: 'File watch added successfully',
      watchId,
      path: watchPath,
    });
  } catch (error) {
    logger.error(`Failed to add file watch for ${watchPath}:`, error);
    throw new ValidationError(`Failed to add file watch: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}));

// Get file watches for assistant
router.get('/:assistantId/watches', authenticate, [
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

  const watches = await fileWatcher.getWatches(assistantId);

  res.json({ watches });
}));

// Remove file watch
router.delete('/:assistantId/watch/:watchId', authenticate, [
  param('assistantId').isString(),
  param('watchId').isString(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed');
  }

  const { assistantId, watchId } = req.params;

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

  try {
    await fileWatcher.removeWatch(watchId);

    res.json({
      message: 'File watch removed successfully',
    });
  } catch (error) {
    logger.error(`Failed to remove file watch ${watchId}:`, error);
    throw new ValidationError(`Failed to remove file watch: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}));

// Reprocess document
router.post('/:assistantId/:documentId/reprocess', authenticate, [
  param('assistantId').isString(),
  param('documentId').isString(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed');
  }

  const { assistantId, documentId } = req.params;

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

  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      assistantId,
    }
  });

  if (!document) {
    throw new NotFoundError('Document not found');
  }

  try {
    const filePath = path.join(uploadDir, document.filename);
    
    // Check if file exists
    await fs.access(filePath);

    // Reprocess document
    await DocumentProcessor.updateDocument(
      documentId,
      filePath,
      document.mimeType,
      document.size
    );

    // Get updated document
    const updatedDocument = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        filename: true,
        originalName: true,
        mimeType: true,
        size: true,
        metadata: true,
        isProcessed: true,
        lastModified: true,
        updatedAt: true,
      }
    });

    res.json({
      message: 'Document reprocessed successfully',
      document: updatedDocument,
    });

  } catch (error) {
    logger.error(`Failed to reprocess document ${documentId}:`, error);
    throw new ValidationError(`Failed to reprocess document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}));

export default router;