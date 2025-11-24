# WhatsApp Notification Debugging Guide

## Issue: Getting "undefined" values in WhatsApp message

### Current Message Format (with undefined):
```
Dear undefined,
Your payment of Rs. undefined has been undefined successfully.
Account No: undefined
Total Amount: Rs. undefined
Agent Name: undefined
Thank you for your payment!
```

## Root Cause Analysis

The webhook is receiving `undefined` values because the data being passed to the notification function has missing or incorrectly mapped fields.

## Step-by-Step Debugging

### Step 1: Check Browser Console

When a transaction is made, you should see these logs:

```javascript
=== Preparing deposit notification ===
Transaction data: { ... }
Customer data: { ... }
Agent data: { ... }
Transaction: { ... }
Notification data to send: { ... }

=== sendDepositNotification called ===
Raw data received: { ... }
Destructured values: { ... }
Sending deposit notification with data: { ... }
Webhook URL: https://webhook.whatapi.in/webhook/...
```

### Step 2: Verify Data Structure

Based on your actual data, the structure should be:

**Customer Data:**
```javascript
{
  accountNumber: "20252606",
  name: "Shreyas chudmunge",
  phoneNumber: "7757921239",
  totalDeposits: 7999.96,
  // ... other fields
}
```

**Transaction Data:**
```javascript
{
  accountNumber: "20252606",
  amount: 1000,
  customerName: "Shreyas chudmunge",
  customerId: "7757921239",
  type: "deposit",
  // ... other fields
}
```

### Step 3: Check What's Being Sent

The notification function expects:
```javascript
{
  customerPhone: "7757921239",      // From transactionData.customerPhone
  customerName: "Shreyas chudmunge", // From transactionData.customerName || customer.name
  amount: 1000,                      // From transaction.amount
  accountNumber: "20252606",         // From transactionData.accountNumber || customer.accountNumber
  totalAmount: 8000,                 // From updates.totalDeposits
  agentName: "Agent Name"            // From agent.name
}
```

### Step 4: Common Issues and Fixes

#### Issue 1: `customerPhone` is undefined
**Cause:** `transactionData.customerPhone` is not set
**Fix:** Ensure when calling `addTransactionToAgent()`, you pass `customerPhone`:
```javascript
await addTransactionToAgent(agentPhone, {
  customerPhone: '7757921239',  // ← Make sure this is set
  customerName: 'Shreyas chudmunge',
  amount: 1000,
  // ... other fields
});
```

#### Issue 2: `customerName` is undefined
**Cause:** Neither `transactionData.customerName` nor `customer.name` is set
**Fix:** Check that customer data has `name` field (not `customerName`)

#### Issue 3: `amount` is undefined
**Cause:** `transaction.amount` is not set or is null
**Fix:** Ensure amount is passed as a number:
```javascript
amount: Number(1000)  // or parseFloat(1000)
```

#### Issue 4: `agentName` is undefined
**Cause:** Agent data structure is incorrect or `getAgentById()` returns null
**Fix:** Check agent data structure - should have `agentInfo.agentName`

## Testing Solutions

### Solution 1: Test with Browser Console

Open browser console and run:
```javascript
// Import the test function
import { testWithRealCustomerData } from './utils/testWithRealData';

// Run test
await testWithRealCustomerData();
```

### Solution 2: Test with Test Page

1. Go to `/test-whatsapp`
2. Enter your actual data:
   - Phone: `7757921239`
   - Name: `Shreyas chudmunge`
   - Amount: `1000`
   - Account: `20252606`
   - Total: `8000`
   - Agent: `Your Agent Name`
3. Click "Test Deposit"
4. Check console for detailed logs

### Solution 3: Add Logging to Your Transaction Code

Find where you call `addTransactionToAgent()` and add logging:

```javascript
console.log('About to add transaction with data:', {
  customerPhone: customerPhone,
  customerName: customerName,
  amount: amount,
  accountNumber: accountNumber
});

await addTransactionToAgent(agentPhone, {
  customerPhone: customerPhone,
  customerName: customerName,
  amount: amount,
  accountNumber: accountNumber,
  // ... other fields
});
```

## Expected Console Output (Success)

When working correctly, you should see:

```
=== Preparing deposit notification ===
Transaction data: {
  customerPhone: "7757921239",
  customerName: "Shreyas chudmunge",
  amount: 1000,
  accountNumber: "20252606",
  ...
}
Customer data: {
  name: "Shreyas chudmunge",
  phoneNumber: "7757921239",
  accountNumber: "20252606",
  totalDeposits: 7999.96,
  ...
}
Agent data: {
  name: "Agent Name",
  phone: "8978988789",
  ...
}
Notification data to send: {
  customerPhone: "7757921239",
  customerName: "Shreyas chudmunge",
  amount: 1000,
  accountNumber: "20252606",
  totalAmount: 8999.96,
  agentName: "Agent Name"
}

=== sendDepositNotification called ===
Raw data received: {
  "customerPhone": "7757921239",
  "customerName": "Shreyas chudmunge",
  "amount": 1000,
  "accountNumber": "20252606",
  "totalAmount": 8999.96,
  "agentName": "Agent Name"
}
Destructured values: {
  customerPhone: "7757921239",
  customerName: "Shreyas chudmunge",
  amount: 1000,
  accountNumber: "20252606",
  totalAmount: 8999.96,
  agentName: "Agent Name"
}
Sending deposit notification with data: {
  phone: "917757921239",
  name: "Shreyas chudmunge",
  amount: 1000,
  accountNo: "20252606",
  totalAmount: 8999.96,
  agentName: "Agent Name"
}
Webhook URL: https://webhook.whatapi.in/webhook/69213b981b9845c02d533ccb?number=917757921239&message=bhishi&name=Shreyas%20chudmunge&amount=1000&deposit=1000&accountno=20252606&totalamount=8999.96&agentname=Agent%20Name
Deposit notification sent successfully
```

## Quick Fix Checklist

- [ ] Check browser console for logs
- [ ] Verify `customerPhone` is being passed
- [ ] Verify `customerName` is being passed
- [ ] Verify `amount` is a number
- [ ] Verify `accountNumber` is being passed
- [ ] Verify `totalAmount` is calculated correctly
- [ ] Verify agent data is being fetched
- [ ] Test with the test page first
- [ ] Check network tab for webhook request
- [ ] Verify webhook response

## Still Not Working?

If you're still getting undefined values:

1. **Copy the exact console output** when making a transaction
2. **Check the Network tab** in DevTools:
   - Look for the webhook request
   - Check the URL parameters
   - Check the response
3. **Verify the webhook template** on whatapi.in side matches the parameters being sent

The detailed logging added will show exactly what data is being passed at each step, making it easy to identify where the undefined values are coming from.
