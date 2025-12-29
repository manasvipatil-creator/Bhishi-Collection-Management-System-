/**
 * WhatsApp Notification Utility
 * Sends transaction notifications via WhatsApp webhook API
 */

const WEBHOOK_BASE_URL = 'https://webhook.whatapi.in/webhook/69213b981b9845c02d533ccb';

/**
 * Send WhatsApp notification for deposit transaction
 * @param {Object} data - Transaction data
 * @param {string} data.customerPhone - Customer phone number (without country code)
 * @param {string} data.customerName - Customer name
 * @param {number} data.amount - Deposit amount
 * @param {string} data.accountNumber - Account number
 * @param {number} data.totalAmount - Total balance after deposit
 * @param {string} data.agentName - Agent name
 */
export const sendDepositNotification = async (data) => {
  try {
    // Log the raw incoming data for debugging
    console.log('=== sendDepositNotification called ===');
    console.log('Raw data received:', JSON.stringify(data, null, 2));

    const {
      customerPhone,
      customerName,
      amount,
      accountNumber,
      totalAmount,
      agentName
    } = data;

    console.log('Destructured values:', {
      customerPhone,
      customerName,
      amount,
      accountNumber,
      totalAmount,
      agentName
    });

    // Validate required fields
    if (!customerPhone) {
      console.error('ERROR: Customer phone number is missing!');
      throw new Error('Customer phone number is required');
    }
    if (!amount && amount !== 0) {
      console.error('ERROR: Amount is missing!');
      throw new Error('Amount is required');
    }

    // Format phone number - ensure it starts with 91
    const cleanPhone = String(customerPhone).replace(/\D/g, ''); // Remove non-digits
    const formattedPhone = cleanPhone.startsWith('91')
      ? cleanPhone
      : `91${cleanPhone}`;

    // Ensure all values are properly formatted
    const finalName = String(customerName || 'Customer');
    const finalAmount = Number(amount) || 0;
    const finalAccountNo = String(accountNumber || 'N/A');
    const finalTotalAmount = (Number(totalAmount) || finalAmount).toFixed(2);
    const finalAgentName = String(agentName || 'Agent');

    // Build webhook URL with parameters
    // Format: message=bhishi,name,amount,deposit,accountno,totalamount,agentname
    const webhookUrl = new URL(WEBHOOK_BASE_URL);
    webhookUrl.searchParams.append('number', formattedPhone);
    webhookUrl.searchParams.append('message', `bhishi,${finalName},${finalAmount},${finalAmount},${finalAccountNo},${finalTotalAmount},${finalAgentName}`);

    console.log('Sending deposit notification with data:', {
      phone: formattedPhone,
      name: finalName,
      amount: finalAmount,
      accountNo: finalAccountNo,
      totalAmount: finalTotalAmount,
      agentName: finalAgentName
    });
    console.log('Webhook URL:', webhookUrl.toString());

    // Send the webhook request
    const response = await fetch(webhookUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status: ${response.status}`);
    }

    const result = await response.json().catch(() => ({ success: true }));
    console.log('Deposit notification sent successfully:', result);

    return {
      success: true,
      message: 'Deposit notification sent',
      data: result
    };
  } catch (error) {
    console.error('Error sending deposit notification:', error);
    // Don't throw error - notification failure shouldn't break the transaction
    return {
      success: false,
      message: error.message,
      error: error
    };
  }
};

/**
 * Send WhatsApp notification for withdrawal transaction
 * @param {Object} data - Transaction data
 * @param {string} data.customerPhone - Customer phone number (without country code)
 * @param {string} data.customerName - Customer name
 * @param {number} data.amount - Withdrawal amount
 * @param {string} data.accountNumber - Account number
 * @param {number} data.totalAmount - Remaining balance after withdrawal
 * @param {string} data.agentName - Agent name
 */
export const sendWithdrawalNotification = async (data) => {
  try {
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
      throw new Error('Customer phone number is required');
    }
    if (!amount && amount !== 0) {
      throw new Error('Amount is required');
    }

    // Format phone number - ensure it starts with 91
    const cleanPhone = String(customerPhone).replace(/\D/g, ''); // Remove non-digits
    const formattedPhone = cleanPhone.startsWith('91')
      ? cleanPhone
      : `91${cleanPhone}`;

    // Ensure all values are properly formatted
    const finalName = String(customerName || 'Customer');
    const finalAmount = Number(amount) || 0;
    const finalAccountNo = String(accountNumber || 'N/A');
    const finalTotalAmount = (Number(totalAmount) || 0).toFixed(2);
    const finalAgentName = String(agentName || 'Agent');

    // Build webhook URL with parameters
    // Format: message=bhishi,name,amount,withdrawal,accountno,totalamount,agentname
    const webhookUrl = new URL(WEBHOOK_BASE_URL);
    webhookUrl.searchParams.append('number', formattedPhone);
    webhookUrl.searchParams.append('message', `bhishi,${finalName},${finalAmount},${finalAmount},${finalAccountNo},${finalTotalAmount},${finalAgentName}`);

    console.log('Sending withdrawal notification with data:', {
      phone: formattedPhone,
      name: finalName,
      amount: finalAmount,
      accountNo: finalAccountNo,
      totalAmount: finalTotalAmount,
      agentName: finalAgentName
    });
    console.log('Webhook URL:', webhookUrl.toString());

    // Send the webhook request
    const response = await fetch(webhookUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status: ${response.status}`);
    }

    const result = await response.json().catch(() => ({ success: true }));
    console.log('Withdrawal notification sent successfully:', result);

    return {
      success: true,
      message: 'Withdrawal notification sent',
      data: result
    };
  } catch (error) {
    console.error('Error sending withdrawal notification:', error);
    // Don't throw error - notification failure shouldn't break the transaction
    return {
      success: false,
      message: error.message,
      error: error
    };
  }
};

