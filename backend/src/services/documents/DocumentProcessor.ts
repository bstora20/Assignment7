import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import { logger } from '../../utils/logger';
import { prisma } from '../../utils/prisma';

export interface ProcessedDocument {
  content: string;
  metadata: {
    pageCount?: number;
    wordCount: number;
    extractedAt: string;
    processingTime: number;
    contentType: string;
    language?: string;
  };
}

export class DocumentProcessor {
  private static readonly SUPPORTED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'text/plain',
    'text/markdown',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv',
  ];

  static isSupported(mimeType: string): boolean {
    return this.SUPPORTED_TYPES.includes(mimeType);
  }

  static async processDocument(filePath: string, mimeType: string): Promise<ProcessedDocument> {
    const startTime = Date.now();
    logger.info(`Processing document: ${filePath} (${mimeType})`);

    try {
      let content = '';
      let metadata: any = {
        extractedAt: new Date().toISOString(),
        contentType: mimeType,
      };

      const fileBuffer = await fs.readFile(filePath);

      switch (mimeType) {
        case 'application/pdf':
          content = await this.processPDF(fileBuffer);
          break;
        
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          content = await this.processDocx(fileBuffer);
          break;
        
        case 'text/plain':
        case 'text/markdown':
          content = await this.processText(fileBuffer);
          break;
        
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        case 'application/vnd.ms-excel':
          content = await this.processExcel(fileBuffer);
          break;
        
        case 'text/csv':
          content = await this.processCSV(fileBuffer);
          break;
        
        default:
          throw new Error(`Unsupported file type: ${mimeType}`);
      }

      // Calculate metadata
      metadata.wordCount = this.getWordCount(content);
      metadata.processingTime = Date.now() - startTime;
      metadata.language = this.detectLanguage(content);

      logger.info(`Document processed successfully: ${path.basename(filePath)} (${metadata.wordCount} words, ${metadata.processingTime}ms)`);

      return {
        content: content.trim(),
        metadata,
      };

    } catch (error) {
      logger.error(`Failed to process document ${filePath}:`, error);
      throw new Error(`Document processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async processPDF(buffer: Buffer): Promise<string> {
    const data = await pdfParse(buffer);
    return data.text;
  }

  private static async processDocx(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  private static async processText(buffer: Buffer): Promise<string> {
    return buffer.toString('utf-8');
  }

  private static async processExcel(buffer: Buffer): Promise<string> {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    let content = '';
    
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const csvData = xlsx.utils.sheet_to_csv(worksheet);
      content += `\n--- Sheet: ${sheetName} ---\n${csvData}\n`;
    });
    
    return content;
  }

  private static async processCSV(buffer: Buffer): Promise<string> {
    return buffer.toString('utf-8');
  }

  private static getWordCount(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private static detectLanguage(text: string): string {
    // Simple language detection - in production, you might use a proper language detection library
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'as'];
    const words = text.toLowerCase().split(/\s+/);
    const englishCount = words.filter(word => englishWords.includes(word)).length;
    
    return (englishCount / Math.min(words.length, 100)) > 0.1 ? 'en' : 'unknown';
  }

  static generateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  static async saveProcessedDocument(
    assistantId: string,
    filename: string,
    originalName: string,
    mimeType: string,
    size: number,
    processedDoc: ProcessedDocument
  ): Promise<string> {
    const checksum = this.generateChecksum(processedDoc.content);

    // Check if document with same checksum already exists
    const existingDoc = await prisma.document.findFirst({
      where: {
        assistantId,
        checksum,
      }
    });

    if (existingDoc) {
      logger.info(`Document with same content already exists: ${originalName}`);
      return existingDoc.id;
    }

    // Create new document record
    const document = await prisma.document.create({
      data: {
        assistantId,
        filename,
        originalName,
        mimeType,
        size,
        content: processedDoc.content,
        metadata: processedDoc.metadata,
        checksum,
        isProcessed: true,
        lastModified: new Date(),
      }
    });

    logger.info(`Document saved to database: ${originalName} (ID: ${document.id})`);
    return document.id;
  }

  static async updateDocument(
    documentId: string,
    filePath: string,
    mimeType: string,
    size: number
  ): Promise<void> {
    const processedDoc = await this.processDocument(filePath, mimeType);
    const checksum = this.generateChecksum(processedDoc.content);

    await prisma.document.update({
      where: { id: documentId },
      data: {
        content: processedDoc.content,
        metadata: processedDoc.metadata,
        checksum,
        size,
        isProcessed: true,
        lastModified: new Date(),
        updatedAt: new Date(),
      }
    });

    logger.info(`Document updated in database (ID: ${documentId})`);
  }

  static async deleteDocument(documentId: string): Promise<void> {
    await prisma.document.delete({
      where: { id: documentId }
    });

    logger.info(`Document deleted from database (ID: ${documentId})`);
  }

  static async getDocumentsByAssistant(assistantId: string) {
    return prisma.document.findMany({
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
      orderBy: { createdAt: 'desc' }
    });
  }
}