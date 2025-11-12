import { ref, get, set, push, remove } from "firebase/database";
import { db } from "../firebase";

/**
 * Database Migration Helper for Bishi Collection System
 * Migrates from old structure to new nested customer-transaction structure
 */

// Check current database structure
export const checkDatabaseStructure = async () => {
  try {
    console.log('🔍 Checking current database structure...');
    
    const agentsRef = ref(db, 'bishi_collection/agents');
    const snapshot = await get(agentsRef);
    
    if (snapshot.exists()) {
      const agents = snapshot.val();
      console.log('📊 Current agents in database:', Object.keys(agents).length);
      
      // Check structure of first agent
      const firstAgentId = Object.keys(agents)[0];
      const firstAgent = agents[firstAgentId];
      
      console.log('🏗️ Current structure for agent:', firstAgentId);
      console.log('   - Has agentInfo:', !!firstAgent.agentInfo);
      console.log('   - Has stats:', !!firstAgent.stats);
      console.log('   - Has customers:', !!firstAgent.customers);
      console.log('   - Has weeklyCollections:', !!firstAgent.weeklyCollections);
      console.log('   - Has transactions:', !!firstAgent.transactions);
      
      return {
        hasAgents: true,
        agentCount: Object.keys(agents).length,
        structure: {
          hasAgentInfo: !!firstAgent.agentInfo,
          hasStats: !!firstAgent.stats,
          hasCustomers: !!firstAgent.customers,
          hasWeeklyCollections: !!firstAgent.weeklyCollections,
          hasTransactions: !!firstAgent.transactions
        },
        sampleAgent: firstAgent
      };
    } else {
      console.log('📭 No agents found in database');
      return { hasAgents: false };
    }
  } catch (error) {
    console.error('❌ Error checking database structure:', error);
    return { hasAgents: false, error: error.message };
  }
};

// Migrate old structure to new nested structure
export const migrateToNestedStructure = async () => {
  try {
    console.log('🚀 Starting migration to nested structure...');
    
    const structureInfo = await checkDatabaseStructure();
    
    if (!structureInfo.hasAgents) {
      console.log('📭 No existing data to migrate');
      return { success: true, message: 'No data to migrate' };
    }
    
    const agentsRef = ref(db, 'bishi_collection/agents');
    const snapshot = await get(agentsRef);
    const agents = snapshot.val();
    
    let migratedCount = 0;
    
    for (const [agentId, agentData] of Object.entries(agents)) {
      console.log(`🔄 Migrating agent: ${agentId}`);
      
      // Create new agent structure
      const newAgentData = {
        agentId: agentId,
        name: agentData.agentInfo?.agentName || agentData.name || 'Unknown Agent',
        phone: agentData.agentInfo?.mobileNumber || agentData.phone || '',
        password: agentData.agentInfo?.password || 'defaultpass123',
        route: agentData.agentInfo?.route || agentData.route || 'Default Route',
        createdAt: agentData.agentInfo?.createdAt || new Date().toISOString(),
        customers: {}
      };
      
      // Migrate existing customers if any
      if (agentData.customers) {
        for (const [customerId, customerData] of Object.entries(agentData.customers)) {
          console.log(`   👤 Migrating customer: ${customerId}`);
          
          const newCustomerData = {
            customerId: customerId,
            name: customerData.customerName || customerData.name || 'Unknown Customer',
            phone: customerData.mobileNumber || customerData.phone || '',
            address: `${customerData.village || ''}, ${customerData.taluka || ''}`.trim() || customerData.address || '',
            joinDate: customerData.startDate || customerData.joinDate || new Date().toISOString().split('T')[0],
            monthlyDue: customerData.weeklyAmount || customerData.monthlyDue || 0,
            balance: customerData.currentBalance || customerData.balance || 0,
            status: customerData.status || 'active',
            transactions: {}
          };
          
          // Migrate existing transactions if any (from agent level to customer level)
          if (agentData.transactions) {
            for (const [txnId, txnData] of Object.entries(agentData.transactions)) {
              if (txnData.customerId === customerId) {
                console.log(`      💳 Migrating transaction: ${txnId}`);
                
                newCustomerData.transactions[txnId] = {
                  transactionId: txnId,
                  type: txnData.type || 'deposit',
                  amount: txnData.amount || 0,
                  date: txnData.date || new Date().toISOString().split('T')[0],
                  mode: 'cash', // Default mode
                  remarks: txnData.description || txnData.remarks || '',
                  createdAt: txnData.createdAt || new Date().toISOString(),
                  timestamp: txnData.timestamp || Date.now()
                };
              }
            }
          }
          
          newAgentData.customers[customerId] = newCustomerData;
        }
      }
      
      // Update agent with new structure
      const agentRef = ref(db, `bishi_collection/agents/${agentId}`);
      await set(agentRef, newAgentData);
      
      migratedCount++;
      console.log(`✅ Agent ${agentId} migrated successfully`);
    }
    
    console.log(`🎉 Migration completed! Migrated ${migratedCount} agents`);
    
    return {
      success: true,
      message: `Successfully migrated ${migratedCount} agents to nested structure`,
      migratedCount
    };
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    return {
      success: false,
      message: `Migration failed: ${error.message}`,
      error: error.message
    };
  }
};