/**
 * Send WhatsApp notification for credit (money added to account)
 * @param {Object} data - Transaction data
 * @param {string} data.customerPhone - Customer phone number (without country code)
 * @param {string} data.customerName - Customer name
 * @param {number} data.amount - Credit amount
 * @param {string} data.accountNumber - Account number
 * @param {number} data.totalAmount - Total balance after credit
 * @param {string} data.agentName - Agent name
 */
export const sendCreditNotification = async (data) => {
  try {
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
      throw new Error('Customer phone number is required');
    }
    if (!amount && amount !== 0) {
      throw new Error('Amount is required');
    }

    // Format phone number - ensure it starts with 91
    const cleanPhone = String(customerPhone).replace(/\D/g, ''); // Remove non-digits
    const formattedPhone = cleanPhone.startsWith('91')
      ? cleanPhone
      : `91${cleanPhone}`;

    // Ensure all values are properly formatted
    const finalName = String(customerName || 'Customer');
    const finalAmount = Number(amount) || 0;
    const finalAccountNo = String(accountNumber || 'N/A');
    const finalTotalAmount = (Number(totalAmount) || finalAmount).toFixed(2);
    const finalAgentName = String(agentName || 'Agent');

    // Build webhook URL with parameters
    // Format: message=bhishi,name,amount,credit,accountno,totalamount,agentname
    const webhookUrl = new URL(WEBHOOK_BASE_URL);
    webhookUrl.searchParams.append('number', formattedPhone);
    webhookUrl.searchParams.append('message', `bhishi,${finalName},${finalAmount},${finalAmount},${finalAccountNo},${finalTotalAmount},${finalAgentName}`);

    console.log('Sending credit notification with data:', {
      phone: formattedPhone,
      name: finalName,
      amount: finalAmount,
      accountNo: finalAccountNo,
      totalAmount: finalTotalAmount,
      agentName: finalAgentName
    });
    console.log('Webhook URL:', webhookUrl.toString());

    // Send the webhook request
    const response = await fetch(webhookUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status: ${response.status}`);
    }

    const result = await response.json().catch(() => ({ success: true }));
    console.log('Credit notification sent successfully:', result);

    return {
      success: true,
      message: 'Credit notification sent',
      data: result
    };
  } catch (error) {
    console.error('Error sending credit notification:', error);
    // Don't throw error - notification failure shouldn't break the transaction
    return {
      success: false,
      message: error.message,
      error: error
    };
  }
};

export default {
  sendDepositNotification,
  sendWithdrawalNotification,
  sendCreditNotification
};
