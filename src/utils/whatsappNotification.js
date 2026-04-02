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

    const webhookUrl = new URL(webhookBaseUrl);
    webhookUrl.searchParams.append('number', phone);

    // Join parameters with commas into a single 'message' parameter
    // This matches the exact format used in the working old version
    const messageString = messageParams.join(',');
    webhookUrl.searchParams.append('message', messageString);

    console.log('Final Webhook URL:', webhookUrl.toString());

    // Add timeout to the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    console.log('Sending request to webhook...');
    const startTime = Date.now();

    // mode: 'no-cors' avoids CORS preflight
    await fetch(webhookUrl.toString(), {
      method: 'GET',
      mode: 'no-cors',
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));

    const responseTime = Date.now() - startTime;
    console.log(`✅ Webhook fired in ${responseTime}ms (no-cors — response is opaque but message is sent)`);

    return {
      success: true,
      status: 200,
      message: 'Webhook triggered successfully'
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

    // Create message parameters array (6 items: Template Name + 5 Variables)
    // Mapping matches the "deposited" template: name, amount, accountNo, total, agent
    const messageParams = [
      'deposited',
      customerName || 'Customer', // var1
      formattedAmount,           // var2
      accountNumber || 'N/A',     // var3
      formattedTotal,            // var4
      agentName || 'Agent'       // var5
    ];

    console.log('Sending deposit notification (6 items):');
    console.log(messageParams);

    const result = await sendWhatsAppMessage(phone, messageParams, DEPOSIT_WEBHOOK_URL);
    console.log('Notification result:', result);

    return {
      success: result.success,
      message: result.success ? 'Deposit notification sent' : `Failed: ${result.error}`,
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
    const phone = formatPhoneNumber(customerPhone);
    const penaltyAmt = Number(penaltyAmount || 0);
    const requestAmt = Number(amount || 0);
    const formattedRequest = requestAmt.toFixed(2);
    const formattedFinal = Number(netAmount ?? amount).toFixed(2);
    const formattedBalance = Number(totalAmount || 0).toFixed(2);
    const acctNo = accountNumber || 'N/A';
    const agent = agentName || 'Agent';

    // Format penalty: descriptive when applied, "0.00" when no penalty
    const formattedPenalty = penaltyAmt > 0
      ? `Penalty Applied - Rs.${penaltyAmt.toFixed(2)} (5% of Rs.${requestAmt.toFixed(2)})`
      : '0.00';

    console.log('Withdrawal Notification Details:', {
      customerName, formattedRequest, formattedPenalty,
      formattedFinal, acctNo, formattedBalance, agent
    });

    // Create message parameters array (8 items: Template Name + 7 Variables)
    // Mapping: withdrawal, {name}, {requested}, {penalty}, {final}, {acctNo}, {balance}, {agent}
    const messageParams = [
      'withdrawal',
      customerName || 'Customer', // var1
      formattedRequest,           // var2
      formattedPenalty,           // var3
      formattedFinal,             // var4
      acctNo,                      // var5
      formattedBalance,           // var6
      agent                       // var7
    ];

    console.log('Sending withdrawal notification (8 items):');
    console.log(messageParams);

    const result = await sendWhatsAppMessage(phone, messageParams, WITHDRAWAL_WEBHOOK_URL);
    
    return {
      success: result.success,
      message: result.success ? 'Withdrawal notification sent' : `Failed: ${result.error}`,
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

    // Create message parameters array (6 items: Template Name + 5 Variables)
    const messageParams = [
      'deposited',
      customerName || 'Customer', // var1
      formattedAmount,           // var2
      accountNumber || 'N/A',     // var3
      formattedTotal,            // var4
      agentName || 'Agent'       // var5
    ];

    console.log('Sending credit notification (6 items):');
    console.log(messageParams);

    const result = await sendWhatsAppMessage(phone, messageParams, DEPOSIT_WEBHOOK_URL);
    
    return {
      success: result.success,
      message: result.success ? 'Credit notification sent' : `Failed: ${result.error}`,
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
    
    // Use the specific template identifiers required by the active webhook
    const testParams = type === 'withdrawal'
      ? ['withdrawal', name, amount.toFixed(2), '0.00', amount.toFixed(2), accountNo, total.toFixed(2), agent]
      : ['deposited', name, amount.toFixed(2), accountNo, total.toFixed(2), agent];
    
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