// Create backup of current data before migration
export const createBackup = async () => {
  try {
    console.log('💾 Creating backup of current data...');
    
    const agentsRef = ref(db, 'bishi_collection/agents');
    const snapshot = await get(agentsRef);
    
    if (snapshot.exists()) {
      const backupData = snapshot.val();
      const backupRef = ref(db, `backup_${Date.now()}`);
      await set(backupRef, backupData);
      
      console.log('✅ Backup created successfully');
      return { success: true, backupKey: `backup_${Date.now()}` };
    } else {
      console.log('📭 No data to backup');
      return { success: true, message: 'No data to backup' };
    }
  } catch (error) {
    console.error('❌ Error creating backup:', error);
    return { success: false, error: error.message };
  }
};

// Test the new structure with sample data
export const testNestedStructure = async () => {
  try {
    console.log('🧪 Testing nested structure...');
    
    // Import helper functions
    const { addAgent, addCustomerToAgent, addTransactionToCustomer, getAgentCustomers, getCustomerTransactions } = await import('./databaseHelpers.js');
    
    // Create a test agent
    const testAgentData = {
      name: 'Test Agent',
      phone: '9999999999',
      password: 'testpass123',
      route: 'Test Route'
    };
    
    const testAgentId = await addAgent(testAgentData);
    console.log(`✅ Created test agent: ${testAgentId}`);
    
    // Add a test customer
    const testCustomerData = {
      name: 'Test Customer',
      phone: '8888888888',
      address: 'Test Address',
      joinDate: '2025-10-12',
      monthlyDue: 1000,
      balance: 0,
      status: 'active'
    };
    
    const testCustomerId = await addCustomerToAgent(testAgentId, testCustomerData);
    console.log(`✅ Created test customer: ${testCustomerId}`);
    
    // Add a test transaction
    const testTransactionData = {
      type: 'deposit',
      amount: 1000,
      date: '2025-10-12',
      mode: 'cash',
      remarks: 'Test deposit'
    };
    
    const testTransactionId = await addTransactionToCustomer(testAgentId, testCustomerId, testTransactionData);
    console.log(`✅ Created test transaction: ${testTransactionId}`);
    
    // Verify the structure
    const customers = await getAgentCustomers(testAgentId);
    const transactions = await getCustomerTransactions(testAgentId, testCustomerId);
    
    console.log(`📊 Test Results:`);
    console.log(`   Customers: ${customers.length}`);
    console.log(`   Transactions: ${transactions.length}`);
    console.log(`   Customer Balance: ₹${customers[0]?.balance || 0}`);
    
    // Clean up test data
    const testAgentRef = ref(db, `bishi_collection/agents/${testAgentId}`);
    await remove(testAgentRef);
    console.log('🧹 Cleaned up test data');
    
    return {
      success: true,
      message: 'Nested structure test completed successfully',
      testResults: {
        customers: customers.length,
        transactions: transactions.length,
        balance: customers[0]?.balance || 0
      }
    };
    
  } catch (error) {
    console.error('❌ Error testing nested structure:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  checkDatabaseStructure,
  migrateToNestedStructure,
  createBackup,
  testNestedStructure
};
