# Test Webhook URL

## What We're Currently Sending

When a deposit of Rs. 1000 is made for Shreyas chudmunge:

```
https://webhook.whatapi.in/webhook/69213b981b9845c02d533ccb?number=917757921239&message=bhishi&name=Shreyas%20chudmunge&amount=1000&deposit=1000&accountno=20252606&totalamount=8999.96&agentname=Agent%20Name
```

## Parameters Being Sent

| Parameter | Value | Description |
|-----------|-------|-------------|
| `number` | 917757921239 | Customer phone with 91 prefix |
| `message` | bhishi | Fixed identifier |
| `name` | Shreyas chudmunge | Customer name |
| `amount` | 1000 | Transaction amount |
| `deposit` | 1000 | Deposit amount (same as amount) |
| `accountno` | 20252606 | Account number |
| `totalamount` | 8999.96 | Total balance after deposit |
| `agentname` | Agent Name | Agent name |

## Test This URL

Copy this URL and paste it in your browser to test:

```
https://webhook.whatapi.in/webhook/69213b981b9845c02d533ccb?number=917058363608&message=bhishi&name=Test%20Customer&amount=1000&deposit=1000&accountno=ACC123&totalamount=5000&agentname=Test%20Agent
```

This should send a WhatsApp message to 917058363608 with:
- Name: Test Customer
- Amount: 1000
- Deposit: 1000
- Account: ACC123
- Total: 5000
- Agent: Test Agent

## If Still Getting "undefined"

The webhook template on whatapi.in needs to be configured to use these variable names:

### For Deposit Message Template:
```
Dear {{name}},
Your payment of Rs. {{amount}} has been {{deposit}} successfully.
Account No: {{accountno}}
Total Amount: Rs. {{totalamount}}
Agent Name: {{agentname}}
Thank you for your payment!
```

### For Withdrawal Message Template:
```
Dear {{name}},
Your withdrawal of Rs. {{amount}} has been {{withdrawal}} successfully.
Account No: {{accountno}}
Remaining Balance: Rs. {{totalamount}}
Agent Name: {{agentname}}
Thank you!
```

## Action Required

You need to configure the message template on whatapi.in dashboard to use the correct variable names as shown above.

The variables should be:
- `{{name}}` - Customer name
- `{{amount}}` - Transaction amount
- `{{deposit}}` or `{{withdrawal}}` - Transaction type specific amount
- `{{accountno}}` - Account number
- `{{totalamount}}` - Total/remaining balance
- `{{agentname}}` - Agent name
