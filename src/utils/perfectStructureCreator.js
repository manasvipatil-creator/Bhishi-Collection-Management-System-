import { ref, set } from "firebase/database";
import { db } from "../firebase";

/**
 * Perfect Structure Creator for Bishi Collection System
 * Creates the exact structure as specified with sample data
 */

export const createPerfectStructure = async () => {
  try {
    console.log('🚀 Creating perfect bishi_collection structure...');

    // Define the complete structure with sample data
    const perfectStructure = {
      bishi_collection: {
        agents: {
          agent_001: {
            agentId: "agent_001",
            name: "Amit Sharma",
            phone: "9876543210",
            password: "amit123",
            route: "Route A - Central Area",
            createdAt: "2025-10-12T19:37:49+05:30",
            customers: {
              cust_001: {
                customerId: "cust_001",
                name: "Rajesh Patil",
                phone: "9876543211",
                address: "Village ABC, Taluka XYZ, Dist Sangli",
                joinDate: "2025-01-15",
                monthlyDue: 1000,
                balance: 2950,
                status: "active",
                transactions: {
                  txn_001: {
                    transactionId: "txn_001",
                    type: "deposit",
                    amount: 1000,
                    date: "2025-01-15",
                    mode: "cash",
                    remarks: "Monthly collection - January"
                  },
                  txn_002: {
                    transactionId: "txn_002",
                    type: "deposit",
                    amount: 1000,
                    date: "2025-02-15",
                    mode: "cash",
                    remarks: "Monthly collection - February"
                  },
                  txn_003: {
                    transactionId: "txn_003",
                    type: "deposit",
                    amount: 1000,
                    date: "2025-03-15",
                    mode: "online",
                    remarks: "Monthly collection - March (UPI)"
                  },
                  txn_004: {
                    transactionId: "txn_004",
                    type: "penalty",
                    amount: 50,
                    date: "2025-04-01",
                    mode: "auto",
                    remarks: "Late payment penalty"
                  }
                }
              },
              cust_002: {
                customerId: "cust_002",
                name: "Priya Desai",
                phone: "9876543212",
                address: "Village DEF, Taluka PQR, Dist Kolhapur",
                joinDate: "2025-02-01",
                monthlyDue: 1500,
                balance: 4500,
                status: "active",
                transactions: {
                  txn_001: {
                    transactionId: "txn_001",
                    type: "deposit",
                    amount: 1500,
                    date: "2025-02-01",
                    mode: "cash",
                    remarks: "Initial deposit"
                  },
                  txn_002: {
                    transactionId: "txn_002",
                    type: "deposit",
                    amount: 1500,
                    date: "2025-03-01",
                    mode: "cash",
                    remarks: "Monthly collection - March"
                  },
                  txn_003: {
                    transactionId: "txn_003",
                    type: "deposit",
                    amount: 1500,
                    date: "2025-04-01",
                    mode: "online",
                    remarks: "Monthly collection - April (Bank Transfer)"
                  }
                }
              }
            }
          },
          agent_002: {
            agentId: "agent_002",
            name: "Sunita Kumar",
            phone: "9876543213",
            password: "sunita123",
            route: "Route B - North Area",
            createdAt: "2025-10-12T19:37:49+05:30",
            customers: {
              cust_001: {
                customerId: "cust_001",
                name: "Vikram Singh",
                phone: "9876543214",
                address: "Village GHI, Taluka STU, Dist Pune",
                joinDate: "2025-03-01",
                monthlyDue: 2000,
                balance: 5500,
                status: "active",
                transactions: {
                  txn_001: {
                    transactionId: "txn_001",
                    type: "deposit",
                    amount: 2000,
                    date: "2025-03-01",
                    mode: "cash",
                    remarks: "Initial deposit"
                  },
                  txn_002: {
                    transactionId: "txn_002",
                    type: "deposit",
                    amount: 2000,
                    date: "2025-04-01",
                    mode: "cash",
                    remarks: "Monthly collection - April"
                  },
                  txn_003: {
                    transactionId: "txn_003",
                    type: "withdrawal",
                    amount: 500,
                    date: "2025-04-15",
                    mode: "cash",
                    remarks: "Emergency withdrawal"
                  }
                }
              },
              cust_002: {
                customerId: "cust_002",
                name: "Meera Joshi",
                phone: "9876543215",
                address: "Village JKL, Taluka VWX, Dist Mumbai",
                joinDate: "2025-04-01",
                monthlyDue: 1200,
                balance: 1200,
                status: "active",
                transactions: {
                  txn_001: {
                    transactionId: "txn_001",
                    type: "deposit",
                    amount: 1200,
                    date: "2025-04-01",
                    mode: "online",
                    remarks: "Monthly deposit via UPI"
                  }
                }
              }
            }
          }
        }
      }
    };

    // Write the complete structure to Firebase
    const rootRef = ref(db, '/');
    await set(rootRef, perfectStructure);

    console.log('✅ Perfect structure created successfully!');
    
    // Return summary
    const summary = {
      success: true,
      structure: {
        root: "bishi_collection",
        agents: 2,
        totalCustomers: 4,
        totalTransactions: 10,
        agents_details: [
          {
            id: "agent_001",
            name: "Amit Sharma",
            customers: 2,
            transactions: 7
          },
          {
            id: "agent_002", 
            name: "Sunita Kumar",
            customers: 2,
            transactions: 4
          }
        ]
      }
    };

    return summary;

  } catch (error) {
    console.error('❌ Error creating perfect structure:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Function to verify the created structure
export const verifyStructure = async () => {
  try {
    console.log('🔍 Verifying created structure...');

    const { getAllAgents, getAgentCustomers, getCustomerTransactions } = await import('./databaseHelpers.js');

    // Get all agents
    const agents = await getAllAgents();
    console.log(`📊 Found ${agents.length} agents`);

    let totalCustomers = 0;
    let totalTransactions = 0;

    for (const agent of agents) {
      console.log(`\n👤 Agent: ${agent.name} (${agent.agentId})`);
      
      // Get customers for this agent
      const customers = await getAgentCustomers(agent.id);
      totalCustomers += customers.length;
      console.log(`   📋 Customers: ${customers.length}`);

      for (const customer of customers) {
        console.log(`   👥 Customer: ${customer.name} - Balance: ₹${customer.balance}`);
        
        // Get transactions for this customer
        const transactions = await getCustomerTransactions(agent.id, customer.id);
        totalTransactions += transactions.length;
        console.log(`      💳 Transactions: ${transactions.length}`);

        transactions.forEach((txn, index) => {
          console.log(`         ${index + 1}. ${txn.type}: ₹${txn.amount} on ${txn.date} (${txn.mode})`);
        });
      }
    }

    console.log('\n📈 Structure Verification Summary:');
    console.log(`   Total Agents: ${agents.length}`);
    console.log(`   Total Customers: ${totalCustomers}`);
    console.log(`   Total Transactions: ${totalTransactions}`);

    return {
      success: true,
      verification: {
        agents: agents.length,
        customers: totalCustomers,
        transactions: totalTransactions
      }
    };

  } catch (error) {
    console.error('❌ Error verifying structure:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Function to add more sample data to existing structure
export const addMoreSampleData = async () => {
  try {
    console.log('📝 Adding more sample data...');

    const { addAgent, addCustomerToAgent, addTransactionToCustomer } = await import('./databaseHelpers.js');

    // Add a third agent
    const agent3Data = {
      name: 'Rahul Mehta',
      phone: '9876543216',
      password: 'rahul123',
      route: 'Route C - South Area'
    };

    const agent3Id = await addAgent(agent3Data);
    console.log(`✅ Added Agent 3: ${agent3Id}`);

    // Add customers to Agent 3
    const customer1Data = {
      name: 'Anjali Patel',
      phone: '9876543217',
      address: 'Village MNO, Taluka RST, Dist Nashik',
      joinDate: '2025-05-01',
      monthlyDue: 800,
      balance: 0,
      status: 'active'
    };

    const customer1Id = await addCustomerToAgent(agent3Id, customer1Data);
    console.log(`✅ Added Customer 1 to Agent 3: ${customer1Id}`);

    // Add transactions for the new customer
    await addTransactionToCustomer(agent3Id, customer1Id, {
      type: 'deposit',
      amount: 800,
      date: '2025-05-01',
      mode: 'cash',
      remarks: 'Initial deposit'
    });

    await addTransactionToCustomer(agent3Id, customer1Id, {
      type: 'deposit',
      amount: 800,
      date: '2025-06-01',
      mode: 'online',
      remarks: 'Monthly collection - June'
    });

    console.log('✅ Added sample transactions');

    return {
      success: true,
      message: 'Additional sample data added successfully',
      newAgent: agent3Id,
      newCustomer: customer1Id
    };

  } catch (error) {
    console.error('❌ Error adding sample data:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  createPerfectStructure,
  verifyStructure,
  addMoreSampleData
};
