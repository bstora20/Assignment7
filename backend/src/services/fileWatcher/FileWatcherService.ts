import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../../utils/logger';
import { prisma } from '../../utils/prisma';
import { DocumentProcessor } from '../documents/DocumentProcessor';
import { EmailService } from '../email/EmailService';

export interface WatchedPath {
  id: string;
  path: string;
  assistantId: string;
  isActive: boolean;
}

export class FileWatcherService {
  private watchers: Map<string, chokidar.FSWatcher> = new Map();
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  async initialize(): Promise<void> {
    try {
      // Get all active file watches from database
      const fileWatches = await prisma.fileWatch.findMany({
        where: { isActive: true },
      });

      logger.info(`Initializing ${fileWatches.length} file watchers`);

      for (const watch of fileWatches) {
        await this.startWatching(watch.path, watch.assistantId);
      }

      logger.info('File watcher service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize file watcher service:', error);
      throw error;
    }
  }

  async addWatch(watchPath: string, assistantId: string): Promise<string> {
    try {
      // Verify path exists
      await fs.access(watchPath);

      // Check if watch already exists
      const existingWatch = await prisma.fileWatch.findUnique({
        where: { path: watchPath }
      });

      if (existingWatch) {
        if (existingWatch.assistantId !== assistantId) {
          throw new Error('Path is already being watched by another assistant');
        }
        return existingWatch.id;
      }

      // Create database record
      const fileWatch = await prisma.fileWatch.create({
        data: {
          path: watchPath,
          assistantId,
          isActive: true,
        }
      });

      // Start watching
      await this.startWatching(watchPath, assistantId);

      logger.info(`Added file watch: ${watchPath} for assistant ${assistantId}`);
      return fileWatch.id;

    } catch (error) {
      logger.error(`Failed to add file watch for ${watchPath}:`, error);
      throw error;
    }
  }

  async removeWatch(watchId: string): Promise<void> {
    try {
      const fileWatch = await prisma.fileWatch.findUnique({
        where: { id: watchId }
      });

      if (!fileWatch) {
        throw new Error('File watch not found');
      }

      // Stop watching
      this.stopWatching(fileWatch.path);

      // Remove from database
      await prisma.fileWatch.delete({
        where: { id: watchId }
      });

      logger.info(`Removed file watch: ${fileWatch.path}`);

    } catch (error) {
      logger.error(`Failed to remove file watch ${watchId}:`, error);
      throw error;
    }
  }

