import nodemailer from 'nodemailer';
import { logger } from '../../utils/logger';

export interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    try {
      const config = this.getEmailConfig();
      
      this.transporter = nodemailer.createTransporter({
        host: config.host,
        port: config.port,
        secure: config.port === 465, // true for 465, false for other ports
        auth: {
          user: config.user,
          pass: config.pass,
        },
        tls: {
          rejectUnauthorized: false // Accept self-signed certificates
        }
      });

      this.isConfigured = true;
      logger.info('Email service configured successfully');

    } catch (error) {
      logger.warn('Email service not configured - notifications will be logged only:', error);
      this.isConfigured = false;
    }
  }

  private getEmailConfig(): EmailConfig {
    const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing email configuration: ${missingVars.join(', ')}`);
    }

    return {
      host: process.env.SMTP_HOST!,
      port: parseInt(process.env.SMTP_PORT!),
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
      from: process.env.SMTP_FROM!,
    };
  }

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<void> {
    if (!this.isConfigured) {
      logger.info(`Email would be sent to ${to}: ${subject}`);
      return;
    }

    try {
      const config = this.getEmailConfig();
      
      const mailOptions = {
        from: config.from,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${to}: ${subject}`);

    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, error);
      throw new Error(`Email sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async sendDocumentUpdateNotification(
    email: string,
    userName: string,
    assistantName: string,
    filename: string,
    action: string
  ): Promise<void> {
    const actionText = {
      'added': 'added to',
      'updated': 'updated in',
      'deleted': 'removed from'
    }[action] || 'modified in';

    const subject = `Document ${action}: ${filename} - ${assistantName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .content { margin-bottom: 20px; }
          .footer { font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          .button { background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>📚 Student Support Assistant - Document Update</h2>
        </div>
        
        <div class="content">
          <p>Hello ${userName},</p>
          
          <p>A document has been automatically ${actionText} your Student Support Assistant:</p>
          
          <ul>
            <li><strong>Assistant:</strong> ${assistantName}</li>
            <li><strong>Document:</strong> ${filename}</li>
            <li><strong>Action:</strong> ${action.charAt(0).toUpperCase() + action.slice(1)}</li>
            <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
          </ul>
          
          ${action === 'added' || action === 'updated' ? 
            '<p>Your assistant has been automatically updated with the new information and is ready to help students with questions about this content.</p>' : 
            '<p>The document has been removed from your assistant\'s knowledge base.</p>'
          }
          
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/assistants/${assistantName}" class="button">View Assistant</a>
        </div>
        
        <div class="footer">
          <p>This is an automated notification from your Student Support Assistant system.</p>
          <p>If you have any questions, please contact your system administrator.</p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, subject, html);
  }

  async sendTestCompletedNotification(
    email: string,
    userName: string,
    assistantName: string,
    testName: string,
    results: { total: number; passed: number; failed: number; averageScore: number }
  ): Promise<void> {
    const subject = `Test Completed: ${testName} - ${assistantName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .content { margin-bottom: 20px; }
          .results { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .score-good { color: #28a745; font-weight: bold; }
          .score-warning { color: #ffc107; font-weight: bold; }
          .score-bad { color: #dc3545; font-weight: bold; }
          .footer { font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          .button { background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>🧪 Student Support Assistant - Test Results</h2>
        </div>
        
        <div class="content">
          <p>Hello ${userName},</p>
          
          <p>The quality assurance test for your Student Support Assistant has been completed:</p>
          
          <ul>
            <li><strong>Assistant:</strong> ${assistantName}</li>
            <li><strong>Test Name:</strong> ${testName}</li>
            <li><strong>Completed:</strong> ${new Date().toLocaleString()}</li>
          </ul>
          
          <div class="results">
            <h3>Test Results Summary</h3>
            <ul>
              <li><strong>Total Questions:</strong> ${results.total}</li>
              <li><strong>Passed:</strong> <span class="score-good">${results.passed}</span></li>
              <li><strong>Failed:</strong> <span class="score-bad">${results.failed}</span></li>
              <li><strong>Average Score:</strong> 
                <span class="${results.averageScore >= 0.8 ? 'score-good' : results.averageScore >= 0.6 ? 'score-warning' : 'score-bad'}">
                  ${(results.averageScore * 100).toFixed(1)}%
                </span>
              </li>
            </ul>
          </div>
          
          ${results.averageScore >= 0.8 ? 
            '<p>✅ Excellent! Your assistant is performing very well and is ready to help students.</p>' :
            results.averageScore >= 0.6 ?
            '<p>⚠️ Good performance, but you might want to review the failed questions and consider adding more documentation.</p>' :
            '<p>❌ The assistant needs improvement. Please review the test results and consider adding more comprehensive documentation.</p>'
          }
          
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/assistants/${assistantName}/tests" class="button">View Detailed Results</a>
        </div>
        
        <div class="footer">
          <p>This is an automated notification from your Student Support Assistant system.</p>
          <p>Regular testing helps ensure your assistant provides accurate and helpful responses to students.</p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, subject, html);
  }

  async sendAssistantCreatedNotification(
    email: string,
    userName: string,
    assistantName: string,
    assistantUrl: string
  ): Promise<void> {
    const subject = `Assistant Created: ${assistantName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .content { margin-bottom: 20px; }
          .url-box { background-color: #e9ecef; padding: 15px; border-radius: 5px; font-family: monospace; margin: 15px 0; }
          .footer { font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          .button { background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>🎉 Student Support Assistant Created!</h2>
        </div>
        
        <div class="content">
          <p>Hello ${userName},</p>
          
          <p>Congratulations! Your new Student Support Assistant has been successfully created and is ready to help students.</p>
          
          <ul>
            <li><strong>Assistant Name:</strong> ${assistantName}</li>
            <li><strong>Created:</strong> ${new Date().toLocaleString()}</li>
            <li><strong>Status:</strong> Active</li>
          </ul>
          
          <h3>Student Access URL</h3>
          <p>Students can access your assistant at the following URL:</p>
          <div class="url-box">
            ${assistantUrl}
          </div>
          
          <p>You can share this URL with students through your website, email, or any other communication channels.</p>
          
          <h3>Next Steps</h3>
          <ul>
            <li>Upload your documentation to build the knowledge base</li>
            <li>Test the assistant with common student questions</li>
            <li>Customize the branding and greeting message</li>
            <li>Set up file watching for automatic updates</li>
          </ul>
          
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/assistants/${assistantName}" class="button">Manage Assistant</a>
        </div>
        
        <div class="footer">
          <p>This is an automated notification from your Student Support Assistant system.</p>
          <p>Need help? Check the documentation or contact your system administrator.</p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, subject, html);
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('Email connection test passed');
      return true;
    } catch (error) {
      logger.error('Email connection test failed:', error);
      return false;
    }
  }
}