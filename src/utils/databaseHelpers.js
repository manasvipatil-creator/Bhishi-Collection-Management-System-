import { ref, get, set, push } from "firebase/database";
import { db } from "../firebase";

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
// NEW LOGIC: Customer must complete all 12 months (₹12,000) to be eligible
// In 13th month, if payment is delayed even by 1-2 days, customer gets only accumulated amount (no bonus)
export const calculateBonusEligibility = async (agentPhone, customerPhone) => {
  try {
    // Get all transactions for this customer
    const transactionsRef = ref(db, `agents/${agentPhone}/transactions/${customerPhone}`);
    const snapshot = await get(transactionsRef);
    
    if (!snapshot.exists()) {
      return {
        eligible: false,
        totalDeposits: 0,
        monthsPaid: 0,
        completedMonths: 0,
        startDate: null,
        monthsSinceStart: 0,
        reason: 'No transactions found'
      };
    }
    
    const transactions = snapshot.val();
    const txnArray = Object.values(transactions).filter(t => t.type === 'deposit');
    
    if (txnArray.length === 0) {
      return {
        eligible: false,
        totalDeposits: 0,
        monthsPaid: 0,
        completedMonths: 0,
        startDate: null,
        monthsSinceStart: 0,
        reason: 'No deposit transactions found'
      };
    }
    
    // Sort transactions by date
    txnArray.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const startDate = new Date(txnArray[0].date);
    const currentDate = new Date();
    
    // Calculate months since start
    const monthsSinceStart = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24 * 30));
    
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
    
    // NEW LOGIC: Customer must complete all 12 months with ₹12,000 total
    const eligible = totalDeposits >= 12000 && completedMonths >= 12;
    
    return {
      eligible,
      totalDeposits,
      monthsPaid: Object.keys(monthlyPayments).length,
      completedMonths,
      startDate: startDate.toISOString().split('T')[0],
      monthsSinceStart,
      monthlyPayments,
      reason: eligible ? 'Eligible for bonus' : 
              totalDeposits < 12000 ? 'Total deposits less than ₹12,000' :
              completedMonths < 12 ? 'Less than 12 months completed' :
              'Not enough time elapsed'
    };
  } catch (error) {
    console.error("Error calculating bonus eligibility:", error);
    return {
      eligible: false,
      totalDeposits: 0,
      monthsPaid: 0,
      completedMonths: 0,
      startDate: null,
      monthsSinceStart: 0,
      reason: 'Error calculating eligibility'
    };
  }
};

