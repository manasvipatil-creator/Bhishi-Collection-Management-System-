import { useEffect, useMemo, useState } from "react";
import {
  FiUsers,
  FiUser,
  FiCreditCard,
  FiArrowLeft,
  FiPlus,
  FiSearch,
  FiTrendingUp,
  FiDollarSign,
  FiBarChart2,
  FiPrinter,
  FiDownload,
  FiEdit,
  FiTrash2,
  FiFileText
} from "react-icons/fi";
import { getAllTransactions, getAllAgents, getAgentCustomers, addTransactionToAgent, updateTransaction, calculateBonusEligibility, processEarlyWithdrawal } from "../utils/databaseHelpers";
import { ref, get, remove } from "firebase/database";
import { db } from "../firebase";
import { useLocation } from "react-router-dom";
import { exportToExcelWithFormat } from "../utils/excelExport";

const MONTHLY_INSTALLMENT_AMOUNT = 1000;
const TOTAL_INSTALLMENTS = 12;
const MATURITY_BONUS_AMOUNT = 1000;
const DEFAULT_MONTHLY_BONUS_RATE = Number((MATURITY_BONUS_AMOUNT / TOTAL_INSTALLMENTS).toFixed(2));

const formatCurrency = (value, fractionDigits = 2) =>
  Number(value ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });

