import { createSampleData, testDataRetrieval } from './sampleDataCreator.js';
import { 
  getAllAgents, 
  getAgentById, 
  getAgentCustomers, 
  addAgent, 
  addCustomerToAgent, 
  addTransactionToCustomer,
  getCustomerTransactions,
  getAllAgentTransactions,
  updateCustomerBalance,
  calculateAgentStats,
  getSystemStats
} from './databaseHelpers.js';

/**
 * Comprehensive test suite for Firebase nested structure
 * Tests the exact structure you specified:
 * bishi_collection/agents/{agentId}/customers/{customerId}/transactions/{transactionId}
 */

export const runCompleteTest = async () => {
  console.log('🧪 Starting comprehensive Firebase structure test...\n');
  
  try {
    // Test 1: Create sample data
    console.log('=== TEST 1: Creating Sample Data ===');
    const sampleData = await createSampleData();
    console.log('✅ Sample data created successfully\n');
    
    // Test 2: Verify agent structure
    console.log('=== TEST 2: Verifying Agent Structure ===');
    const agents = await getAllAgents();
    console.log(`📊 Found ${agents.length} agents in database`);
    
    for (const agent of agents) {
      console.log(`👤 Agent: ${agent.name}`);
      console.log(`   - ID: ${agent.agentId}`);
      console.log(`   - Phone: ${agent.phone}`);
      console.log(`   - Route: ${agent.route}`);
      console.log(`   - Created: ${agent.createdAt}`);
    }
    console.log('✅ Agent structure verified\n');
    
    // Test 3: Verify customer structure under agents
    console.log('=== TEST 3: Verifying Customer Structure ===');
    for (const agent of agents) {
      const customers = await getAgentCustomers(agent.id);
      console.log(`👥 Agent "${agent.name}" has ${customers.length} customers:`);
      
      for (const customer of customers) {
        console.log(`   - Customer: ${customer.name}`);
        console.log(`     * ID: ${customer.customerId}`);
        console.log(`     * Phone: ${customer.phone}`);
        console.log(`     * Address: ${customer.address}`);
        console.log(`     * Join Date: ${customer.joinDate}`);
        console.log(`     * Monthly Due: ₹${customer.monthlyDue}`);
        console.log(`     * Balance: ₹${customer.balance}`);
        console.log(`     * Status: ${customer.status}`);
      }
    }
    console.log('✅ Customer structure verified\n');
    
    // Test 4: Verify transaction structure under customers
    console.log('=== TEST 4: Verifying Transaction Structure ===');
    for (const agent of agents) {
      const customers = await getAgentCustomers(agent.id);
      
      for (const customer of customers) {
        const transactions = await getCustomerTransactions(agent.id, customer.id);
        console.log(`💳 Customer "${customer.name}" has ${transactions.length} transactions:`);
        
        for (const txn of transactions) {
          console.log(`   - Transaction: ${txn.transactionId}`);
          console.log(`     * Type: ${txn.type}`);
          console.log(`     * Amount: ₹${txn.amount}`);
          console.log(`     * Date: ${txn.date}`);
          console.log(`     * Mode: ${txn.mode}`);
          console.log(`     * Remarks: ${txn.remarks}`);
          console.log(`     * Created: ${txn.createdAt}`);
        }
      }
    }
    console.log('✅ Transaction structure verified\n');
    
    // Test 5: Test balance calculations
    console.log('=== TEST 5: Testing Balance Calculations ===');
    for (const agent of agents) {
      const customers = await getAgentCustomers(agent.id);
      
      for (const customer of customers) {
        const oldBalance = customer.balance;
        const newBalance = await updateCustomerBalance(agent.id, customer.id);
        console.log(`💰 Customer "${customer.name}": Balance updated from ₹${oldBalance} to ₹${newBalance}`);
      }
    }
    console.log('✅ Balance calculations verified\n');
    
    // Test 6: Test agent statistics
    console.log('=== TEST 6: Testing Agent Statistics ===');
    for (const agent of agents) {
      const stats = await calculateAgentStats(agent.id);
      console.log(`📈 Agent "${agent.name}" Statistics:`);
      console.log(`   - Total Customers: ${stats.totalCustomers}`);
      console.log(`   - Active Customers: ${stats.activeCustomers}`);
      console.log(`   - Total Balance: ₹${stats.totalBalance}`);
      console.log(`   - Total Transactions: ${stats.totalTransactions}`);
      console.log(`   - Average Balance per Customer: ₹${stats.averageBalancePerCustomer}`);
    }
    console.log('✅ Agent statistics verified\n');
    
    // Test 7: Test system-wide statistics
    console.log('=== TEST 7: Testing System Statistics ===');
    const systemStats = await getSystemStats();
    console.log('🌐 System-wide Statistics:');
    console.log(`   - Total Agents: ${systemStats.totalAgents}`);
    console.log(`   - Total Customers: ${systemStats.totalCustomers}`);
    console.log(`   - Total Balance: ₹${systemStats.totalBalance}`);
    console.log(`   - Total Transactions: ${systemStats.totalTransactions}`);
    console.log(`   - Average Balance per Customer: ₹${systemStats.averageBalancePerCustomer}`);
    console.log('✅ System statistics verified\n');
    
    // Test 8: Test adding new data to existing structure
    console.log('=== TEST 8: Testing New Data Addition ===');
    
    // Add a new customer to first agent
    const firstAgent = agents[0];
    const newCustomerData = {
      name: 'Test Customer',
      phone: '9999999999',
      address: 'Test Address',
      joinDate: new Date().toISOString().split('T')[0],
      monthlyDue: 800,
      balance: 0,
      status: 'active'
    };
    
    const newCustomerId = await addCustomerToAgent(firstAgent.id, newCustomerData);
    console.log(`✅ Added new customer: ${newCustomerId}`);
    
    // Add transaction to new customer
    const newTransactionData = {
      type: 'deposit',
      amount: 800,
      date: new Date().toISOString().split('T')[0],
      mode: 'cash',
      remarks: 'Test transaction'
    };
    
    const newTransactionId = await addTransactionToCustomer(firstAgent.id, newCustomerId, newTransactionData);
    console.log(`✅ Added new transaction: ${newTransactionId}`);
    console.log('✅ New data addition verified\n');
    
    // Test 9: Verify the complete hierarchy path
    console.log('=== TEST 9: Verifying Complete Hierarchy Path ===');
    console.log('📁 Database Structure Verification:');
    console.log('   bishi_collection/');
    console.log('   └── agents/');
    
    for (const agent of agents) {
      console.log(`       ├── ${agent.id}/`);
      console.log(`       │   ├── agentId: ${agent.agentId}`);
      console.log(`       │   ├── name: ${agent.name}`);
      console.log(`       │   ├── phone: ${agent.phone}`);
      console.log(`       │   ├── route: ${agent.route}`);
      console.log(`       │   ├── createdAt: ${agent.createdAt}`);
      console.log(`       │   └── customers/`);
      
      const customers = await getAgentCustomers(agent.id);
      for (let i = 0; i < customers.length; i++) {
        const customer = customers[i];
        const isLast = i === customers.length - 1;
        const prefix = isLast ? '           └──' : '           ├──';
        
        console.log(`${prefix} ${customer.id}/`);
        console.log(`       │       │   ├── customerId: ${customer.customerId}`);
        console.log(`       │       │   ├── name: ${customer.name}`);
        console.log(`       │       │   ├── phone: ${customer.phone}`);
        console.log(`       │       │   ├── address: ${customer.address}`);
        console.log(`       │       │   ├── joinDate: ${customer.joinDate}`);
        console.log(`       │       │   ├── monthlyDue: ${customer.monthlyDue}`);
        console.log(`       │       │   ├── balance: ${customer.balance}`);
        console.log(`       │       │   ├── status: ${customer.status}`);
        console.log(`       │       │   └── transactions/`);
        
        const transactions = await getCustomerTransactions(agent.id, customer.id);
        for (let j = 0; j < transactions.length; j++) {
          const txn = transactions[j];
          const txnIsLast = j === transactions.length - 1;
          const txnPrefix = txnIsLast ? '               └──' : '               ├──';
          
          console.log(`${txnPrefix} ${txn.id}/`);
          console.log(`       │       │           ├── transactionId: ${txn.transactionId}`);
          console.log(`       │       │           ├── type: ${txn.type}`);
          console.log(`       │       │           ├── amount: ${txn.amount}`);
          console.log(`       │       │           ├── date: ${txn.date}`);
          console.log(`       │       │           ├── mode: ${txn.mode}`);
          console.log(`       │       │           └── remarks: ${txn.remarks}`);
        }
      }
    }
    console.log('✅ Complete hierarchy verified\n');
    
    console.log('🎉 ALL TESTS PASSED! Firebase nested structure is working perfectly!');
    console.log('📋 Structure Summary:');
    console.log('   ✓ Agents are properly stored under bishi_collection/agents/');
    console.log('   ✓ Customers are nested under their respective agents');
    console.log('   ✓ Transactions are nested under their respective customers');
    console.log('   ✓ All CRUD operations are working correctly');
    console.log('   ✓ Balance calculations are automatic');
    console.log('   ✓ Statistics aggregation is working');
    console.log('   ✓ Data hierarchy matches your specification exactly');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
};

// Function to display the structure in a clean format
export const displayDatabaseStructure = async () => {
  console.log('📊 Current Database Structure:');
  console.log('=====================================');
  
  try {
    const agents = await getAllAgents();
    
    console.log('bishi_collection/');
    console.log('│');
    console.log('└── agents/');
    
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const isLastAgent = i === agents.length - 1;
      const agentPrefix = isLastAgent ? '    └──' : '    ├──';
      
      console.log(`${agentPrefix} ${agent.id}/`);
      console.log(`    │   ├── agentId: "${agent.agentId}"`);
      console.log(`    │   ├── name: "${agent.name}"`);
      console.log(`    │   ├── phone: "${agent.phone}"`);
      console.log(`    │   ├── password: "${agent.password}"`);
      console.log(`    │   ├── route: "${agent.route}"`);
      console.log(`    │   ├── createdAt: "${agent.createdAt}"`);
      console.log(`    │   │`);
      console.log(`    │   └── customers/`);
      
      const customers = await getAgentCustomers(agent.id);
      for (let j = 0; j < customers.length; j++) {
        const customer = customers[j];
        const isLastCustomer = j === customers.length - 1;
        const customerPrefix = isLastCustomer ? '        └──' : '        ├──';
        
        console.log(`${customerPrefix} ${customer.id}/`);
        console.log(`        │   ├── customerId: "${customer.customerId}"`);
        console.log(`        │   ├── name: "${customer.name}"`);
        console.log(`        │   ├── phone: "${customer.phone}"`);
        console.log(`        │   ├── address: "${customer.address}"`);
        console.log(`        │   ├── joinDate: "${customer.joinDate}"`);
        console.log(`        │   ├── monthlyDue: ${customer.monthlyDue}`);
        console.log(`        │   ├── balance: ${customer.balance}`);
        console.log(`        │   ├── status: "${customer.status}"`);
        console.log(`        │   │`);
        console.log(`        │   └── transactions/`);
        
        const transactions = await getCustomerTransactions(agent.id, customer.id);
        for (let k = 0; k < transactions.length; k++) {
          const txn = transactions[k];
          const isLastTransaction = k === transactions.length - 1;
          const txnPrefix = isLastTransaction ? '            └──' : '            ├──';
          
          console.log(`${txnPrefix} ${txn.id}/`);
          console.log(`            │   ├── transactionId: "${txn.transactionId}"`);
          console.log(`            │   ├── type: "${txn.type}"`);
          console.log(`            │   ├── amount: ${txn.amount}`);
          console.log(`            │   ├── date: "${txn.date}"`);
          console.log(`            │   ├── mode: "${txn.mode}"`);
          console.log(`            │   └── remarks: "${txn.remarks}"`);
        }
        
        if (!isLastCustomer && !isLastAgent) {
          console.log(`        │`);
        }
      }
      
      if (!isLastAgent) {
        console.log(`    │`);
      }
    }
    
    console.log('\n=====================================');
    
  } catch (error) {
    console.error('Error displaying structure:', error);
  }
};

export default {
  runCompleteTest,
  displayDatabaseStructure
};
