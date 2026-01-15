# WhatsApp Integration Setup Guide

This guide explains how to set up WhatsApp notifications for staff work assignments in the Safai Sathi dashboard.

## Prerequisites

1. **WhatsApp Business Account**: You need a WhatsApp Business Account
2. **Meta Developer Account**: Create an account at [developers.facebook.com](https://developers.facebook.com)
3. **WhatsApp Business API**: Set up the WhatsApp Business API through Meta

## Setup Steps

### 1. Create WhatsApp Business App

1. Go to [Meta for Developers](https://developers.facebook.com)
2. Create a new app and select "Business" as the app type
3. Add WhatsApp product to your app
4. Complete the business verification process

### 2. Get Required Credentials

You'll need the following credentials from your WhatsApp Business API setup:

- **Access Token**: Your WhatsApp Business API access token
- **Phone Number ID**: The ID of your WhatsApp Business phone number
- **Business Account ID**: Your WhatsApp Business Account ID
- **Webhook Verify Token**: A custom token for webhook verification

### 3. Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# WhatsApp Business API Configuration
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=safai_sathi_verify_token
```

### 4. Webhook Configuration

1. Set up a webhook URL: `https://your-domain.com/api/whatsapp/webhook`
2. Use the verify token: `safai_sathi_verify_token`
3. Subscribe to `messages` events

### 5. Phone Number Format

Ensure staff phone numbers are stored in the correct format:
- Include country code (e.g., +91 for India)
- Remove spaces, dashes, and parentheses
- Example: `+919876543210`

## Features

### Automatic Notifications

The system automatically sends WhatsApp notifications when:

1. **Work Assignment**: When a staff member is assigned new work
2. **Work Completion**: When work is marked as completed
3. **Status Updates**: When work status changes

### Message Types

#### Work Assignment Message
```
🧹 New Work Assignment - Safai Sathi

Hello [Staff Name],

You have been assigned a new cleaning task:

📍 Location: [Address]
🕐 Assigned on: [Date] at [Time]
📊 Confidence Score: [Score]%
🎯 Status: Pending

Please proceed to the assigned location and complete the cleaning task.

Google Maps Link: [Location Link]

Thank you for keeping our city clean! 🌟
```

#### Work Completion Message
```
✅ Work Completed - Safai Sathi

Hello [Staff Name],

Great job! Your cleaning task has been marked as completed:

📍 Location: [Address]
✅ Status: Completed

Thank you for your excellent work in keeping our city clean!

Keep up the great work! 🌟
```

## API Endpoints

### Send Notification
```
POST /api/whatsapp/send
```

**Request Body:**
```json
{
  "type": "work_assignment" | "work_reminder" | "work_completed" | "custom",
  "phoneNumber": "+919876543210",
  "staffId": "staff_id",
  "workId": "work_id",
  "customMessage": "Custom message text"
}
```

### Webhook (for receiving messages)
```
GET/POST /api/whatsapp/webhook
```

## Testing

### Test Notification
You can test the WhatsApp integration by:

1. Using the API endpoint to send a test message
2. Assigning work to a staff member through the dashboard
3. Updating work status to completed

### Test Webhook
1. Use the webhook URL with the verify token
2. Send test messages to your WhatsApp Business number
3. Check the console logs for incoming message processing

## Troubleshooting

### Common Issues

1. **Invalid Phone Number Format**
   - Ensure phone numbers include country code
   - Remove special characters

2. **Access Token Issues**
   - Verify the access token is valid and not expired
   - Check if the token has the required permissions

3. **Webhook Verification Failed**
   - Ensure the verify token matches in both places
   - Check the webhook URL is accessible

4. **Message Not Delivered**
   - Verify the phone number is registered on WhatsApp
   - Check if the recipient has blocked your business number

### Debug Mode

Enable debug logging by checking the browser console and server logs for detailed error messages.

## Security Considerations

1. **Environment Variables**: Never commit sensitive credentials to version control
2. **Webhook Security**: Implement proper authentication for webhook endpoints
3. **Rate Limiting**: Be aware of WhatsApp API rate limits
4. **Data Privacy**: Ensure compliance with data protection regulations

## Support

For issues related to:
- **WhatsApp Business API**: Contact Meta Developer Support
- **Safai Sathi Integration**: Check the application logs and error messages