  private async startWatching(watchPath: string, assistantId: string): Promise<void> {
    try {
      // Create watcher
      const watcher = chokidar.watch(watchPath, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: false,
        followSymlinks: false,
        depth: 10, // Maximum depth
      });

      // Set up event handlers
      watcher
        .on('add', (filePath) => this.handleFileAdded(filePath, assistantId))
        .on('change', (filePath) => this.handleFileChanged(filePath, assistantId))
        .on('unlink', (filePath) => this.handleFileDeleted(filePath, assistantId))
        .on('error', (error) => {
          logger.error(`Watcher error for ${watchPath}:`, error);
        });

      this.watchers.set(watchPath, watcher);
      logger.info(`Started watching: ${watchPath}`);

    } catch (error) {
      logger.error(`Failed to start watching ${watchPath}:`, error);
      throw error;
    }
  }

  private stopWatching(watchPath: string): void {
    const watcher = this.watchers.get(watchPath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(watchPath);
      logger.info(`Stopped watching: ${watchPath}`);
    }
  }

  private async handleFileAdded(filePath: string, assistantId: string): Promise<void> {
    try {
      logger.info(`File added: ${filePath}`);
      await this.processFile(filePath, assistantId, 'added');
    } catch (error) {
      logger.error(`Failed to handle added file ${filePath}:`, error);
    }
  }

  private async handleFileChanged(filePath: string, assistantId: string): Promise<void> {
    try {
      logger.info(`File changed: ${filePath}`);
      await this.processFile(filePath, assistantId, 'changed');
    } catch (error) {
      logger.error(`Failed to handle changed file ${filePath}:`, error);
    }
  }

  private async handleFileDeleted(filePath: string, assistantId: string): Promise<void> {
    try {
      logger.info(`File deleted: ${filePath}`);
      
      // Find document in database
      const document = await prisma.document.findFirst({
        where: {
          assistantId,
          filename: path.basename(filePath),
        }
      });

      if (document) {
        await DocumentProcessor.deleteDocument(document.id);
        await this.sendNotification(assistantId, 'deleted', filePath);
      }

    } catch (error) {
      logger.error(`Failed to handle deleted file ${filePath}:`, error);
    }
  }

  private async processFile(filePath: string, assistantId: string, action: 'added' | 'changed'): Promise<void> {
    try {
      // Get file stats
      const stats = await fs.stat(filePath);
      
      if (!stats.isFile()) {
        return; // Skip directories
      }

      // Determine MIME type
      const mimeType = this.getMimeType(filePath);
      
      if (!DocumentProcessor.isSupported(mimeType)) {
        logger.info(`Skipping unsupported file type: ${filePath} (${mimeType})`);
        return;
      }

      const filename = path.basename(filePath);
      const originalName = filename;
      const size = stats.size;

      // Check if document already exists
      const existingDoc = await prisma.document.findFirst({
        where: {
          assistantId,
          filename,
        }
      });

      if (existingDoc && action === 'changed') {
        // Update existing document
        await DocumentProcessor.updateDocument(existingDoc.id, filePath, mimeType, size);
        await this.sendNotification(assistantId, 'updated', filePath);
        
      } else if (!existingDoc && action === 'added') {
        // Process new document
        const processedDoc = await DocumentProcessor.processDocument(filePath, mimeType);
        await DocumentProcessor.saveProcessedDocument(
          assistantId,
          filename,
          originalName,
          mimeType,
          size,
          processedDoc
        );
        await this.sendNotification(assistantId, 'added', filePath);
      }

      // Update last scan time
      await prisma.fileWatch.updateMany({
        where: { assistantId },
        data: { lastScan: new Date() }
      });

    } catch (error) {
      logger.error(`Failed to process file ${filePath}:`, error);
    }
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
      '.csv': 'text/csv',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  private async sendNotification(assistantId: string, action: string, filePath: string): Promise<void> {
    try {
      // Get assistant and user info
      const assistant = await prisma.assistant.findUnique({
        where: { id: assistantId },
        include: { user: true }
      });

      if (!assistant) {
        logger.error(`Assistant not found for notification: ${assistantId}`);
        return;
      }

      const filename = path.basename(filePath);
      let title = '';
      let message = '';

      switch (action) {
        case 'added':
          title = 'New Document Added';
          message = `A new document "${filename}" has been automatically added to your assistant "${assistant.name}".`;
          break;
        case 'updated':
          title = 'Document Updated';
          message = `The document "${filename}" in your assistant "${assistant.name}" has been automatically updated.`;
          break;
        case 'deleted':
          title = 'Document Removed';
          message = `The document "${filename}" has been removed from your assistant "${assistant.name}".`;
          break;
      }

      // Save notification to database
      await prisma.notification.create({
        data: {
          type: 'DOCUMENT_UPDATED',
          title,
          message,
          userId: assistant.userId,
          assistantId,
          metadata: {
            filename,
            action,
            filePath,
            timestamp: new Date().toISOString(),
          }
        }
      });

      // Send email notification
      await this.emailService.sendDocumentUpdateNotification(
        assistant.user.email,
        assistant.user.name,
        assistant.name,
        filename,
        action
      );

    } catch (error) {
      logger.error(`Failed to send notification for ${action} ${filePath}:`, error);
    }
  }

  async getWatches(assistantId: string): Promise<WatchedPath[]> {
    const watches = await prisma.fileWatch.findMany({
      where: { assistantId },
      select: {
        id: true,
        path: true,
        assistantId: true,
        isActive: true,
      }
    });

    return watches;
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up file watcher service...');
    
    for (const [path, watcher] of this.watchers.entries()) {
      watcher.close();
    }
    
    this.watchers.clear();
    logger.info('File watcher service cleaned up');
  }
}