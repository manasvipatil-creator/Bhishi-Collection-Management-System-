import { ref, get, set, push, remove } from "firebase/database";
import { db } from "../firebase";
import { sendDepositNotification, sendWithdrawalNotification } from "./whatsappNotification";

const MONTHLY_INSTALLMENT_AMOUNT = 1000;
const TOTAL_INSTALLMENTS = 12;
const PLAN_DURATION_MONTHS = 13;
const MATURITY_BONUS_AMOUNT = 1000;
const MONTHLY_BONUS_RATE = Number((MATURITY_BONUS_AMOUNT / TOTAL_INSTALLMENTS).toFixed(2));
const EARLY_WITHDRAWAL_PENALTY_RATE = 0.05;

const formatDateIso = (date) => date?.toISOString().split("T")[0] || null;

const addMonths = (baseDate, months) => {
  const date = new Date(baseDate.getTime());
  date.setMonth(date.getMonth() + months);
  return date;
};

const monthDiff = (from, to) => {
  if (!from || !to) return 0;
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) {
    months -= 1;
  }
  return Math.max(months, 0);
};

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
    if (transaction.type === 'deposit' || transaction.type === 'withdrawal' || transaction.type === 'bonus' || transaction.type === 'penalty') {
      try {
        // Recalculate totals and balance
        const updates = await updateCustomerTotals(agentPhone, transactionData.customerPhone);

        if (updates) {
          // Send WhatsApp notification
          if (transaction.type === 'deposit') {
            try {
              const agent = await getAgentById(agentPhone);
              const customerRef = ref(db, `agents/${agentPhone}/customers/${transactionData.customerPhone}`);
              const customerSnapshot = await get(customerRef);
              const customer = customerSnapshot.exists() ? customerSnapshot.val() : {};

              const notificationData = {
                customerPhone: transactionData.customerPhone,
                customerName: transactionData.customerName || customer.name,
                amount: transaction.amount,
                accountNumber: transactionData.accountNumber || customer.accountNumber || 'N/A',
                totalAmount: updates.balance, // Show NET BALANCE after this deposit
                agentName: agent?.name || agent?.agentInfo?.agentName || 'Agent'
              };

              await sendDepositNotification(notificationData);
            } catch (notifError) {
              console.error("WhatsApp notification failed:", notifError);
            }
          } else if (transaction.type === 'withdrawal') {
            try {
              const agent = await getAgentById(agentPhone);
              const customerRef = ref(db, `agents/${agentPhone}/customers/${transactionData.customerPhone}`);
              const customerSnapshot = await get(customerRef);
              const customer = customerSnapshot.exists() ? customerSnapshot.val() : {};

              // Use the updated balance (after withdrawal) for the notification
              await sendWithdrawalNotification({
                customerPhone: transactionData.customerPhone,
                customerName: transactionData.customerName || customer.name,
                amount: transaction.amount,
                accountNumber: transactionData.accountNumber || customer.accountNumber || 'N/A',
                totalAmount: updates.balance, // Show balance after withdrawal
                agentName: agent?.name || 'Agent'
              });
            } catch (notifError) {
              console.error("WhatsApp notification failed:", notifError);
            }
          }
        }
      } catch (error) {
        console.error("Error updating customer totals:", error);
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
        time: value.time || value.depositTime || '',
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
            let customerData = null;
            if (agent.customers) {
              customerData = Object.values(agent.customers).find(c => c.phone === customerPhone || c.phoneNumber === customerPhone);
              if (!customerData && agent.customers[customerPhone]) {
                customerData = agent.customers[customerPhone];
              }
            }

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
                time: txnValue.time || txnValue.depositTime || '',
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
              let customer = Object.values(agent.customers).find(c => c.phone === customerPhone || c.phoneNumber === customerPhone);
              if (!customer && agent.customers[customerPhone]) {
                customer = agent.customers[customerPhone];
              }

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
              time: txnValue.time || '',
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

    // Recalculate customer totals
    await updateCustomerTotals(agentPhone, customerPhone);

    return updatedTransaction;
  } catch (error) {
    console.error("Error updating transaction:", error);
    throw error;
  }
};

/**
 * DELETE TRANSACTION
 * Deletes transaction from agents collection and optionally from withdrawals collection
 */
