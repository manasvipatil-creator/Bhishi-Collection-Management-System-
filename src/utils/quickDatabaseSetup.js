import { ref, get, set, push } from "firebase/database";
import { db } from "../firebase";

/**
 * Quick Database Setup for Bishi Collection System
 * Works with your existing Firebase database: bishi-collection-project-default-rtdb
 */

// Quick function to check what's currently in your database
export const checkCurrentDatabase = async () => {
  try {
    console.log('🔍 Checking your current database...');
    
    const agentsRef = ref(db, 'bishi_collection/agents');
    const snapshot = await get(agentsRef);
    
    if (snapshot.exists()) {
      const agents = snapshot.val();
      const agentIds = Object.keys(agents);
      
      console.log(`📊 Found ${agentIds.length} agents in database`);
      
      // Show details of first agent
      const firstAgent = agents[agentIds[0]];
      console.log('📋 First agent structure:');
      console.log('   - ID:', agentIds[0]);
      console.log('   - Has agentInfo:', !!firstAgent.agentInfo);
      console.log('   - Has customers:', !!firstAgent.customers);
      console.log('   - Has stats:', !!firstAgent.stats);
      console.log('   - Has transactions:', !!firstAgent.transactions);
      
      if (firstAgent.agentInfo) {
        console.log('👤 Agent Info:');
        console.log('   - Name:', firstAgent.agentInfo.agentName);
        console.log('   - Phone:', firstAgent.agentInfo.mobileNumber);
        console.log('   - Route:', firstAgent.agentInfo.route);
      }
      
      if (firstAgent.customers) {
        const customerCount = Object.keys(firstAgent.customers).length;
        console.log(`👥 Customers: ${customerCount}`);
      }
      
      return {
        success: true,
        agentCount: agentIds.length,
        sampleAgent: firstAgent,
        agentIds: agentIds
      };
    } else {
      console.log('📭 No agents found in database');
      return { success: true, agentCount: 0 };
    }
  } catch (error) {
    console.error('❌ Error checking database:', error);
    return { success: false, error: error.message };
  }
};

// Add a customer with nested transactions to existing agent
export const addCustomerWithTransactions = async (agentId, customerData) => {
  try {
    console.log(`👤 Adding customer to agent: ${agentId}`);
    
    // Create customer with nested transactions structure
    const customersRef = ref(db, `bishi_collection/agents/${agentId}/customers`);
    const newCustomerRef = push(customersRef);
    
    const customer = {
      customerId: newCustomerRef.key,
      name: customerData.name || 'New Customer',
      phone: customerData.phone || '',
      address: customerData.address || '',
      joinDate: customerData.joinDate || new Date().toISOString().split('T')[0],
      monthlyDue: customerData.monthlyDue || 1000,
      balance: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      transactions: {} // Empty transactions object for nested structure
    };
    
    await set(newCustomerRef, customer);
    console.log(`✅ Customer added with ID: ${newCustomerRef.key}`);
    
    return newCustomerRef.key;
  } catch (error) {
    console.error('❌ Error adding customer:', error);
    throw error;
  }
};

// Add transaction to specific customer
export const addTransactionToCustomer = async (agentId, customerId, transactionData) => {
  try {
    console.log(`💳 Adding transaction to customer: ${customerId}`);
    
    const transactionsRef = ref(db, `bishi_collection/agents/${agentId}/customers/${customerId}/transactions`);
    const newTransactionRef = push(transactionsRef);
    
    const transaction = {
      transactionId: newTransactionRef.key,
      type: transactionData.type || 'deposit',
      amount: transactionData.amount || 0,
      date: transactionData.date || new Date().toISOString().split('T')[0],
      mode: transactionData.mode || 'cash',
      remarks: transactionData.remarks || '',
      createdAt: new Date().toISOString()
    };
    
    await set(newTransactionRef, transaction);
    
    // Update customer balance
    await updateCustomerBalance(agentId, customerId);
    
    console.log(`✅ Transaction added with ID: ${newTransactionRef.key}`);
    return newTransactionRef.key;
  } catch (error) {
    console.error('❌ Error adding transaction:', error);
    throw error;
  }
};

