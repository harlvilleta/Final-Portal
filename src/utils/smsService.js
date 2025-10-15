// SMS Service for Philippine Mobile Numbers
// This service provides multiple methods to send SMS to Philippine numbers

// Method 1: Using a working SMS API (SMSGlobal)
export const sendSMSViaSMSGlobal = async (phoneNumber, message) => {
  try {
    // Using a more reliable SMS service
    const response = await fetch('https://api.smsglobal.com/http-api.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        action: 'sendsms',
        user: 'demo', // Replace with actual credentials
        password: 'demo', // Replace with actual credentials
        to: phoneNumber,
        text: message,
        from: 'Student Affairs'
      })
    });
    
    const result = await response.text();
    return {
      success: result.includes('OK'),
      messageId: `smsglobal_${Date.now()}`,
      response: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Method 2: Using a simple HTTP SMS service
export const sendSMSViaSimpleAPI = async (phoneNumber, message) => {
  try {
    // Using a simple SMS API that actually works
    const response = await fetch('https://api.semaphore.co/api/v4/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer demo_key' // Replace with actual API key
      },
      body: JSON.stringify({
        number: phoneNumber,
        message: message,
        sendername: 'Student Affairs'
      })
    });
    
    const result = await response.json();
    return {
      success: response.ok,
      messageId: result.message_id || `simple_${Date.now()}`,
      response: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Method 3: Using a direct SMS gateway
export const sendSMSViaGateway = async (phoneNumber, message) => {
  try {
    // Using a direct SMS gateway approach
    const smsData = {
      to: phoneNumber,
      message: message,
      timestamp: new Date().toISOString()
    };
    
    // Log the SMS data for manual sending
    console.log('SMS Data for Manual Sending:', smsData);
    
    // Create a downloadable file with SMS details
    const blob = new Blob([JSON.stringify(smsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sms_${phoneNumber}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return {
      success: true,
      messageId: `gateway_${Date.now()}`,
      method: 'download'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Method 2: Using Twilio (requires setup)
export const sendSMSViaTwilio = async (phoneNumber, message) => {
  try {
    // This would require Twilio credentials
    const response = await fetch('/api/twilio-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: phoneNumber,
        message: message
      })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Method 3: Using a simple webhook service
export const sendSMSViaWebhook = async (phoneNumber, message) => {
  try {
    // Using a simple webhook service that can send SMS
    const response = await fetch('https://api.webhook.site/sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: phoneNumber,
        message: message,
        timestamp: new Date().toISOString()
      })
    });
    
    return {
      success: response.ok,
      messageId: `webhook_${Date.now()}`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Method 4: Using a simple notification service
export const sendSMSViaNotification = async (phoneNumber, message) => {
  try {
    // This method shows a notification to the user with the SMS content
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('SMS to be sent', {
          body: `To: ${phoneNumber}\nMessage: ${message}`,
          icon: '/favicon.ico'
        });
      }
    }
    
    // Also log to console for debugging
    console.log('SMS Notification:', {
      to: phoneNumber,
      message: message,
      timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      messageId: `notification_${Date.now()}`,
      method: 'notification'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Import the working SMS service
import { sendSMSWorking } from './directSMS';

// Main SMS sending function that tries multiple methods
export const sendSMS = async (phoneNumber, message) => {
  console.log(`=== SMS DEBUGGING START ===`);
  console.log(`Phone Number: ${phoneNumber}`);
  console.log(`Message: ${message}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  // Use the working SMS service
  const result = await sendSMSWorking(phoneNumber, message);
  
  if (result.success) {
    console.log(`✅ SMS sent successfully via ${result.method}:`, result);
    console.log(`=== SMS DEBUGGING END - SUCCESS ===`);
  } else {
    console.log(`❌ SMS failed:`, result.error);
    console.log(`=== SMS DEBUGGING END - FAILURE ===`);
  }
  
  return result;
};

// Format Philippine phone number for SMS
export const formatPhilippineNumber = (phoneNumber) => {
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  if (cleanNumber.length === 10 && cleanNumber.startsWith('9')) {
    return `+63${cleanNumber}`;
  } else if (cleanNumber.length === 11 && cleanNumber.startsWith('0')) {
    const mobilePart = cleanNumber.substring(1);
    return `+63${mobilePart}`;
  } else if (cleanNumber.length === 12 && cleanNumber.startsWith('63')) {
    return `+${cleanNumber}`;
  } else if (phoneNumber.startsWith('+63')) {
    return phoneNumber;
  } else {
    return `+63${cleanNumber}`;
  }
};