export const deleteTransaction = async (agentPhone, customerPhone, transactionId) => {
  try {
    const transactionRef = ref(db, `agents/${agentPhone}/transactions/${customerPhone}/${transactionId}`);

    // Get transaction data first to know its type
    const snapshot = await get(transactionRef);
    if (!snapshot.exists()) {
      // Also check withdrawals collection just in case
      const withdrawalRef = ref(db, `withdrawals/${customerPhone}/${transactionId}`);
      const wSnapshot = await get(withdrawalRef);
      if (wSnapshot.exists()) {
        await remove(withdrawalRef);
      } else {
        console.warn("Transaction not found in either collection during deletion");
      }
    } else {
      const transactionData = snapshot.val();
      await remove(transactionRef);

      // If it's a withdrawal, also remove from withdrawals collection
      if (transactionData.type === 'withdrawal') {
        const withdrawalRef = ref(db, `withdrawals/${customerPhone}/${transactionId}`);
        await remove(withdrawalRef);
      }
    }

    // Recalculate customer totals
    await updateCustomerTotals(agentPhone, customerPhone);

    return { success: true };
  } catch (error) {
    console.error("Error deleting transaction:", error);
    throw error;
  }
};

/**
 * RECALCULATE CUSTOMER TOTALS AND BALANCE
 * This updates totalDeposits, totalWithdrawals, and balance on the customer object
 */
