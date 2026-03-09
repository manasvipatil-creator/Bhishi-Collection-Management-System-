/**
 * WhatsApp Notification Utility
 * Sends transaction notifications via WhatsApp webhook API
 */

const WITHDRAWAL_WEBHOOK_URL = 'https://webhook.whatapi.in/webhook/69aa76e002e28c7ee4e36141';
const DEPOSIT_WEBHOOK_URL = 'https://webhook.whatapi.in/webhook/69aa76e002e28c7ee4e36141';

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
const sendWhatsAppMessage = async (phone, messageParams, webhookBaseUrl) => {
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
    
    const webhookUrl = `${webhookBaseUrl}?number=${phone}&message=${encodedMessage}`;
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
    
    // Create message parameters array for the deposit webhook
    // Format: deposited,var1,var2,var3,var4,var5  (6 params total)
    const messageParams = [
      'deposited',
      customerName || 'Customer',
      formattedAmount,
      accountNumber || 'N/A',
      formattedTotal,
      agentName || 'Agent'
    ];

    console.log('Sending deposit notification with parameters:');
    console.log(messageParams);

    const result = await sendWhatsAppMessage(phone, messageParams, DEPOSIT_WEBHOOK_URL);
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
      amount,        // Requested withdrawal amount
      penaltyAmount, // Penalty deducted (if any)
      netAmount,     // Final payout to customer (Final Amount)
      accountNumber, // Account No
      totalAmount,   // Remaining Balance after withdrawal
      agentName      // Agent name
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
    const phone            = formatPhoneNumber(customerPhone);
    const penaltyAmt       = Number(penaltyAmount || 0);
    const requestAmt       = Number(amount        || 0);
    const formattedRequest = requestAmt.toFixed(2);
    const formattedFinal   = Number(netAmount ?? amount).toFixed(2);
    const formattedBalance = Number(totalAmount   || 0).toFixed(2);
    const acctNo           = accountNumber || 'N/A';
    const agent            = agentName    || 'Agent';

    // Format penalty: descriptive when applied, "0.00" when no penalty
    const formattedPenalty = penaltyAmt > 0
      ? `Penalty Applied - Rs.${penaltyAmt.toFixed(2)} (5% of Rs.${requestAmt.toFixed(2)})`
      : '0.00';

    console.log('Withdrawal Notification Details:', {
      customerName, formattedRequest, formattedPenalty,
      formattedFinal, acctNo, formattedBalance, agent
    });

    // Webhook template:
    // Dear {var1}, Requested: {var2}, Penalty: {var3},
    // Final Amount: {var4}, Account No: {var5}, Remaining Balance: {var6}, Agent: {var7}
    const messageParams = [
      'withdrawal',
      customerName    || 'Customer', // var1 — Dear {name}
      formattedRequest,              // var2 — Requested amount
      formattedPenalty,              // var3 — "Penalty Applied - Rs.5 (5% of Rs.100)" or "Nil"
      formattedFinal,                // var4 — Final Amount (net payout)
      acctNo,                        // var5 — Account No
      formattedBalance,              // var6 — Remaining Balance
      agent                          // var7 — Agent name
    ];

    console.log('Sending withdrawal notification with parameters:');
    console.log(messageParams);

    const result = await sendWhatsAppMessage(phone, messageParams, WITHDRAWAL_WEBHOOK_URL);
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

    const result = await sendWhatsAppMessage(phone, messageParams, DEPOSIT_WEBHOOK_URL);
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
    const webhookUrl = type === 'withdrawal' ? WITHDRAWAL_WEBHOOK_URL : DEPOSIT_WEBHOOK_URL;
    const testParams = type === 'withdrawal'
      ? ['withdrawal', name, amount.toString(), accountNo, total.toString(), agent, '', '']
      : ['deposited', name, amount.toString(), accountNo, total.toString(), agent];
    console.log('Test Parameters:', testParams);
    
    const result = await sendWhatsAppMessage(phone, testParams, webhookUrl);
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
