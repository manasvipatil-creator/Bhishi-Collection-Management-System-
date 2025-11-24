# How to Fix WhatsApp Webhook Template

## Problem

You're getting this message:
```
Dear undefined,
Your payment of Rs. undefined has been undefined successfully.
Account No: undefined
Total Amount: Rs. undefined
Agent Name: undefined
Thank you for your payment!
```

## Root Cause

The webhook template on **whatapi.in** is not configured to use the correct variable names that we're sending.

## What We're Sending

Our code sends these parameters:

| Parameter | Example Value | Description |
|-----------|---------------|-------------|
| `number` | 917757921239 | Customer phone |
| `message` | bhishi | Template identifier |
| `name` | Shreyas chudmunge | Customer name |
| `amount` | 1000 | Transaction amount |
| `deposit` | 1000 | For deposits |
| `withdrawal` | 1000 | For withdrawals |
| `accountno` | 20252606 | Account number |
| `totalamount` | 8999.96 | Total balance |
| `agentname` | Agent Name | Agent name |

## Solution: Update Webhook Template

You need to log in to **whatapi.in** and update your webhook template to use these variable names.

### Step 1: Test Current Setup

1. Open `test-webhook.html` in your browser
2. Enter your phone number
3. Click "Test Deposit"
4. Check what message you receive

### Step 2: Update Template on whatapi.in

Go to your whatapi.in dashboard and update the template for webhook ID `69213b981b9845c02d533ccb`.

#### For Deposit Messages:

**Template should be:**
```
Dear {{name}},
Your payment of Rs. {{amount}} has been deposited successfully.
Account No: {{accountno}}
Total Amount: Rs. {{totalamount}}
Agent Name: {{agentname}}
Thank you for your payment!
```

**Variable Mapping:**
- `{{name}}` → Customer name (e.g., "Shreyas chudmunge")
- `{{amount}}` → Transaction amount (e.g., "1000")
- `{{accountno}}` → Account number (e.g., "20252606")
- `{{totalamount}}` → Total balance (e.g., "8999.96")
- `{{agentname}}` → Agent name (e.g., "Agent Name")

#### For Withdrawal Messages:

**Template should be:**
```
Dear {{name}},
Your withdrawal of Rs. {{amount}} has been processed successfully.
Account No: {{accountno}}
Remaining Balance: Rs. {{totalamount}}
Agent Name: {{agentname}}
Thank you!
```

### Step 3: Verify Template Syntax

Make sure the template uses **double curly braces** `{{variable}}` not single braces or other syntax.

Common template syntaxes:
- ✅ `{{name}}` - Correct
- ❌ `{name}` - Wrong
- ❌ `$name` - Wrong
- ❌ `%name%` - Wrong

### Step 4: Test Again

After updating the template:

1. Open `test-webhook.html` again
2. Click "Test Deposit"
3. You should now receive:
```
Dear Test Customer,
Your payment of Rs. 1000 has been deposited successfully.
Account No: ACC12345
Total Amount: Rs. 5000
Agent Name: Test Agent
Thank you for your payment!
```

## Alternative: Check Webhook Documentation

If the above doesn't work, check whatapi.in documentation for:

1. **Correct variable syntax** - They might use `{name}` or `$name` instead of `{{name}}`
2. **Parameter names** - They might expect different parameter names
3. **Template configuration** - How to set up message templates

## Quick Test URLs

### Test Deposit:
```
https://webhook.whatapi.in/webhook/69213b981b9845c02d533ccb?number=917058363608&message=bhishi&name=Test%20Customer&amount=1000&deposit=1000&accountno=ACC123&totalamount=5000&agentname=Test%20Agent
```

### Test Withdrawal:
```
https://webhook.whatapi.in/webhook/69213b981b9845c02d533ccb?number=917058363608&message=bhishi&name=Test%20Customer&amount=1000&withdrawal=1000&accountno=ACC123&totalamount=4000&agentname=Test%20Agent
```

Copy these URLs and paste them in your browser. They should trigger WhatsApp messages.

## If Still Not Working

### Option 1: Contact whatapi.in Support

Ask them:
1. What is the correct variable syntax for templates?
2. How to configure message templates for webhook `69213b981b9845c02d533ccb`?
3. Can they provide a working example?

### Option 2: Check Webhook Logs

If whatapi.in provides logs:
1. Check if the webhook is receiving the parameters
2. Verify the parameter values are correct
3. Check for any error messages

### Option 3: Use Different Variable Names

If whatapi.in expects different parameter names, update our code:

In `src/utils/whatsappNotification.js`, change the parameter names:

```javascript
// Current (if not working):
webhookUrl.searchParams.append('name', finalName);
webhookUrl.searchParams.append('amount', finalAmount.toString());
webhookUrl.searchParams.append('accountno', finalAccountNo);
webhookUrl.searchParams.append('totalamount', finalTotalAmount.toString());
webhookUrl.searchParams.append('agentname', finalAgentName);

// Try these alternatives:
webhookUrl.searchParams.append('customerName', finalName);
webhookUrl.searchParams.append('transactionAmount', finalAmount.toString());
webhookUrl.searchParams.append('accountNumber', finalAccountNo);
webhookUrl.searchParams.append('totalBalance', finalTotalAmount.toString());
webhookUrl.searchParams.append('agentName', finalAgentName);
```

## Summary

1. ✅ Our code is sending the correct data
2. ✅ Parameters are properly formatted
3. ❌ Webhook template needs to be configured on whatapi.in
4. 🔧 Update the template to use `{{name}}`, `{{amount}}`, `{{accountno}}`, `{{totalamount}}`, `{{agentname}}`
5. 🧪 Test with `test-webhook.html` file

The issue is **NOT in our code** - it's in the webhook template configuration on whatapi.in side!
