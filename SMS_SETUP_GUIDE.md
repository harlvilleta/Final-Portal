# 📱 SMS Setup Guide - Real SMS Functionality

## 🎯 Goal
Set up real SMS functionality so that when an admin sends a message, the phone number owner will actually receive the text on their phone.

## 🚀 Quick Setup (5 minutes)

### Option 1: TextBelt (Recommended for Testing)
1. **Go to**: https://textbelt.com/
2. **Sign up** for a free account
3. **Get your API key** from the dashboard
4. **Open**: `src/config/smsConfig.js`
5. **Replace**: `apiKey: 'textbelt'` with `apiKey: 'your_actual_api_key'`
6. **Test**: Use the "Test SMS" button in your app

**Free Tier**: 1 SMS per day (perfect for testing)

### Option 2: Twilio (Recommended for Production)
1. **Go to**: https://www.twilio.com/
2. **Sign up** for free trial (get $15 credit)
3. **Get credentials**:
   - Account SID
   - Auth Token
   - Phone Number
4. **Open**: `src/config/smsConfig.js`
5. **Update**:
   ```javascript
   TWILIO: {
     enabled: true,
     accountSid: 'your_account_sid',
     authToken: 'your_auth_token',
     phoneNumber: 'your_twilio_phone_number',
     // ... rest stays the same
   }
   ```

**Free Tier**: $15 credit (about 100 SMS messages)

### Option 3: Semaphore (Best for Philippines)
1. **Go to**: https://semaphore.co/
2. **Sign up** for account
3. **Get API key**
4. **Open**: `src/config/smsConfig.js`
5. **Update**:
   ```javascript
   SEMAPHORE: {
     enabled: true,
     apiKey: 'your_semaphore_api_key',
     // ... rest stays the same
   }
   ```

**Cost**: ~₱0.50 per SMS (very affordable)

## 🔧 How It Works

### Current System:
1. **Admin enters phone number** (e.g., "09123456789")
2. **System formats it** to international format ("+639123456789")
3. **Tries multiple SMS services** in order:
   - TextBelt (if enabled)
   - SMS Magic (if enabled)
   - Twilio (if enabled)
   - Semaphore (if enabled)
   - Fallback methods
4. **Sends real SMS** to the phone
5. **Phone owner receives text message**

### SMS Services Priority:
1. **TextBelt** - Free, good for testing
2. **SMS Magic** - Free tier available
3. **Twilio** - Most reliable, free trial
4. **Semaphore** - Philippines-focused
5. **Fallback** - Downloads SMS details for manual sending

## 📱 Testing

### Test SMS Button:
1. **Enter a phone number** in the meeting form
2. **Click "Test SMS"** button
3. **Check your phone** for the message
4. **Check browser console** (F12) for detailed logs

### Meeting Notifications:
1. **Create a meeting** with a student's phone number
2. **System automatically sends SMS** with meeting details
3. **Student receives text** with meeting information

## 🛠️ Configuration

### Enable/Disable Services:
In `src/config/smsConfig.js`, set `enabled: true/false` for each service.

### Add New Service:
1. **Add configuration** in `SMS_CONFIG`
2. **Create method** in `src/utils/directSMS.js`
3. **Add to methods array** in `sendSMSWorking`

## 📊 Monitoring

### Console Logs:
- All SMS attempts are logged to browser console
- Shows which service was used
- Shows success/failure status
- Shows API responses

### Success Indicators:
- ✅ "SMS sent successfully via [Service Name]"
- Phone receives actual text message
- Console shows success response

### Failure Indicators:
- ❌ "SMS failed: [error message]"
- Alert popup with manual instructions
- Downloaded SMS file for manual sending

## 🔒 Security Notes

- **Never commit real API keys** to version control
- **Use environment variables** for production
- **Rotate API keys** regularly
- **Monitor usage** to avoid unexpected charges

## 💡 Tips

1. **Start with TextBelt** for testing (free)
2. **Use Twilio** for production (reliable)
3. **Use Semaphore** for Philippines (local, affordable)
4. **Test with your own phone** first
5. **Check spam folder** if SMS doesn't arrive
6. **Use international format** (+639123456789)

## 🆘 Troubleshooting

### SMS Not Received:
1. **Check phone number format** (should be +639123456789)
2. **Check API key** is correct
3. **Check service limits** (free tiers have limits)
4. **Check console logs** for error messages
5. **Try different service** (enable another one)

### API Errors:
1. **Invalid API key** - Check credentials
2. **Rate limit exceeded** - Wait or upgrade plan
3. **Invalid phone number** - Check format
4. **Service down** - Try different service

## 📞 Support

If you need help:
1. **Check console logs** first
2. **Try different SMS service**
3. **Test with your own phone**
4. **Check service documentation**

---

**Ready to send real SMS messages!** 🎉
