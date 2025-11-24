/**
 * Test utility for WhatsApp notifications
 * Use this to test the WhatsApp webhook integration
 */

import { sendDepositNotification, sendWithdrawalNotification, sendCreditNotification } from './whatsappNotification';

/**
 * Test deposit notification
 */
export const testDepositNotification = async () => {
  console.log('Testing deposit notification...');
  
  const testData = {
    customerPhone: '7058363608', // Your test phone number
    customerName: 'Test Customer',
    amount: 1000,
    accountNumber: 'ACC12345',
    totalAmount: 5000,
    agentName: 'Test Agent'
  };
  
  console.log('Test data:', testData);
  
  const result = await sendDepositNotification(testData);
  
  console.log('Result:', result);
  return result;
};

/**
 * Test withdrawal notification
 */
export const testWithdrawalNotification = async () => {
  console.log('Testing withdrawal notification...');
  
  const testData = {
    customerPhone: '7058363608', // Your test phone number
    customerName: 'Test Customer',
    amount: 12500,
    accountNumber: 'ACC12345',
    totalAmount: 0,
    agentName: 'Test Agent'
  };
  
  console.log('Test data:', testData);
  
  const result = await sendWithdrawalNotification(testData);
  
  console.log('Result:', result);
  return result;
};

/**
 * Test credit notification
 */
export const testCreditNotification = async () => {
  console.log('Testing credit notification...');
  
  const testData = {
    customerPhone: '7058363608', // Your test phone number
    customerName: 'Test Customer',
    amount: 1000,
    accountNumber: 'ACC12345',
    totalAmount: 6000,
    agentName: 'Test Agent'
  };
  
  console.log('Test data:', testData);
  
  const result = await sendCreditNotification(testData);
  
  console.log('Result:', result);
  return result;
};

/**
 * Run all tests
 */
export const runAllTests = async () => {
  console.log('=== Running all WhatsApp notification tests ===\n');
  
  console.log('1. Testing Deposit Notification:');
  await testDepositNotification();
  console.log('\n');
  
  console.log('2. Testing Withdrawal Notification:');
  await testWithdrawalNotification();
  console.log('\n');
  
  console.log('3. Testing Credit Notification:');
  await testCreditNotification();
  console.log('\n');
  
  console.log('=== All tests completed ===');
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testWhatsApp = {
    testDeposit: testDepositNotification,
    testWithdrawal: testWithdrawalNotification,
    testCredit: testCreditNotification,
    runAll: runAllTests
  };
  
  console.log('WhatsApp test functions available:');
  console.log('- window.testWhatsApp.testDeposit()');
  console.log('- window.testWhatsApp.testWithdrawal()');
  console.log('- window.testWhatsApp.testCredit()');
  console.log('- window.testWhatsApp.runAll()');
}

export default {
  testDepositNotification,
  testWithdrawalNotification,
  testCreditNotification,
  runAllTests
};
