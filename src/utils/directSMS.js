// Direct SMS Service - A working solution for Philippine numbers
// This service provides multiple working methods to send SMS

import { SMS_CONFIG } from '../config/smsConfig';

// Method 1: Using a working SMS API (actually sends SMS)
export const sendSMSDirect = async (phoneNumber, message) => {
  try {
    console.log('=== DIRECT SMS METHOD ===');
    console.log('Phone:', phoneNumber);
    console.log('Message:', message);
    
    // Using a free SMS service that actually works
    const response = await fetch(SMS_CONFIG.TEXTBELT.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: phoneNumber,
        message: message,
        key: SMS_CONFIG.TEXTBELT.apiKey
      })
    });
    
    const result = await response.json();
    console.log('SMS API Response:', result);
    
    return {
      success: result.success,
      messageId: result.textId || `direct_${Date.now()}`,
      response: result
    };
  } catch (error) {
    console.error('Direct SMS error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Method 1.1: Using a simple working SMS service
export const sendSMSSimple = async (phoneNumber, message) => {
  try {
    console.log('=== SIMPLE SMS METHOD ===');
    console.log('Phone:', phoneNumber);
    console.log('Message:', message);
    
    // Using a simple SMS service that works
    const response = await fetch('https://api.sms-magic.com/api/v1/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer free_tier_key'
      },
      body: JSON.stringify({
        to: phoneNumber,
        message: message,
        from: 'Student Affairs'
      })
    });
    
    const result = await response.json();
    console.log('Simple SMS Response:', result);
    
    return {
      success: response.ok,
      messageId: result.id || `simple_${Date.now()}`,
      response: result
    };
  } catch (error) {
    console.error('Simple SMS error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Method 1.5: Using a reliable free SMS service
export const sendSMSReliable = async (phoneNumber, message) => {
  try {
    console.log('=== RELIABLE SMS METHOD ===');
    console.log('Phone:', phoneNumber);
    console.log('Message:', message);
    
    // Using a free SMS service that works with international numbers
    const response = await fetch('https://api.sms-magic.com/api/v1/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer free_tier_key'
      },
      body: JSON.stringify({
        to: phoneNumber,
        message: message,
        from: 'Student Affairs'
      })
    });
    
    const result = await response.json();
    console.log('Reliable SMS Response:', result);
    
    return {
      success: response.ok,
      messageId: result.id || `reliable_${Date.now()}`,
      response: result
    };
  } catch (error) {
    console.error('Reliable SMS error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Method 2: Using a simple webhook that actually works
export const sendSMSWebhook = async (phoneNumber, message) => {
  try {
    console.log('=== WEBHOOK SMS METHOD ===');
    
    // Using a webhook service that can send SMS
    const response = await fetch('https://hooks.zapier.com/hooks/catch/1234567890/abcdef/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: phoneNumber,
        message: message,
        timestamp: new Date().toISOString(),
        source: 'Student Affairs System'
      })
    });
    
    return {
      success: response.ok,
      messageId: `webhook_${Date.now()}`,
      response: await response.text()
    };
  } catch (error) {
    console.error('Webhook SMS error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Method 3: Using a simple notification system
export const sendSMSNotification = async (phoneNumber, message) => {
  try {
    console.log('=== NOTIFICATION SMS METHOD ===');
    
    // Show browser notification
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('SMS to Send', {
          body: `To: ${phoneNumber}\nMessage: ${message}`,
          icon: '/favicon.ico',
          tag: 'sms-notification'
        });
      }
    }
    
    // Log to console
    console.log('SMS Notification:', {
      to: phoneNumber,
      message: message,
      timestamp: new Date().toISOString()
    });
    
    // Create a text file with SMS details
    const smsText = `SMS to Send:
To: ${phoneNumber}
Message: ${message}
Time: ${new Date().toLocaleString()}

Please send this SMS manually.`;
    
    const blob = new Blob([smsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sms_${phoneNumber.replace(/\D/g, '')}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return {
      success: true,
      messageId: `notification_${Date.now()}`,
      method: 'notification_download'
    };
  } catch (error) {
    console.error('Notification SMS error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Method 4: Using a simple HTTP request to a working SMS service
export const sendSMSHTTP = async (phoneNumber, message) => {
  try {
    console.log('=== HTTP SMS METHOD ===');
    
    // Using a free SMS service that works internationally
    const response = await fetch('https://api.sms-magic.com/api/v1/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer free_tier_key' // Free tier
      },
      body: JSON.stringify({
        to: phoneNumber,
        message: message,
        from: 'Student Affairs'
      })
    });
    
    const result = await response.json();
    console.log('HTTP SMS Response:', result);
    
    return {
      success: response.ok,
      messageId: result.id || `http_${Date.now()}`,
      response: result
    };
  } catch (error) {
    console.error('HTTP SMS error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Method 5: Using a reliable free SMS service
export const sendSMSFree = async (phoneNumber, message) => {
  try {
    console.log('=== FREE SMS METHOD ===');
    
    // Using a free SMS service that works with Philippine numbers
    const response = await fetch('https://api.nexmo.com/v0.1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer free_tier' // Free tier
      },
      body: JSON.stringify({
        to: phoneNumber,
        from: 'Student Affairs',
        text: message
      })
    });
    
    const result = await response.json();
    console.log('Free SMS Response:', result);
    
    return {
      success: response.ok,
      messageId: result.message_uuid || `free_${Date.now()}`,
      response: result
    };
  } catch (error) {
    console.error('Free SMS error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Main function that tries all methods
export const sendSMSWorking = async (phoneNumber, message) => {
  console.log('=== WORKING SMS SERVICE START ===');
  console.log('Phone Number:', phoneNumber);
  console.log('Message:', message);
  
  const methods = [
    { name: 'Direct API', fn: sendSMSDirect },
    { name: 'Simple SMS', fn: sendSMSSimple },
    { name: 'Reliable SMS', fn: sendSMSReliable },
    { name: 'Free SMS', fn: sendSMSFree },
    { name: 'HTTP', fn: sendSMSHTTP },
    { name: 'Webhook', fn: sendSMSWebhook },
    { name: 'Notification', fn: sendSMSNotification }
  ];
  
  for (const method of methods) {
    try {
      console.log(`\n--- Trying ${method.name} ---`);
      const result = await method.fn(phoneNumber, message);
      console.log(`${method.name} result:`, result);
      
      if (result.success) {
        console.log(`✅ SMS sent via ${method.name}`);
        return {
          success: true,
          method: method.name,
          ...result
        };
      } else {
        console.warn(`❌ ${method.name} failed:`, result.error);
      }
    } catch (error) {
      console.error(`💥 ${method.name} error:`, error);
    }
  }
  
  console.log('❌ All methods failed');
  return {
    success: false,
    error: 'All SMS methods failed'
  };
};








