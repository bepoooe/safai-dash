/**
 * Test script for Simple WhatsApp notification functionality
 * This script demonstrates how to send WhatsApp notifications without API tokens
 */

import { simpleWhatsAppService } from '../services/simpleWhatsAppService';
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
    const success = await simpleWhatsAppService.sendWorkAssignmentNotification(mockStaff, mockWork);
    
    if (success) {
      console.log('✅ Work assignment notification prepared successfully!');
      console.log(`📱 Will open WhatsApp Web for: ${mockStaff.name} (${mockStaff.phone})`);
      console.log(`📍 Location: ${mockWork.address}`);
      console.log('💡 Note: This will open WhatsApp Web in your browser with the pre-filled message.');
    } else {
      console.log('❌ Failed to prepare work assignment notification');
    }
  } catch (error) {
    console.error('❌ Error preparing work assignment notification:', error);
  }
}

/**
 * Test work reminder notification
 */
async function testWorkReminderNotification() {
  console.log('\n⏰ Testing Work Reminder Notification\n');
  
  try {
    const success = await simpleWhatsAppService.sendWorkReminderNotification(mockStaff, mockWork);
    
    if (success) {
      console.log('✅ Work reminder notification prepared successfully!');
      console.log(`📱 Will open WhatsApp Web for: ${mockStaff.name} (${mockStaff.phone})`);
    } else {
      console.log('❌ Failed to prepare work reminder notification');
    }
  } catch (error) {
    console.error('❌ Error preparing work reminder notification:', error);
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
    const success = await simpleWhatsAppService.sendWorkCompletionNotification(mockStaff, completedWork);
    
    if (success) {
      console.log('✅ Work completion notification prepared successfully!');
      console.log(`📱 Will open WhatsApp Web for: ${mockStaff.name} (${mockStaff.phone})`);
    } else {
      console.log('❌ Failed to prepare work completion notification');
    }
  } catch (error) {
    console.error('❌ Error preparing work completion notification:', error);
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
    const success = await simpleWhatsAppService.sendCustomMessage(mockStaff.phone, customMessage);
    
    if (success) {
      console.log('✅ Custom message prepared successfully!');
      console.log(`📱 Will open WhatsApp Web for: ${mockStaff.phone}`);
    } else {
      console.log('❌ Failed to prepare custom message');
    }
  } catch (error) {
    console.error('❌ Error preparing custom message:', error);
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
    '91-98765-43210',
    '+919876543210'
  ];
  
  testNumbers.forEach(number => {
    const formatted = simpleWhatsAppService['formatPhoneNumber'](number);
    console.log(`Original: ${number} → Formatted: ${formatted}`);
  });
}

/**
 * Display message previews
 */
function displayMessagePreviews() {
  console.log('\n📋 Message Preview\n');
  
  console.log('=== Work Assignment Message ===');
  const assignmentMessage = simpleWhatsAppService['formatWorkAssignmentMessage'](mockStaff, mockWork);
  console.log(assignmentMessage);
  
  console.log('\n=== Work Reminder Message ===');
  const reminderMessage = simpleWhatsAppService['formatWorkReminderMessage'](mockStaff, mockWork);
  console.log(reminderMessage);
  
  console.log('\n=== Work Completion Message ===');
  const completedWork = { ...mockWork, status: 'completed' as const };
  const completionMessage = simpleWhatsAppService['formatWorkCompletionMessage'](mockStaff, completedWork);
  console.log(completionMessage);
}

/**
 * Test SMS fallback
 */
function testSMSFallback() {
  console.log('\n📱 Testing SMS Fallback Message\n');
  
  const smsMessage = simpleWhatsAppService.generateSMSMessage(mockStaff, mockWork);
  console.log('SMS Message:');
  console.log(smsMessage);
}

/**
 * Test clipboard functionality (browser only)
 */
async function testClipboardFunctionality() {
  console.log('\n📋 Testing Clipboard Functionality\n');
  
  if (typeof window !== 'undefined') {
    const message = simpleWhatsAppService['formatWorkAssignmentMessage'](mockStaff, mockWork);
    const success = await simpleWhatsAppService.copyMessageToClipboard(message);
    
    if (success) {
      console.log('✅ Message copied to clipboard successfully!');
    } else {
      console.log('❌ Failed to copy message to clipboard');
    }
  } else {
    console.log('ℹ️ Clipboard functionality only available in browser environment');
  }
}

/**
 * Main test function
 */
async function runSimpleWhatsAppTests() {
  console.log('🚀 Starting Simple WhatsApp Notification Tests\n');
  console.log('=============================================\n');
  
  // Display message previews
  displayMessagePreviews();
  
  // Test phone number formatting
  testPhoneNumberFormatting();
  
  // Test SMS fallback
  testSMSFallback();
  
  // Test clipboard functionality
  await testClipboardFunctionality();
  
  // Test notifications (uncomment to open WhatsApp Web)
  console.log('\n🔗 Testing WhatsApp Web Integration\n');
  console.log('Note: Uncomment the test functions below to open WhatsApp Web with pre-filled messages.\n');
  
  // Uncomment these lines to test actual WhatsApp Web integration
  // await testWorkAssignmentNotification();
  // await testWorkReminderNotification();
  // await testWorkCompletionNotification();
  // await testCustomMessage();
  
  console.log('✅ Simple WhatsApp notification tests completed!');
  console.log('\n📝 Features:');
  console.log('   ✓ No API tokens required');
  console.log('   ✓ Opens WhatsApp Web with pre-filled messages');
  console.log('   ✓ Works in both browser and server environments');
  console.log('   ✓ Phone number formatting and validation');
  console.log('   ✓ SMS fallback messages');
  console.log('   ✓ Clipboard integration (browser only)');
  console.log('   ✓ Notification previews');
  
  console.log('\n💡 Usage:');
  console.log('   1. Uncomment the test functions above');
  console.log('   2. Replace the phone number with a valid test number');
  console.log('   3. Run the script to open WhatsApp Web with pre-filled messages');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runSimpleWhatsAppTests().catch(console.error);
}

export { 
  runSimpleWhatsAppTests,
  testWorkAssignmentNotification,
  testWorkReminderNotification,
  testWorkCompletionNotification,
  testCustomMessage
};