// Update customer balance based on transactions
export const updateCustomerBalance = async (agentId, customerId) => {
  try {
    const transactionsRef = ref(db, `bishi_collection/agents/${agentId}/customers/${customerId}/transactions`);
    const snapshot = await get(transactionsRef);
    
    let balance = 0;
    
    if (snapshot.exists()) {
      const transactions = snapshot.val();
      Object.values(transactions).forEach(transaction => {
        if (transaction.type === 'deposit' || transaction.type === 'bonus') {
          balance += transaction.amount;
        } else if (transaction.type === 'withdrawal' || transaction.type === 'penalty') {
          balance -= transaction.amount;
        }
      });
    }
    
    // Update customer balance
    const balanceRef = ref(db, `bishi_collection/agents/${agentId}/customers/${customerId}/balance`);
    await set(balanceRef, balance);
    
    console.log(`💰 Updated customer balance: ₹${balance}`);
    return balance;
  } catch (error) {
    console.error('❌ Error updating balance:', error);
    throw error;
  }
};

// Get all customers for an agent with their transactions
export const getAgentCustomersWithTransactions = async (agentId) => {
  try {
    const customersRef = ref(db, `bishi_collection/agents/${agentId}/customers`);
    const snapshot = await get(customersRef);
    
    if (snapshot.exists()) {
      const customers = snapshot.val();
      return Object.entries(customers).map(([key, value]) => ({
        id: key,
        ...value,
        transactionCount: value.transactions ? Object.keys(value.transactions).length : 0
      }));
    }
    return [];
  } catch (error) {
    console.error('❌ Error getting customers:', error);
    return [];
  }
};

// Demo function to set up nested structure for existing agent
export const setupNestedStructureDemo = async () => {
  try {
    console.log('🚀 Setting up nested structure demo...');
    
    // Check current database
    const dbInfo = await checkCurrentDatabase();
    
    if (dbInfo.agentCount === 0) {
      console.log('📭 No agents found. Please add agents first.');
      return { success: false, message: 'No agents found' };
    }
    
    // Use first agent for demo
    const agentId = dbInfo.agentIds[0];
    console.log(`🎯 Using agent: ${agentId} for demo`);
    
    // Add a demo customer with nested transactions
    const demoCustomer = {
      name: 'Demo Customer',
      phone: '9999999999',
      address: 'Demo Village, Demo Taluka',
      joinDate: '2025-10-12',
      monthlyDue: 1500
    };
    
    const customerId = await addCustomerWithTransactions(agentId, demoCustomer);
    
    // Add some demo transactions
    await addTransactionToCustomer(agentId, customerId, {
      type: 'deposit',
      amount: 1500,
      date: '2025-10-12',
      mode: 'cash',
      remarks: 'Initial deposit'
    });
    
    await addTransactionToCustomer(agentId, customerId, {
      type: 'deposit',
      amount: 1500,
      date: '2025-10-13',
      mode: 'online',
      remarks: 'Monthly payment'
    });
    
    await addTransactionToCustomer(agentId, customerId, {
      type: 'penalty',
      amount: 75,
      date: '2025-10-14',
      mode: 'auto',
      remarks: 'Late payment penalty'
    });
    
    // Get updated customer data
    const customers = await getAgentCustomersWithTransactions(agentId);
    const demoCustomerData = customers.find(c => c.id === customerId);
    
    console.log('🎉 Demo setup completed!');
    console.log(`📊 Demo customer balance: ₹${demoCustomerData.balance}`);
    console.log(`💳 Demo customer transactions: ${demoCustomerData.transactionCount}`);
    
    return {
      success: true,
      agentId,
      customerId,
      customerBalance: demoCustomerData.balance,
      transactionCount: demoCustomerData.transactionCount
    };
    
  } catch (error) {
    console.error('❌ Error setting up demo:', error);
    return { success: false, error: error.message };
  }
};

export default {
  checkCurrentDatabase,
  addCustomerWithTransactions,
  addTransactionToCustomer,
  updateCustomerBalance,
  getAgentCustomersWithTransactions,
  setupNestedStructureDemo
};
