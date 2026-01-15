import { SafaiKarmi, AssignedWork } from '@/types/staff';

export interface SimpleWhatsAppConfig {
  enabled: boolean;
  openInNewTab: boolean;
  fallbackToSMS: boolean;
}

export interface NotificationMessage {
  to: string;
  type: 'work_assignment' | 'work_reminder' | 'work_completed';
  workData?: AssignedWork;
  staffData?: SafaiKarmi;
  customMessage?: string;
}

export class SimpleWhatsAppService {
  private config: SimpleWhatsAppConfig;

  constructor(config: SimpleWhatsAppConfig = { enabled: true, openInNewTab: true, fallbackToSMS: true }) {
    this.config = config;
  }

  /**
   * Send work assignment notification via WhatsApp Web
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
   * Send work reminder notification via WhatsApp Web
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
   * Send work completion notification via WhatsApp Web
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
   * Send custom message via WhatsApp Web
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
   * Send message via WhatsApp Web
   */
  private async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    try {
      if (!this.config.enabled) {
        console.log('WhatsApp notifications are disabled');
        return false;
      }

      // Clean and format phone number
      const cleanPhoneNumber = this.formatPhoneNumber(phoneNumber);
      
      // Create WhatsApp Web URL with pre-filled message
      const whatsappUrl = `https://web.whatsapp.com/send?phone=${cleanPhoneNumber}&text=${encodeURIComponent(message)}`;
      
      // Open WhatsApp Web
      if (typeof window !== 'undefined') {
        if (this.config.openInNewTab) {
          window.open(whatsappUrl, '_blank');
        } else {
          window.location.href = whatsappUrl;
        }
        
        console.log(`📱 WhatsApp message prepared for ${cleanPhoneNumber}`);
        console.log(`💬 Message: ${message.substring(0, 100)}...`);
        
        return true;
      } else {
        // Server-side fallback - just log the message
        console.log('📱 WhatsApp Message (Server-side):');
        console.log(`To: ${cleanPhoneNumber}`);
        console.log(`Message: ${message}`);
        return true;
      }
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  /**
   * Format phone number for WhatsApp
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add country code if not present
    if (cleaned.startsWith('91')) {
      return cleaned;
    } else if (cleaned.length === 10) {
      return `91${cleaned}`;
    } else {
      return cleaned;
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
   * Generate SMS fallback message
   */
  generateSMSMessage(staff: SafaiKarmi, work: AssignedWork): string {
    return `Safai Sathi: New work assigned to ${staff.name}. Location: ${work.address}. Please check dashboard for details.`;
  }

  /**
   * Copy message to clipboard (browser only)
   */
  async copyMessageToClipboard(message: string): Promise<boolean> {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(message);
        console.log('📋 Message copied to clipboard');
        return true;
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * Show notification with message preview
   */
  showNotificationPreview(staff: SafaiKarmi, work: AssignedWork, message: string): void {
    if (typeof window !== 'undefined') {
      // Create a simple notification
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #25D366;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 400px;
        font-family: Arial, sans-serif;
      `;
      
      notification.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px;">📱 WhatsApp Message Ready</div>
        <div style="font-size: 14px; margin-bottom: 8px;">To: ${staff.name} (${staff.phone})</div>
        <div style="font-size: 12px; opacity: 0.9; max-height: 100px; overflow-y: auto;">${message.substring(0, 200)}...</div>
        <div style="margin-top: 10px; font-size: 12px; opacity: 0.8;">Click to open WhatsApp Web</div>
      `;
      
      notification.onclick = () => {
        const cleanPhoneNumber = this.formatPhoneNumber(staff.phone);
        const whatsappUrl = `https://web.whatsapp.com/send?phone=${cleanPhoneNumber}&text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        document.body.removeChild(notification);
      };
      
      document.body.appendChild(notification);
      
      // Auto-remove after 10 seconds
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 10000);
    }
  }
}

// Create default service instance
export const simpleWhatsAppService = new SimpleWhatsAppService();
