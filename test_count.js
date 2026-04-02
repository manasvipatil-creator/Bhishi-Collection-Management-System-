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
  
  console.log("Check 7 items (Old format)");
  await testGeneric(webhookId, {
    number: '917058363608',
    message: 'bhishi,Manasvi,500,500,001,9599.99,divya'
  }, "7 items");

  console.log("\nCheck 8 items (The mapping I just applied)");
  await testGeneric(webhookId, {
    number: '917058363608',
    message: 'bhishi,Manasvi,500,500,001,9599.99,divya,02/04/2026'
  }, "8 items");
}

run();
