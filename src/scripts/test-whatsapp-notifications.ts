/**
 * Test script for WhatsApp notification functionality
 * This script demonstrates how to send WhatsApp notifications to staff members
 */

import { whatsappService } from '../services/whatsappNotificationService';
import { SafaiKarmi, AssignedWork } from '../types/staff';

// Mock staff data for testing
const mockStaff: SafaiKarmi = {
  id: 'test-staff-001',
  name: 'Rajesh Kumar',
  phone: '+919876543210', // Replace with actual test phone number
  workingArea: 'Park Street, Kolkata',
  status: 'Active',
  joinDate: '2024-01-15',
  lastActive: 'Just now',
  totalCollections: 150,
  rating: 4.8
};

// Mock work assignment data
const mockWork: AssignedWork = {
  detectionId: 'test-detection-001',
  address: 'Park Street, Near Metro Station, Kolkata',
  latitude: 22.5448,
  longitude: 88.3426,
  confidenceScore: 0.85,
  assignedAt: new Date().toISOString(),
  status: 'pending'
};

/**
 * Test work assignment notification
 */
async function testWorkAssignmentNotification() {
  console.log('🧹 Testing Work Assignment Notification\n');
  
  try {
    const success = await whatsappService.sendWorkAssignmentNotification(mockStaff, mockWork);
    
    if (success) {
      console.log('✅ Work assignment notification sent successfully!');
      console.log(`📱 Sent to: ${mockStaff.name} (${mockStaff.phone})`);
      console.log(`📍 Location: ${mockWork.address}`);
    } else {
      console.log('❌ Failed to send work assignment notification');
    }
  } catch (error) {
    console.error('❌ Error sending work assignment notification:', error);
  }
}

/**
 * Test work reminder notification
 */
async function testWorkReminderNotification() {
  console.log('\n⏰ Testing Work Reminder Notification\n');
  
  try {
    const success = await whatsappService.sendWorkReminderNotification(mockStaff, mockWork);
    
    if (success) {
      console.log('✅ Work reminder notification sent successfully!');
      console.log(`📱 Sent to: ${mockStaff.name} (${mockStaff.phone})`);
    } else {
      console.log('❌ Failed to send work reminder notification');
    }
  } catch (error) {
    console.error('❌ Error sending work reminder notification:', error);
  }
}

/**
 * Test work completion notification
 */
async function testWorkCompletionNotification() {
  console.log('\n✅ Testing Work Completion Notification\n');
  
  const completedWork: AssignedWork = {
    ...mockWork,
    status: 'completed'
  };
  
  try {
    const success = await whatsappService.sendWorkCompletionNotification(mockStaff, completedWork);
    
    if (success) {
      console.log('✅ Work completion notification sent successfully!');
      console.log(`📱 Sent to: ${mockStaff.name} (${mockStaff.phone})`);
    } else {
      console.log('❌ Failed to send work completion notification');
    }
  } catch (error) {
    console.error('❌ Error sending work completion notification:', error);
  }
}

/**
 * Test custom message
 */
async function testCustomMessage() {
  console.log('\n💬 Testing Custom Message\n');
  
  const customMessage = `Hello ${mockStaff.name}! 

This is a test message from Safai Sathi system. 

Your current status:
- Total Collections: ${mockStaff.totalCollections}
- Rating: ${mockStaff.rating} ⭐
- Working Area: ${mockStaff.workingArea}

Thank you for your service! 🌟

---
Safai Sathi - Kolkata Municipal Corporation`;

  try {
    const success = await whatsappService.sendCustomMessage(mockStaff.phone, customMessage);
    
    if (success) {
      console.log('✅ Custom message sent successfully!');
      console.log(`📱 Sent to: ${mockStaff.phone}`);
    } else {
      console.log('❌ Failed to send custom message');
    }
  } catch (error) {
    console.error('❌ Error sending custom message:', error);
  }
}

/**
 * Test phone number formatting
 */
function testPhoneNumberFormatting() {
  console.log('\n📞 Testing Phone Number Formatting\n');
  
  const testNumbers = [
    '9876543210',
    '+91 98765 43210',
    '+91-98765-43210',
    '(91) 98765 43210',
    '91-98765-43210'
  ];
  
  testNumbers.forEach(number => {
    const cleaned = number.replace(/[\s\-\(\)]/g, '');
    const formatted = cleaned.startsWith('+91') ? cleaned : `+91${cleaned}`;
    console.log(`Original: ${number} → Formatted: ${formatted}`);
  });
}

/**
 * Display message previews
 */
function displayMessagePreviews() {
  console.log('\n📋 Message Preview\n');
  
  console.log('=== Work Assignment Message ===');
  console.log(whatsappService['formatWorkAssignmentMessage'](mockStaff, mockWork));
  
  console.log('\n=== Work Reminder Message ===');
  console.log(whatsappService['formatWorkReminderMessage'](mockStaff, mockWork));
  
  console.log('\n=== Work Completion Message ===');
  const completedWork = { ...mockWork, status: 'completed' as const };
  console.log(whatsappService['formatWorkCompletionMessage'](mockStaff, completedWork));
}

/**
 * Main test function
 */
async function runWhatsAppTests() {
  console.log('🚀 Starting WhatsApp Notification Tests\n');
  console.log('=====================================\n');
  
  // Check if WhatsApp is configured
  const config = whatsappService['config'];
  if (!config.accessToken || !config.phoneNumberId) {
    console.log('⚠️  WhatsApp not configured. Please set up environment variables:');
    console.log('   - WHATSAPP_ACCESS_TOKEN');
    console.log('   - WHATSAPP_PHONE_NUMBER_ID');
    console.log('   - WHATSAPP_BUSINESS_ACCOUNT_ID');
    console.log('   - WHATSAPP_WEBHOOK_VERIFY_TOKEN');
    console.log('\n📖 See WHATSAPP_SETUP.md for detailed setup instructions.\n');
    return;
  }
  
  // Display message previews
  displayMessagePreviews();
  
  // Test phone number formatting
  testPhoneNumberFormatting();
  
  // Test notifications (uncomment to send actual messages)
  // await testWorkAssignmentNotification();
  // await testWorkReminderNotification();
  // await testWorkCompletionNotification();
  // await testCustomMessage();
  
  console.log('\n✅ WhatsApp notification tests completed!');
  console.log('\n📝 Note: Uncomment the test functions above to send actual WhatsApp messages.');
  console.log('   Make sure to replace the phone number with a valid test number.');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runWhatsAppTests().catch(console.error);
}

export { 
  runWhatsAppTests,
  testWorkAssignmentNotification,
  testWorkReminderNotification,
  testWorkCompletionNotification,
  testCustomMessage
};