const getMonthKeyFromDate = (dateInput) => {
  if (!dateInput) return null;
  const date = typeof dateInput === "number" ? new Date(dateInput) : new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export default function Transactions() {
  const location = useLocation();
  const [transactions, setTransactions] = useState([]);
  const [agents, setAgents] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showEditTransaction, setShowEditTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Hierarchical view state
  const [viewMode, setViewMode] = useState('agents'); // 'agents', 'customers', 'transactions'
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState({ title: '', message: '', type: 'success' });
  const [selectedAgentCustomers, setSelectedAgentCustomers] = useState([]);
  const [selectedCustomerTransactions, setSelectedCustomerTransactions] = useState([]);

  const [newTransaction, setNewTransaction] = useState({
    agentId: "",
    customerId: "",
    customerName: "",
    customerPhone: "",
    type: "deposit", // deposit, withdrawal, penalty, bonus
    amount: "",
    paymentMethod: "cash",
    onlineMobileNumber: "",
    accountNumber: "",
    receiptNumber: "",
    remarks: "",
    date: new Date().toISOString().split('T')[0]
  });

  // Withdrawal penalty state
  const [withdrawalPenalty, setWithdrawalPenalty] = useState(null);
  const [customerEligibility, setCustomerEligibility] = useState(null);
  const monthlyBonusSummary = useMemo(() => {
    if (!customerEligibility) {
      return null;
    }

    const {
      totalDeposits = 0,
      completedMonths = 0,
      monthsPaid = 0,
      totalBonusAccrued = 0,
      perMonthBonus = DEFAULT_MONTHLY_BONUS_RATE,
      totalBonusPotential = MATURITY_BONUS_AMOUNT,
      requiredTotalDeposits = MONTHLY_INSTALLMENT_AMOUNT * TOTAL_INSTALLMENTS,
      bonusEligible = false,
      maturityBonusAmount = 0
    } = customerEligibility;

    const cappedMonths = Math.min(completedMonths, TOTAL_INSTALLMENTS);
    const expectedBonus = Number((cappedMonths * (perMonthBonus || DEFAULT_MONTHLY_BONUS_RATE)).toFixed(2));
    const roundedAccrued = Number((totalBonusAccrued ?? expectedBonus).toFixed(2));
    const progressPercent = Math.min(100, Math.round((cappedMonths / TOTAL_INSTALLMENTS) * 100));

    return {
      totalDeposits,
      completedMonths: cappedMonths,
      monthsPaid,
      perMonthBonus: perMonthBonus || DEFAULT_MONTHLY_BONUS_RATE,
      expectedBonus,
      accruedBonus: roundedAccrued,
      totalBonusPotential,
      requiredTotalDeposits,
      progressPercent,
      bonusEligible,
      maturityBonusAmount
    };
  }, [customerEligibility]);

  const depositBonusAssignments = useMemo(() => {
    if (!customerEligibility || !selectedCustomerTransactions.length) {
      return {};
    }

    const monthlyPayments = customerEligibility.monthlyPayments || {};
    const perMonthBonus = customerEligibility.perMonthBonus || DEFAULT_MONTHLY_BONUS_RATE;

    const qualifyingMonths = Object.entries(monthlyPayments)
      .filter(([, amount]) => Number(amount || 0) >= MONTHLY_INSTALLMENT_AMOUNT)
      .map(([monthKey]) => monthKey)
      .sort();

    if (qualifyingMonths.length === 0) {
      return {};
    }

    const allowedMonths = qualifyingMonths.slice(0, TOTAL_INSTALLMENTS);
    const allowedMonthSet = new Set(allowedMonths);
    const assignedMonths = new Set();
    const assignments = {};

    const sortedDeposits = [...selectedCustomerTransactions]
      .filter((txn) => txn.type === 'deposit')
      .sort((a, b) => {
        // Sort by date string provided to ensure consistent ordering with backend
        const dateA = a.date || a.depositDate || '';
        const dateB = b.date || b.depositDate || '';
        return dateA.localeCompare(dateB);
      });

    sortedDeposits.forEach((txn) => {
      // Logic matching databaseHelpers.js exactly
      const txnDateStr = txn.date || txn.depositDate;
      if (!txnDateStr) return;

      const dateObj = new Date(txnDateStr);
      // Use YYYY-MM format
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const monthKey = `${year}-${month}`;

      if (assignedMonths.size >= allowedMonthSet.size) {
        return;
      }

      if (!monthKey || !allowedMonthSet.has(monthKey) || assignedMonths.has(monthKey)) {
        return;
      }

      assignedMonths.add(monthKey);
      assignments[txn.id] = Number(Number(perMonthBonus).toFixed(2));
    });

    return assignments;
  }, [customerEligibility, selectedCustomerTransactions]);

  const headerInfo = useMemo(() => {
    if (viewMode === 'agents') {
      return {
        title: 'Select Agent',
        subtitle: 'Pick an agent to review their customers',
        Icon: FiUsers
      };
    }

    if (viewMode === 'customers') {
      return {
        title: selectedAgent?.name ? `${selectedAgent.name} · Customers` : 'Agent Customers',
        subtitle: 'Choose a customer to view their transactions',
        Icon: FiUser
      };
    }

    return {
      title: selectedCustomer?.name ? `${selectedCustomer.name} · Transactions` : 'Customer Transactions',
      subtitle: 'Review deposit, withdrawal, and bonus history',
      Icon: FiCreditCard
    };
  }, [viewMode, selectedAgent, selectedCustomer]);

  const customerTableRows = useMemo(() => {
    if (!selectedAgentCustomers?.length) {
      return [];
    }

    return selectedAgentCustomers.map((customer, index) => {
      const customerTransactions = transactions.filter(t =>
        t.customerPhone === customer.phone ||
        t.customerPhone === customer.phoneNumber
      );

      // Net Balance = (Deposits + Bonuses) - (Withdrawals [Principal Part] + Penalties)
      // Since withdrawals 'amount' field currently stores the Net Payout (which includes bonus),
      // we use 'requestedAmount' to get the actual principal removed from the balance.
      const totalDeposits = customerTransactions
        .filter(t => t.type === 'deposit')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const totalWithdrawals = customerTransactions
        .filter(t => t.type === 'withdrawal')
        .reduce((sum, t) => sum + (Number(t.amount || 0) + Number(t.penalty || 0)), 0);

      const totalBonuses = customerTransactions
        .filter(t => t.type === 'bonus')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const totalPenalties = customerTransactions
        .filter(t => t.type === 'penalty')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      return {
        customer,
        srNo: index + 1,
        actualBalance: (totalDeposits + totalBonuses) - (totalWithdrawals + totalPenalties)
      };
    });
  }, [selectedAgentCustomers, transactions]);

  const totalCustomerBalance = useMemo(
    () => customerTableRows.reduce((sum, row) => sum + row.actualBalance, 0),
    [customerTableRows]
  );

  const { activeCustomerCount, inactiveCustomerCount } = useMemo(() => {
    if (!customerTableRows.length) {
      return { activeCustomerCount: 0, inactiveCustomerCount: 0 };
    }

    const active = customerTableRows.filter(row => row.customer.active).length;
    return {
      activeCustomerCount: active,
      inactiveCustomerCount: customerTableRows.length - active
    };
  }, [customerTableRows]);

  useEffect(() => {
    loadData();
  }, []);

  // Handle navigation from ViewCustomers page
  useEffect(() => {
    const handleNavigationState = async () => {
      if (location.state && location.state.agentPhone && location.state.customerPhone) {
        setLoading(true);
        try {
          // Find the agent
          const agent = agents.find(a => a.phone === location.state.agentPhone);

          if (agent) {
            setSelectedAgent(agent);

            // Get agent's customers
            const agentCustomers = await getAgentCustomers(location.state.agentPhone);
            setSelectedAgentCustomers(agentCustomers);

            // Find the customer
            const customer = agentCustomers.find(c => c.phone === location.state.customerPhone);

            if (customer) {
              setSelectedCustomer(customer);

              // Get customer transactions from agents/{agentPhone}/transactions/{customerPhone}
              const transactionsRef = ref(db, `agents/${location.state.agentPhone}/transactions/${location.state.customerPhone}`);
              const snapshot = await get(transactionsRef);

              let customerTransactions = [];
              if (snapshot.exists()) {
                const txns = snapshot.val();
                customerTransactions = Object.entries(txns).map(([key, value]) => ({
                  id: key,
                  // Support both old and new field names
                  amount: value.amount || value.amountDeposited || 0,
                  date: value.depositDate || value.date || '',
                  time: value.depositTime || value.time || '',
                  type: value.type || 'deposit',
                  mode: value.paymentMethod || value.mode || 'cash',
                  remarks: value.remarks || '',
                  receiptNumber: value.receiptNumber || value.receiptNo || '',
                  interestAmount: value.interestAmount || 0,
                  customerId: value.customerId || customer.id || 0,
                  customerName: customer.name,
                  customerPhone: customer.phone,
                  agentName: agent.name,
                  timestamp: value.timestamp || (value.depositDate ? new Date(`${value.depositDate} ${value.depositTime || '00:00:00'}`).getTime() : Date.now()),
                  // Keep original data
                  ...value
                }));
              }

              // Also get withdrawals from withdrawals/{customerPhone}
              const withdrawalsRef = ref(db, `withdrawals/${location.state.customerPhone}`);
              const withdrawalsSnapshot = await get(withdrawalsRef);

              if (withdrawalsSnapshot.exists()) {
                const withdrawals = withdrawalsSnapshot.val();
                const withdrawalTransactions = Object.entries(withdrawals).map(([key, value]) => ({
                  id: key,
                  amount: value.amount || 0,
                  date: value.date || '',
                  time: value.time || '',
                  type: 'withdrawal',
                  mode: value.mode || 'cash',
                  remarks: value.remarks || value.notes || '',
                  receiptNumber: value.receiptNumber || '',
                  accountNumber: value.accountNumber || '',
                  customerId: value.customerId || customer.id || 0,
                  customerName: customer.name,
                  customerPhone: customer.phone,
                  agentName: agent.name,
                  timestamp: value.timestamp || (value.date ? new Date(value.date).getTime() : Date.now()),
                  // Keep original data
                  ...value
                }));
                // Deduplicate: Filter out withdrawals that already exist in the main transactions list
                // We prefer the transaction from 'agents' (customerTransactions) because it has the generated Receipt Number and full metadata
                const existingWithdrawals = customerTransactions
                  .filter(t => t.type === 'withdrawal');

                const uniqueWithdrawals = withdrawalTransactions.filter(w => {
                  // Check if this withdrawal already exists in the existing list
                  // We match on Date AND Amount (comparing agentTxn.amount with withdrawalTxn.netAmount)
                  const isDuplicate = existingWithdrawals.some(existing =>
                    existing.date === w.date &&
                    Number(existing.amount) === Number(w.netAmount || w.amount || 0)
                  );
                  return !isDuplicate;
                });

                customerTransactions = [...customerTransactions, ...uniqueWithdrawals];
              }

              // Sort by date (newest first)
              customerTransactions.sort((a, b) => {
                return b.timestamp - a.timestamp;
              });

              setSelectedCustomerTransactions(customerTransactions);
              setViewMode('transactions');
            }
          }
        } catch (error) {
          console.error("Error loading customer from navigation:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    if (agents.length > 0) {
      handleNavigationState();
    }
  }, [location.state, agents]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log("Loading transactions data...");

      // Fetch all transactions from nested structure
      const allTransactions = await getAllTransactions();
      console.log("Fetched transactions:", allTransactions);
      setTransactions(allTransactions);

      // Fetch all agents
      const allAgents = await getAllAgents();
      console.log("Fetched agents:", allAgents);
      setAgents(allAgents);

      // Fetch all customers for all agents
      if (allAgents.length > 0) {
        const customersList = [];
        for (const agent of allAgents) {
          const agentCustomers = await getAgentCustomers(agent.id);
          customersList.push(...agentCustomers.map(c => ({
            ...c,
            agentId: agent.id,  // This is the phone number
            agentPhone: agent.phone || agent.id,  // Explicitly store phone
            agentName: agent.name
          })));
        }
        console.log("Fetched customers:", customersList);
        setAllCustomers(customersList);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Use customer transactions if in transaction view, otherwise use all transactions
  const displayTransactions = viewMode === 'transactions' ? selectedCustomerTransactions : transactions;

  const filteredTransactions = displayTransactions.filter(transaction => {
    return (
      transaction.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.agentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.remarks?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.type?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Calculate statistics based on view mode
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let totalPenalties = 0;
  let totalBonuses = 0;
  let totalBalance = 0;

  const calculateTotals = (txns) => {
    let d = 0, w = 0, p = 0, b = 0;
    let standalone_p = 0;
    txns.forEach(t => {
      if (t.type === 'deposit') {
        d += Number(t.amount || 0);
      } else if (t.type === 'withdrawal') {
        w += Number(t.amount || 0) + Number(t.penalty || 0);
        p += Number(t.penalty || 0);
        b += Number(t.bonusAmount || 0);
      } else if (t.type === 'bonus') {
        b += Number(t.amount || 0);
      } else if (t.type === 'penalty') {
        p += Number(t.amount || 0);
        standalone_p += Number(t.amount || 0);
      }
    });
    return { d, w, p, b, bal: (d + b) - (w + standalone_p) };
  };

  if (viewMode === 'transactions' && selectedCustomerTransactions.length > 0) {
    const totals = calculateTotals(selectedCustomerTransactions);
    totalDeposits = totals.d;
    totalWithdrawals = totals.w;
    totalPenalties = totals.p;
    totalBonuses = totals.b;
    totalBalance = totals.bal;
  } else if (viewMode === 'customers') {
    // When viewing customers, show total balance from all customers
    totalBalance = customerTableRows.reduce((sum, row) => sum + row.actualBalance, 0);
    // Also calculate global totals from the full transactions list for the stats cards
    const totals = calculateTotals(transactions);
    totalDeposits = totals.d;
    totalWithdrawals = totals.w;
    totalPenalties = totals.p;
    totalBonuses = totals.b;
  } else {
    // When viewing agents/all, calculate from the full transactions list
    const totals = calculateTotals(filteredTransactions);
    totalDeposits = totals.d;
    totalWithdrawals = totals.w;
    totalPenalties = totals.p;
    totalBonuses = totals.b;
    totalBalance = totals.bal;
  }



  // Handle account number change and auto-fill customer details
  const handleAccountNumberChange = async (accountNumber) => {
    setWithdrawalPenalty(null);
    setCustomerEligibility(null);

    // ALWAYS update the account number so the user can see what they are typing
    setNewTransaction(prev => ({
      ...prev,
      accountNumber,
      // Reset auto-filled fields if user starts typing again
      agentId: "",
      agentPhone: "",
      customerId: "",
      customerName: "",
      customerPhone: "",
      receiptNumber: ""
    }));

    if (accountNumber) {
      // Find customer by account number
      const customer = allCustomers.find(c => c.accountNumber === accountNumber);

      if (customer) {
        // Auto-fill customer and agent details
        setNewTransaction(prev => ({
          ...prev,
          accountNumber,
          agentId: customer.agentId,  // Phone number
          agentPhone: customer.agentPhone || customer.agentId,  // Explicitly store phone
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          type: "deposit", // Default to deposit
          receiptNumber: `RCP${Date.now()}` // Auto-generate receipt number
        }));

        // Load customer eligibility for withdrawal
        try {
          const eligibility = await calculateBonusEligibility(customer.agentId, customer.phone);
          setCustomerEligibility(eligibility);
        } catch (error) {
          console.error("Error loading customer eligibility:", error);
        }
      }
    }
  };

  // Handle transaction type change
  const handleTransactionTypeChange = async (type) => {
    setNewTransaction(prev => ({ ...prev, type }));
    setWithdrawalPenalty(null);

    // If switching to withdrawal, ensure eligibility is loaded
    if (type === 'withdrawal') {
      if (!customerEligibility && newTransaction.agentId && newTransaction.customerPhone) {
        try {
          const eligibility = await calculateBonusEligibility(newTransaction.agentId, newTransaction.customerPhone);
          setCustomerEligibility(eligibility);

          // Calculate penalty if amount exists
          if (newTransaction.amount) {
            await calculateWithdrawalPenalty(Number(newTransaction.amount));
          }
        } catch (error) {
          console.error("Error loading customer eligibility:", error);
        }
      } else if (customerEligibility && newTransaction.amount) {
        await calculateWithdrawalPenalty(Number(newTransaction.amount));
      }
    }
  };

  // Handle amount change for withdrawal (now handled inline in JSX)

  // Force recalculation of withdrawal penalty
  const forceRecalculateWithdrawal = async () => {
    if (newTransaction.type === 'withdrawal' && customerEligibility && newTransaction.amount) {
      setWithdrawalPenalty(null); // Clear cache
      await calculateWithdrawalPenalty(Number(newTransaction.amount));
    }
  };

  // Calculate withdrawal penalty with new ₹12,000 bonus logic
  const calculateWithdrawalPenalty = async (amount) => {
    if (!customerEligibility || !amount) {
      setWithdrawalPenalty(null);
      return;
    }

    const monthsCompleted = customerEligibility.monthsSinceStart;
    const totalBalance = customerEligibility.totalDeposits;
    let actualWithdrawalAmount = amount;
    let penalty = 0;
    let penaltyApplied = false;
    let bonusIncluded = false;
    let reason = '';

    // FIRST: Check date-based penalty/bonus for ALL withdrawals
    let dateBasedBonus = 0;
    let dateBasedPenalty = 0;
    let dateBasedReason = '';
    let penaltyResult = null;

    try {
      const { calculateWithdrawalPenalty: calcPenalty } = await import('../utils/databaseHelpers');
      // Ensure date is in proper YYYY-MM-DD format
      const withdrawalDate = newTransaction.date || new Date().toISOString().split('T')[0];
      penaltyResult = await calcPenalty(amount, monthsCompleted, newTransaction.agentId, newTransaction.customerPhone, withdrawalDate);

      if (penaltyResult.bonusApplied) {
        dateBasedBonus = penaltyResult.bonusAmount;
        dateBasedReason = penaltyResult.reason;
      } else if (penaltyResult.penaltyApplied) {
        dateBasedPenalty = penaltyResult.penalty;
        dateBasedReason = penaltyResult.reason;
      } else {
        dateBasedReason = penaltyResult.reason;
      }
    } catch (error) {
      console.error("Error calculating date-based penalty:", error);
      // For full amount withdrawal before end date, apply 5% penalty as fallback
      if (amount >= totalBalance) {
        dateBasedPenalty = Math.floor(amount * 0.05);
        dateBasedReason = `Early withdrawal - 5% penalty on withdrawal amount`;
      }
      penaltyResult = penaltyResult || {
        planStartDate: customerEligibility.startDate,
        planEndDate: customerEligibility.planEndDate
      };
    }

    // SECOND: Check if customer is withdrawing full amount and bonus eligible
    if (amount >= totalBalance && customerEligibility.bonusEligible) {
      // Check 12th month payment status
      try {
        const { checkTwelfthMonthPayment } = await import('../utils/databaseHelpers');
        const twelfthMonth = await checkTwelfthMonthPayment(
          newTransaction.agentId,
          newTransaction.customerPhone,
          customerEligibility.startDate
        );

        if (!twelfthMonth.hasMissedPayment) {
          // Customer gets full ₹12,000 deposits + ₹1,000 bonus = ₹13,000 total
          const standardBonus = 1000;
          actualWithdrawalAmount = totalBalance + standardBonus + dateBasedBonus;
          bonusIncluded = true;
          penalty = dateBasedPenalty; // Apply date-based penalty if any
          penaltyApplied = dateBasedPenalty > 0;

          if (dateBasedBonus > 0) {
            reason = `✅ Full Bonus (₹${standardBonus.toLocaleString()}) + Date Bonus (₹${dateBasedBonus}) - ${dateBasedReason}`;
          } else if (dateBasedPenalty > 0) {
            reason = `✅ Full Bonus (₹${standardBonus.toLocaleString()}) but ${dateBasedReason}`;
          } else {
            reason = `✅ Full Bonus! 12th month payment on time - Total: ₹${(totalBalance + standardBonus).toLocaleString()}`;
          }
        } else {
          // Customer gets only accumulated amount PLUS/MINUS date-based adjustments
          actualWithdrawalAmount = totalBalance + dateBasedBonus;
          penalty = dateBasedPenalty;
          penaltyApplied = dateBasedPenalty > 0;
          bonusIncluded = dateBasedBonus > 0;
          reason = `⚠️ 12th month payment delayed (${twelfthMonth.missedDays} days) - Only accumulated amount: ₹${totalBalance.toLocaleString()}. ${dateBasedReason}`;
        }
      } catch (error) {
        console.error("Error checking 12th month payment:", error);
        actualWithdrawalAmount = totalBalance + dateBasedBonus;
        penalty = dateBasedPenalty;
        penaltyApplied = dateBasedPenalty > 0;
        bonusIncluded = dateBasedBonus > 0;
        reason = `Accumulated amount only: ₹${totalBalance.toLocaleString()}. ${dateBasedReason}`;
      }
    } else if (amount >= totalBalance && customerEligibility.eligible && !customerEligibility.bonusEligible) {
      // Customer completed 12 months but not bonus eligible yet - apply date-based logic
      actualWithdrawalAmount = totalBalance + dateBasedBonus;
      penalty = dateBasedPenalty;
      penaltyApplied = dateBasedPenalty > 0;
      bonusIncluded = dateBasedBonus > 0;
      reason = `12 months completed - Accumulated amount: ₹${totalBalance.toLocaleString()}. ${dateBasedReason}`;
    } else {
      // Partial withdrawal - use date-based calculation
      if (dateBasedBonus > 0) {
        actualWithdrawalAmount = amount + dateBasedBonus;
        bonusIncluded = true;
        reason = dateBasedReason;
      } else {
        penalty = dateBasedPenalty;
        penaltyApplied = dateBasedPenalty > 0;
        reason = dateBasedReason;
      }
    }

    const netAmount = actualWithdrawalAmount - penalty;

    // Calculate Bishi plan dates
    const planStartDateIso = (penaltyResult && penaltyResult.planStartDate) || customerEligibility.startDate;
    const planEndDateIso = (penaltyResult && penaltyResult.planEndDate) || customerEligibility.planEndDate;
    const startDate = planStartDateIso ? new Date(planStartDateIso) : null;
    const endDate = planEndDateIso ? new Date(planEndDateIso) : null;

    setWithdrawalPenalty({
      originalAmount: amount,
      actualWithdrawalAmount: actualWithdrawalAmount,
      totalBalance: totalBalance,
      penalty,
      netAmount,
      penaltyApplied,
      bonusIncluded,
      bonusAmount: bonusIncluded ? (actualWithdrawalAmount - totalBalance) : 0,
      monthsCompleted: customerEligibility.completedMonths,
      reason: reason,
      // Add plan dates
      planStartDate: startDate ? startDate.toLocaleDateString('en-IN') : null,
      planEndDate: endDate ? endDate.toLocaleDateString('en-IN') : null,
      planStartDateISO: planStartDateIso || null,
      planEndDateISO: planEndDateIso || null
    });
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Get customer details
      const selectedCustomer = allCustomers.find(c => c.id === newTransaction.customerId);

      // Handle withdrawal with penalty logic
      if (newTransaction.type === 'withdrawal') {
        if (!customerEligibility) {
          alert("Loading customer data, please wait a moment and try again");
          return;
        }

        if (!withdrawalPenalty) {
          // Calculate penalty now if not already calculated
          calculateWithdrawalPenalty(Number(newTransaction.amount));
          alert("Calculating penalty, please click submit again");
          return;
        }

        // Confirm withdrawal with new bonus logic details
        let confirmMessage = `Process withdrawal for ${selectedCustomer?.name}?\n\n` +
          `Total Balance: ₹${withdrawalPenalty.totalBalance.toLocaleString()}\n` +
          `Requested Amount: ₹${withdrawalPenalty.originalAmount.toLocaleString()}\n`;

        if (withdrawalPenalty.bonusIncluded) {
          confirmMessage += `✅ BONUS INCLUDED!\n` +
            `Total Bonus Amount: ₹${withdrawalPenalty.bonusAmount.toLocaleString()}\n` +
            `Total Amount: ₹${withdrawalPenalty.actualWithdrawalAmount.toLocaleString()}\n`;
        } else if (withdrawalPenalty.actualWithdrawalAmount !== withdrawalPenalty.originalAmount) {
          confirmMessage += `Actual Amount: ₹${withdrawalPenalty.actualWithdrawalAmount.toLocaleString()}\n`;
        }

        if (withdrawalPenalty.penaltyApplied) {
          confirmMessage += `Penalty (5%): ₹${withdrawalPenalty.penalty.toLocaleString()}\n`;
        }

        confirmMessage += `Net Amount to Pay: ₹${withdrawalPenalty.netAmount.toLocaleString()}\n\n` +
          `Months Completed: ${withdrawalPenalty.monthsCompleted} / 12\n` +
          `Reason: ${withdrawalPenalty.reason}`;

        // Add plan dates if available
        if (withdrawalPenalty.planStartDate && withdrawalPenalty.planEndDate) {
          confirmMessage += `\n\n📅 Bishi Plan Period:\n` +
            `Start Date: ${withdrawalPenalty.planStartDate}\n` +
            `End Date: ${withdrawalPenalty.planEndDate}`;
        }

        if (!window.confirm(confirmMessage)) {
          return;
        }

        // Process withdrawal with penalty - this will handle both the withdrawal and transaction creation
        const result = await processEarlyWithdrawal(
          newTransaction.agentId,
          selectedCustomer?.phone,
          Number(newTransaction.amount),
          {
            customerId: newTransaction.customerId,
            customerName: selectedCustomer?.name || newTransaction.customerName,
            accountNumber: newTransaction.accountNumber,
            receiptNumber: newTransaction.receiptNumber,
            paymentMethod: newTransaction.paymentMethod,
            onlineMobileNumber: newTransaction.paymentMethod === 'online' ? newTransaction.onlineMobileNumber : undefined,
            date: newTransaction.date,
            time: new Date().toLocaleTimeString('en-IN')
          }
        );

        if (!result.success) {
          throw new Error('Failed to process withdrawal');
        }

        let successMessage = `Withdrawal processed successfully!\n\n` +
          `Total Balance: ₹${result.totalBalance?.toLocaleString() || result.originalAmount.toLocaleString()}\n`;

        if (result.bonusIncluded) {
          successMessage += `✅ BONUS INCLUDED!\n` +
            `Bonus Amount: ₹${result.bonusAmount.toLocaleString()}\n` +
            `Total Amount: ₹${result.actualWithdrawalAmount.toLocaleString()}\n`;
        } else if (result.actualWithdrawalAmount !== result.originalAmount) {
          successMessage += `Actual Amount: ₹${result.actualWithdrawalAmount.toLocaleString()}\n`;
        }

        if (result.penalty > 0) {
          successMessage += `Penalty (5%): ₹${result.penalty.toLocaleString()}\n`;
        }

        successMessage += `Net Amount Paid: ₹${result.netAmount.toLocaleString()}\n` +
          `Transaction ID: ${result.transactionId}`;

        setSuccessModalData({
          title: "Withdrawal Successful",
          message: successMessage,
          type: 'success',
          icon: '✨'
        });
        setShowSuccessModal(true);
      } else {
        // Handle deposit transaction
        const agentPhone = newTransaction.agentId;  // agentId IS the phone number
        const customerPhone = selectedCustomer?.phone || newTransaction.customerPhone;

        console.log("Adding transaction to:", `agents/${agentPhone}/transactions/${customerPhone}`);

        await addTransactionToAgent(agentPhone, {
          customerId: newTransaction.customerId,
          customerName: selectedCustomer?.name || '',
          customerPhone: customerPhone,
          type: newTransaction.type,
          amount: Number(newTransaction.amount),
          date: newTransaction.date,
          time: new Date().toLocaleTimeString('en-IN'),  // Add time field
          paymentMethod: newTransaction.paymentMethod,
          onlineMobileNumber: newTransaction.paymentMethod === 'online' ? newTransaction.onlineMobileNumber : undefined,
          accountNumber: newTransaction.accountNumber,
          receiptNumber: newTransaction.receiptNumber,
          remarks: newTransaction.remarks
        });

        setSuccessModalData({
          title: "Transaction Added",
          message: "Transaction has been recorded successfully!",
          type: 'success',
          icon: '✨'
        });
        setShowSuccessModal(true);
      }

      // Reset form
      setNewTransaction({
        agentId: "",
        customerId: "",
        customerName: "",
        customerPhone: "",
        type: "deposit",
        amount: "",
        paymentMethod: "cash",
        onlineMobileNumber: "",
        accountNumber: "",
        receiptNumber: "",
        remarks: "",
        date: new Date().toISOString().split('T')[0]
      });
      setWithdrawalPenalty(null);
      setCustomerEligibility(null);

      setShowAddTransaction(false);

      // Reload customer transactions to show the new transaction immediately
      if (selectedCustomer && selectedAgent) {
        await handleCustomerClick(selectedCustomer);
      } else {
        // Reload all data if not in customer view
        loadData();
      }
    } catch (error) {
      alert("Error adding transaction: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAgentChange = async (agentId) => {
    setNewTransaction({ ...newTransaction, agentId, customerId: "", customerName: "", customerPhone: "" });

    if (agentId) {
      const agentCustomers = await getAgentCustomers(agentId);
      setCustomers(agentCustomers.map(c => ({ ...c, agentId })));
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'deposit': return '💰';
      case 'withdrawal': return '💸';
      case 'penalty': return '⚠️';
      case 'bonus': return '🎁';
      default: return '📝';
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'deposit': return 'success';
      case 'withdrawal': return 'danger';
      case 'penalty': return 'warning';
      case 'bonus': return 'info';
      default: return 'secondary';
    }
  };

  // Handle agent click - show customers
  const handleAgentClick = async (agent) => {
    setLoading(true);
    setSelectedAgent(agent);
    try {
      const agentCustomers = await getAgentCustomers(agent.phone);
      setSelectedAgentCustomers(agentCustomers);
      setViewMode('customers');
    } catch (error) {
      console.error("Error loading agent customers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle customer click - show transactions
  const handleCustomerClick = async (customer) => {
    setLoading(true);
    setSelectedCustomer(customer);
    try {
      console.log("Loading transactions for customer:", customer.name, customer.phone);
      console.log("Agent phone:", selectedAgent.phone);

      // Get transactions from agents/{agentPhone}/transactions/{customerPhone}
      const transactionsRef = ref(db, `agents/${selectedAgent.phone}/transactions/${customer.phone}`);
      const snapshot = await get(transactionsRef);

      console.log("Transactions snapshot exists:", snapshot.exists());

      let customerTransactions = [];
      if (snapshot.exists()) {
        const txns = snapshot.val();
        console.log("Transactions data:", txns);
        customerTransactions = Object.entries(txns).map(([key, value]) => ({
          id: key,
          // Support both old and new field names, including withdrawal fields
          amount: value.amount || value.netAmount || value.actualAmount || value.amountDeposited || 0,
          date: value.depositDate || value.date || '',
          time: value.depositTime || value.time || '',
          type: value.type || 'deposit',
          mode: value.paymentMethod || value.mode || 'cash',
          remarks: value.remarks || '',
          receiptNumber: value.receiptNumber || value.receiptNo || '',
          interestAmount: value.interestAmount || 0,
          customerId: value.customerId || customer.id || 0,
          customerName: customer.name,
          customerPhone: customer.phone,
          agentName: selectedAgent.name,
          // For withdrawal transactions, include additional fields
          requestedAmount: value.requestedAmount || 0,
          actualAmount: value.actualAmount || 0,
          netAmount: value.netAmount || 0,
          penalty: value.penalty || 0,
          bonusAmount: value.bonusAmount || 0,
          bonusIncluded: value.bonusIncluded || false,
          penaltyApplied: value.penaltyApplied || false,
          timestamp: value.timestamp || (value.depositDate ? new Date(`${value.depositDate} ${value.depositTime || '00:00:00'}`).getTime() : Date.now()),
          // Keep original data
          ...value
        }));

        // Sort by date (newest first)
        customerTransactions.sort((a, b) => {
          return b.timestamp - a.timestamp;
        });
      }

      // Also check for withdrawals in the withdrawals/{customerPhone} collection
      // This collection has the correct bonus amounts, so we'll merge it with agent transactions
      const withdrawalsRef = ref(db, `withdrawals/${customer.phone}`);
      const withdrawalsSnapshot = await get(withdrawalsRef);

      if (withdrawalsSnapshot.exists()) {
        const withdrawals = withdrawalsSnapshot.val();
        console.log("Found withdrawals in withdrawals collection:", withdrawals);

        // Create a map of withdrawal data by date for easy lookup
        const withdrawalDataMap = new Map();
        Object.entries(withdrawals).forEach(([key, value]) => {
          const dateKey = `${value.date || value.withdrawalDate}`;
          withdrawalDataMap.set(dateKey, {
            id: key,
            requestedAmount: value.requestedAmount || 0,
            actualAmount: value.actualAmount || 0,
            netAmount: value.netAmount || 0,
            penalty: value.penalty || 0,
            bonusAmount: value.bonusAmount || 0,
            bonusIncluded: value.bonusIncluded || false,
            penaltyApplied: value.penaltyApplied || false,
            totalBalance: value.totalBalance || 0,
            reason: value.reason || '',
            timestamp: value.timestamp || Date.now()
          });
        });

        // Update existing withdrawal transactions with correct data from withdrawals collection
        customerTransactions = customerTransactions.map(t => {
          if (t.type === 'withdrawal') {
            const dateKey = `${t.date}`;
            const withdrawalData = withdrawalDataMap.get(dateKey);

            if (withdrawalData) {
              // Merge the correct withdrawal data, keeping the receipt number from agent transaction
              return {
                ...t,
                ...withdrawalData,
                id: t.id, // Explicitly keep the agent transaction ID
                withdrawalId: withdrawalData.id, // Store the withdrawal collection ID
                receiptNumber: t.receiptNumber || withdrawalData.receiptNumber || '', // Keep receipt from agent transaction
                amount: withdrawalData.netAmount || t.amount,
                requestedAmount: withdrawalData.requestedAmount || t.requestedAmount,
                actualAmount: withdrawalData.actualAmount || t.actualAmount,
                netAmount: withdrawalData.netAmount || t.netAmount,
                penalty: withdrawalData.penalty || t.penalty,
                bonusAmount: withdrawalData.bonusAmount || t.bonusAmount,
                bonusIncluded: withdrawalData.bonusIncluded || t.bonusIncluded,
                penaltyApplied: withdrawalData.penaltyApplied || t.penaltyApplied,
                totalBalance: withdrawalData.totalBalance || t.totalBalance
              };
            }
          }
          return t;
        });

        // Sort again by date (newest first)
        customerTransactions.sort((a, b) => {
          return b.timestamp - a.timestamp;
        });
      }

      console.log("Total transactions found:", customerTransactions.length);
      console.log("Transactions:", customerTransactions);

      setSelectedCustomerTransactions(customerTransactions);

      const agentPhone = selectedAgent?.phone || selectedAgent?.mobileNumber || customer.agentId || customer.agentPhone;
      if (agentPhone && customer.phone) {
        try {
          const eligibility = await calculateBonusEligibility(agentPhone, customer.phone);
          setCustomerEligibility(eligibility);
        } catch (error) {
          console.error("Error loading customer eligibility:", error);
        }
      }
      setViewMode('transactions');
    } catch (error) {
      console.error("Error loading customer transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Go back to agents view
  const handleBackToAgents = () => {
    setViewMode('agents');
    setSelectedAgent(null);
    setSelectedCustomer(null);
    setSelectedAgentCustomers([]);
    setSelectedCustomerTransactions([]);
  };

  // Go back to customers view
  const handleBackToCustomers = () => {
    setViewMode('customers');
    setSelectedCustomer(null);
    setSelectedCustomerTransactions([]);
  };

  // Handle edit transaction
  const handleEditTransaction = (transaction) => {
    console.log("Edit button clicked for transaction:", transaction);
    setEditingTransaction({
      id: transaction.id,
      type: transaction.type || 'deposit',
      amount: transaction.amount || '',
      date: transaction.date || '',
      paymentMethod: transaction.paymentMethod || transaction.mode || 'cash',
      receiptNumber: transaction.receiptNumber || '',
      remarks: transaction.remarks || ''
    });
    setShowEditTransaction(true);
  };

  // Handle update transaction
  const handleUpdateTransaction = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const updatedData = {
        type: editingTransaction.type,
        amount: Number(editingTransaction.amount),
        date: editingTransaction.date,
        paymentMethod: editingTransaction.paymentMethod,
        onlineMobileNumber: editingTransaction.paymentMethod === 'online' ? editingTransaction.onlineMobileNumber : undefined,
        receiptNumber: editingTransaction.receiptNumber,
        remarks: editingTransaction.remarks
      };

      await updateTransaction(
        selectedAgent.phone,
        selectedCustomer.phone,
        editingTransaction.id,
        updatedData
      );

      setShowEditTransaction(false);
      setEditingTransaction(null);
      setSuccessModalData({
        title: "Transaction Updated",
        message: "The transaction has been updated successfully!",
        type: 'success',
        icon: '✏️'
      });
      setShowSuccessModal(true);

      // Reload transactions
      handleCustomerClick(selectedCustomer);
    } catch (error) {
      console.error("Error updating transaction:", error);
      alert("Error updating transaction: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete transaction
  const handleDeleteTransaction = async (transaction) => {
    console.log("Delete button clicked for transaction:", transaction);
    console.log("Selected Agent:", selectedAgent);
    console.log("Selected Customer:", selectedCustomer);

    // Validate required data
    if (!selectedAgent || !selectedAgent.phone) {
      alert("Error: Agent information is missing. Please refresh and try again.");
      return;
    }

    if (!selectedCustomer || !selectedCustomer.phone) {
      alert("Error: Customer information is missing. Please refresh and try again.");
      return;
    }

    if (!transaction || !transaction.id) {
      alert("Error: Transaction ID is missing. Cannot delete transaction.");
      return;
    }

    if (window.confirm("Are you sure you want to delete this transaction?")) {
      try {
        const { deleteTransaction } = await import('../utils/databaseHelpers');

        await deleteTransaction(
          selectedAgent.phone,
          selectedCustomer.phone,
          transaction.id,
          transaction.withdrawalId
        );

        console.log("Transaction deleted successfully");
        setSuccessModalData({
          title: "Transaction Deleted",
          message: "The transaction has been deleted successfully!",
          type: 'success',
          icon: '🗑️'
        });
        setShowSuccessModal(true);

        // Reload transactions
        handleCustomerClick(selectedCustomer);
      } catch (error) {
        console.error("Error deleting transaction:", error);
        alert("Error deleting transaction: " + error.message);
      }
    }
  };

  // Print transactions function - Bank Statement Style
  const handlePrintTransactions = () => {
    const printWindow = window.open('', '', 'height=800,width=900');
    const currentDate = new Date().toLocaleDateString('en-IN');
    const currentTime = new Date().toLocaleTimeString('en-IN');

    printWindow.document.write('<html><head><title>Customer Transactions</title>');
    printWindow.document.write('<style>');
    printWindow.document.write('@page { margin: 20mm; }');
    printWindow.document.write('* { margin: 0; padding: 0; box-sizing: border-box; }');
    printWindow.document.write('body { font-family: "Segoe UI", Arial, sans-serif; padding: 40px; background: #f5f5f5; color: #333; }');
    printWindow.document.write('.statement-container { background: white; padding: 40px; box-shadow: 0 0 10px rgba(0,0,0,0.1); max-width: 800px; margin: 0 auto; }');
    printWindow.document.write('.header { border-bottom: 3px solid #2c5aa0; padding-bottom: 20px; margin-bottom: 30px; }');
    printWindow.document.write('.header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }');
    printWindow.document.write('.company-name { font-size: 24px; font-weight: bold; color: #2c5aa0; }');
    printWindow.document.write('.statement-title { font-size: 18px; color: #2c5aa0; text-align: right; }');
    printWindow.document.write('.date-time { text-align: right; font-size: 11px; color: #666; margin-top: 5px; }');
    printWindow.document.write('.customer-section { background: #f8f9fa; padding: 20px; border-left: 4px solid #2c5aa0; margin-bottom: 30px; }');
    printWindow.document.write('.customer-section h3 { color: #2c5aa0; font-size: 16px; margin-bottom: 15px; }');
    printWindow.document.write('.customer-info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }');
    printWindow.document.write('.info-item { font-size: 13px; }');
    printWindow.document.write('.info-label { color: #666; font-weight: 500; }');
    printWindow.document.write('.info-value { color: #000; font-weight: 600; margin-left: 5px; }');
    printWindow.document.write('.balance-highlight { background: #2c5aa0; color: white; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 10px; font-size: 14px; }');
    printWindow.document.write('.transaction-section h3 { color: #2c5aa0; font-size: 16px; margin-bottom: 15px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; }');
    printWindow.document.write('table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }');
    printWindow.document.write('thead { background: #2c5aa0; color: white; }');
    printWindow.document.write('th { padding: 12px 8px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }');
    printWindow.document.write('tbody tr { border-bottom: 1px solid #e0e0e0; }');
    printWindow.document.write('tbody tr:hover { background: #f8f9fa; }');
    printWindow.document.write('td { padding: 12px 8px; }');
    printWindow.document.write('.date-col { width: 100px; font-size: 11px; }');
    printWindow.document.write('.receipt-col { width: 140px; font-size: 11px; color: #666; }');
    printWindow.document.write('.amount-col { width: 100px; text-align: right; font-weight: 600; }');
    printWindow.document.write('.mode-col { width: 80px; text-align: center; font-size: 11px; }');
    printWindow.document.write('.text-success { color: #10b981; }');
    printWindow.document.write('.text-danger { color: #ef4444; }');
    printWindow.document.write('.summary { margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 4px; }');
    printWindow.document.write('.summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; }');
    printWindow.document.write('.summary-item { text-align: center; padding: 15px; background: white; border-radius: 4px; }');
    printWindow.document.write('.summary-label { font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 5px; }');
    printWindow.document.write('.summary-value { font-size: 18px; font-weight: bold; }');
    printWindow.document.write('.summary-deposits { color: #10b981; }');
    printWindow.document.write('.summary-withdrawals { color: #ef4444; }');
    printWindow.document.write('.summary-balance { color: #2c5aa0; }');
    printWindow.document.write('.footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e0e0e0; text-align: center; font-size: 10px; color: #999; }');
    printWindow.document.write('@media print { body { background: white; padding: 0; } .statement-container { box-shadow: none; } }');
    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<div class="statement-container">');

    // Header
    printWindow.document.write('<div class="header">');
    printWindow.document.write('<div class="header-top">');
    printWindow.document.write('<div class="company-name">SMART BHISHI</div>');
    printWindow.document.write('<div><div class="statement-title">Customer Transactions</div>');
    printWindow.document.write('<div class="date-time">' + currentDate + ', ' + currentTime + '</div></div>');
    printWindow.document.write('</div>');
    printWindow.document.write('</div>');

    // Customer Information
    if (selectedCustomer) {
      printWindow.document.write('<div class="customer-section">');
      printWindow.document.write('<h3>Customer Information</h3>');
      printWindow.document.write('<div class="customer-info-grid">');
      printWindow.document.write('<div class="info-item"><span class="info-label">Name:</span><span class="info-value">' + selectedCustomer.name + '</span></div>');
      printWindow.document.write('<div class="info-item"><span class="info-label">Phone:</span><span class="info-value">' + selectedCustomer.phone + '</span></div>');
      printWindow.document.write('<div class="info-item"><span class="info-label">Account Number:</span><span class="info-value">' + (selectedCustomer.accountNumber || 'N/A') + '</span></div>');
      printWindow.document.write('<div class="info-item"><span class="info-label">Agent Name:</span><span class="info-value">' + (selectedAgent?.name || 'N/A') + '</span></div>');
      printWindow.document.write('<div class="info-item"><span class="info-label">Village:</span><span class="info-value">' + (selectedCustomer.village || selectedCustomer.address || 'N/A') + '</span></div>');
      printWindow.document.write('<div class="info-item"><span class="info-label">Total Balance:</span><span class="balance-highlight">₹' + (totalDeposits - totalWithdrawals).toLocaleString() + '</span></div>');
      printWindow.document.write('</div>');
      printWindow.document.write('</div>');
    }

    // Transaction History
    printWindow.document.write('<div class="transaction-section">');
    printWindow.document.write('<h3>Transaction History</h3>');
    printWindow.document.write('<table>');
    printWindow.document.write('<thead><tr>');
    printWindow.document.write('<th class="date-col">Date & Time</th>');
    printWindow.document.write('<th class="receipt-col">Receipt No</th>');
    printWindow.document.write('<th class="amount-col">Deposit</th>');
    printWindow.document.write('<th class="amount-col">Withdrawal</th>');
    printWindow.document.write('<th class="amount-col">Penalty</th>');
    printWindow.document.write('<th class="amount-col">Net Amount</th>');
    printWindow.document.write('<th class="mode-col">Mode</th>');
    printWindow.document.write('</tr></thead>');
    printWindow.document.write('<tbody>');

    selectedCustomerTransactions.forEach(transaction => {
      const isWithdrawal = transaction.type === 'withdrawal';
      const depositAmount = transaction.type === 'deposit' ? Number(transaction.amount || 0) : 0;
      const originalWithdrawAmount = isWithdrawal ? Number(transaction.originalAmount || transaction.amount || 0) : 0;
      const penaltyAmount = isWithdrawal ? Number(transaction.penalty || 0) : 0;
      const netWithdrawAmount = isWithdrawal ? Number(transaction.amount || 0) : 0;
      const dateStr = transaction.date ? new Date(transaction.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
      const timeStr = transaction.time || '';

      printWindow.document.write('<tr>');
      printWindow.document.write('<td class="date-col">' + dateStr + (timeStr ? '<br/>' + timeStr : '') + '</td>');
      printWindow.document.write('<td class="receipt-col">' + (transaction.receiptNumber || '-') + '</td>');
      printWindow.document.write('<td class="amount-col text-success">' + (depositAmount > 0 ? '₹' + depositAmount.toLocaleString() : '-') + '</td>');
      printWindow.document.write('<td class="amount-col text-danger">' + (originalWithdrawAmount > 0 ? '₹' + originalWithdrawAmount.toLocaleString() : '-') + '</td>');
      printWindow.document.write('<td class="amount-col" style="color: #f59e0b;">' + (penaltyAmount > 0 ? '- ₹' + penaltyAmount.toLocaleString() : '-') + '</td>');
      printWindow.document.write('<td class="amount-col text-success">' + (netWithdrawAmount > 0 ? '₹' + netWithdrawAmount.toLocaleString() : '-') + '</td>');
      printWindow.document.write('<td class="mode-col">' + (transaction.paymentMethod || transaction.mode || 'CASH').toUpperCase() + '</td>');
      printWindow.document.write('</tr>');
    });

    printWindow.document.write('</tbody></table>');
    printWindow.document.write('</div>');

    // Summary
    printWindow.document.write('<div class="summary">');
    printWindow.document.write('<div class="summary-grid">');
    printWindow.document.write('<div class="summary-item">');
    printWindow.document.write('<div class="summary-label">Total Deposits</div>');
    printWindow.document.write('<div class="summary-value summary-deposits">₹' + totalDeposits.toLocaleString() + '</div>');
    printWindow.document.write('</div>');
    printWindow.document.write('<div class="summary-item">');
    printWindow.document.write('<div class="summary-label">Total Withdrawals</div>');
    printWindow.document.write('<div class="summary-value summary-withdrawals">₹' + totalWithdrawals.toLocaleString() + '</div>');
    printWindow.document.write('</div>');
    printWindow.document.write('<div class="summary-item">');
    printWindow.document.write('<div class="summary-label">Total Balance</div>');
    printWindow.document.write('<div class="summary-value summary-balance">₹' + (totalDeposits - totalWithdrawals).toLocaleString() + '</div>');
    printWindow.document.write('</div>');
    printWindow.document.write('</div>');
    printWindow.document.write('</div>');

    // Footer
    printWindow.document.write('<div class="footer">');
    printWindow.document.write('<p>about blank</p>');
    printWindow.document.write('<p>1/1</p>');
    printWindow.document.write('</div>');

    printWindow.document.write('</div>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="container-fluid py-4">
      <div className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '52px', height: '52px', backgroundColor: '#eef2ff', color: '#4c51bf' }}
              >
                <headerInfo.Icon size={24} />
              </div>
              <div>
                <h4 className="mb-1 fw-semibold text-dark">{headerInfo.title}</h4>
                <p className="mb-0 text-muted">{headerInfo.subtitle}</p>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              {viewMode !== 'agents' && (
                <button
                  className="btn btn-outline-secondary d-flex align-items-center gap-2"
                  onClick={viewMode === 'transactions' ? handleBackToCustomers : handleBackToAgents}
                >
                  <FiArrowLeft />
                  <span>Back</span>
                </button>
              )}
              <button
                className="btn btn-primary d-flex align-items-center gap-2"
                onClick={() => setShowAddTransaction(true)}
              >
                <FiPlus />
                <span>Add Transaction</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {viewMode === 'customers' && (
        <div className="row g-3 mb-4">
          <div className="col-sm-6 col-xl-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body d-flex align-items-center gap-3">
                <div className="rounded-circle bg-light d-flex align-items-center justify-content-center" style={{ width: '44px', height: '44px', color: '#0d6efd' }}>
                  <FiDollarSign />
                </div>
                <div>
                  <div className="text-muted text-uppercase small fw-semibold">Total Balance</div>
                  <div className="h5 mb-0">₹{totalCustomerBalance.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-sm-6 col-xl-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body d-flex align-items-center gap-3">
                <div className="rounded-circle bg-light d-flex align-items-center justify-content-center" style={{ width: '44px', height: '44px', color: '#0d6efd' }}>
                  <FiUsers />
                </div>
                <div>
                  <div className="text-muted text-uppercase small fw-semibold">Total Customers</div>
                  <div className="h5 mb-0">{customerTableRows.length}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-sm-6 col-xl-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body d-flex align-items-center gap-3">
                <div className="rounded-circle bg-light d-flex align-items-center justify-content-center" style={{ width: '44px', height: '44px', color: '#16a34a' }}>
                  <FiTrendingUp />
                </div>
                <div>
                  <div className="text-muted text-uppercase small fw-semibold">Active</div>
                  <div className="h5 mb-0">{activeCustomerCount}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-sm-6 col-xl-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body d-flex align-items-center gap-3">
                <div className="rounded-circle bg-light d-flex align-items-center justify-content-center" style={{ width: '44px', height: '44px', color: '#dc2626' }}>
                  <FiBarChart2 />
                </div>
                <div>
                  <div className="text-muted text-uppercase small fw-semibold">Inactive</div>
                  <div className="h5 mb-0">{inactiveCustomerCount}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'transactions' && (
        <div className="row g-3 mb-4">
          <div className="col-sm-6 col-xl-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body d-flex align-items-center gap-3">
                <div className="rounded-circle bg-light d-flex align-items-center justify-content-center" style={{ width: '44px', height: '44px', color: '#16a34a' }}>
                  <FiTrendingUp />
                </div>
                <div>
                  <div className="text-muted text-uppercase small fw-semibold">Deposits</div>
                  <div className="h5 mb-0">₹{totalDeposits.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-sm-6 col-xl-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body d-flex align-items-center gap-3">
                <div className="rounded-circle bg-light d-flex align-items-center justify-content-center" style={{ width: '44px', height: '44px', color: '#dc2626' }}>
                  <FiCreditCard />
                </div>
                <div>
                  <div className="text-muted text-uppercase small fw-semibold">Withdrawals</div>
                  <div className="h5 mb-0">₹{totalWithdrawals.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-sm-6 col-xl-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body d-flex align-items-center gap-3">
                <div className="rounded-circle bg-light d-flex align-items-center justify-content-center" style={{ width: '44px', height: '44px', color: '#0d6efd' }}>
                  <FiDollarSign />
                </div>
                <div>
                  <div className="text-muted text-uppercase small fw-semibold">Net Balance</div>
                  <div className="h5 mb-0">₹{(totalDeposits - totalWithdrawals).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text">🔍</span>
                <input
                  type="text"
                  className="form-control"
                  placeholder={
                    viewMode === 'agents' ? 'Search agents...' :
                      viewMode === 'customers' ? 'Search customers...' :
                        'Search transactions...'
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-6 text-end">
              {viewMode === 'agents' && <span className="badge bg-info">{agents.length} agents</span>}
              {viewMode === 'customers' && <span className="badge bg-info">{selectedAgentCustomers.length} customers</span>}
              {viewMode === 'transactions' && <span className="badge bg-info">{selectedCustomerTransactions.length} transactions</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Agents View */}
      {viewMode === 'agents' && (
        <div className="card">
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center p-5">
                <div className="spinner"></div>
                <p className="mt-3">Loading agents...</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>Sr No</th>
                      <th>Agent Name</th>
                      <th>Phone</th>
                      <th>Route</th>
                      <th>Total Customers</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-muted">
                          No agents found
                        </td>
                      </tr>
                    ) : (
                      agents
                        .filter(agent =>
                          agent.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          agent.phone?.includes(searchTerm) ||
                          agent.route?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((agent, index) => {
                          const customerCount = agent.customers ? Object.keys(agent.customers).length : 0;
                          return (
                            <tr key={agent.id} style={{ cursor: 'pointer' }} onClick={() => handleAgentClick(agent)}>
                              <td>{index + 1}</td>
                              <td>
                                <div className="d-flex align-items-center">
                                  <div className="rounded-circle d-flex align-items-center justify-content-center me-3"
                                    style={{ width: '40px', height: '40px', background: 'var(--primary-gradient)', color: 'white' }}>
                                    👤
                                  </div>
                                  <div>
                                    <div className="fw-semibold">{agent.name}</div>
                                    <small className="text-muted">ID: {agent.agentId}</small>
                                  </div>
                                </div>
                              </td>
                              <td>{agent.mobileNumber || agent.phone}</td>
                              <td>
                                {agent.routes && agent.routes.length > 0 ? (
                                  <div className="d-flex flex-wrap gap-2 text-muted">
                                    {agent.routes.map((route, idx) => {
                                      const routeName = typeof route === 'object' ? route.name : route;
                                      return (
                                        <span key={idx} className="d-flex align-items-center gap-1">
                                          <span style={{ fontSize: '0.7rem' }}>•</span>
                                          <span>{routeName}</span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-muted">No routes</span>
                                )}
                              </td>
                              <td>
                                <span className="text-muted">👥 {customerCount}</span>
                              </td>
                              <td>
                                <button className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); handleAgentClick(agent); }}>
                                  View Customers →
                                </button>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content - Customers View */}
      {viewMode === 'customers' && (
        <div className="card">
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center p-5">
                <div className="spinner"></div>
                <p className="mt-3">Loading customers...</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>Sr No</th>
                      <th>Customer Name</th>
                      <th>Phone</th>
                      <th>Balance</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerTableRows.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-muted">
                          No customers found for this agent
                        </td>
                      </tr>
                    ) : (
                      customerTableRows
                        .filter(row =>
                          row.customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          row.customer.phone?.includes(searchTerm)
                        )
                        .map(({ customer, srNo, actualBalance }) => (
                          <tr key={customer.id} style={{ cursor: 'pointer' }} onClick={() => handleCustomerClick(customer)}>
                            <td>{srNo}</td>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="rounded-circle d-flex align-items-center justify-content-center me-3"
                                  style={{ width: '40px', height: '40px', background: 'var(--success-gradient)', color: 'white' }}>
                                  👤
                                </div>
                                <div>
                                  <div className="fw-semibold">{customer.name}</div>
                                  <small className="text-muted">{customer.address}</small>
                                </div>
                              </div>
                            </td>
                            <td>{customer.phoneNumber || customer.phone}</td>
                            <td className="fw-bold text-success">₹{actualBalance.toLocaleString()}</td>
                            <td>
                              <span className={`badge ${customer.active ? 'bg-success' : 'bg-danger'}`}>
                                {customer.active ? 'active' : 'inactive'}
                              </span>
                            </td>
                            <td>
                              <button className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); handleCustomerClick(customer); }}>
                                View Transactions →
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content - Transactions View */}
      {viewMode === 'transactions' && (
        <>
          {/* Customer Information Card */}
          {selectedCustomer && (
            <div className="card mb-4">
              <div className="card-header" style={{ background: 'var(--primary-gradient)', color: 'white' }}>
                <h5 className="mb-0">Customer Information</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-2">
                    <p className="mb-2"><strong>Name:</strong></p>
                    <p className="text-muted">{selectedCustomer.name}</p>
                  </div>
                  <div className="col-md-2">
                    <p className="mb-2"><strong>Phone:</strong></p>
                    <p className="text-muted">{selectedCustomer.phone}</p>
                  </div>
                  <div className="col-md-2">
                    <p className="mb-2"><strong>Account Number:</strong></p>
                    <p className="text-muted">{selectedCustomer.accountNumber || 'N/A'}</p>
                  </div>
                  <div className="col-md-2">
                    <p className="mb-2"><strong>Agent Name:</strong></p>
                    <p className="text-muted">{selectedAgent?.name || 'N/A'}</p>
                  </div>
                  <div className="col-md-2">
                    <p className="mb-2"><strong>Village:</strong></p>
                    <p className="text-muted">{selectedCustomer.village || selectedCustomer.address || 'N/A'}</p>
                  </div>
                  <div className="col-md-2">
                    <p className="mb-2"><strong>Balance:</strong></p>
                    <p className="text-success fw-bold">₹{totalBalance.toLocaleString()}</p>
                    <small className="text-muted">Deposits: ₹{totalDeposits.toLocaleString()} - Withdrawals: ₹{totalWithdrawals.toLocaleString()}</small>
                  </div>
                </div>
                {monthlyBonusSummary && (
                  <div className="mt-4">
                    <div className="d-flex align-items-center justify-content-between flex-wrap">
                      <h6 className="mb-0">🎁 Monthly Bonus Progress</h6>
                      <span className="badge bg-primary">₹{formatCurrency(monthlyBonusSummary.perMonthBonus)}</span>
                    </div>
                    <div className="row gy-3 mt-2">
                      <div className="col-md-3 col-sm-6">
                        <small className="text-muted d-block">Completed Months</small>
                        <strong>{monthlyBonusSummary.completedMonths} / {TOTAL_INSTALLMENTS}</strong>
                      </div>
                      <div className="col-md-3 col-sm-6">
                        <small className="text-muted d-block">Total Deposits</small>
                        <strong>₹{formatCurrency(monthlyBonusSummary.totalDeposits, 0)} / ₹{formatCurrency(monthlyBonusSummary.requiredTotalDeposits, 0)}</strong>
                      </div>
                      <div className="col-md-3 col-sm-6">
                        <small className="text-muted d-block">Accrued Bonus</small>
                        <strong>₹{formatCurrency(monthlyBonusSummary.accruedBonus)}</strong>
                      </div>
                      <div className="col-md-3 col-sm-6">
                        <small className="text-muted d-block">Maturity Bonus</small>
                        <strong className={monthlyBonusSummary.bonusEligible ? 'text-success' : ''}>
                          {monthlyBonusSummary.bonusEligible
                            ? `✅ ₹${formatCurrency(monthlyBonusSummary.maturityBonusAmount)}`
                            : `₹${formatCurrency(monthlyBonusSummary.totalBonusPotential)}`}
                        </strong>
                      </div>
                      <div className="col-12">
                        <div className="progress" style={{ height: '10px' }}>
                          <div
                            className={`progress-bar ${monthlyBonusSummary.bonusEligible ? 'bg-success' : 'bg-primary'}`}
                            role="progressbar"
                            style={{ width: `${monthlyBonusSummary.progressPercent}%` }}
                            aria-valuenow={monthlyBonusSummary.progressPercent}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          ></div>
                        </div>
                        <small className="text-muted d-block mt-2">
                          {monthlyBonusSummary.bonusEligible
                            ? `🎉 All 12 payments complete! ₹${formatCurrency(monthlyBonusSummary.maturityBonusAmount)} bonus unlocked and will be paid at maturity.`
                            : `Each ₹${MONTHLY_INSTALLMENT_AMOUNT.toLocaleString('en-IN')} payment adds ₹${formatCurrency(monthlyBonusSummary.perMonthBonus)} bonus. Complete ${TOTAL_INSTALLMENTS - monthlyBonusSummary.completedMonths} more month(s) to unlock the full ₹${formatCurrency(monthlyBonusSummary.totalBonusPotential)} bonus.`}
                        </small>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center p-5">
                  <div className="spinner"></div>
                  <p className="mt-3">Loading transactions...</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table mb-0 align-middle">
                    <thead>
                      <tr>
                        <th style={{ width: '70px' }}>Sr No</th>
                        <th>Date & Time</th>
                        <th>Receipt No</th>
                        <th>Deposit</th>
                        <th>Withdrawal</th>
                        <th>Bonus</th>
                        <th>Penalty</th>
                        <th>Net Amount</th>
                        <th>Mode</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCustomerTransactions.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="text-center py-4 text-muted">
                            No transactions found for this customer
                          </td>
                        </tr>
                      ) : (
                        selectedCustomerTransactions
                          .filter(transaction =>
                            transaction.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            transaction.remarks?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            transaction.receiptNumber?.includes(searchTerm)
                          )
                          .map((transaction, index) => {
                            // Check if this is a withdrawal by type only
                            const isWithdrawal = transaction.type === 'withdrawal';
                            const depositAmount = transaction.type === 'deposit' ? Number(transaction.amount || 0) : 0;
                            const originalWithdrawAmount = isWithdrawal ? Number(transaction.requestedAmount || transaction.originalAmount || transaction.totalBalance || 0) : 0;
                            const penaltyAmount = isWithdrawal ? Number(transaction.penalty || 0) : 0;
                            const netWithdrawAmount = isWithdrawal ? Number(transaction.netAmount || transaction.amount || 0) : 0;
                            const depositBonus = !isWithdrawal ? Number(depositBonusAssignments[transaction.id] || 0) : 0;
                            const bonusAmount = isWithdrawal ? Number(transaction.bonusAmount || 0) : depositBonus;

                            // Debug logging for withdrawals
                            if (isWithdrawal) {
                              console.log('Withdrawal Transaction:', {
                                id: transaction.id,
                                bonusAmount: transaction.bonusAmount,
                                bonusIncluded: transaction.bonusIncluded,
                                totalBalance: transaction.totalBalance,
                                netAmount: transaction.netAmount,
                                actualAmount: transaction.actualAmount
                              });
                            }

                            const paymentMode = (transaction.paymentMethod || transaction.mode || 'cash').toLowerCase();
                            const modeConfig = {
                              cash: { label: 'Cash', Icon: FiDollarSign, color: 'text-success' },
                              online: { label: 'Online', Icon: FiCreditCard, color: 'text-primary' },
                              cheque: { label: 'Cheque', Icon: FiFileText, color: 'text-warning' }
                            };
                            const { label: modeLabel, Icon: ModeIcon, color: modeColor } = modeConfig[paymentMode] || modeConfig.cash;

                            return (
                              <tr key={transaction.id}>
                                <td className="text-muted fw-semibold">{index + 1}</td>
                                <td>
                                  {transaction.type === 'withdrawal' ? (
                                    <>
                                      <div className="fw-semibold">
                                        {transaction.withdrawalDate || transaction.date
                                          ? new Date(transaction.withdrawalDate || transaction.date).toLocaleDateString('en-GB')
                                          : '-'}
                                      </div>
                                      {transaction.withdrawalTime || transaction.time ? (
                                        <small className="text-muted">{transaction.withdrawalTime || transaction.time}</small>
                                      ) : null}
                                    </>
                                  ) : (
                                    <>
                                      <div className="fw-semibold">
                                        {transaction.date ? new Date(transaction.date).toLocaleDateString('en-GB') : '-'}
                                      </div>
                                      {transaction.time && <small className="text-muted">{transaction.time}</small>}
                                    </>
                                  )}
                                </td>
                                <td>
                                  <span className="badge bg-secondary">{transaction.receiptNumber || '-'}</span>
                                </td>
                                <td>
                                  {depositAmount > 0 ? (
                                    <span className="fw-bold text-success">₹{depositAmount.toLocaleString()}</span>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                                <td>
                                  {originalWithdrawAmount > 0 ? (
                                    <div>
                                      <span className="fw-bold text-danger">₹{originalWithdrawAmount.toLocaleString()}</span>
                                      {transaction.penaltyApplied && (
                                        <div><small className="text-warning">⚠️ Penalty Applied</small></div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                                <td>
                                  {bonusAmount > 0 ? (
                                    <span className="fw-bold text-success">
                                      + ₹{formatCurrency(bonusAmount, bonusAmount % 1 === 0 ? 0 : 2)}
                                    </span>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                                <td>
                                  {penaltyAmount > 0 ? (
                                    <div>
                                      <span className="fw-bold text-warning">- ₹{penaltyAmount.toLocaleString()}</span>
                                      {originalWithdrawAmount > 0 && (
                                        <div><small className="text-muted">5% of ₹{originalWithdrawAmount.toLocaleString()}</small></div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                                <td>
                                  {netWithdrawAmount > 0 && isWithdrawal ? (
                                    <span className="fw-bold text-success">₹{netWithdrawAmount.toLocaleString()}</span>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                </td>
                                <td>
                                  <span className={`d-inline-flex align-items-center gap-2 small fw-semibold ${modeColor}`}>
                                    <ModeIcon size={14} />
                                    <span>{modeLabel}</span>
                                  </span>
                                  {paymentMode === 'online' && transaction.onlineMobileNumber && (
                                    <div>
                                      <small className="text-muted d-block">📱 {transaction.onlineMobileNumber}</small>
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="icon-button icon-button--primary me-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditTransaction(transaction);
                                    }}
                                    title="Edit Transaction"
                                    aria-label="Edit transaction"
                                  >
                                    <FiEdit />
                                  </button>
                                  <button
                                    type="button"
                                    className="icon-button icon-button--danger"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTransaction(transaction);
                                    }}
                                    title="Delete Transaction"
                                    aria-label="Delete transaction"
                                  >
                                    <FiTrash2 />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Print and Export Buttons */}
          <div className="text-center mt-4 mb-4">
            <button className="btn btn-primary btn-lg me-3" onClick={handlePrintTransactions}>
              🖨️ Print Transactions
            </button>
            <button className="btn btn-success btn-lg" onClick={() => {
              const exportData = filteredTransactions.map(txn => ({
                'Date': txn.date,
                'Customer Name': txn.customerName,
                'Customer Phone': txn.customerPhone,
                'Agent Name': txn.agentName,
                'Type': txn.type,
                'Amount': txn.amount || 0,
                'Mode': txn.paymentMethod || txn.mode,
                'Remarks': txn.remarks || ''
              }));
              exportToExcelWithFormat(exportData, 'all_transactions');
            }}>
              📊 Export to Excel
            </button>
          </div>
        </>
      )}

      {/* Add Transaction Modal */}
      {showAddTransaction && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content" style={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
              <div className="modal-header border-bottom-0 pt-4 px-4 pb-0">
                <h4 className="modal-title fw-bold text-dark">
                  Add New Transaction
                </h4>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAddTransaction(false)}
                ></button>
              </div>
              <form onSubmit={handleAddTransaction}>
                <div className="modal-body" style={{ padding: '30px' }}>
                  {/* Account Number - Primary Input */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold" style={{ color: '#667eea', fontSize: '0.95rem' }}>
                      🔢 Account Number <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      value={newTransaction.accountNumber}
                      onChange={(e) => handleAccountNumberChange(e.target.value)}
                      placeholder="Enter account number"
                      required
                      style={{
                        borderRadius: '12px',
                        border: '2px solid #e0e0e0',
                        padding: '12px 20px',
                        fontSize: '1rem',
                        transition: 'all 0.3s'
                      }}
                      onFocus={(e) => e.target.style.border = '2px solid #667eea'}
                      onBlur={(e) => e.target.style.border = '2px solid #e0e0e0'}
                    />
                    <small className="text-muted d-block mt-2">
                      <i className="bi bi-info-circle"></i> Auto-fills customer details
                    </small>
                  </div>

                  {/* Auto-filled Section */}
                  <div className="row mb-4">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold" style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                        👤 Agent
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={agents.find(a => a.id === newTransaction.agentId)?.name || ''}
                        readOnly
                        placeholder="Auto-filled"
                        style={{
                          backgroundColor: '#f8f9fa',
                          borderRadius: '10px',
                          border: '1px solid #e0e0e0',
                          padding: '10px 15px'
                        }}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold" style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                        👥 Customer
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={newTransaction.customerName}
                        readOnly
                        placeholder="Auto-filled"
                        style={{
                          backgroundColor: '#f8f9fa',
                          borderRadius: '10px',
                          border: '1px solid #e0e0e0',
                          padding: '10px 15px'
                        }}
                      />
                    </div>
                  </div>

                  {/* Transaction Details */}
                  <div className="row mb-4">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold" style={{ color: '#667eea', fontSize: '0.95rem' }}>
                        💰 Transaction Type <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select form-select-lg"
                        value={newTransaction.type}
                        onChange={(e) => handleTransactionTypeChange(e.target.value)}
                        required
                        style={{
                          borderRadius: '12px',
                          border: '2px solid #e0e0e0',
                          padding: '12px 20px',
                          fontSize: '1rem'
                        }}
                      >
                        <option value="deposit">💰 Deposit</option>
                        <option value="withdrawal">💸 Withdrawal</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold" style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                        🧾 Receipt No
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={newTransaction.receiptNumber}
                        readOnly
                        placeholder="Auto-generated"
                        style={{
                          backgroundColor: '#f8f9fa',
                          borderRadius: '10px',
                          border: '1px solid #e0e0e0',
                          padding: '10px 15px'
                        }}
                      />
                    </div>
                  </div>

                  {/* Amount and Payment */}
                  <div className="row mb-4">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold" style={{ color: '#667eea', fontSize: '0.95rem' }}>
                        💵 Amount <span className="text-danger">*</span>
                      </label>
                      <div className="input-group input-group-lg">
                        <span className="input-group-text" style={{
                          borderRadius: '12px 0 0 12px',
                          border: '2px solid #e0e0e0',
                          borderRight: 'none',
                          backgroundColor: 'white',
                          fontSize: '1.2rem'
                        }}>₹</span>
                        <input
                          type="number"
                          className="form-control"
                          value={newTransaction.amount}
                          onChange={(e) => {
                            const value = e.target.value;
                            setNewTransaction(prev => ({ ...prev, amount: value }));
                            // Handle penalty calculation asynchronously without blocking input
                            if (newTransaction.type === 'withdrawal' && value && customerEligibility) {
                              calculateWithdrawalPenalty(Number(value));
                            } else {
                              setWithdrawalPenalty(null);
                            }
                          }}
                          required
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          style={{
                            borderRadius: '0 12px 12px 0',
                            border: '2px solid #e0e0e0',
                            borderLeft: 'none',
                            padding: '12px 20px',
                            fontSize: '1rem'
                          }}
                        />
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold" style={{ color: '#667eea', fontSize: '0.95rem' }}>
                        💳 Payment Mode <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select form-select-lg"
                        value={newTransaction.paymentMethod}
                        onChange={(e) => setNewTransaction({ ...newTransaction, paymentMethod: e.target.value })}
                        required
                        style={{
                          borderRadius: '12px',
                          border: '2px solid #e0e0e0',
                          padding: '12px 20px',
                          fontSize: '1rem'
                        }}
                      >
                        <option value="cash">💵 Cash</option>
                        <option value="online">💳 Online</option>
                      </select>
                    </div>
                  </div>

                  {/* Online Mobile Number - Conditional Field */}
                  {newTransaction.paymentMethod === 'online' && (
                    <div className="row mb-4">
                      <div className="col-12">
                        <label className="form-label fw-semibold" style={{ color: '#667eea', fontSize: '0.95rem' }}>
                          📱 Online Mobile Number <span className="text-danger">*</span>
                        </label>
                        <input
                          type="tel"
                          className="form-control form-control-lg"
                          value={newTransaction.onlineMobileNumber}
                          onChange={(e) => setNewTransaction({ ...newTransaction, onlineMobileNumber: e.target.value })}
                          required={newTransaction.paymentMethod === 'online'}
                          placeholder="Enter mobile number for online payment"
                          pattern="[0-9]{10}"
                          maxLength="10"
                          style={{
                            borderRadius: '12px',
                            border: '2px solid #e0e0e0',
                            padding: '12px 20px',
                            fontSize: '1rem'
                          }}
                          onFocus={(e) => e.target.style.border = '2px solid #667eea'}
                          onBlur={(e) => e.target.style.border = '2px solid #e0e0e0'}
                        />
                        <small className="text-muted d-block mt-2">
                          <i className="bi bi-info-circle"></i> Enter 10-digit mobile number used for online payment
                        </small>
                      </div>
                    </div>
                  )}

                  {/* Monthly Bonus Progress Display for Deposits */}
                  {newTransaction.type === 'deposit' && monthlyBonusSummary && (
                    <div className="alert alert-info mb-4">
                      <h6 className="alert-heading d-flex align-items-center gap-2">
                        <span>🎁 Monthly Bonus Progress</span>
                        <span className="badge bg-primary">₹{formatCurrency(monthlyBonusSummary.perMonthBonus)}</span>
                      </h6>
                      <div className="row gy-3 mt-1">
                        <div className="col-md-6">
                          <small className="text-muted d-block">Completed Months</small>
                          <strong>{monthlyBonusSummary.completedMonths} / {TOTAL_INSTALLMENTS}</strong>
                        </div>
                        <div className="col-md-6">
                          <small className="text-muted d-block">Total Deposits</small>
                          <strong>₹{formatCurrency(monthlyBonusSummary.totalDeposits, 0)} / ₹{formatCurrency(monthlyBonusSummary.requiredTotalDeposits, 0)}</strong>
                        </div>
                        <div className="col-md-6">
                          <small className="text-muted d-block">Accrued Bonus</small>
                          <strong>₹{formatCurrency(monthlyBonusSummary.accruedBonus)}</strong>
                        </div>
                        <div className="col-md-6">
                          <small className="text-muted d-block">Maturity Bonus</small>
                          <strong className={monthlyBonusSummary.bonusEligible ? 'text-success' : ''}>
                            {monthlyBonusSummary.bonusEligible ? `✅ ₹${formatCurrency(monthlyBonusSummary.maturityBonusAmount)}` : `₹${formatCurrency(monthlyBonusSummary.totalBonusPotential)}`}
                          </strong>
                        </div>
                        <div className="col-12">
                          <div className="progress" style={{ height: '10px' }}>
                            <div
                              className={`progress-bar ${monthlyBonusSummary.bonusEligible ? 'bg-success' : 'bg-primary'}`}
                              role="progressbar"
                              style={{ width: `${monthlyBonusSummary.progressPercent}%` }}
                              aria-valuenow={monthlyBonusSummary.progressPercent}
                              aria-valuemin="0"
                              aria-valuemax="100"
                            ></div>
                          </div>
                          <small className="text-muted d-block mt-2">
                            {monthlyBonusSummary.bonusEligible
                              ? `🎉 All 12 payments complete! ₹${formatCurrency(monthlyBonusSummary.maturityBonusAmount)} bonus unlocked and will be paid at maturity.`
                              : `Each ₹${MONTHLY_INSTALLMENT_AMOUNT.toLocaleString('en-IN')} payment adds ₹${formatCurrency(monthlyBonusSummary.perMonthBonus)} bonus. Complete ${TOTAL_INSTALLMENTS - monthlyBonusSummary.completedMonths} more month(s) to unlock the full ₹${formatCurrency(monthlyBonusSummary.totalBonusPotential)} bonus.`}
                          </small>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Withdrawal Penalty Display with New Bonus Logic */}
                  {newTransaction.type === 'withdrawal' && withdrawalPenalty && (
                    <div className={`alert ${withdrawalPenalty.bonusIncluded ? 'alert-success' : withdrawalPenalty.penaltyApplied ? 'alert-warning' : 'alert-info'} mb-4`}>
                      <h6 className="alert-heading fw-bold">
                        {withdrawalPenalty.bonusIncluded ? '🎉 Bonus Included!' :
                          withdrawalPenalty.penaltyApplied ? '⚠️ Penalty Applied' :
                            '✅ No Penalty'}
                      </h6>
                      <div className="row mb-3">
                        <div className="col-md-3">
                          <strong>Total Balance:</strong><br />
                          <h5 className="mb-0 text-primary">
                            ₹{withdrawalPenalty.totalBalance.toLocaleString()}
                            {withdrawalPenalty.bonusIncluded && (
                              <span className="text-success"> + ₹{withdrawalPenalty.bonusAmount.toLocaleString()} (Bonus)</span>
                            )}
                          </h5>
                          {withdrawalPenalty.bonusIncluded && (
                            <div className="text-success small">
                              Total with Bonus: ₹{(withdrawalPenalty.totalBalance + withdrawalPenalty.bonusAmount).toLocaleString()}
                            </div>
                          )}
                        </div>
                        <div className="col-md-3">
                          <strong>Requested Amount:</strong><br />
                          <h5 className="mb-0 text-dark">₹{withdrawalPenalty.originalAmount.toLocaleString()}</h5>
                        </div>
                        {withdrawalPenalty.bonusIncluded && (
                          <div className="col-md-3">
                            <strong>🎁 Bonus Amount:</strong><br />
                            <h5 className="mb-0 text-success">₹{withdrawalPenalty.bonusAmount.toLocaleString()}</h5>
                          </div>
                        )}
                        {withdrawalPenalty.actualWithdrawalAmount !== withdrawalPenalty.originalAmount && !withdrawalPenalty.bonusIncluded && (
                          <div className="col-md-3">
                            <strong>Actual Amount:</strong><br />
                            <h5 className="mb-0 text-warning">₹{withdrawalPenalty.actualWithdrawalAmount.toLocaleString()}</h5>
                          </div>
                        )}
                        {withdrawalPenalty.penaltyApplied && (
                          <div className="col-md-3">
                            <strong>Penalty (5%):</strong><br />
                            <h5 className="mb-0 text-danger">₹{withdrawalPenalty.penalty.toLocaleString()}</h5>
                          </div>
                        )}
                        <div className="col-md-3">
                          <strong>Net Amount to Pay:</strong><br />
                          <h5 className="mb-0 text-success fw-bold">₹{withdrawalPenalty.netAmount.toLocaleString()}</h5>
                        </div>
                      </div>

                      {withdrawalPenalty.bonusIncluded && (
                        <div className="alert alert-success mb-3" style={{ fontSize: '0.9rem' }}>
                          <strong>🎉 Congratulations!</strong> {withdrawalPenalty.reason}
                        </div>
                      )}

                      <div className="alert alert-info mb-0 mt-3" style={{ fontSize: '0.9rem' }}>
                        <strong>💡 Calculation:</strong>
                        {withdrawalPenalty.bonusIncluded ?
                          `Requested Amount (₹${withdrawalPenalty.originalAmount.toLocaleString()}) + Bonus (₹${withdrawalPenalty.bonusAmount.toLocaleString()}) = Total Amount (₹${withdrawalPenalty.actualWithdrawalAmount.toLocaleString()})` :
                          withdrawalPenalty.penaltyApplied ?
                            `Withdrawal (₹${withdrawalPenalty.originalAmount.toLocaleString()}) - Penalty (₹${withdrawalPenalty.penalty.toLocaleString()}) = Net Amount (₹${withdrawalPenalty.netAmount.toLocaleString()})` :
                            `Accumulated Amount: ₹${withdrawalPenalty.actualWithdrawalAmount.toLocaleString()}`
                        }
                      </div>
                      <hr />
                      <small>
                        <strong>Reason:</strong> {withdrawalPenalty.reason}<br />
                        <strong>Months Completed:</strong> {withdrawalPenalty.monthsCompleted} / 12 months<br />
                        {withdrawalPenalty.planStartDate && withdrawalPenalty.planEndDate && (
                          <>
                            <strong>📅 Bishi Plan Start Date:</strong> {withdrawalPenalty.planStartDate}<br />
                            <strong>🏁 Bishi Plan End Date:</strong> {withdrawalPenalty.planEndDate}
                          </>
                        )}
                      </small>
                    </div>
                  )}

                  {/* Date */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ color: '#667eea', fontSize: '0.95rem' }}>
                      📅 Date <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control form-control-lg"
                      value={newTransaction.date}
                      onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                      required
                      style={{
                        borderRadius: '12px',
                        border: '2px solid #e0e0e0',
                        padding: '12px 20px',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                </div>
                <div className="modal-footer border-0 px-4 pb-4 pt-0 gap-3">
                  <button
                    type="button"
                    className="btn px-4 py-2"
                    onClick={() => setShowAddTransaction(false)}
                    style={{
                      borderRadius: '50px',
                      padding: '12px 30px',
                      backgroundColor: '#f1f5f9',
                      color: '#64748b',
                      fontWeight: '600',
                      border: 'none'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn px-4 py-2 flex-grow-1"
                    disabled={isSubmitting}
                    style={{
                      borderRadius: '50px',
                      padding: '12px 40px',
                      background: '#10b981',
                      border: 'none',
                      color: 'white',
                      fontWeight: '700',
                      fontSize: '1rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="spinner-border spinner-border-sm" role="status"></div>
                        Processing...
                      </>
                    ) : (
                      <>Add Transaction</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {showEditTransaction && editingTransaction && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content" style={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
              <div className="modal-header" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', borderRadius: '20px 20px 0 0', padding: '20px 30px' }}>
                <h4 className="modal-title mb-0 fw-bold">
                  <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>✏️</span>
                  Edit Transaction
                </h4>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowEditTransaction(false);
                    setEditingTransaction(null);
                  }}
                ></button>
              </div>
              <form onSubmit={handleUpdateTransaction}>
                <div className="modal-body" style={{ padding: '30px' }}>
                  {/* Transaction Details */}
                  <div className="row mb-4">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold" style={{ color: '#f5576c', fontSize: '0.95rem' }}>
                        💰 Transaction Type <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select form-select-lg"
                        value={editingTransaction.type}
                        onChange={(e) => setEditingTransaction({ ...editingTransaction, type: e.target.value })}
                        required
                        style={{
                          borderRadius: '12px',
                          border: '2px solid #e0e0e0',
                          padding: '12px 20px',
                          fontSize: '1rem'
                        }}
                      >
                        <option value="deposit">💰 Deposit</option>
                        <option value="withdrawal">💸 Withdrawal</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold" style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                        🧾 Receipt No
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-lg"
                        value={editingTransaction.receiptNumber}
                        onChange={(e) => setEditingTransaction({ ...editingTransaction, receiptNumber: e.target.value })}
                        placeholder="Receipt number"
                        style={{
                          borderRadius: '12px',
                          border: '2px solid #e0e0e0',
                          padding: '12px 20px',
                          fontSize: '1rem'
                        }}
                      />
                    </div>
                  </div>

                  {/* Amount and Payment */}
                  <div className="row mb-4">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold" style={{ color: '#f5576c', fontSize: '0.95rem' }}>
                        💵 Amount <span className="text-danger">*</span>
                      </label>
                      <div className="input-group input-group-lg">
                        <span className="input-group-text" style={{
                          borderRadius: '12px 0 0 12px',
                          border: '2px solid #e0e0e0',
                          borderRight: 'none',
                          backgroundColor: 'white',
                          fontSize: '1.2rem'
                        }}>₹</span>
                        <input
                          type="number"
                          className="form-control"
                          value={editingTransaction.amount}
                          onChange={(e) => setEditingTransaction({ ...editingTransaction, amount: e.target.value })}
                          required
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          style={{
                            borderRadius: '0 12px 12px 0',
                            border: '2px solid #e0e0e0',
                            borderLeft: 'none',
                            padding: '12px 20px',
                            fontSize: '1rem'
                          }}
                        />
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold" style={{ color: '#f5576c', fontSize: '0.95rem' }}>
                        💳 Payment Mode <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select form-select-lg"
                        value={editingTransaction.paymentMethod}
                        onChange={(e) => setEditingTransaction({ ...editingTransaction, paymentMethod: e.target.value })}
                        required
                        style={{
                          borderRadius: '12px',
                          border: '2px solid #e0e0e0',
                          padding: '12px 20px',
                          fontSize: '1rem'
                        }}
                      >
                        <option value="cash">💵 Cash</option>
                        <option value="online">💳 Online</option>
                      </select>
                    </div>
                  </div>

                  {/* Online Mobile Number - Conditional Field */}
                  {editingTransaction.paymentMethod === 'online' && (
                    <div className="row mb-4">
                      <div className="col-12">
                        <label className="form-label fw-semibold" style={{ color: '#f5576c', fontSize: '0.95rem' }}>
                          📱 Online Mobile Number <span className="text-danger">*</span>
                        </label>
                        <input
                          type="tel"
                          className="form-control form-control-lg"
                          value={editingTransaction.onlineMobileNumber || ''}
                          onChange={(e) => setEditingTransaction({ ...editingTransaction, onlineMobileNumber: e.target.value })}
                          required={editingTransaction.paymentMethod === 'online'}
                          placeholder="Enter mobile number for online payment"
                          pattern="[0-9]{10}"
                          maxLength="10"
                          style={{
                            borderRadius: '12px',
                            border: '2px solid #e0e0e0',
                            padding: '12px 20px',
                            fontSize: '1rem'
                          }}
                          onFocus={(e) => e.target.style.border = '2px solid #f5576c'}
                          onBlur={(e) => e.target.style.border = '2px solid #e0e0e0'}
                        />
                        <small className="text-muted d-block mt-2">
                          <i className="bi bi-info-circle"></i> Enter 10-digit mobile number used for online payment
                        </small>
                      </div>
                    </div>
                  )}

                  {/* Date and Remarks */}
                  <div className="row mb-4">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold" style={{ color: '#f5576c', fontSize: '0.95rem' }}>
                        📅 Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control form-control-lg"
                        value={editingTransaction.date}
                        onChange={(e) => setEditingTransaction({ ...editingTransaction, date: e.target.value })}
                        required
                        style={{
                          borderRadius: '12px',
                          border: '2px solid #e0e0e0',
                          padding: '12px 20px',
                          fontSize: '1rem'
                        }}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold" style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                        📝 Remarks
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-lg"
                        value={editingTransaction.remarks}
                        onChange={(e) => setEditingTransaction({ ...editingTransaction, remarks: e.target.value })}
                        placeholder="Optional remarks"
                        style={{
                          borderRadius: '12px',
                          border: '2px solid #e0e0e0',
                          padding: '12px 20px',
                          fontSize: '1rem'
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0 px-4 pb-4 pt-0 gap-3">
                  <button
                    type="button"
                    className="btn px-4 py-2"
                    onClick={() => {
                      setShowEditTransaction(false);
                      setEditingTransaction(null);
                    }}
                    style={{
                      borderRadius: '50px',
                      padding: '12px 30px',
                      backgroundColor: '#f1f5f9',
                      color: '#64748b',
                      fontWeight: '600',
                      border: 'none'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn px-4 py-2 flex-grow-1"
                    disabled={isSubmitting}
                    style={{
                      borderRadius: '50px',
                      padding: '12px 40px',
                      background: '#10b981',
                      border: 'none',
                      color: 'white',
                      fontWeight: '700',
                      fontSize: '1rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="spinner-border spinner-border-sm" role="status"></div>
                        Updating...
                      </>
                    ) : (
                      <>Update Transaction</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', zIndex: 9999 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{
              borderRadius: '24px',
              border: 'none',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
              <div className="modal-body p-0">
                <div style={{
                  background: successModalData.type === 'success' ? '#10b981' : '#ef4444',
                  padding: '50px 20px',
                  textAlign: 'center',
                  color: 'white'
                }}>
                  <div style={{
                    fontSize: '64px',
                    marginBottom: '15px',
                    animation: 'bounceIn 0.6s ease-out'
                  }}>
                    {successModalData.type === 'success' ? '✨' : '⚠️'}
                  </div>
                  <h2 className="fw-bold mb-0" style={{ fontSize: '2rem' }}>
                    {successModalData.icon} {successModalData.title}
                  </h2>
                </div>
                <div className="p-5 text-center bg-white">
                  <p style={{
                    fontSize: '1.25rem',
                    color: '#4b5563',
                    marginBottom: '35px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-line'
                  }}>
                    {successModalData.message}
                  </p>
                  <button
                    className="btn btn-lg w-100 text-uppercase fw-bold"
                    onClick={() => setShowSuccessModal(false)}
                    style={{
                      borderRadius: '50px',
                      padding: '16px',
                      background: successModalData.type === 'success' ? '#10b981' : '#ef4444',
                      color: 'white',
                      border: 'none',
                      fontSize: '1rem',
                      letterSpacing: '1px',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                    }}
                  >
                    Got it, thanks!
                  </button>
                </div>
              </div>
            </div>
          </div>
          <style>{`
            @keyframes bounceIn {
              from { opacity: 0; transform: scale(0.3); }
              50% { opacity: 1; transform: scale(1.05); }
              70% { transform: scale(0.9); }
              to { transform: scale(1); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
