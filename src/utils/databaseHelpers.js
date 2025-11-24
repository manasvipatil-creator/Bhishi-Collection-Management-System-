import { ref, get, set, push } from "firebase/database";
import { db } from "../firebase";
import { sendDepositNotification, sendWithdrawalNotification, sendCreditNotification } from "./whatsappNotification";

/**
 * Database Helper Functions for Nested Agent-Customer-Transaction Structure
 * Structure: bishi_collection/agents/{agentId}/customers/{customerId}/transactions/{transactionId}
 */

// Get all agents with their complete data
export const getAllAgents = async () => {
  try {
    const agentsRef = ref(db, 'agents');
    const snapshot = await get(agentsRef);
    
    if (snapshot.exists()) {
      const agents = snapshot.val();
      return Object.entries(agents).map(([key, value]) => ({
        id: key,  // This is the mobile number
        agentId: value.agentInfo?.agentId || key,
        name: value.agentInfo?.agentName || '',
        phone: key,  // The key itself is the mobile number
        mobileNumber: value.agentInfo?.mobileNumber || key,
        password: value.agentInfo?.password || '',
        routes: value.agentInfo?.routes || (value.agentInfo?.route ? [value.agentInfo.route] : []),
        status: value.agentInfo?.status || 'active',
        createdAt: value.agentInfo?.createdAt || '',
        timestamp: value.agentInfo?.timestamp || '',
        customers: value.customers || {},
        transactions: value.transactions || {}
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching agents:", error);
    return [];
  }
};

// Get specific agent by ID (mobile number)
export const getAgentById = async (agentPhone) => {
  try {
    const agentRef = ref(db, `agents/${agentPhone}`);
    const snapshot = await get(agentRef);
    
    if (snapshot.exists()) {
      const value = snapshot.val();
      return {
        id: agentPhone,
        agentId: value.agentInfo?.agentId || agentPhone,
        name: value.agentInfo?.agentName || '',
        phone: agentPhone,
        mobileNumber: value.agentInfo?.mobileNumber || agentPhone,
        password: value.agentInfo?.password || '',
        routes: value.agentInfo?.routes || (value.agentInfo?.route ? [value.agentInfo.route] : []),
        status: value.agentInfo?.status || 'active',
        createdAt: value.agentInfo?.createdAt || '',
        timestamp: value.agentInfo?.timestamp || '',
        customers: value.customers || {},
        transactions: value.transactions || {}
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching agent:", error);
    return null;
  }
};

// Get agent's customers with their transactions
export const getAgentCustomers = async (agentPhone) => {
  try {
    const customersRef = ref(db, `agents/${agentPhone}/customers`);
    const snapshot = await get(customersRef);
    
    if (snapshot.exists()) {
      const customers = snapshot.val();
      return Object.entries(customers).map(([key, value]) => ({
        id: key,
        customerKey: key,
        customerId: value.customerId || key,
        name: value.name || '',
        phone: value.phoneNumber || value.phone || key,
        phoneNumber: value.phoneNumber || value.phone || key,
        address: value.address || '',
        accountNumber: value.accountNumber || '',
        principalAmount: value.principalAmount || 0,
        interestRate: value.interestRate || 0,
        startDate: value.startDate || '',
        joinDate: value.joinDate || value.startDate || '',
        monthlyDue: value.monthlyDue || 0,
        balance: value.balance || value.principalAmount || 0,
        status: value.status || 'active',
        active: value.active !== undefined ? value.active : true,
        transactions: value.transactions || {}
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching agent customers:", error);
    return [];
  }
};

// Add customer to specific agent
export const addCustomerToAgent = async (agentId, customerData) => {
  try {
    const agentCustomersRef = ref(db, `bishi_collection/agents/${agentId}/customers`);
    const newCustomerRef = push(agentCustomersRef);
    
    const customer = {
      customerId: newCustomerRef.key,
      name: customerData.name || '',
      phone: customerData.phone || '',
      address: customerData.address || '',
      joinDate: customerData.joinDate || new Date().toISOString().split('T')[0],
      monthlyDue: customerData.monthlyDue || 0,
      balance: customerData.balance || 0,
      status: customerData.status || 'active',
      createdAt: new Date().toISOString(),
      transactions: {} // Initialize empty transactions object
    };
    
    await set(newCustomerRef, customer);
    return newCustomerRef.key;
  } catch (error) {
    console.error("Error adding customer to agent:", error);
    throw error;
  }
};

// Update agent statistics (removed as we're using direct customer data now)
export const calculateAgentStats = async (agentId) => {
  try {
    const customers = await getAgentCustomers(agentId);
    let totalBalance = 0;
    let totalTransactions = 0;
    
    for (const customer of customers) {
      totalBalance += customer.balance || 0;
      const transactions = await getCustomerTransactions(agentId, customer.id);
      totalTransactions += transactions.length;
    }
    
    const stats = {
      totalCustomers: customers.length,
      activeCustomers: customers.filter(c => c.status === 'active').length,
      totalBalance,
      totalTransactions,
      averageBalancePerCustomer: customers.length > 0 ? Math.round(totalBalance / customers.length) : 0,
      lastCalculated: new Date().toISOString()
    };
    
    return stats;
  } catch (error) {
    console.error("Error calculating agent stats:", error);
    return {
      totalCustomers: 0,
      activeCustomers: 0,
      totalBalance: 0,
      totalTransactions: 0,
      averageBalancePerCustomer: 0
    };
  }
};

// Add transaction to agent under customer phone (agents/{agentPhone}/transactions/{customerPhone})
export const addTransactionToAgent = async (agentPhone, transactionData) => {
  try {
    if (!transactionData.customerPhone) {
      throw new Error("Customer phone is required");
    }
    
    // Create transaction under customer phone number
    const transactionsRef = ref(db, `agents/${agentPhone}/transactions/${transactionData.customerPhone}`);
    const newTransactionRef = push(transactionsRef);
    
    const transaction = {
      transactionId: newTransactionRef.key,
      customerId: transactionData.customerId || '',
      customerName: transactionData.customerName || '',
      type: transactionData.type || 'deposit',
      amount: transactionData.amount || 0,
      date: transactionData.date || new Date().toISOString().split('T')[0],
      time: transactionData.time || new Date().toLocaleTimeString('en-IN'),
      paymentMethod: transactionData.paymentMethod || transactionData.mode || 'cash',
      accountNumber: transactionData.accountNumber || '',
      receiptNumber: transactionData.receiptNumber || '',
      remarks: transactionData.remarks || '',
      createdAt: new Date().toISOString(),
      timestamp: Date.now()
    };
    
    // Add withdrawal-specific fields if this is a withdrawal
    if (transactionData.type === 'withdrawal') {
      transaction.netAmount = transactionData.netAmount || transactionData.amount;  // Amount customer receives
      transaction.penalty = transactionData.penalty || 0;
      transaction.totalBalance = transactionData.totalBalance || 0;
      transaction.penaltyApplied = transactionData.penaltyApplied || false;
    }
    
    await set(newTransactionRef, transaction);
    
    // Update customer's total deposits or withdrawals based on transaction type
    if (transaction.type === 'deposit' || transaction.type === 'withdrawal') {
      try {
        // Get customer reference
        const customerRef = ref(db, `agents/${agentPhone}/customers/${transactionData.customerPhone}`);
        const customerSnapshot = await get(customerRef);
        
        if (customerSnapshot.exists()) {
          const customer = customerSnapshot.val();
          const updates = {};
          
          if (transaction.type === 'deposit') {
            // Get current total from customer data
            const currentTotal = customer.totalDeposits || 0;
            
            // Add current transaction to total
            updates.totalDeposits = currentTotal + Number(transaction.amount || 0);
            
            // Send WhatsApp notification for deposit
            // Use updates.totalDeposits (after this deposit) as the total amount shown in message
            try {
              // Get agent info for notification
              const agent = await getAgentById(agentPhone);
              
              console.log('=== Preparing deposit notification ===');
              console.log('Customer previous total:', currentTotal);
              console.log('Current deposit amount:', transaction.amount);
              console.log('New total after deposit:', updates.totalDeposits);
              console.log('Transaction data:', transactionData);
              console.log('Customer data:', customer);
              
              const notificationData = {
                customerPhone: transactionData.customerPhone,
                customerName: transactionData.customerName || customer.name,
                amount: transaction.amount,
                accountNumber: transactionData.accountNumber || customer.accountNumber || 'N/A',
                totalAmount: updates.totalDeposits, // Show NEW total (after adding this deposit)
                agentName: agent?.name || agent?.agentInfo?.agentName || 'Agent'
              };
              
              console.log('Notification data to send:', notificationData);
              
              await sendDepositNotification(notificationData);
            } catch (notifError) {
              console.error("WhatsApp notification failed (non-critical):", notifError);
              console.error("Error stack:", notifError.stack);
            }
          } else if (transaction.type === 'withdrawal') {
            // Add to total withdrawals
            updates.totalWithdrawals = (customer.totalWithdrawals || 0) + Number(transaction.amount || 0);
            
            // Send WhatsApp notification for withdrawal
            try {
              // Get agent info for notification
              const agent = await getAgentById(agentPhone);
              const remainingBalance = (customer.totalDeposits || 0) - updates.totalWithdrawals;
              
              await sendWithdrawalNotification({
                customerPhone: transactionData.customerPhone,
                customerName: transactionData.customerName || customer.name,
                amount: transaction.amount,
                accountNumber: transactionData.accountNumber || customer.accountNumber || 'N/A',
                totalAmount: remainingBalance,
                agentName: agent?.name || 'Agent'
              });
            } catch (notifError) {
              console.error("WhatsApp notification failed (non-critical):", notifError);
            }
          }
          
          // Update customer with new totals
          await set(customerRef, { ...customer, ...updates });
        }
      } catch (error) {
        console.error("Error updating customer totals:", error);
        // Don't fail the transaction if we can't update the customer totals
      }
    }
    
    return newTransactionRef.key;
  } catch (error) {
    console.error("Error adding transaction to agent:", error);
    throw error;
  }
};

// Add transaction to specific customer under agent
export const addTransactionToCustomer = async (agentId, customerId, transactionData) => {
  try {
    const transactionsRef = ref(db, `bishi_collection/agents/${agentId}/customers/${customerId}/transactions`);
    const newTransactionRef = push(transactionsRef);
    
    const transaction = {
      transactionId: newTransactionRef.key,
      type: transactionData.type || 'deposit',
      amount: transactionData.amount || 0,
      date: transactionData.date || new Date().toISOString().split('T')[0],
      mode: transactionData.mode || 'cash',
      remarks: transactionData.remarks || '',
      createdAt: new Date().toISOString(),
      timestamp: Date.now()
    };
    
    await set(newTransactionRef, transaction);
    
    // Update customer balance after transaction
    await updateCustomerBalance(agentId, customerId);
    
    return newTransactionRef.key;
  } catch (error) {
    console.error("Error adding transaction to customer:", error);
    throw error;
  }
};

// Get all transactions for a specific customer
export const getCustomerTransactions = async (agentId, customerId) => {
  try {
    const transactionsRef = ref(db, `bishi_collection/agents/${agentId}/customers/${customerId}/transactions`);
    const snapshot = await get(transactionsRef);
    
    if (snapshot.exists()) {
      const transactions = snapshot.val();
      return Object.entries(transactions).map(([key, value]) => ({
        id: key,
        ...value
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching customer transactions:", error);
    return [];
  }
};

// Update customer balance based on transactions
export const updateCustomerBalance = async (agentId, customerId) => {
  try {
    const transactions = await getCustomerTransactions(agentId, customerId);
    
    let balance = 0;
    transactions.forEach(transaction => {
      if (transaction.type === 'deposit' || transaction.type === 'bonus') {
        balance += transaction.amount;
      } else if (transaction.type === 'withdrawal' || transaction.type === 'penalty') {
        balance -= transaction.amount;
      }
    });
    
    const customerBalanceRef = ref(db, `bishi_collection/agents/${agentId}/customers/${customerId}/balance`);
    await set(customerBalanceRef, balance);
    
    return balance;
  } catch (error) {
    console.error("Error updating customer balance:", error);
    throw error;
  }
};

// Add agent to database
export const addAgent = async (agentData) => {
  try {
    const agentsRef = ref(db, 'bishi_collection/agents');
    const newAgentRef = push(agentsRef);
    
    const agent = {
      agentId: newAgentRef.key,
      name: agentData.name || '',
      phone: agentData.phone || '',
      password: agentData.password || '',
      route: agentData.route || '',
      createdAt: new Date().toISOString(),
      customers: {} // Initialize empty customers object
    };
    
    await set(newAgentRef, agent);
    return newAgentRef.key;
  } catch (error) {
    console.error("Error adding agent:", error);
    throw error;
  }
};

// Get all transactions for all customers under an agent
export const getAllAgentTransactions = async (agentId) => {
  try {
    const customers = await getAgentCustomers(agentId);
    let allTransactions = [];
    
    for (const customer of customers) {
      const customerTransactions = await getCustomerTransactions(agentId, customer.id);
      const transactionsWithCustomerInfo = customerTransactions.map(transaction => ({
        ...transaction,
        customerId: customer.id,
        customerName: customer.name
      }));
      allTransactions = [...allTransactions, ...transactionsWithCustomerInfo];
    }
    
    // Sort by date (newest first)
    return allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (error) {
    console.error("Error fetching all agent transactions:", error);
    return [];
  }
};

// Get all transactions from agents/{agentPhone}/transactions/{customerPhone}/{transactionId}
// and withdrawals/{customerPhone}/{transactionId}
export const getAllTransactions = async () => {
  try {
    const agents = await getAllAgents();
    console.log("getAllTransactions - Agents found:", agents.length);
    let allTransactions = [];
    
    // Fetch transactions from agents/{agentPhone}/transactions
    for (const agent of agents) {
      console.log(`Checking transactions for agent: ${agent.name} (${agent.phone})`);
      
      // Get transactions organized by customer phone - using agent.phone as the key
      const agentTransactionsRef = ref(db, `agents/${agent.phone}/transactions`);
      const snapshot = await get(agentTransactionsRef);
      
      console.log(`Agent ${agent.phone} transactions exists:`, snapshot.exists());
      
      if (snapshot.exists()) {
        const customerPhones = snapshot.val();
        console.log(`Agent ${agent.phone} customer phones:`, Object.keys(customerPhones));
        
        // Iterate through each customer phone number
        Object.entries(customerPhones).forEach(([customerPhone, transactions]) => {
          console.log(`Processing transactions for customer phone: ${customerPhone}`, transactions);
          
          if (transactions && typeof transactions === 'object') {
            // Get customer details from agent's customers
            const customerData = agent.customers ? 
              Object.values(agent.customers).find(c => c.phone === customerPhone) : null;
            
            console.log(`Customer data for ${customerPhone}:`, customerData);
            
            // Iterate through transactions for this customer
            Object.entries(transactions).forEach(([txnKey, txnValue]) => {
              const transaction = {
                id: txnKey,
                transactionId: txnValue.transactionId || txnKey,
                agentId: agent.phone,
                agentName: agent.name,
                agentPhone: agent.phone,
                customerPhone: customerPhone,
                customerId: customerData?.customerId || '',
                customerName: customerData?.name || txnValue.customerName || customerPhone,
                type: txnValue.type || '',
                amount: txnValue.amount || 0,
                date: txnValue.date || '',
                mode: txnValue.mode || '',
                remarks: txnValue.remarks || '',
                createdAt: txnValue.createdAt || '',
                timestamp: txnValue.timestamp || Date.now()
              };
              console.log("Adding transaction:", transaction);
              allTransactions.push(transaction);
            });
          }
        });
      }
    }
    
    // Fetch withdrawals from withdrawals/{customerPhone}/{transactionId}
    console.log("Fetching withdrawals from withdrawals collection...");
    const withdrawalsRef = ref(db, 'withdrawals');
    const withdrawalsSnapshot = await get(withdrawalsRef);
    
    if (withdrawalsSnapshot.exists()) {
      const withdrawalsByCustomer = withdrawalsSnapshot.val();
      console.log("Withdrawals customer phones:", Object.keys(withdrawalsByCustomer));
      
      // Iterate through each customer phone number
      Object.entries(withdrawalsByCustomer).forEach(([customerPhone, withdrawals]) => {
        console.log(`Processing withdrawals for customer phone: ${customerPhone}`, withdrawals);
        
        if (withdrawals && typeof withdrawals === 'object') {
          // Find agent and customer data
          let agentData = null;
          let customerData = null;
          
          for (const agent of agents) {
            if (agent.customers) {
              const customer = Object.values(agent.customers).find(c => c.phone === customerPhone);
              if (customer) {
                agentData = agent;
                customerData = customer;
                break;
              }
            }
          }
          
          // Iterate through withdrawals for this customer
          Object.entries(withdrawals).forEach(([txnKey, txnValue]) => {
            const transaction = {
              id: txnKey,
              transactionId: txnValue.transactionId || txnKey,
              agentId: agentData?.phone || '',
              agentName: agentData?.name || '',
              agentPhone: agentData?.phone || '',
              customerPhone: customerPhone,
              customerId: customerData?.customerId || txnValue.customerId || '',
              customerName: customerData?.name || txnValue.customerName || customerPhone,
              type: 'withdrawal',
              amount: txnValue.amount || 0,
              date: txnValue.date || '',
              mode: txnValue.mode || '',
              remarks: txnValue.remarks || txnValue.notes || '',
              receiptNumber: txnValue.receiptNumber || '',
              accountNumber: txnValue.accountNumber || '',
              createdAt: txnValue.createdAt || '',
              timestamp: txnValue.timestamp || Date.now()
            };
            console.log("Adding withdrawal transaction:", transaction);
            allTransactions.push(transaction);
          });
        }
      });
    }
    
    console.log("Total transactions found:", allTransactions.length);
    
    // Sort by timestamp/date (newest first)
    return allTransactions.sort((a, b) => {
      const dateA = a.timestamp || new Date(a.date).getTime();
      const dateB = b.timestamp || new Date(b.date).getTime();
      return dateB - dateA;
    });
  } catch (error) {
    console.error("Error fetching all transactions:", error);
    return [];
  }
};

// Get system-wide statistics
export const getSystemStats = async () => {
  try {
    const agents = await getAllAgents();
    let totalCustomers = 0;
    let totalBalance = 0;
    let totalTransactions = 0;
    
    for (const agent of agents) {
      const customers = await getAgentCustomers(agent.id);
      totalCustomers += customers.length;
      
      for (const customer of customers) {
        totalBalance += customer.balance || 0;
        const transactions = await getCustomerTransactions(agent.id, customer.id);
        totalTransactions += transactions.length;
      }
    }
    
    const systemStats = {
      totalAgents: agents.length,
      totalCustomers,
      totalBalance,
      totalTransactions,
      averageBalancePerCustomer: totalCustomers > 0 ? Math.round(totalBalance / totalCustomers) : 0
    };
    
    return systemStats;
  } catch (error) {
    console.error("Error getting system stats:", error);
    return {
      totalAgents: 0,
      totalCustomers: 0,
      totalBalance: 0,
      totalTransactions: 0,
      averageBalancePerCustomer: 0
    };
  }
};

// Search agents by various criteria
export const searchAgents = (agents, searchTerm) => {
  if (!searchTerm) return agents;
  
  const term = searchTerm.toLowerCase();
  return agents.filter(agent => 
    agent.name?.toLowerCase().includes(term) ||
    agent.phone?.includes(term) ||
    agent.routes?.some(route => route.toLowerCase().includes(term))
  );
};

// Search customers by various criteria
export const searchCustomers = (customers, searchTerm) => {
  if (!searchTerm) return customers;
  
  const term = searchTerm.toLowerCase();
  return customers.filter(customer => 
    customer.name?.toLowerCase().includes(term) ||
    customer.phone?.includes(term) ||
    customer.address?.toLowerCase().includes(term)
  );
};

// Update transaction in agents/{agentPhone}/transactions/{customerPhone}/{transactionId}
export const updateTransaction = async (agentPhone, customerPhone, transactionId, updatedData) => {
  try {
    const transactionRef = ref(db, `agents/${agentPhone}/transactions/${customerPhone}/${transactionId}`);
    
    // Get current transaction data first
    const snapshot = await get(transactionRef);
    if (!snapshot.exists()) {
      throw new Error("Transaction not found");
    }
    
    const currentData = snapshot.val();
    
    // Merge current data with updates
    const updatedTransaction = {
      ...currentData,
      ...updatedData,
      updatedAt: new Date().toISOString(),
      updatedTimestamp: Date.now()
    };
    
    // Update the transaction
    await set(transactionRef, updatedTransaction);
    
    return updatedTransaction;
  } catch (error) {
    console.error("Error updating transaction:", error);
    throw error;
  }
};

// Calculate customer's bonus eligibility for Year-End Bonus system
// UPDATED LOGIC: 
// - Customer completes 12 months regular payments (₹12,000)
// - Customer is eligible for full ₹12,000 bonus only if 12th month payment is made on time
// - If 12th month payment is delayed even by 1-2 days, customer gets only accumulated amount
// - If withdrawal before 13 months, apply 5% penalty
export const calculateBonusEligibility = async (agentPhone, customerPhone) => {
  try {
    // Get all transactions for this customer
    const transactionsRef = ref(db, `agents/${agentPhone}/transactions/${customerPhone}`);
    const snapshot = await get(transactionsRef);
    
    if (!snapshot.exists()) {
      return {
        eligible: false,
        bonusEligible: false,
        totalDeposits: 0,
        monthsPaid: 0,
        completedMonths: 0,
        startDate: null,
        monthsSinceStart: 0,
        thirteenthMonthStartDate: null,
        isInThirteenthMonth: false,
        reason: 'No transactions found'
      };
    }
    
    const transactions = snapshot.val();
    const txnArray = Object.values(transactions).filter(t => t.type === 'deposit');
    
    if (txnArray.length === 0) {
      return {
        eligible: false,
        bonusEligible: false,
        totalDeposits: 0,
        monthsPaid: 0,
        completedMonths: 0,
        startDate: null,
        monthsSinceStart: 0,
        thirteenthMonthStartDate: null,
        isInThirteenthMonth: false,
        reason: 'No deposit transactions found'
      };
    }
    
    // Sort transactions by date
    txnArray.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const startDate = new Date(txnArray[0].date);
    const currentDate = new Date();
    
    // Calculate 13th month start date (12 months after first deposit)
    const thirteenthMonthStart = new Date(startDate);
    thirteenthMonthStart.setMonth(startDate.getMonth() + 12);
    
    // Calculate months since start (proper month calculation)
    const monthsSinceStart = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
                            (currentDate.getMonth() - startDate.getMonth());
    
    // Calculate total deposits
    const totalDeposits = txnArray.reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // Group transactions by month
    const monthlyPayments = {};
    txnArray.forEach(txn => {
      const date = new Date(txn.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyPayments[monthKey]) {
        monthlyPayments[monthKey] = 0;
      }
      monthlyPayments[monthKey] += txn.amount || 0;
    });
    
    // Count months with payments >= 1000
    const completedMonths = Object.values(monthlyPayments).filter(amount => amount >= 1000).length;
    
    // Check if customer has completed 12 months with ₹12,000
    // Modified: Only check total deposits, not number of months
    const hasCompleted12Months = totalDeposits >= 12000;
    
    // Check if we are in or past the 13th month
    const isInThirteenthMonth = currentDate >= thirteenthMonthStart;
    
    // UPDATED BONUS LOGIC:
    // - Customer must complete ₹12,000 in total deposits
    // - No need to wait for 13th month for bonus
    const bonusEligible = hasCompleted12Months;
    
    let reason;
    if (!hasCompleted12Months) {
      reason = `Total deposits: ₹${totalDeposits.toLocaleString()} (Need ₹12,000)`;
    } else {
      reason = `✅ Bonus eligible! Total deposits: ₹${totalDeposits.toLocaleString()}`;
    }
    
    return {
      eligible: hasCompleted12Months, // Basic eligibility (completed 12 months)
      bonusEligible, // Bonus eligibility (13th month started)
      totalDeposits,
      monthsPaid: Object.keys(monthlyPayments).length,
      completedMonths,
      startDate: startDate.toISOString().split('T')[0],
      monthsSinceStart,
      thirteenthMonthStartDate: thirteenthMonthStart.toISOString().split('T')[0],
      isInThirteenthMonth,
      monthlyPayments,
      reason
    };
  } catch (error) {
    console.error("Error in calculateBonusEligibility:", error);
    return {
      eligible: false,
      bonusEligible: false,
      totalDeposits: 0,
      monthsPaid: 0,
      completedMonths: 0,
      startDate: null,
      monthsSinceStart: 0,
      thirteenthMonthStartDate: null,
      isInThirteenthMonth: false,
      reason: 'Error calculating eligibility: ' + error.message,
      error: error.message,
      monthlyPayments: {}
    };
  }
};

// Check if customer has made 12th month payment on time
// NEW LOGIC: If 12th month payment is delayed even by 1-2 days, customer gets only accumulated amount (₹12,000)
export const checkTwelfthMonthPayment = async (agentPhone, customerPhone, startDate) => {
  try {
    const start = new Date(startDate);
    const twelfthMonthStart = new Date(start);
    twelfthMonthStart.setMonth(start.getMonth() + 11); // 12th month (0-indexed)
    
    // First day of 12th month is the due date
    const dueDate = new Date(twelfthMonthStart);
    
    const twelfthMonthEnd = new Date(twelfthMonthStart);
    twelfthMonthEnd.setMonth(twelfthMonthStart.getMonth() + 1);
    
    // Get transactions in 12th month
    const transactionsRef = ref(db, `agents/${agentPhone}/transactions/${customerPhone}`);
    const snapshot = await get(transactionsRef);
    
    if (!snapshot.exists()) {
      return { paid: false, amount: 0, missedDays: 0, hasMissedPayment: true };
    }
    
    const transactions = snapshot.val();
    const twelfthMonthTxns = Object.values(transactions).filter(t => {
      const txnDate = new Date(t.date);
      return t.type === 'deposit' && txnDate >= twelfthMonthStart && txnDate < twelfthMonthEnd;
    });
    
    const totalPaid = twelfthMonthTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // NEW LOGIC: Check if payment was made on or before the due date (first day of 12th month)
    let missedDays = 0;
    let hasMissedPayment = true;
    
    if (twelfthMonthTxns.length > 0) {
      // Find the first payment in 12th month
      const firstPaymentDate = new Date(Math.min(...twelfthMonthTxns.map(t => new Date(t.date))));
      
      // Calculate days delayed from due date
      const delayDays = Math.floor((firstPaymentDate - dueDate) / (1000 * 60 * 60 * 24));
      
      if (delayDays > 0) {
        // Payment was delayed - customer gets only accumulated amount
        missedDays = delayDays;
        hasMissedPayment = true;
      } else {
        // Payment was on time - customer gets full ₹12,000 bonus
        hasMissedPayment = false;
      }
    } else {
      // No payment in 12th month yet
      const currentDate = new Date();
      if (currentDate > dueDate) {
        missedDays = Math.floor((currentDate - dueDate) / (1000 * 60 * 60 * 24));
      }
      hasMissedPayment = true;
    }
    
    return {
      paid: totalPaid >= 1000,
      amount: totalPaid,
      missedDays,
      hasMissedPayment,
      dueDate: dueDate.toISOString().split('T')[0]
    };
  } catch (error) {
    console.error("Error checking 12th month payment:", error);
    return { paid: false, amount: 0, missedDays: 0, hasMissedPayment: true };
  }
};

// Keep the old function for backward compatibility but mark as deprecated
export const checkThirteenthMonthPayment = checkTwelfthMonthPayment;

// Get last deposit date for a customer
export const getLastDepositDate = async (agentPhone, customerPhone) => {
  try {
    const transactionsRef = ref(db, `agents/${agentPhone}/transactions/${customerPhone}`);
    const snapshot = await get(transactionsRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    const transactions = snapshot.val();
    const depositTransactions = Object.values(transactions)
      .filter(t => t.type === 'deposit')
      .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending
    
    if (depositTransactions.length === 0) {
      return null;
    }
    
    return depositTransactions[0].date; // Return the most recent deposit date
  } catch (error) {
    console.error("Error getting last deposit date:", error);
    return null;
  }
};

// Calculate withdrawal penalty based on end date
// NEW RULES: 
// - If customer hasn't completed 12 months: Can only withdraw exact deposited amount with 5% penalty if before end date
// - If withdrawal is 1 month before end date: ₹1000 bonus added
// - If withdrawal is before end date: 5% penalty on withdrawal amount
// - If withdrawal is 1 month after end date: ₹1000 bonus added
export const calculateWithdrawalPenalty = async (amount, monthsCompleted, agentPhone, customerPhone, withdrawalDate = null) => {
  // Get customer's eligibility to check plan dates
  const eligibility = await calculateBonusEligibility(agentPhone, customerPhone);
  
  // If customer hasn't completed 12 months, they can only withdraw exact deposited amount with 5% penalty if before end date
  if (monthsCompleted < 12) {
    const totalDeposits = eligibility.totalDeposits || 0;
    
    // If trying to withdraw more than deposited, limit to deposited amount
    const actualAmount = Math.min(amount, totalDeposits);
    
    // Calculate plan end date (1 year from start date)
    const startDate = new Date(eligibility.startDate);
    const endDate = new Date(startDate);
    endDate.setFullYear(startDate.getFullYear() + 1);
    
    const withdrawalDateObj = withdrawalDate ? new Date(withdrawalDate) : new Date();
    const isBeforeEndDate = withdrawalDateObj < endDate;
    
    // Apply 5% penalty if withdrawing before end date
    const penalty = isBeforeEndDate ? Math.floor(actualAmount * 0.05) : 0;
    const netAmount = actualAmount - penalty;
    
    return {
      originalAmount: amount,
      actualAmount: actualAmount,
      penalty,
      netAmount,
      penaltyApplied: isBeforeEndDate,
      bonusApplied: false,
      bonusAmount: 0,
      reason: isBeforeEndDate 
        ? `Early withdrawal before completing 12 months - 5% penalty applied (₹${penalty})`
        : 'Withdrawal of deposited amount (no penalty after plan end date)',
      planStartDate: eligibility.startDate,
      planEndDate: endDate.toISOString().split('T')[0],
      withdrawalDate: withdrawalDateObj.toISOString().split('T')[0]
    };
  }
  
  if (!eligibility.startDate) {
    // No start date found, apply default penalty
    const penalty = Math.floor(amount * 0.05);
    const netAmount = amount - penalty;
    return {
      originalAmount: amount,
      penalty,
      netAmount,
      penaltyApplied: true,
      bonusApplied: false,
      bonusAmount: 0,
      reason: '5% penalty - No plan start date found',
      planStartDate: null,
      planEndDate: null
    };
  }
  
  // Calculate plan end date (1 year from start date)
  const startDate = new Date(eligibility.startDate);
  const endDate = new Date(startDate);
  endDate.setFullYear(startDate.getFullYear() + 1);
  
  // Calculate 1 month before end date
  const oneMonthBeforeEnd = new Date(endDate);
  oneMonthBeforeEnd.setMonth(endDate.getMonth() - 1);
  
  // Calculate 1 month after end date
  const oneMonthAfterEnd = new Date(endDate);
  oneMonthAfterEnd.setMonth(endDate.getMonth() + 1);
  
  const withdrawalDateObj = withdrawalDate ? new Date(withdrawalDate) : new Date();
  
  // Debug logging (remove in production)
  console.log('DEBUG - Withdrawal Penalty Calculation:');
  console.log('Start Date:', startDate.toISOString().split('T')[0]);
  console.log('End Date:', endDate.toISOString().split('T')[0]);
  console.log('One Month Before End:', oneMonthBeforeEnd.toISOString().split('T')[0]);
  console.log('One Month After End:', oneMonthAfterEnd.toISOString().split('T')[0]);
  console.log('Withdrawal Date Input:', withdrawalDate);
  console.log('Withdrawal Date Parsed:', withdrawalDateObj.toISOString().split('T')[0]);
  
  // Calculate days from important dates
  const daysFromEndDate = Math.floor((withdrawalDateObj - endDate) / (1000 * 60 * 60 * 24));
  const daysFromOneMonthBefore = Math.floor((withdrawalDateObj - oneMonthBeforeEnd) / (1000 * 60 * 60 * 24));
  const daysFromOneMonthAfter = Math.floor((withdrawalDateObj - oneMonthAfterEnd) / (1000 * 60 * 60 * 24));
  
  console.log('Days from One Month Before:', daysFromOneMonthBefore);
  console.log('Days from One Month After:', daysFromOneMonthAfter);
  console.log('Days from End Date:', daysFromEndDate);
  
  // Check if all monthly payments were made regularly (12 payments of at least 1000 each)
  const hasRegularPayments = eligibility.completedMonths >= 12 && 
                           eligibility.totalDeposits >= 12000 &&
                           Object.values(eligibility.monthlyPayments || {}).length >= 12;
  
  // Bonus calculation based on withdrawal timing (as per the bonus table)
  let bonusAmount = 0;
  let penaltyAmount = 0;
  let reason = '';
  
  // Check if customer has paid exactly ₹12,000
  const totalDeposits = eligibility.totalDeposits || 0;
  const hasPaidFullAmount = totalDeposits >= 12000;
  
  // 1. If withdrawal is after end date and full amount is paid
  if (daysFromEndDate > 0) {
    if (hasPaidFullAmount) {
      // Check if this is a full withdrawal of the total balance
      if (amount >= eligibility.totalDeposits) {
        bonusAmount = 1000;
        reason = '₹1,000 bonus - Full withdrawal after plan end date';
      } else {
        reason = 'Partial withdrawal after plan end date (no bonus)';
      }
    } else {
      reason = `Withdrawal after plan end date but only ₹${totalDeposits.toLocaleString()} paid (need ₹12,000)`;
    }
  }
  // 2. If withdrawal is exactly on end date
  else if (daysFromEndDate === 0) {
    if (hasPaidFullAmount) {
      bonusAmount = 1000;
      reason = '₹1,000 bonus - Withdrawal on plan end date';
    } else {
reason = `Withdrawal on plan end date but only ₹${totalDeposits.toLocaleString()} paid (need ₹12,000)`;
    }
  }
  // 3. If withdrawal is before end date
  else if (daysFromEndDate < 0) {
    penaltyAmount = Math.floor(amount * 0.05);
    reason = `5% penalty - Early withdrawal (${Math.abs(daysFromEndDate)} days before end date)`;
    
    // If trying to withdraw full amount but haven't paid full ₹12,000
if (amount >= totalDeposits && !hasPaidFullAmount) {
      reason = `5% penalty - Early withdrawal. Full amount not paid (₹${totalDeposits.toLocaleString()}/₹12,000)`;
    }
  }
  
  // Apply the calculated bonus/penalty
  const netAmount = amount + bonusAmount - penaltyAmount;
  
  // Log the calculation details for debugging
  console.log('Withdrawal calculation:', {
    withdrawalDate: withdrawalDateObj.toISOString().split('T')[0],
    planEndDate: endDate.toISOString().split('T')[0],
    daysFromEndDate,
    daysFromOneMonthBefore,
    daysFromOneMonthAfter,
    hasRegularPayments,
    completedMonths: eligibility.completedMonths,
    totalDeposits: eligibility.totalDeposits,
    monthlyPayments: Object.keys(eligibility.monthlyPayments || {}).length,
    bonusAmount,
    penaltyAmount,
    netAmount,
    reason
  });
  
  // Only apply bonus if all regular payments were made
  const finalBonusAmount = hasRegularPayments ? bonusAmount : 0;
  const finalNetAmount = amount + finalBonusAmount - penaltyAmount;
  
  return {
    originalAmount: amount,
    penalty: penaltyAmount,
    netAmount: finalNetAmount,
    penaltyApplied: penaltyAmount > 0,
    bonusApplied: finalBonusAmount > 0,
    bonusAmount: finalBonusAmount,
    reason: !hasRegularPayments && bonusAmount > 0 
      ? 'No bonus - Incomplete or irregular monthly payments' 
      : reason,
    planStartDate: startDate.toISOString().split('T')[0],
    planEndDate: endDate.toISOString().split('T')[0],
    oneMonthBeforeEndDate: oneMonthBeforeEnd.toISOString().split('T')[0],
    oneMonthAfterEndDate: oneMonthAfterEnd.toISOString().split('T')[0],
    withdrawalDate: withdrawalDateObj.toISOString().split('T')[0],
    hasRegularPayments
  };
};

// Process withdrawal with new bonus logic
export const processEarlyWithdrawal = async (agentPhone, customerPhone, withdrawalAmount, additionalData = {}) => {
  try {
    // Get customer's eligibility status
    const eligibility = await calculateBonusEligibility(agentPhone, customerPhone);
    
    // NEW LOGIC: Calculate withdrawal amount based on bonus eligibility
    const totalBalance = eligibility.totalDeposits;
    let actualWithdrawalAmount = withdrawalAmount;
    let penalty = 0;
    let penaltyApplied = false;
    let reason = '';
    let bonusIncluded = false;
    
    // Check if customer is withdrawing full amount and is bonus eligible
    if (withdrawalAmount >= totalBalance && eligibility.bonusEligible) {
      // Check 12th month payment status
      const twelfthMonth = await checkTwelfthMonthPayment(agentPhone, customerPhone, eligibility.startDate);
      
      if (!twelfthMonth.hasMissedPayment) {
        // Customer gets ₹12,000 deposits + ₹1,000 bonus = ₹13,000 total
        const standardBonus = 1000;
        actualWithdrawalAmount = totalBalance + standardBonus;
        bonusIncluded = true;
        reason = `✅ Full Bonus! 12th month payment on time - Total: ₹${actualWithdrawalAmount.toLocaleString()}`;
      } else {
        // Customer gets only accumulated amount
        actualWithdrawalAmount = totalBalance;
        reason = `⚠️ 12th month payment delayed (${twelfthMonth.missedDays} days) - Only accumulated amount: ₹${totalBalance.toLocaleString()}`;
      }
    } else if (withdrawalAmount >= totalBalance && eligibility.eligible && !eligibility.bonusEligible) {
      // Customer completed 12 months but not bonus eligible yet
      actualWithdrawalAmount = totalBalance;
      reason = `12 months completed - Accumulated amount: ₹${totalBalance.toLocaleString()}`;
    } else {
      // Use new date-based penalty/bonus calculation for all other withdrawals
      const withdrawalDate = additionalData.date || new Date().toISOString().split('T')[0];
      const penaltyResult = await calculateWithdrawalPenalty(withdrawalAmount, eligibility.monthsSinceStart, agentPhone, customerPhone, withdrawalDate);
      
      // Handle bonus from date-based calculation
      if (penaltyResult.bonusApplied) {
        actualWithdrawalAmount = withdrawalAmount + penaltyResult.bonusAmount;
        reason = penaltyResult.reason;
      } else {
        penalty = penaltyResult.penalty;
        penaltyApplied = penaltyResult.penaltyApplied;
        reason = penaltyResult.reason;
      }
    }
    
    // Net amount = actual withdrawal amount - penalty
    const netAmount = actualWithdrawalAmount - penalty;
    
    const penaltyInfo = {
      originalAmount: withdrawalAmount,
      actualWithdrawalAmount: actualWithdrawalAmount,
      totalBalance: totalBalance,
      penalty: penalty,
      netAmount: netAmount,
      penaltyApplied: penaltyApplied,
      bonusIncluded: bonusIncluded,
      bonusAmount: bonusIncluded ? (actualWithdrawalAmount - totalBalance) : 0,
      reason: reason
    };
    
    // Get current date and time for withdrawal
    const withdrawalDate = additionalData.date || new Date().toISOString().split('T')[0];
    const withdrawalTime = additionalData.time || new Date().toLocaleTimeString('en-IN');
    
    // Create withdrawal transaction
    const withdrawalRef = ref(db, `withdrawals/${customerPhone}`);
    const newWithdrawalRef = push(withdrawalRef);
    
    const withdrawal = {
      transactionId: newWithdrawalRef.key,
      requestedAmount: penaltyInfo.originalAmount,
      actualAmount: penaltyInfo.actualWithdrawalAmount,
      totalBalance: penaltyInfo.totalBalance,
      penalty: penaltyInfo.penalty,
      bonusAmount: penaltyInfo.bonusAmount,
      bonusIncluded: penaltyInfo.bonusIncluded,
      netAmount: penaltyInfo.netAmount,
      date: withdrawalDate,
      time: withdrawalTime,
      withdrawalDate: withdrawalDate, // Add withdrawal date
      withdrawalTime: withdrawalTime, // Add withdrawal time
      monthsCompleted: eligibility.monthsSinceStart,
      penaltyApplied: penaltyInfo.penaltyApplied,
      reason: penaltyInfo.reason,
      thirteenthMonthStartDate: eligibility.thirteenthMonthStartDate,
      createdAt: new Date().toISOString(),
      timestamp: Date.now()
    };
    
    await set(newWithdrawalRef, withdrawal);
    
    // Also add to agent's transactions
    await addTransactionToAgent(agentPhone, {
      customerPhone,
      customerId: additionalData.customerId || customerPhone,
      customerName: additionalData.customerName || '',
      accountNumber: additionalData.accountNumber || '',
      receiptNumber: additionalData.receiptNumber || `WDR${Date.now()}`,
      type: 'withdrawal',
      amount: penaltyInfo.netAmount, // Main amount field for display
      originalAmount: penaltyInfo.totalBalance, // Store the withdrawal amount (deposits only, without bonus)
      requestedAmount: penaltyInfo.originalAmount,
      actualAmount: penaltyInfo.actualWithdrawalAmount,
      netAmount: penaltyInfo.netAmount,
      totalBalance: penaltyInfo.totalBalance,
      penalty: penaltyInfo.penalty,
      bonusAmount: penaltyInfo.bonusAmount,
      bonusIncluded: penaltyInfo.bonusIncluded,
      penaltyApplied: penaltyInfo.penaltyApplied,
      paymentMethod: additionalData.paymentMethod || 'cash',
      time: additionalData.time || new Date().toLocaleTimeString('en-IN'),
      remarks: penaltyInfo.bonusIncluded ? 
        `✅ Full Bonus: ₹${penaltyInfo.actualWithdrawalAmount.toLocaleString()} (₹${penaltyInfo.totalBalance.toLocaleString()} + ₹${penaltyInfo.bonusAmount.toLocaleString()} bonus)` :
        penaltyInfo.penaltyApplied ? 
          `Penalty: ₹${penaltyInfo.penalty} (5% of ₹${penaltyInfo.originalAmount})` : 
          'No penalty',
      date: additionalData.date || new Date().toISOString().split('T')[0]
    });
    
    // Send WhatsApp notification for withdrawal
    try {
      const agent = await getAgentById(agentPhone);
      
      await sendWithdrawalNotification({
        customerPhone: customerPhone,
        customerName: additionalData.customerName || 'Customer',
        amount: penaltyInfo.netAmount,
        accountNumber: additionalData.accountNumber || 'N/A',
        totalAmount: 0, // After withdrawal, balance is 0
        agentName: agent?.name || 'Agent'
      });
    } catch (notifError) {
      console.error("WhatsApp notification failed (non-critical):", notifError);
    }
    
    return {
      success: true,
      ...penaltyInfo,
      transactionId: newWithdrawalRef.key
    };
  } catch (error) {
    console.error("Error processing early withdrawal:", error);
    throw error;
  }
};

// Get all eligible customers for year-end bonus
export const getAllEligibleCustomers = async () => {
  try {
    const agents = await getAllAgents();
    const eligibleCustomers = [];
    
    for (const agent of agents) {
      if (agent.customers) {
        for (const [customerKey, customer] of Object.entries(agent.customers)) {
          const customerPhone = customer.phone || customer.phoneNumber || customerKey;
          const eligibility = await calculateBonusEligibility(agent.phone, customerPhone);
          
          if (eligibility.eligible) {
            // Check 12th month payment status
            const twelfthMonth = await checkTwelfthMonthPayment(
              agent.phone, 
              customerPhone, 
              eligibility.startDate
            );
            
            eligibleCustomers.push({
              agentPhone: agent.phone,
              agentName: agent.name,
              customerPhone,
              customerName: customer.name,
              customerId: customer.customerId,
              ...eligibility,
              twelfthMonthStatus: twelfthMonth,
              // Give bonus if total deposits >= 12000, regardless of delay
              bonusAmount: eligibility.totalDeposits >= 12000 ? 1000 : 0
            });
          }
        }
      }
    }
    
    return eligibleCustomers;
  } catch (error) {
    console.error("Error getting eligible customers:", error);
    return [];
  }
};

const databaseHelpers = {
  getAllAgents,
  getAgentById,
  getAgentCustomers,
  addAgent,
  addCustomerToAgent,
  addTransactionToAgent,
  addTransactionToCustomer,
  getCustomerTransactions,
  getAllAgentTransactions,
  getAllTransactions,
  updateCustomerBalance,
  calculateAgentStats,
  getSystemStats,
  searchAgents,
  searchCustomers,
  updateTransaction,
  calculateBonusEligibility,
  checkTwelfthMonthPayment,
  checkThirteenthMonthPayment,
  calculateWithdrawalPenalty,
  processEarlyWithdrawal,
  getAllEligibleCustomers
};

export default databaseHelpers;
