const http = require('https');

async function testWebhook(webhookId, title) {
  return new Promise((resolve) => {
    // using the exact encoded payload from the logs
    const url = `https://webhook.whatapi.in/webhook/${webhookId}?number=917058363608&message=bhishi,Manasvi,500.00,500.00,001,9599.99,divya,02/04/2026`;
    
    console.log(`\n--- Testing ${title} ---`);
    console.log(`URL: ${url}`);
    
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Status code: ${res.statusCode}`);
        console.log(`Response: ${data}`);
        resolve();
      });
    }).on('error', (err) => {
      console.log(`Error: ${err.message}`);
      resolve();
    });
  });
}

async function run() {
  await testWebhook('69213b981b9845c02d533ccb', 'Currently Used Webhook');
  await testWebhook('69aa76e002e28c7ee4e36141', 'Webhook From Test Page');
  await testWebhook('691c2fa62fa643ccdb4e4eaa', 'Maybe Old Webhook (example)');
}

run();
