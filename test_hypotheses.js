const http = require('https');

async function testGeneric(webhookId, params, title) {
  return new Promise((resolve) => {
    const query = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    const url = `https://webhook.whatapi.in/webhook/${webhookId}?${query}`;
    
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
  const webhookId = '69213b981b9845c02d533ccb';
  
  console.log("Hypothesis 1: Single comma-separated message parameter (current implementation)");
  await testGeneric(webhookId, {
    number: '917058363608',
    message: 'bhishi,Manasvi,500,500,001,9599.99,divya,02/04/2026'
  }, "Comma separated");

  console.log("\nHypothesis 2: Individual parameters (hint from TestWhatsApp.jsx UI)");
  await testGeneric(webhookId, {
    number: '917058363608',
    message: 'bhishi',
    name: 'Manasvi',
    amount: '500',
    deposit: '500',
    accountno: '001',
    totalamount: '9599.99',
    agentname: 'divya'
  }, "Individual parameters");
  
  console.log("\nHypothesis 3: Comma separated WITHOUT templates name at start (if it's in the webhook config itself)");
  await testGeneric(webhookId, {
    number: '917058363608',
    message: 'Manasvi,500,500,001,9599.99,divya,02/04/2026'
  }, "Comma separated NO name");
}

run();