export const updateCustomerTotals = async (agentPhone, customerPhone) => {
  try {
    console.log(`Recalculating totals for customer: ${customerPhone} under agent: ${agentPhone}`);

    const transactionsRef = ref(db, `agents/${agentPhone}/transactions/${customerPhone}`);
    const snapshot = await get(transactionsRef);

    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalBonuses = 0;
    let totalPenalties = 0;
    let balance = 0;

    if (snapshot.exists()) {
      const transactions = snapshot.val();
      Object.values(transactions).forEach(t => {
        const amount = Number(t.amount || 0);
        if (t.type === 'deposit') {
          totalDeposits += amount;
          balance += amount;
        } else if (t.type === 'withdrawal') {
          totalWithdrawals += amount;
          balance -= amount;
        } else if (t.type === 'bonus') {
          totalBonuses += amount;
          balance += amount;
        } else if (t.type === 'penalty') {
          totalPenalties += amount;
          balance -= amount;
        }
      });
    }

    // Also check withdrawals collection for bonuses/penalties that might not be in agents transactions
    const withdrawalsRef = ref(db, `withdrawals/${customerPhone}`);
    const wSnapshot = await get(withdrawalsRef);
    if (wSnapshot.exists()) {
      const withdrawals = wSnapshot.val();
      Object.values(withdrawals).forEach(w => {
        // If there's a bonus included in the withdrawal record that isn't already counted
        if (w.bonusIncluded && w.bonusAmount > 0) {
          // We assume the bonus should be added to deposits/bonuses and then withdrawn
          // However, for simplicity and to match Transactions.jsx logic, 
          // we only count transactions already in the agents/{agent}/transactions list
          // unless they are missing.
        }
      });
    }

    // Update the customer object in the agents collection
    const customerRef = ref(db, `agents/${agentPhone}/customers/${customerPhone}`);
    const customerSnapshot = await get(customerRef);

    if (customerSnapshot.exists()) {
      const customer = customerSnapshot.val();
      const updates = {
        totalDeposits,
        totalWithdrawals,
        totalBonuses,
        totalPenalties,
        balance: balance, // NET BALANCE
        lastUpdated: new Date().toISOString()
      };

      console.log('Updating customer with new totals:', updates);

      // Update specific fields rather than rewriting the whole object to preserve other data
      await set(customerRef, { ...customer, ...updates });
      return updates;
    }
    return null;
  } catch (error) {
    console.error("Error updating customer totals:", error);
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
    const transactionsRef = ref(db, `agents/${agentPhone}/transactions/${customerPhone}`);
    const snapshot = await get(transactionsRef);

    if (!snapshot.exists()) {
      return {
        eligible: false,
        bonusEligible: false,
        totalDeposits: 0,
        completedMonths: 0,
        monthsPaid: 0,
        startDate: null,
        monthsSinceStart: 0,
        thirteenthMonthStartDate: null,
        planEndDate: null,
        isInThirteenthMonth: false,
        totalBonusAccrued: 0,
        perMonthBonus: MONTHLY_BONUS_RATE,
        totalBonusPotential: MATURITY_BONUS_AMOUNT,
        maturityBonusAmount: 0,
        requiredTotalDeposits: MONTHLY_INSTALLMENT_AMOUNT * TOTAL_INSTALLMENTS,
        reason: 'No transactions found',
        monthlyPayments: {},
        cumulativeDeposits: [],
        isAtOrAfterEndDate: false,
        hasPlanStarted: false
      };
    }

    const transactions = Object.values(snapshot.val()).filter(t => t.type === "deposit" && t.date);

    if (transactions.length === 0) {
      return {
        eligible: false,
        bonusEligible: false,
        totalDeposits: 0,
        completedMonths: 0,
        monthsPaid: 0,
        startDate: null,
        monthsSinceStart: 0,
        thirteenthMonthStartDate: null,
        planEndDate: null,
        isInThirteenthMonth: false,
        totalBonusAccrued: 0,
        perMonthBonus: MONTHLY_BONUS_RATE,
        totalBonusPotential: MATURITY_BONUS_AMOUNT,
        maturityBonusAmount: 0,
        requiredTotalDeposits: MONTHLY_INSTALLMENT_AMOUNT * TOTAL_INSTALLMENTS,
        reason: 'No deposit transactions found',
        monthlyPayments: {},
        cumulativeDeposits: [],
        isAtOrAfterEndDate: false,
        hasPlanStarted: false
      };
    }

    // Sort by date
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Determine actual start date: when cumulative deposits first reach 1000
    let cumulative = 0;
    let startDate = null;
    const cumulativeDeposits = [];

    for (const txn of transactions) {
      const amount = Number(txn.amount || 0);
      cumulative += amount;
      cumulativeDeposits.push({
        date: txn.date,
        amount,
        cumulative
      });

      if (!startDate && cumulative >= MONTHLY_INSTALLMENT_AMOUNT) {
        startDate = new Date(txn.date);
      }
    }

    if (!startDate) {
      // Never reached mandatory first installment yet
      const totalDeposits = cumulative;
      return {
        eligible: false,
        bonusEligible: false,
        totalDeposits,
        completedMonths: 0,
        monthsPaid: 0,
        startDate: null,
        monthsSinceStart: 0,
        thirteenthMonthStartDate: null,
        planEndDate: null,
        isInThirteenthMonth: false,
        totalBonusAccrued: 0,
        perMonthBonus: MONTHLY_BONUS_RATE,
        totalBonusPotential: MATURITY_BONUS_AMOUNT,
        maturityBonusAmount: 0,
        requiredTotalDeposits: MONTHLY_INSTALLMENT_AMOUNT * TOTAL_INSTALLMENTS,
        reason: `Bishi not started yet. Accumulated: ₹${totalDeposits.toLocaleString()} (Need first ₹${MONTHLY_INSTALLMENT_AMOUNT})`,
        monthlyPayments: {},
        cumulativeDeposits,
        isAtOrAfterEndDate: false,
        hasPlanStarted: false
      };
    }

    const planEndDate = addMonths(startDate, PLAN_DURATION_MONTHS);
    const thirteenthMonthStart = addMonths(startDate, PLAN_DURATION_MONTHS - 1);
    const currentDate = new Date();
    const monthsSinceStart = monthDiff(startDate, currentDate);

    // Build monthly payment map based on all transactions (to ensure partial payments leading to start date are counted)
    const monthlyPayments = {};
    transactions.forEach(txn => {
      const txnDate = new Date(txn.date);
      // Use YYYY-MM format
      const year = txnDate.getFullYear();
      const month = String(txnDate.getMonth() + 1).padStart(2, "0");
      const monthKey = `${year}-${month}`;

      if (!monthlyPayments[monthKey]) {
        monthlyPayments[monthKey] = 0;
      }
      monthlyPayments[monthKey] += Number(txn.amount || 0);
    });

    const completedMonths = Object.values(monthlyPayments).filter(amount => amount >= MONTHLY_INSTALLMENT_AMOUNT).length;
    const totalDeposits = Object.values(monthlyPayments).reduce((sum, amount) => sum + amount, 0);

    const totalBonusAccrued = Math.min(completedMonths, TOTAL_INSTALLMENTS) * MONTHLY_BONUS_RATE;
    const requiredTotal = MONTHLY_INSTALLMENT_AMOUNT * TOTAL_INSTALLMENTS;
    const hasCompletedAllMonths = completedMonths >= TOTAL_INSTALLMENTS && totalDeposits >= requiredTotal;
    const eligible = hasCompletedAllMonths;
    const bonusEligible = hasCompletedAllMonths;
    const isAtOrAfterEndDate = currentDate >= planEndDate;

    const reason = !bonusEligible
      ? `Monthly payments complete: ${completedMonths}/${TOTAL_INSTALLMENTS}. Total paid: ₹${totalDeposits.toLocaleString()} (Need ₹${requiredTotal.toLocaleString()}).`
      : `✅ 12 installments complete. Bonus of ₹${MATURITY_BONUS_AMOUNT.toLocaleString()} available on or after ${formatDateIso(planEndDate)}.`;

    return {
      eligible,
      bonusEligible,
      totalDeposits,
      completedMonths,
      monthsPaid: Object.keys(monthlyPayments).length,
      startDate: formatDateIso(startDate),
      monthsSinceStart,
      thirteenthMonthStartDate: formatDateIso(thirteenthMonthStart),
      planEndDate: formatDateIso(planEndDate),
      isInThirteenthMonth: currentDate >= thirteenthMonthStart,
      totalBonusAccrued: Number(totalBonusAccrued.toFixed(2)),
      perMonthBonus: MONTHLY_BONUS_RATE,
      totalBonusPotential: MATURITY_BONUS_AMOUNT,
      maturityBonusAmount: bonusEligible ? MATURITY_BONUS_AMOUNT : 0,
      requiredTotalDeposits: requiredTotal,
      reason,
      monthlyPayments,
      cumulativeDeposits,
      isAtOrAfterEndDate,
      hasPlanStarted: true
    };
  } catch (error) {
    console.error("Error in calculateBonusEligibility:", error);
    return {
      eligible: false,
      bonusEligible: false,
      totalDeposits: 0,
      completedMonths: 0,
      monthsPaid: 0,
      startDate: null,
      monthsSinceStart: 0,
      thirteenthMonthStartDate: null,
      planEndDate: null,
      isInThirteenthMonth: false,
      totalBonusAccrued: 0,
      perMonthBonus: MONTHLY_BONUS_RATE,
      totalBonusPotential: MATURITY_BONUS_AMOUNT,
      maturityBonusAmount: 0,
      requiredTotalDeposits: MONTHLY_INSTALLMENT_AMOUNT * TOTAL_INSTALLMENTS,
      reason: 'Error calculating eligibility: ' + error.message,
      monthlyPayments: {},
      cumulativeDeposits: [],
      isAtOrAfterEndDate: false,
      hasPlanStarted: false
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

// Calculate withdrawal penalty based on maturity rules
export const calculateWithdrawalPenalty = async (amount, _unusedMonthsCompleted, agentPhone, customerPhone, withdrawalDate = null) => {
  const eligibility = await calculateBonusEligibility(agentPhone, customerPhone);

  const totalBalance = Number(eligibility.totalDeposits || 0);
  const requestedAmount = Number(amount || 0);
  const withdrawalAmount = Math.max(0, Math.min(requestedAmount, totalBalance));

  const hasPlanStarted = Boolean(eligibility.startDate);
  const withdrawalDateObj = withdrawalDate ? new Date(withdrawalDate) : new Date();
  const planStartDate = eligibility.startDate ? new Date(eligibility.startDate) : null;
  const planEndDate = eligibility.planEndDate ? new Date(eligibility.planEndDate) : (planStartDate ? addMonths(planStartDate, PLAN_DURATION_MONTHS) : null);
  const isBeforeEndDate = planEndDate ? withdrawalDateObj < planEndDate : true;

  let penaltyAmount = 0;
  let penaltyApplied = false;
  let penaltyReason = '';

  if (!hasPlanStarted) {
    penaltyReason = `Bishi not started yet. Accumulated amount available: ₹${totalBalance.toLocaleString('en-IN')}.`;
  } else if (withdrawalAmount === 0) {
    penaltyReason = 'No deposits available to withdraw.';
  } else if (isBeforeEndDate) {
    penaltyAmount = Math.floor(withdrawalAmount * EARLY_WITHDRAWAL_PENALTY_RATE);
    penaltyApplied = penaltyAmount > 0;
    penaltyReason = `5% penalty applied for withdrawal before maturity date (${eligibility.planEndDate || 'N/A'}).`;
  } else {
    penaltyReason = 'No penalty - withdrawal on/after maturity date.';
  }

  const bonusEligibleForPayout = eligibility.bonusEligible && !isBeforeEndDate && withdrawalAmount >= totalBalance && totalBalance > 0;
  const bonusAmount = bonusEligibleForPayout ? MATURITY_BONUS_AMOUNT : 0;
  const bonusReason = bonusEligibleForPayout
    ? `₹${MATURITY_BONUS_AMOUNT.toLocaleString('en-IN')} maturity bonus added.`
    : eligibility.bonusEligible && isBeforeEndDate
      ? 'Bonus unlocked but payable only on/after maturity date.'
      : eligibility.bonusEligible
        ? 'Bonus payable on full withdrawal after maturity.'
        : `Bonus unlocked after completing all ${TOTAL_INSTALLMENTS} installments.`;

  const actualWithdrawalAmount = withdrawalAmount + bonusAmount;
  const netAmount = actualWithdrawalAmount - penaltyAmount;

  const reason = [penaltyReason, bonusReason].filter(Boolean).join(' ');

  return {
    originalAmount: requestedAmount,
    requestedAmount,
    withdrawalAmount,
    actualWithdrawalAmount,
    totalBalance,
    totalDeposits: totalBalance,
    penalty: penaltyAmount,
    penaltyRate: penaltyApplied ? EARLY_WITHDRAWAL_PENALTY_RATE : 0,
    netAmount,
    penaltyApplied,
    bonusApplied: bonusAmount > 0,
    bonusAmount,
    bonusEligibleOnMaturity: eligibility.bonusEligible,
    bonusAccruedToDate: eligibility.totalBonusAccrued,
    monthlyBonusRate: eligibility.perMonthBonus,
    totalBonusPotential: eligibility.totalBonusPotential,
    monthsCompleted: eligibility.completedMonths,
    monthsRequired: TOTAL_INSTALLMENTS,
    planStartDate: eligibility.startDate,
    planEndDate: eligibility.planEndDate,
    maturityDate: eligibility.planEndDate,
    thirteenthMonthStartDate: eligibility.thirteenthMonthStartDate,
    withdrawalDate: formatDateIso(withdrawalDateObj),
    isBeforeEndDate,
    reason,
    penaltyReason,
    bonusReason,
    hasPlanStarted,
    totalDepositsRequired: eligibility.requiredTotalDeposits,
    bonusAccruedRounded: Number((eligibility.totalBonusAccrued || 0).toFixed(2))
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

    // Notification is handled in addTransactionToAgent

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
export const getAllEligibleCustomers = async (filterYear = null) => {
  try {
    const agents = await getAllAgents();
    const eligibleCustomers = [];

    for (const agent of agents) {
      if (agent.customers) {
        for (const [customerKey, customer] of Object.entries(agent.customers)) {
          const customerPhone = customer.phone || customer.phoneNumber || customerKey;
          const eligibility = await calculateBonusEligibility(agent.phone, customerPhone);

          // Filter by year if specified
          if (filterYear) {
            const startYear = new Date(eligibility.startDate).getFullYear();
            // Check if customer started in the selected year
            if (startYear !== filterYear) {
              continue; // Skip this customer
            }
          }

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
  deleteTransaction,
  updateCustomerTotals,
  calculateBonusEligibility,
  checkTwelfthMonthPayment,
  checkThirteenthMonthPayment,
  calculateWithdrawalPenalty,
  processEarlyWithdrawal,
  getAllEligibleCustomers
};

export default databaseHelpers;
