import { NextRequest, NextResponse } from 'next/server';
import { simpleWhatsAppService } from '@/services/simpleWhatsAppService';
import { SafaiKarmi, AssignedWork } from '@/types/staff';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, staffId, workId, phoneNumber, customMessage } = body;

    // Validate required fields
    if (!type || !phoneNumber) {
      return NextResponse.json(
        { error: 'Missing required fields: type and phoneNumber' },
        { status: 400 }
      );
    }

    let success = false;

    switch (type) {
      case 'work_assignment':
        if (!staffId || !workId) {
          return NextResponse.json(
            { error: 'Missing required fields for work assignment: staffId and workId' },
            { status: 400 }
          );
        }
        
        const staff: SafaiKarmi = body.staffData;
        const work: AssignedWork = body.workData;
        
        if (!staff || !work) {
          return NextResponse.json(
            { error: 'Missing staff or work data' },
            { status: 400 }
          );
        }
        
        success = await simpleWhatsAppService.sendWorkAssignmentNotification(staff, work);
        break;

      case 'work_reminder':
        if (!staffId || !workId) {
          return NextResponse.json(
            { error: 'Missing required fields for work reminder: staffId and workId' },
            { status: 400 }
          );
        }
        const reminderStaff: SafaiKarmi = body.staffData;
        const reminderWork: AssignedWork = body.workData;
        
        if (!reminderStaff || !reminderWork) {
          return NextResponse.json(
            { error: 'Missing staff or work data' },
            { status: 400 }
          );
        }
        
        success = await simpleWhatsAppService.sendWorkReminderNotification(reminderStaff, reminderWork);
        break;

      case 'work_completed':
        if (!staffId || !workId) {
          return NextResponse.json(
            { error: 'Missing required fields for work completion: staffId and workId' },
            { status: 400 }
          );
        }
        const completedStaff: SafaiKarmi = body.staffData;
        const completedWork: AssignedWork = body.workData;
        
        if (!completedStaff || !completedWork) {
          return NextResponse.json(
            { error: 'Missing staff or work data' },
            { status: 400 }
          );
        }
        
        success = await simpleWhatsAppService.sendWorkCompletionNotification(completedStaff, completedWork);
        break;

      case 'custom':
        if (!customMessage) {
          return NextResponse.json(
            { error: 'Missing custom message' },
            { status: 400 }
          );
        }
        success = await simpleWhatsAppService.sendCustomMessage(phoneNumber, customMessage);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        );
    }

    if (success) {
      return NextResponse.json(
        { 
          message: 'WhatsApp message prepared successfully',
          note: 'Message will open in WhatsApp Web. No API tokens required.'
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: 'Failed to prepare WhatsApp message' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error preparing WhatsApp message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Simple WhatsApp Service - No API tokens required',
    features: [
      'Opens WhatsApp Web with pre-filled messages',
      'Works without WhatsApp Business API',
      'Supports work assignments, reminders, and completion notifications',
      'Shows notification previews in the browser',
      'Fallback to SMS format available'
    ],
    usage: 'Send POST request with type, phoneNumber, and relevant data'
  });
}