// Check if customer has missed payments in 13th month
// NEW LOGIC: If payment is delayed even by 1-2 days in 13th month, customer gets only accumulated amount
export const checkThirteenthMonthPayment = async (agentPhone, customerPhone, startDate) => {
  try {
    const start = new Date(startDate);
    const thirteenthMonthStart = new Date(start);
    thirteenthMonthStart.setMonth(start.getMonth() + 12);
    
    // First day of 13th month is the due date
    const dueDate = new Date(thirteenthMonthStart);
    
    const thirteenthMonthEnd = new Date(thirteenthMonthStart);
    thirteenthMonthEnd.setMonth(thirteenthMonthStart.getMonth() + 1);
    
    // Get transactions in 13th month
    const transactionsRef = ref(db, `agents/${agentPhone}/transactions/${customerPhone}`);
    const snapshot = await get(transactionsRef);
    
    if (!snapshot.exists()) {
      return { paid: false, amount: 0, missedDays: 0, hasMissedPayment: true };
    }
    
    const transactions = snapshot.val();
    const thirteenthMonthTxns = Object.values(transactions).filter(t => {
      const txnDate = new Date(t.date);
      return t.type === 'deposit' && txnDate >= thirteenthMonthStart && txnDate < thirteenthMonthEnd;
    });
    
    const totalPaid = thirteenthMonthTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // NEW LOGIC: Check if payment was made on or before the due date (first day of 13th month)
    let missedDays = 0;
    let hasMissedPayment = true;
    
    if (thirteenthMonthTxns.length > 0) {
      // Find the first payment in 13th month
      const firstPaymentDate = new Date(Math.min(...thirteenthMonthTxns.map(t => new Date(t.date))));
      
      // Calculate days delayed from due date
      const delayDays = Math.floor((firstPaymentDate - dueDate) / (1000 * 60 * 60 * 24));
      
      if (delayDays > 0) {
        // Payment was delayed - customer gets only accumulated amount
        missedDays = delayDays;
        hasMissedPayment = true;
      } else {
        // Payment was on time - customer gets full bonus
        hasMissedPayment = false;
      }
    } else {
      // No payment in 13th month yet
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
    console.error("Error checking 13th month payment:", error);
    return { paid: false, amount: 0, missedDays: 0, hasMissedPayment: true };
  }
};

// Calculate withdrawal penalty (5% deduction for early withdrawals before 13 months)
export const calculateWithdrawalPenalty = (amount, monthsCompleted) => {
  if (monthsCompleted < 13) {
    const penalty = Math.floor(amount * 0.05);
    const netAmount = amount - penalty;
    return {
      originalAmount: amount,
      penalty,
      netAmount,
      penaltyApplied: true,
      reason: 'Early withdrawal before 13 months'
    };
  }
  
  return {
    originalAmount: amount,
    penalty: 0,
    netAmount: amount,
    penaltyApplied: false,
    reason: 'No penalty - 13 months completed'
  };
};

// Process early withdrawal with penalty
export const processEarlyWithdrawal = async (agentPhone, customerPhone, withdrawalAmount, additionalData = {}) => {
  try {
    // Get customer's eligibility status
    const eligibility = await calculateBonusEligibility(agentPhone, customerPhone);
    
    // Calculate penalty based on WITHDRAWAL AMOUNT (5% of withdrawal)
    const totalBalance = eligibility.totalDeposits;
    let penalty = 0;
    let penaltyApplied = false;
    let reason = '';
    
    if (eligibility.monthsSinceStart < 13) {
      // Penalty is 5% of withdrawal amount
      penalty = Math.floor(withdrawalAmount * 0.05);
      penaltyApplied = true;
      reason = `Early withdrawal before 13 months - 5% penalty on withdrawal amount`;
    } else {
      reason = 'No penalty - 13 months completed';
    }
    
    // Net amount = withdrawal amount - penalty
    const netAmount = withdrawalAmount - penalty;
    
    const penaltyInfo = {
      originalAmount: withdrawalAmount,
      totalBalance: totalBalance,
      penalty: penalty,
      netAmount: netAmount,
      penaltyApplied: penaltyApplied,
      reason: reason
    };
    
    // Create withdrawal transaction
    const withdrawalRef = ref(db, `withdrawals/${customerPhone}`);
    const newWithdrawalRef = push(withdrawalRef);
    
    const withdrawal = {
      transactionId: newWithdrawalRef.key,
      amount: penaltyInfo.originalAmount,
      totalBalance: penaltyInfo.totalBalance,
      penalty: penaltyInfo.penalty,
      netAmount: penaltyInfo.netAmount,
      date: new Date().toISOString().split('T')[0],
      monthsCompleted: eligibility.monthsSinceStart,
      penaltyApplied: penaltyInfo.penaltyApplied,
      reason: penaltyInfo.reason,
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
      amount: penaltyInfo.originalAmount,  // Store original withdrawal amount (₹100)
      netAmount: penaltyInfo.netAmount,    // Store net amount customer receives (₹95)
      totalBalance: penaltyInfo.totalBalance,
      penalty: penaltyInfo.penalty,        // Store penalty amount (₹5)
      penaltyApplied: penaltyInfo.penaltyApplied,
      paymentMethod: additionalData.paymentMethod || 'cash',
      time: additionalData.time || new Date().toLocaleTimeString('en-IN'),
      remarks: penaltyInfo.penaltyApplied ? `Penalty: ₹${penaltyInfo.penalty} (5% of ₹${penaltyInfo.originalAmount})` : 'No penalty',
      date: additionalData.date || new Date().toISOString().split('T')[0]
    });
    
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
            // Check 13th month payment status
            const thirteenthMonth = await checkThirteenthMonthPayment(
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
              thirteenthMonthStatus: thirteenthMonth,
              bonusAmount: thirteenthMonth.hasMissedPayment ? eligibility.totalDeposits : 13000
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
  checkThirteenthMonthPayment,
  calculateWithdrawalPenalty,
  processEarlyWithdrawal,
  getAllEligibleCustomers
};

export default databaseHelpers;
