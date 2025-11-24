# WhatsApp Notification Setup Guide

## ✅ What's Been Implemented

The WhatsApp notification system has been fully integrated into your Bhishi Collection Management System. Here's what's working:

### 1. **Automatic Notifications**
- **Deposit notifications** - Sent automatically when money is deposited
- **Withdrawal notifications** - Sent automatically when money is withdrawn
- **Credit notifications** - Available for bonus/interest credits

### 2. **Integration Points**
- ✅ `addTransactionToAgent()` - Sends notifications for all deposits and withdrawals
- ✅ `processEarlyWithdrawal()` - Sends withdrawal notifications with bonus/penalty details
- ✅ `AddCollection.jsx` - Sends deposit notifications from the UI

### 3. **Files Created/Modified**

#### New Files:
- `src/utils/whatsappNotification.js` - Main notification utility
- `src/pages/TestWhatsApp.jsx` - Test page for notifications
- `src/utils/testWhatsAppNotification.js` - Test utilities

#### Modified Files:
- `src/utils/databaseHelpers.js` - Added notification calls
- `src/pages/AddCollection.jsx` - Added deposit notifications

---

## 🚀 How to Test

### Method 1: Using the Test Page

1. Add the test page to your routes (in `App.jsx` or your router file):
```jsx
import TestWhatsApp from './pages/TestWhatsApp';

// Add this route:
<Route path="/test-whatsapp" element={<TestWhatsApp />} />
```

2. Navigate to `/test-whatsapp` in your browser

3. Fill in the test data:
   - **Customer Phone**: Your phone number (without 91)
   - **Customer Name**: Any name
   - **Amount**: Transaction amount
   - **Total Amount**: Balance after transaction
   - **Account Number**: Any account number
   - **Agent Name**: Any agent name

4. Click one of the test buttons:
   - 💰 Test Deposit
   - 💸 Test Withdrawal
   - 💳 Test Credit

5. Check your WhatsApp for the message!

### Method 2: Using Browser Console

1. Open browser console (F12)
2. Import and test:
```javascript
// Test deposit
await window.testWhatsApp.testDeposit();

// Test withdrawal
await window.testWhatsApp.testWithdrawal();

// Test credit
await window.testWhatsApp.testCredit();

// Run all tests
await window.testWhatsApp.runAll();
```

### Method 3: Real Transaction Test

1. Go to your application
2. Make a real deposit or withdrawal transaction
3. Check the browser console for logs:
   - "Sending deposit notification with data: ..."
   - "Webhook URL: ..."
   - "Deposit notification sent successfully"
4. Check WhatsApp for the message

---

## 📱 Message Format

The webhook sends these parameters to create the WhatsApp message:

### For Deposits:
```
number=917058363608
message=bhishi
name=Customer Name
amount=1000
deposit=1000
accountno=ACC12345
totalamount=5000
agentname=Agent Name
```

### For Withdrawals:
```
number=917058363608
message=bhishi
name=Customer Name
amount=12500
withdrawal=12500
accountno=ACC12345
totalamount=0
agentname=Agent Name
```

### For Credits:
```
number=917058363608
message=bhishi
name=Customer Name
amount=1000
credit=1000
accountno=ACC12345
totalamount=6000
agentname=Agent Name
```

---

## 🔧 Configuration

### Webhook URL
The webhook URL is configured in `src/utils/whatsappNotification.js`:
```javascript
const WEBHOOK_BASE_URL = 'https://webhook.whatapi.in/webhook/69213b981b9845c02d533ccb';
```

To change it, edit this constant.

### Phone Number Format
- Input: Can be with or without country code
  - ✅ "7058363608"
  - ✅ "917058363608"
- Output: Always formatted with "91" prefix
  - "917058363608"

---

## 🐛 Troubleshooting

### Issue: Getting "undefined" values in WhatsApp message

**Solution:** The notification functions now validate and format all data properly:
- All values are converted to strings
- Numbers are properly parsed
- Default values are provided for missing data
- Phone numbers are cleaned and formatted

### Issue: Notification not sent

**Check:**
1. Browser console for error messages
2. Network tab in DevTools for the webhook request
3. Response from the webhook API

**Common causes:**
- Invalid phone number format
- Missing required fields (phone, amount)
- Network connectivity issues
- Webhook API is down

### Issue: Transaction succeeds but notification fails

**This is normal!** Notifications are non-critical:
- Transaction will complete successfully
- Error is logged to console
- User is not affected

---

## 📊 Monitoring

### Console Logs
The system logs detailed information:

```javascript
// Before sending
Sending deposit notification with data: {
  phone: "917058363608",
  name: "Customer Name",
  amount: 1000,
  accountNo: "ACC12345",
  totalAmount: 5000,
  agentName: "Agent Name"
}

// Webhook URL
Webhook URL: https://webhook.whatapi.in/webhook/...

// After sending
Deposit notification sent successfully: { success: true }
```

### Error Logs
```javascript
// If notification fails
WhatsApp notification failed (non-critical): Error message here
```

---

## 🎯 Usage Examples

### Example 1: Manual Deposit Notification
```javascript
import { sendDepositNotification } from './utils/whatsappNotification';

await sendDepositNotification({
  customerPhone: '7058363608',
  customerName: 'John Doe',
  amount: 1000,
  accountNumber: 'ACC123',
  totalAmount: 5000,
  agentName: 'Agent Kumar'
});
```

### Example 2: Manual Withdrawal Notification
```javascript
import { sendWithdrawalNotification } from './utils/whatsappNotification';

await sendWithdrawalNotification({
  customerPhone: '7058363608',
  customerName: 'John Doe',
  amount: 12500,
  accountNumber: 'ACC123',
  totalAmount: 0,
  agentName: 'Agent Kumar'
});
```

### Example 3: Manual Credit Notification
```javascript
import { sendCreditNotification } from './utils/whatsappNotification';

await sendCreditNotification({
  customerPhone: '7058363608',
  customerName: 'John Doe',
  amount: 1000,
  accountNumber: 'ACC123',
  totalAmount: 6000,
  agentName: 'Agent Kumar'
});
```

---

## ✨ Features

### ✅ Automatic Validation
- Phone numbers are validated and formatted
- All values are type-checked and converted
- Missing values get sensible defaults

### ✅ Error Handling
- Notifications don't break transactions
- Errors are logged but not thrown
- Graceful degradation

### ✅ Detailed Logging
- All data is logged before sending
- Webhook URLs are logged for debugging
- Success/failure is clearly indicated

### ✅ Flexible Integration
- Works with existing transaction functions
- Can be called manually if needed
- Non-intrusive to existing code

---

## 📝 Next Steps

1. **Test the notifications** using the test page
2. **Make a real transaction** to verify integration
3. **Check WhatsApp** to see the actual message format
4. **Customize the message template** on the webhook side if needed
5. **Monitor the console logs** for any issues

---

## 🆘 Support

If you encounter issues:

1. Check browser console for detailed logs
2. Verify phone number format (should be 10 digits)
3. Test with the TestWhatsApp page first
4. Check network tab for webhook response
5. Verify webhook URL is correct

The system is designed to be robust - even if notifications fail, your transactions will complete successfully!
