'use client';

import { useState } from 'react';
import { MessageSquare, Copy, ExternalLink, CheckCircle } from 'lucide-react';
import { simpleWhatsAppService } from '@/services/simpleWhatsAppService';
import { SafaiKarmi, AssignedWork } from '@/types/staff';

interface WhatsAppNotificationButtonProps {
  staff: SafaiKarmi;
  work?: AssignedWork;
  type: 'work_assignment' | 'work_reminder' | 'work_completed' | 'custom';
  customMessage?: string;
  className?: string;
  showPreview?: boolean;
}

export default function WhatsAppNotificationButton({
  staff,
  work,
  type,
  customMessage,
  className = '',
  showPreview = true
}: WhatsAppNotificationButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [messageCopied, setMessageCopied] = useState(false);
  const [showMessagePreview, setShowMessagePreview] = useState(false);

  const handleSendMessage = async () => {
    setIsLoading(true);
    
    try {
      let success = false;
      
      switch (type) {
        case 'work_assignment':
          if (work) {
            success = await simpleWhatsAppService.sendWorkAssignmentNotification(staff, work);
          }
          break;
        case 'work_reminder':
          if (work) {
            success = await simpleWhatsAppService.sendWorkReminderNotification(staff, work);
          }
          break;
        case 'work_completed':
          if (work) {
            success = await simpleWhatsAppService.sendWorkCompletionNotification(staff, work);
          }
          break;
        case 'custom':
          if (customMessage) {
            success = await simpleWhatsAppService.sendCustomMessage(staff.phone, customMessage);
          }
          break;
      }
      
      if (success) {
        // Show notification preview if enabled
        if (showPreview && work) {
          const message = getMessagePreview();
          if (message) {
            simpleWhatsAppService.showNotificationPreview(staff, work, message);
          }
        }
      }
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMessagePreview = (): string | null => {
    if (!work) return null;
    
    switch (type) {
      case 'work_assignment':
        return simpleWhatsAppService['formatWorkAssignmentMessage'](staff, work);
      case 'work_reminder':
        return simpleWhatsAppService['formatWorkReminderMessage'](staff, work);
      case 'work_completed':
        return simpleWhatsAppService['formatWorkCompletionMessage'](staff, work);
      case 'custom':
        return customMessage || null;
      default:
        return null;
    }
  };

  const handleCopyMessage = async () => {
    const message = getMessagePreview();
    if (message) {
      const success = await simpleWhatsAppService.copyMessageToClipboard(message);
      if (success) {
        setMessageCopied(true);
        setTimeout(() => setMessageCopied(false), 2000);
      }
    }
  };

  const getButtonText = () => {
    switch (type) {
      case 'work_assignment':
        return 'Send Assignment';
      case 'work_reminder':
        return 'Send Reminder';
      case 'work_completed':
        return 'Send Completion';
      case 'custom':
        return 'Send Message';
      default:
        return 'Send WhatsApp';
    }
  };

  const getButtonIcon = () => {
    if (isLoading) {
      return <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />;
    }
    return <MessageSquare className="h-4 w-4" />;
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleSendMessage}
        disabled={isLoading || (!work && type !== 'custom') || (type === 'custom' && !customMessage)}
        className={`
          inline-flex items-center px-3 py-2 text-sm font-medium rounded-md
          bg-green-600 hover:bg-green-700 text-white
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors duration-200
          ${className}
        `}
      >
        {getButtonIcon()}
        <span className="ml-2">{getButtonText()}</span>
      </button>

      {getMessagePreview() && (
        <div className="flex items-center space-x-1">
          <button
            onClick={handleCopyMessage}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            title="Copy message to clipboard"
          >
            {messageCopied ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
          
          <button
            onClick={() => setShowMessagePreview(!showMessagePreview)}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            title="Preview message"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      )}

      {showMessagePreview && getMessagePreview() && (
        <div className="absolute z-10 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <h4 className="text-sm font-medium text-gray-900">Message Preview</h4>
            <button
              onClick={() => setShowMessagePreview(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <div className="text-xs text-gray-600 max-h-48 overflow-y-auto whitespace-pre-wrap">
            {getMessagePreview()}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            To: {staff.name} ({staff.phone})
          </div>
        </div>
      )}
    </div>
  );
}
