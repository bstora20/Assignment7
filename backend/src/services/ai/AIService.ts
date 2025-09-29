import OpenAI from 'openai';
import { logger } from '../../utils/logger';
import { prisma } from '../../utils/prisma';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: any;
}

export interface ChatResponse {
  message: string;
  confidence: number;
  citations: string[];
  processingTime: number;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface DocumentSummary {
  summary: string;
  keyTopics: string[];
  suggestedQuestions: string[];
}

export class AIService {
  private openai: OpenAI;
  private static instance: AIService;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  async generateChatResponse(
    assistantId: string,
    userMessage: string,
    conversationHistory: ChatMessage[] = []
  ): Promise<ChatResponse> {
    const startTime = Date.now();
    
    try {
      // Get assistant context and documents
      const assistant = await prisma.assistant.findUnique({
        where: { id: assistantId },
        include: {
          documents: {
            where: { isProcessed: true },
            select: { content: true, originalName: true, metadata: true }
          }
        }
      });

      if (!assistant) {
        throw new Error('Assistant not found');
      }

      // Build context from documents
      const documentContext = this.buildDocumentContext(assistant.documents);
      
      // Create system message with context
      const systemMessage = this.createSystemMessage(assistant, documentContext);

      // Prepare messages for OpenAI
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemMessage },
        ...conversationHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content
        })),
        { role: 'user', content: userMessage }
      ];

      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-1106-preview',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      });

      const responseMessage = completion.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response.';
      
      // Extract citations (simplified - in production you'd want more sophisticated citation matching)
      const citations = this.extractCitations(responseMessage, assistant.documents);

      const processingTime = Date.now() - startTime;

      const response: ChatResponse = {
        message: responseMessage,
        confidence: this.calculateConfidence(responseMessage, userMessage, documentContext),
        citations,
        processingTime,
        tokenUsage: {
          prompt: completion.usage?.prompt_tokens || 0,
          completion: completion.usage?.completion_tokens || 0,
          total: completion.usage?.total_tokens || 0,
        }
      };

      logger.info(`Chat response generated for assistant ${assistantId}: ${processingTime}ms, ${response.tokenUsage?.total} tokens`);

      return response;

    } catch (error) {
      logger.error(`Failed to generate chat response for assistant ${assistantId}:`, error);
      throw new Error(`AI service error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async summarizeDocuments(documents: any[]): Promise<DocumentSummary> {
    try {
      if (documents.length === 0) {
        return {
          summary: 'No documents provided.',
          keyTopics: [],
          suggestedQuestions: []
        };
      }

      const combinedContent = documents.map(doc => 
        `Document: ${doc.originalName}\n${doc.content.substring(0, 2000)}`
      ).join('\n\n---\n\n');

      const prompt = `Analyze the following documents and provide:
1. A comprehensive summary of the content
2. Key topics covered (as a list)
3. Suggested questions students might ask about this content

Documents:
${combinedContent}

Please format your response as JSON with the following structure:
{
  "summary": "...",
  "keyTopics": ["topic1", "topic2", ...],
  "suggestedQuestions": ["question1", "question2", ...]
}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-1106-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      try {
        return JSON.parse(response);
      } catch (parseError) {
        logger.error('Failed to parse OpenAI summary response:', parseError);
        return {
          summary: response.substring(0, 500),
          keyTopics: ['General Information'],
          suggestedQuestions: ['What information is available in these documents?']
        };
      }

    } catch (error) {
      logger.error('Failed to summarize documents:', error);
      throw new Error(`Document summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async testResponse(question: string, assistantId: string): Promise<{
    response: string;
    confidence: number;
    citations: string[];
    score: number;
  }> {
    try {
      const chatResponse = await this.generateChatResponse(assistantId, question);
      
      // Calculate a test score based on response quality
      const score = this.calculateTestScore(question, chatResponse.message, chatResponse.confidence);

      return {
        response: chatResponse.message,
        confidence: chatResponse.confidence,
        citations: chatResponse.citations,
        score
      };

    } catch (error) {
      logger.error(`Failed to test response for question "${question}":`, error);
      return {
        response: 'Error generating response',
        confidence: 0,
        citations: [],
        score: 0
      };
    }
  }

  private buildDocumentContext(documents: any[]): string {
    if (documents.length === 0) {
      return 'No documents available.';
    }

    return documents.map(doc => 
      `[${doc.originalName}]\n${doc.content.substring(0, 3000)}`
    ).join('\n\n---\n\n');
  }

  private createSystemMessage(assistant: any, documentContext: string): string {
    return `You are ${assistant.name}, a helpful student support assistant. ${assistant.description || ''}

Your role is to help students by answering questions based on the provided documentation. Always be helpful, accurate, and cite your sources when possible.

Guidelines:
- Use the provided documents to answer questions
- If you're not sure about something, say so
- Be friendly and supportive
- If a question is outside your knowledge base, politely explain your limitations
- Always prioritize student safety and well-being

Available Documentation:
${documentContext}

Remember to maintain a helpful and professional tone while being accessible to students.`;
  }

  private extractCitations(response: string, documents: any[]): string[] {
    // Simple citation extraction - in production, use more sophisticated matching
    const citations: string[] = [];
    
    documents.forEach(doc => {
      // Check if document name or content snippets are referenced
      if (response.toLowerCase().includes(doc.originalName.toLowerCase()) ||
          doc.content.split(' ').slice(0, 10).some((word: string) => 
            word.length > 4 && response.toLowerCase().includes(word.toLowerCase())
          )) {
        citations.push(doc.originalName);
      }
    });

    return [...new Set(citations)]; // Remove duplicates
  }

  private calculateConfidence(response: string, question: string, context: string): number {
    // Simple confidence calculation - in production, use more sophisticated methods
    let confidence = 0.5; // Base confidence
    
    // Increase confidence if response mentions specific terms from context
    const contextWords = context.toLowerCase().split(/\s+/);
    const responseWords = response.toLowerCase().split(/\s+/);
    const overlap = contextWords.filter(word => 
      word.length > 4 && responseWords.includes(word)
    ).length;
    
    confidence += Math.min(overlap / 50, 0.3); // Max 0.3 boost from overlap
    
    // Decrease confidence for uncertain phrases
    const uncertainPhrases = ['i\'m not sure', 'might be', 'possibly', 'i think'];
    if (uncertainPhrases.some(phrase => response.toLowerCase().includes(phrase))) {
      confidence -= 0.2;
    }
    
    // Increase confidence for definitive statements
    const definitePhrases = ['according to', 'based on', 'the document states'];
    if (definitePhrases.some(phrase => response.toLowerCase().includes(phrase))) {
      confidence += 0.2;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  private calculateTestScore(question: string, response: string, confidence: number): number {
    // Simple scoring algorithm - in production, use more sophisticated evaluation
    let score = confidence; // Base score from confidence
    
    // Check response quality indicators
    if (response.length > 50) score += 0.1; // Substantial response
    if (response.includes('based on') || response.includes('according to')) score += 0.1; // Citations
    if (!response.toLowerCase().includes('i don\'t know')) score += 0.1; // Not uncertain
    
    // Penalize for generic responses
    if (response.length < 30) score -= 0.2;
    if (response.toLowerCase().includes('i cannot')) score -= 0.1;
    
    return Math.max(0, Math.min(1, score));
  }
}