import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/services/whatsappNotificationService';
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
        // In a real implementation, you would fetch staff and work data from database
        // For now, we'll use the provided data
        const staff: SafaiKarmi = body.staffData;
        const work: AssignedWork = body.workData;
        
        if (!staff || !work) {
          return NextResponse.json(
            { error: 'Missing staff or work data' },
            { status: 400 }
          );
        }
        
        success = await whatsappService.sendWorkAssignmentNotification(staff, work);
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
        
        success = await whatsappService.sendWorkReminderNotification(reminderStaff, reminderWork);
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
        
        success = await whatsappService.sendWorkCompletionNotification(completedStaff, completedWork);
        break;

      case 'custom':
        if (!customMessage) {
          return NextResponse.json(
            { error: 'Missing custom message' },
            { status: 400 }
          );
        }
        success = await whatsappService.sendCustomMessage(phoneNumber, customMessage);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        );
    }

    if (success) {
      return NextResponse.json(
        { message: 'Notification sent successfully' },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: 'Failed to send notification' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error sending WhatsApp notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
