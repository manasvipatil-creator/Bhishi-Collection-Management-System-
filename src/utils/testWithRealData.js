/**
 * Test WhatsApp notification with real customer data
 * Run this in browser console to test with actual data from your database
 */

import { sendDepositNotification } from './whatsappNotification';

/**
 * Test with the actual customer data you provided
 */
export const testWithRealCustomerData = async () => {
  console.log('=== Testing with real customer data ===');
  
  // Your actual customer data
  const customerData = {
    accountNumber: "20252606",
    active: true,
    address: "shirolh",
    createdDate: "2025-11-20",
    createdTime: "18:14:09",
    id: 0,
    interestRate: 0,
    name: "Shreyas chudmunge",
    phoneNumber: "7757921239",
    principalAmount: 0,
    routeId: 1,
    routeName: "Mumbai",
    startDate: "2025-11-20",
    totalDeposits: 7999.959999999999,
    village: "shirolh"
  };
  
  // Latest transaction
  const latestTransaction = {
    accountNumber: "20252606",
    amount: 1000,
    createdAt: "2025-11-22T05:33:51.791Z",
    customerId: "7757921239",
    customerName: "Shreyas chudmunge",
    date: "2025-11-22",
    paymentMethod: "cash",
    receiptNumber: "RCP1763789625645",
    remarks: "",
    time: "11:03:51 am",
    timestamp: 1763789631791,
    transactionId: "-Oee2TyeZp-AtE45V3bo",
    type: "deposit"
  };
  
  // Prepare notification data
  const notificationData = {
    customerPhone: customerData.phoneNumber,
    customerName: customerData.name,
    amount: latestTransaction.amount,
    accountNumber: customerData.accountNumber,
    totalAmount: customerData.totalDeposits,
    agentName: 'Agent Name' // Replace with actual agent name
  };
  
  console.log('Customer data:', customerData);
  console.log('Transaction data:', latestTransaction);
  console.log('Notification data:', notificationData);
  
  // Send notification
  const result = await sendDepositNotification(notificationData);
  
  console.log('Result:', result);
  
  return result;
};

/**
 * Test with minimal data to isolate the issue
 */
export const testWithMinimalData = async () => {
  console.log('=== Testing with minimal data ===');
  
  const minimalData = {
    customerPhone: '7757921239',
    customerName: 'Shreyas chudmunge',
    amount: 1000,
    accountNumber: '20252606',
    totalAmount: 8000,
    agentName: 'Test Agent'
  };
  
  console.log('Minimal data:', minimalData);
  
  const result = await sendDepositNotification(minimalData);
  
  console.log('Result:', result);
  
  return result;
};

// Make available in browser console
if (typeof window !== 'undefined') {
  window.testRealData = {
    testWithRealCustomerData,
    testWithMinimalData
  };
  
  console.log('Real data test functions available:');
  console.log('- window.testRealData.testWithRealCustomerData()');
  console.log('- window.testRealData.testWithMinimalData()');
}

export default {
  testWithRealCustomerData,
  testWithMinimalData
};
