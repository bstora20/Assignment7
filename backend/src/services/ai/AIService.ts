import axios from 'axios';
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
  private apiKey: string;
  private baseURL: string;
  private model: string;
  private static instance: AIService;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || process.env.AMPLIFY_API_KEY;
    
    if (!apiKey) {
      throw new Error('Amplify API key not configured. Please set OPENAI_API_KEY or AMPLIFY_API_KEY in your .env file');
    }

    this.apiKey = apiKey;
    this.baseURL = process.env.AMPLIFY_API_URL || 'https://prod-api.vanderbilt.ai';
    this.model = process.env.AMPLIFY_MODEL || 'GPT-4o-mini';
    
    logger.info(`AI Service initialized: ${this.baseURL} with model ${this.model}`);
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

      // Build messages for Vanderbilt Amplify API
      const messages = [
        {
          role: 'system',
          content: systemMessage
        }
      ];

      // Add conversation history
      conversationHistory.forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });

      // Add current user message
      messages.push({
        role: 'user',
        content: userMessage
      });

      // Call Vanderbilt Amplify API
      const response = await this.callVanderbiltAPI(messages);

      const responseMessage = response.content || 'I apologize, but I couldn\'t generate a response.';
      
      // Extract citations
      const citations = this.extractCitations(responseMessage, assistant.documents);

      const processingTime = Date.now() - startTime;

      const result: ChatResponse = {
        message: responseMessage,
        confidence: this.calculateConfidence(responseMessage, userMessage, documentContext),
        citations,
        processingTime,
        tokenUsage: response.usage || {
          prompt: 0,
          completion: 0,
          total: 0,
        }
      };

      logger.info(`Chat response generated for assistant ${assistantId}: ${processingTime}ms, ${result.tokenUsage?.total} tokens`);

      return result;

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

      const messages = [
        {
          role: 'user',
          content: `Analyze the following documents and provide a comprehensive analysis.

Documents:
${combinedContent}

Please provide:
1. A comprehensive summary of the content (2-3 sentences)
2. Key topics covered (as a comma-separated list)
3. Suggested questions students might ask about this content (3-5 questions)

Format your response as:
SUMMARY: [your summary here]
TOPICS: [topic1, topic2, topic3, ...]
QUESTIONS: [question1, question2, question3, ...]`
        }
      ];

      const response = await this.callVanderbiltAPI(messages);
      const responseText = response.content || '';

      if (!responseText) {
        throw new Error('No response from Vanderbilt Amplify');
      }

      // Parse the structured response
      const lines = responseText.split('\n');
      let summary = '';
      let keyTopics: string[] = [];
      let suggestedQuestions: string[] = [];

      lines.forEach(line => {
        if (line.startsWith('SUMMARY:')) {
          summary = line.replace('SUMMARY:', '').trim();
        } else if (line.startsWith('TOPICS:')) {
          const topicsLine = line.replace('TOPICS:', '').trim();
          keyTopics = topicsLine.split(',').map(t => t.trim()).filter(t => t.length > 0);
        } else if (line.startsWith('QUESTIONS:')) {
          const questionsLine = line.replace('QUESTIONS:', '').trim();
          suggestedQuestions = questionsLine.split(',').map(q => q.trim()).filter(q => q.length > 0);
        }
      });

      // Fallback parsing if structured format fails
      if (!summary || keyTopics.length === 0) {
        return {
          summary: responseText.substring(0, 200) + '...',
          keyTopics: ['General Information'],
          suggestedQuestions: ['What information is available in these documents?']
        };
      }

      return {
        summary,
        keyTopics: keyTopics.slice(0, 8), // Limit to 8 topics
        suggestedQuestions: suggestedQuestions.slice(0, 5) // Limit to 5 questions
      };

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

  private async callVanderbiltAPI(messages: any[]): Promise<any> {
    try {
      logger.info(`Calling Vanderbilt Amplify API: ${this.baseURL}/chat`);
      
      // Vanderbilt Amplify API format
      const requestData = {
        model: this.model,
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
        stream: false
      };

      const response = await axios.post(`${this.baseURL}/chat`, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'x-api-key': this.apiKey,
          'User-Agent': 'StudentSupportAssistant/1.0'
        },
        timeout: 30000 // 30 second timeout
      });

      logger.info('Vanderbilt API response received:', response.status);

      // Handle different possible response formats from Vanderbilt
      let content = '';
      let usage = { prompt: 0, completion: 0, total: 0 };

      if (response.data.choices && Array.isArray(response.data.choices)) {
        // OpenAI-style format (most likely for GPT-4o-mini)
        content = response.data.choices[0]?.message?.content || response.data.choices[0]?.text || '';
        usage = {
          prompt: response.data.usage?.prompt_tokens || 0,
          completion: response.data.usage?.completion_tokens || 0,
          total: response.data.usage?.total_tokens || 0
        };
      } else if (response.data.content) {
        // Direct content format
        content = response.data.content;
      } else if (response.data.message) {
        // Message format
        content = response.data.message;
      } else if (response.data.response) {
        // Response format
        content = response.data.response;
      } else if (typeof response.data === 'string') {
        // Direct string response
        content = response.data;
      }

      if (!content) {
        logger.error('No content found in Vanderbilt API response:', response.data);
        throw new Error('No content in API response');
      }

      return { content, usage };

    } catch (error: any) {
      logger.error('Vanderbilt API call failed:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });

      if (error.response?.status === 401) {
        throw new Error('Authentication failed with Vanderbilt Amplify API. Please check your API key.');
      } else if (error.response?.status === 404) {
        throw new Error('Vanderbilt Amplify endpoint not found. Please verify the API URL.');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`Vanderbilt API error: ${error.response?.data?.error?.message || error.message}`);
      }
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
- Use the provided documents to answer questions accurately
- If you're not sure about something, say so honestly
- Be friendly, supportive, and professional
- If a question is outside your knowledge base, politely explain your limitations
- Always prioritize student safety and well-being
- When referencing information, mention which document it comes from

Available Documentation:
${documentContext}

Remember to maintain a helpful and professional tone while being accessible to students. Provide clear, actionable information whenever possible.`;
  }

  private extractCitations(response: string, documents: any[]): string[] {
    const citations: string[] = [];
    
    documents.forEach(doc => {
      const docName = doc.originalName.toLowerCase();
      const responseLower = response.toLowerCase();
      
      // Check if document name is mentioned
      if (responseLower.includes(docName) || 
          responseLower.includes(docName.replace(/\.(pdf|docx?|txt|md)$/i, ''))) {
        citations.push(doc.originalName);
      } else {
        // Check for content overlap (key phrases from document)
        const docWords = doc.content.toLowerCase().split(/\s+/)
          .filter((word: string) => word.length > 6) // Only longer words
          .slice(0, 20); // First 20 significant words
        
        const hasOverlap = docWords.some((word: string) => 
          responseLower.includes(word) && 
          word.length > 6 // Ensure meaningful words
        );
        
        if (hasOverlap) {
          citations.push(doc.originalName);
        }
      }
    });

    return [...new Set(citations)]; // Remove duplicates
  }

  private calculateConfidence(response: string, question: string, context: string): number {
    let confidence = 0.7; // Base confidence for GPT-4o-mini
    
    // Increase confidence if response mentions specific terms from context
    const contextWords = context.toLowerCase().split(/\s+/)
      .filter(word => word.length > 5); // Only meaningful words
    const responseWords = response.toLowerCase().split(/\s+/);
    
    const overlap = contextWords.filter(word => 
      responseWords.includes(word)
    ).length;
    
    confidence += Math.min(overlap / 30, 0.2); // Max 0.2 boost from overlap
    
    // Decrease confidence for uncertainty phrases
    const uncertainPhrases = [
      'i\'m not sure', 'might be', 'possibly', 'i think', 
      'i don\'t have', 'unclear', 'i cannot find'
    ];
    if (uncertainPhrases.some(phrase => response.toLowerCase().includes(phrase))) {
      confidence -= 0.3;
    }
    
    // Increase confidence for definitive statements with citations
    const definitePhrases = [
      'according to', 'based on', 'the document states', 
      'as mentioned in', 'the policy indicates'
    ];
    if (definitePhrases.some(phrase => response.toLowerCase().includes(phrase))) {
      confidence += 0.2;
    }
    
    // Boost confidence for detailed responses
    if (response.length > 100) {
      confidence += 0.1;
    }
    
    return Math.max(0.1, Math.min(1, confidence));
  }

  private calculateTestScore(question: string, response: string, confidence: number): number {
    let score = confidence; // Base score from confidence
    
    // Check response quality indicators
    if (response.length > 50) score += 0.1; // Substantial response
    if (response.includes('based on') || response.includes('according to')) score += 0.15; // Citations
    if (!response.toLowerCase().includes('i don\'t know')) score += 0.1; // Not uncertain
    
    // Check for specific helpful elements
    if (response.includes('contact') || response.includes('office') || response.includes('phone')) score += 0.05; // Actionable info
    if (response.match(/\d/)) score += 0.05; // Contains specific numbers/dates
    
    // Penalize for generic or unhelpful responses
    if (response.length < 30) score -= 0.3;
    if (response.toLowerCase().includes('i cannot help') || response.toLowerCase().includes('i can\'t assist')) score -= 0.2;
    
    return Math.max(0, Math.min(1, score));
  }
}