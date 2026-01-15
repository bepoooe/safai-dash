import { SafaiKarmi, AssignedWork } from '@/types/staff';
import { WhatsAppWebhookData, IncomingMessage } from '@/types/cloudinary';

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  webhookVerifyToken: string;
}

export interface NotificationMessage {
  to: string;
  type: 'work_assignment' | 'work_reminder' | 'work_completed';
  workData?: AssignedWork;
  staffData?: SafaiKarmi;
  customMessage?: string;
}

export class WhatsAppNotificationService {
  private config: WhatsAppConfig;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  /**
   * Send work assignment notification to staff member
   */
  async sendWorkAssignmentNotification(staff: SafaiKarmi, work: AssignedWork): Promise<boolean> {
    try {
      const message = this.formatWorkAssignmentMessage(staff, work);
      return await this.sendMessage(staff.phone, message);
    } catch (error) {
      console.error('Error sending work assignment notification:', error);
      return false;
    }
  }

  /**
   * Send work reminder notification
   */
  async sendWorkReminderNotification(staff: SafaiKarmi, work: AssignedWork): Promise<boolean> {
    try {
      const message = this.formatWorkReminderMessage(staff, work);
      return await this.sendMessage(staff.phone, message);
    } catch (error) {
      console.error('Error sending work reminder notification:', error);
      return false;
    }
  }

  /**
   * Send work completion confirmation
   */
  async sendWorkCompletionNotification(staff: SafaiKarmi, work: AssignedWork): Promise<boolean> {
    try {
      const message = this.formatWorkCompletionMessage(staff, work);
      return await this.sendMessage(staff.phone, message);
    } catch (error) {
      console.error('Error sending work completion notification:', error);
      return false;
    }
  }

  /**
   * Send custom message
   */
  async sendCustomMessage(phoneNumber: string, message: string): Promise<boolean> {
    try {
      return await this.sendMessage(phoneNumber, message);
    } catch (error) {
      console.error('Error sending custom message:', error);
      return false;
    }
  }

  /**
   * Format work assignment message
   */
  private formatWorkAssignmentMessage(staff: SafaiKarmi, work: AssignedWork): string {
    const workDate = new Date(work.assignedAt).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const workTime = new Date(work.assignedAt).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `🧹 *New Work Assignment - Safai Sathi*

Hello ${staff.name},

You have been assigned a new cleaning task:

📍 *Location:* ${work.address}
🕐 *Assigned on:* ${workDate} at ${workTime}
📊 *Confidence Score:* ${(work.confidenceScore * 100).toFixed(1)}%
🎯 *Status:* Pending

Please proceed to the assigned location and complete the cleaning task. Once completed, update the status through the dashboard.

*Google Maps Link:* https://maps.google.com/?q=${work.latitude},${work.longitude}

Thank you for keeping our city clean! 🌟

---
*Safai Sathi - Kolkata Municipal Corporation*`;
  }

  /**
   * Format work reminder message
   */
  private formatWorkReminderMessage(staff: SafaiKarmi, work: AssignedWork): string {
    const workDate = new Date(work.assignedAt).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `⏰ *Work Reminder - Safai Sathi*

Hello ${staff.name},

This is a reminder about your pending cleaning task:

📍 *Location:* ${work.address}
📅 *Assigned on:* ${workDate}
🎯 *Status:* ${work.status === 'pending' ? 'Pending' : 'In Progress'}

Please complete this task at your earliest convenience. If you have already completed it, please update the status through the dashboard.

*Google Maps Link:* https://maps.google.com/?q=${work.latitude},${work.longitude}

Thank you! 🌟

---
*Safai Sathi - Kolkata Municipal Corporation*`;
  }

  /**
   * Format work completion message
   */
  private formatWorkCompletionMessage(staff: SafaiKarmi, work: AssignedWork): string {
    return `✅ *Work Completed - Safai Sathi*

Hello ${staff.name},

Great job! Your cleaning task has been marked as completed:

📍 *Location:* ${work.address}
✅ *Status:* Completed

Thank you for your excellent work in keeping our city clean! Your efforts are greatly appreciated.

Keep up the great work! 🌟

---
*Safai Sathi - Kolkata Municipal Corporation*`;
  }

  /**
   * Send message via WhatsApp Business API
   */
  private async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    try {
      // Clean phone number (remove spaces, dashes, etc.)
      const cleanPhoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
      
      // Ensure phone number has country code
      const formattedPhoneNumber = cleanPhoneNumber.startsWith('+91') 
        ? cleanPhoneNumber 
        : `+91${cleanPhoneNumber}`;

      const url = `${this.baseUrl}/${this.config.phoneNumberId}/messages`;
      
      const payload = {
        messaging_product: 'whatsapp',
        to: formattedPhoneNumber,
        type: 'text',
        text: {
          body: message
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('WhatsApp API Error:', errorData);
        return false;
      }

      const result = await response.json();
      console.log('WhatsApp message sent successfully:', result);
      return true;

    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  /**
   * Verify webhook (for receiving messages)
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.config.webhookVerifyToken) {
      return challenge;
    }
    return null;
  }

  /**
   * Process incoming webhook messages
   */
  async processIncomingMessage(webhookData: WhatsAppWebhookData): Promise<void> {
    try {
      const entry = webhookData.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (value?.messages) {
        for (const message of value.messages) {
          await this.handleIncomingMessage(message);
        }
      }
    } catch (error) {
      console.error('Error processing incoming message:', error);
    }
  }

  /**
   * Handle incoming message from staff
   */
  private async handleIncomingMessage(message: IncomingMessage): Promise<void> {
    try {
      const phoneNumber = message.from;
      const messageText = message.text?.body || '';
      
      console.log(`Received message from ${phoneNumber}: ${messageText}`);
      
      // Here you can implement logic to handle different types of messages
      // For example, status updates, location sharing, etc.
      
    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  }
}

// Default configuration (should be moved to environment variables)
export const defaultWhatsAppConfig: WhatsAppConfig = {
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'safai_sathi_verify_token'
};

// Create default service instance
export const whatsappService = new WhatsAppNotificationService(defaultWhatsAppConfig);
