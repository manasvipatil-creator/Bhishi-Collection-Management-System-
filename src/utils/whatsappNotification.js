/**
 * WhatsApp Notification Utility
 * Sends transaction notifications via WhatsApp webhook API
 */

const WEBHOOK_BASE_URL = 'https://webhook.whatapi.in/webhook/69213b981b9845c02d533ccb';

/**
 * Helper: Format Indian phone number
 */
const formatPhoneNumber = (phone) => {
  const cleanPhone = String(phone).replace(/\D/g, '');
  return cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
};

/**
 * Helper: Send WhatsApp Message
 */
const sendWhatsAppMessage = async (phone, messageParams) => {
  try {
    console.log('=== Starting WhatsApp Message Send ===');
    console.log('Phone:', phone);
    console.log('Message Params:', messageParams);
    
    // Validate phone number
    if (!phone || phone.length < 10) {
      throw new Error(`Invalid phone number: ${phone}`);
    }
    
    // Join parameters with commas and encode for URL
    const message = messageParams.join(',');
    console.log('Raw message string:', message);
    
    const encodedMessage = encodeURIComponent(message);
    console.log('Encoded message:', encodedMessage);
    
    const webhookUrl = `${WEBHOOK_BASE_URL}?number=${phone}&message=${encodedMessage}`;
    console.log('Final Webhook URL:', webhookUrl);

    // Add timeout to the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    console.log('Sending request to webhook...');
    const startTime = Date.now();
    
    const response = await fetch(webhookUrl, { 
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));

    const responseTime = Date.now() - startTime;
    console.log(`Response received in ${responseTime}ms`);
    console.log('Response status:', response.status, response.statusText);
    
    // Get response text first, then try to parse as JSON
    const responseText = await response.text();
    console.log('Raw response text:', responseText);
    
    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      console.warn('Response is not valid JSON, using as text');
      responseData = { rawResponse: responseText };
    }
    
    console.log('Parsed response:', responseData);
    
    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}: ${response.statusText}`);
    }
    
    return {
      success: true,
      status: response.status,
      ...responseData
    };
    
  } catch (error) {
    const errorMsg = `WhatsApp Send Error: ${error.message}`;
    console.error(errorMsg, { 
      error: error.toString(),
      stack: error.stack,
      phone,
      messageParams
    });
    
    // Return error information instead of throwing
    return {
      success: false,
      error: errorMsg,
      details: error.toString()
    };
  }
};

/**
 * Deposit Notification
 */
export const sendDepositNotification = async (data) => {
  try {
    console.log('=== sendDepositNotification called with data ===');
    console.log(JSON.stringify(data, null, 2));

    const {
      customerPhone,
      customerName,
      amount,
      accountNumber,
      totalAmount,
      agentName
    } = data;

    // Validate required fields
    if (!customerPhone) {
      const errorMsg = 'Customer phone number is required';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    if (amount === undefined || amount === null) {
      const errorMsg = 'Amount is required';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Format values
    const phone = formatPhoneNumber(customerPhone);
    const formattedAmount = Number(amount).toFixed(2);
    const formattedTotal = Number(totalAmount || amount).toFixed(2);
    
    // Create message parameters array for the webhook
    const messageParams = [
      'bhishi',
      customerName || 'Customer',
      formattedAmount,
      'deposit',
      accountNumber || 'N/A',
      formattedTotal,
      agentName || 'Agent'
    ];

    console.log('Sending deposit notification with parameters:');
    console.log(messageParams);

    const result = await sendWhatsAppMessage(phone, messageParams);
    console.log('Notification sent successfully:', result);

    return { 
      success: true, 
      message: 'Deposit notification sent',
      data: result 
    };
  } catch (error) {
    const errorMsg = `Deposit Notification Error: ${error.message}`;
    console.error(errorMsg, error);
    return { 
      success: false, 
      message: errorMsg,
      error: error 
    };
  }
};

/**
 * Withdrawal Notification
 */
export const sendWithdrawalNotification = async (data) => {
  try {
    console.log('=== sendWithdrawalNotification called with data ===');
    console.log(JSON.stringify(data, null, 2));

    const {
      customerPhone,
      customerName,
      amount,
      accountNumber,
      totalAmount,
      agentName
    } = data;

    // Validate required fields
    if (!customerPhone) {
      const errorMsg = 'Customer phone number is required';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    if (amount === undefined || amount === null) {
      const errorMsg = 'Amount is required';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Format values
    const phone = formatPhoneNumber(customerPhone);
    const formattedAmount = Number(amount).toFixed(2);
    const formattedTotal = Number(totalAmount || 0).toFixed(2);
    
    console.log('Withdrawal Details:', {
      amount: formattedAmount,
      totalAfterWithdrawal: formattedTotal,
      accountNumber,
      customerName
    });
    
    // Create message parameters array for the webhook
    const messageParams = [
      'bhishi',
      customerName || 'Customer',
      formattedAmount,
      'withdraw',
      accountNumber || 'N/A',
      formattedTotal, // Show total after withdrawal
      agentName || 'Agent'
    ];

    console.log('Sending withdrawal notification with parameters:');
    console.log(messageParams);

    const result = await sendWhatsAppMessage(phone, messageParams);
    console.log('Withdrawal notification sent successfully:', result);

    return { 
      success: true, 
      message: 'Withdrawal notification sent',
      data: result 
    };
  } catch (error) {
    const errorMsg = `Withdrawal Notification Error: ${error.message}`;
    console.error(errorMsg, error);
    return { 
      success: false, 
      message: errorMsg,
      error: error 
    };
  }
};

/**
 * Credit Notification
 */
export const sendCreditNotification = async (data) => {
  try {
    console.log('=== sendCreditNotification called with data ===');
    console.log(JSON.stringify(data, null, 2));

    const {
      customerPhone,
      customerName,
      amount,
      accountNumber,
      totalAmount,
      agentName
    } = data;

    // Validate required fields
    if (!customerPhone) {
      const errorMsg = 'Customer phone number is required';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    if (amount === undefined || amount === null) {
      const errorMsg = 'Amount is required';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Format values
    const phone = formatPhoneNumber(customerPhone);
    const formattedAmount = Number(amount).toFixed(2);
    const formattedTotal = Number(totalAmount || amount).toFixed(2);
    
    // Create message parameters array for the webhook
    const messageParams = [
      'bhishi',
      customerName || 'Customer',
      formattedAmount,
      'credit',
      accountNumber || 'N/A',
      formattedTotal,
      agentName || 'Agent'
    ];

    console.log('Sending credit notification with parameters:');
    console.log(messageParams);

    const result = await sendWhatsAppMessage(phone, messageParams);
    console.log('Credit notification sent successfully:', result);

    return { 
      success: true, 
      message: 'Credit notification sent',
      data: result 
    };
  } catch (error) {
    const errorMsg = `Credit Notification Error: ${error.message}`;
    console.error(errorMsg, error);
    return { 
      success: false, 
      message: errorMsg,
      error: error 
    };
  }
};

/**
 * Default Export
 */
/**
 * Test function to debug webhook
 * @param {string} phone - Phone number with country code (without +)
 * @param {string} name - Customer name
 * @param {number} amount - Transaction amount
 * @param {string} type - Transaction type (deposit/withdraw/credit)
 * @param {string} accountNo - Account number
 * @param {number} total - Total amount
 * @param {string} agent - Agent name
 */
export const testWebhook = async (phone = '919876543210', name = 'Test User', amount = 1000, type = 'deposit', accountNo = 'TEST123', total = 1000, agent = 'Test Agent') => {
  try {
    console.log('=== Testing Webhook ===');
    const testParams = ['bhishi', name, amount.toString(), type, accountNo, total.toString(), agent];
    console.log('Test Parameters:', testParams);
    
    const result = await sendWhatsAppMessage(phone, testParams);
    console.log('Test Result:', result);
    
    if (result.success) {
      console.log('✅ Webhook test successful!');
    } else {
      console.error('❌ Webhook test failed:', result.error || 'Unknown error');
    }
    
    return result;
  } catch (error) {
    console.error('❌ Test Error:', error);
    return { success: false, error: error.message };
  }
};

export default {
  sendDepositNotification,
  sendWithdrawalNotification,
  sendCreditNotification,
  testWebhook
};
