// SMS Configuration for Real SMS Sending
// Replace these with your actual SMS service credentials

export const SMS_CONFIG = {
  // TextBelt SMS Service (Free tier available)
  TEXTBELT: {
    enabled: true,
    apiKey: 'textbelt', // Replace with your actual TextBelt API key
    endpoint: 'https://api.textbelt.com/text',
    freeTier: true,
    dailyLimit: 1 // Free tier limit
  },

  // SMS Magic Service
  SMS_MAGIC: {
    enabled: true,
    apiKey: 'free_tier_key', // Replace with your actual SMS Magic API key
    endpoint: 'https://api.sms-magic.com/api/v1/sms/send',
    freeTier: true
  },

  // Nexmo/Vonage Service
  NEXMO: {
    enabled: false, // Set to true when you have credentials
    apiKey: 'your_nexmo_api_key',
    apiSecret: 'your_nexmo_api_secret',
    endpoint: 'https://api.nexmo.com/v0.1/messages',
    freeTier: true,
    monthlyLimit: 10 // Free tier limit
  },

  // Twilio Service (Most reliable)
  TWILIO: {
    enabled: false, // Set to true when you have credentials
    accountSid: 'your_twilio_account_sid',
    authToken: 'your_twilio_auth_token',
    phoneNumber: 'your_twilio_phone_number',
    endpoint: 'https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json',
    freeTier: true,
    trialLimit: 100 // Trial account limit
  },

  // Semaphore SMS (Philippines-focused)
  SEMAPHORE: {
    enabled: false, // Set to true when you have credentials
    apiKey: 'your_semaphore_api_key',
    endpoint: 'https://api.semaphore.co/api/v4/messages',
    freeTier: false,
    costPerSMS: 0.50 // PHP per SMS
  }
};

// Instructions for setting up real SMS:
/*
1. TEXTBELT (Recommended for testing):
   - Go to https://textbelt.com/
   - Sign up for free account
   - Get your API key
   - Replace 'textbelt' with your actual key
   - Free tier: 1 SMS per day

2. TWILIO (Recommended for production):
   - Go to https://www.twilio.com/
   - Sign up for free trial
   - Get Account SID and Auth Token
   - Get a phone number
   - Replace the credentials above
   - Free tier: $15 credit (about 100 SMS)

3. SEMAPHORE (Best for Philippines):
   - Go to https://semaphore.co/
   - Sign up for account
   - Get API key
   - Replace the API key above
   - Cost: ~₱0.50 per SMS

4. SMS MAGIC:
   - Go to https://sms-magic.com/
   - Sign up for free account
   - Get API key
   - Replace the API key above

To enable a service:
1. Set enabled: true for the service you want to use
2. Replace the placeholder credentials with real ones
3. The system will automatically use the first enabled service
*/
