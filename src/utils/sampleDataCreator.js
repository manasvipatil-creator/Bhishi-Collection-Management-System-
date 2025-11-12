import { 
  addAgent, 
  addCustomerToAgent, 
  addTransactionToCustomer 
} from './databaseHelpers.js';

/**
 * Sample Data Creator for Testing Nested Database Structure
 * Creates agents, customers, and transactions to test the new hierarchy
 */

export const createSampleData = async () => {
  try {
    console.log('🚀 Creating sample data for nested database structure...');

    // Create Agent 1
    const agent1Data = {
      name: 'Avantika Sharma',
      phone: '9876543456',
      password: 'securepass123',
      route: 'Route A - Central Area'
    };
    
    const agent1Id = await addAgent(agent1Data);
    console.log(`✅ Created Agent 1: ${agent1Id}`);

    // Create Agent 2
    const agent2Data = {
      name: 'Rajesh Kumar',
      phone: '9876543457',
      password: 'securepass456',
      route: 'Route B - North Area'
    };
    
    const agent2Id = await addAgent(agent2Data);
    console.log(`✅ Created Agent 2: ${agent2Id}`);

    // Add customers to Agent 1
    const customer1Data = {
      name: 'John Doe',
      phone: '9876543210',
      address: 'Village ABC, Taluka XYZ',
      joinDate: '2025-01-15',
      monthlyDue: 1000,
      balance: 0,
      status: 'active'
    };
    
    const customer1Id = await addCustomerToAgent(agent1Id, customer1Data);
    console.log(`✅ Added Customer 1 to Agent 1: ${customer1Id}`);

    const customer2Data = {
      name: 'Jane Smith',
      phone: '9876543211',
      address: 'Village DEF, Taluka PQR',
      joinDate: '2025-02-01',
      monthlyDue: 1500,
      balance: 0,
      status: 'active'
    };
    
    const customer2Id = await addCustomerToAgent(agent1Id, customer2Data);
    console.log(`✅ Added Customer 2 to Agent 1: ${customer2Id}`);

    // Add customers to Agent 2
    const customer3Data = {
      name: 'Amit Patel',
      phone: '9876543212',
      address: 'Village GHI, Taluka STU',
      joinDate: '2025-03-01',
      monthlyDue: 2000,
      balance: 0,
      status: 'active'
    };
    
    const customer3Id = await addCustomerToAgent(agent2Id, customer3Data);
    console.log(`✅ Added Customer 3 to Agent 2: ${customer3Id}`);

    const customer4Data = {
      name: 'Priya Sharma',
      phone: '9876543213',
      address: 'Village JKL, Taluka VWX',
      joinDate: '2025-04-01',
      monthlyDue: 1200,
      balance: 0,
      status: 'active'
    };
    
    const customer4Id = await addCustomerToAgent(agent2Id, customer4Data);
    console.log(`✅ Added Customer 4 to Agent 2: ${customer4Id}`);

    // Add transactions for Agent 1 customers
    // Customer 1 transactions
    await addTransactionToCustomer(agent1Id, customer1Id, {
      type: 'deposit',
      amount: 1000,
      date: '2025-01-15',
      mode: 'cash',
      remarks: 'Monthly deposit'
    });

    await addTransactionToCustomer(agent1Id, customer1Id, {
      type: 'penalty',
      amount: 50,
      date: '2025-02-20',
      mode: 'auto',
      remarks: 'Late payment penalty'
    });

    console.log(`✅ Added transactions for Customer 1`);

    // Customer 2 transactions
    await addTransactionToCustomer(agent1Id, customer2Id, {
      type: 'deposit',
      amount: 1500,
      date: '2025-02-01',
      mode: 'cash',
      remarks: 'Initial deposit'
    });

    console.log(`✅ Added transactions for Customer 2`);

    // Add transactions for Agent 2 customers
    // Customer 3 transactions
    await addTransactionToCustomer(agent2Id, customer3Id, {
      type: 'deposit',
      amount: 2000,
      date: '2025-03-01',
      mode: 'cash',
      remarks: 'Monthly deposit'
    });

    await addTransactionToCustomer(agent2Id, customer3Id, {
      type: 'withdrawal',
      amount: 500,
      date: '2025-03-15',
      mode: 'cash',
      remarks: 'Emergency withdrawal'
    });

    console.log(`✅ Added transactions for Customer 3`);

    // Customer 4 transactions
    await addTransactionToCustomer(agent2Id, customer4Id, {
      type: 'deposit',
      amount: 1200,
      date: '2025-04-01',
      mode: 'online',
      remarks: 'Monthly deposit via UPI'
    });

    console.log(`✅ Added transactions for Customer 4`);

    console.log('🎉 Sample data creation completed successfully!');
    
    return {
      agents: [
        { id: agent1Id, name: 'Avantika Sharma' },
        { id: agent2Id, name: 'Rajesh Kumar' }
      ],
      customers: [
        { id: customer1Id, name: 'John Doe', agentId: agent1Id },
        { id: customer2Id, name: 'Jane Smith', agentId: agent1Id },
        { id: customer3Id, name: 'Amit Patel', agentId: agent2Id },
        { id: customer4Id, name: 'Priya Sharma', agentId: agent2Id }
      ]
    };

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    throw error;
  }
};

// Function to test data retrieval
export const testDataRetrieval = async () => {
  try {
    console.log('🔍 Testing data retrieval...');
    
    const { getAllAgents, getAgentCustomers, getCustomerTransactions, getSystemStats } = await import('./databaseHelpers.js');
    
    // Test getting all agents
    const agents = await getAllAgents();
    console.log('📊 Total Agents:', agents.length);
    
    for (const agent of agents) {
      console.log(`\n👤 Agent: ${agent.name} (${agent.phone})`);
      
      // Get customers for this agent
      const customers = await getAgentCustomers(agent.id);
      console.log(`   📋 Customers: ${customers.length}`);
      
      for (const customer of customers) {
        console.log(`   👥 Customer: ${customer.name} - Balance: ₹${customer.balance}`);
        
        // Get transactions for this customer
        const transactions = await getCustomerTransactions(agent.id, customer.id);
        console.log(`      💳 Transactions: ${transactions.length}`);
        
        transactions.forEach(txn => {
          console.log(`         ${txn.type}: ₹${txn.amount} on ${txn.date} (${txn.mode})`);
        });
      }
    }
    
    // Test system stats
    const stats = await getSystemStats();
    console.log('\n📈 System Statistics:');
    console.log(`   Total Agents: ${stats.totalAgents}`);
    console.log(`   Total Customers: ${stats.totalCustomers}`);
    console.log(`   Total Balance: ₹${stats.totalBalance}`);
    console.log(`   Total Transactions: ${stats.totalTransactions}`);
    console.log(`   Average Balance per Customer: ₹${stats.averageBalancePerCustomer}`);
    
    console.log('✅ Data retrieval test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing data retrieval:', error);
    throw error;
  }
};

export default {
  createSampleData,
  testDataRetrieval
};
