import { useEffect, useState } from "react";
import { getAllTransactions, getAllAgents, getAgentCustomers, addTransactionToAgent, updateTransaction, calculateBonusEligibility, processEarlyWithdrawal } from "../utils/databaseHelpers";
import { ref, get, remove } from "firebase/database";
import { db } from "../firebase";
import { useLocation } from "react-router-dom";
import { exportToExcelWithFormat } from "../utils/excelExport";

export default function Transactions() {
  const location = useLocation();
  const [transactions, setTransactions] = useState([]);
  const [agents, setAgents] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showEditTransaction, setShowEditTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  
  // Hierarchical view state
  const [viewMode, setViewMode] = useState('agents'); // 'agents', 'customers', 'transactions'
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
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
    accountNumber: "",
    receiptNumber: "",
    remarks: "",
    date: new Date().toISOString().split('T')[0]
  });
  
  // Withdrawal penalty state
  const [withdrawalPenalty, setWithdrawalPenalty] = useState(null);
  const [customerEligibility, setCustomerEligibility] = useState(null);

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
                  timestamp: value.timestamp || (value.date ? new Date(value.date).getTime() : Date.now()),
                  // Keep original data
                  ...value
                }));
                customerTransactions = [...customerTransactions, ...withdrawalTransactions];
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

  if (viewMode === 'customers') {
    // When viewing customers, show total balance from all customers
    totalBalance = selectedAgentCustomers.reduce((sum, customer) => {
      return sum + Number(customer.principalAmount || customer.balance || 0);
    }, 0);
  } else {
    // When viewing transactions, calculate from transaction data
    totalDeposits = filteredTransactions
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    totalWithdrawals = filteredTransactions
      .filter(t => t.type === 'withdrawal')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    totalPenalties = filteredTransactions
      .filter(t => t.type === 'penalty')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    totalBonuses = filteredTransactions
      .filter(t => t.type === 'bonus')
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }

  // Handle account number change and auto-fill customer details
  const handleAccountNumberChange = async (accountNumber) => {
    setWithdrawalPenalty(null);
    setCustomerEligibility(null);
    
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
    setNewTransaction(prev => ({...prev, type}));
    setWithdrawalPenalty(null);
    
    // If switching to withdrawal, ensure eligibility is loaded
    if (type === 'withdrawal') {
      if (!customerEligibility && newTransaction.agentId && newTransaction.customerPhone) {
        try {
          const eligibility = await calculateBonusEligibility(newTransaction.agentId, newTransaction.customerPhone);
          setCustomerEligibility(eligibility);
          
          // Calculate penalty if amount exists
          if (newTransaction.amount) {
            const amount = Number(newTransaction.amount);
            const monthsCompleted = eligibility.monthsSinceStart;
            const totalBalance = eligibility.totalDeposits;
            let penalty = 0;
            let penaltyApplied = false;
            
            if (monthsCompleted < 13) {
              penalty = Math.floor(amount * 0.05);
              penaltyApplied = true;
            }
            
            const netAmount = amount - penalty;
            
            setWithdrawalPenalty({
              originalAmount: amount,
              totalBalance: totalBalance,
              penalty,
              netAmount,
              penaltyApplied,
              monthsCompleted,
              reason: penaltyApplied ? `Early withdrawal before 13 months - 5% penalty on withdrawal amount` : 'No penalty - 13 months completed'
            });
          }
        } catch (error) {
          console.error("Error loading customer eligibility:", error);
        }
      } else if (customerEligibility && newTransaction.amount) {
        calculateWithdrawalPenalty(Number(newTransaction.amount));
      }
    }
  };
  
  // Handle amount change for withdrawal
  const handleAmountChange = (amount) => {
    setNewTransaction(prev => ({...prev, amount}));
    
    // If withdrawal type, calculate penalty
    if (newTransaction.type === 'withdrawal' && amount && customerEligibility) {
      calculateWithdrawalPenalty(Number(amount));
    } else {
      setWithdrawalPenalty(null);
    }
  };
  
  // Calculate withdrawal penalty
  const calculateWithdrawalPenalty = (amount) => {
    if (!customerEligibility || !amount) {
      setWithdrawalPenalty(null);
      return;
    }
    
    const monthsCompleted = customerEligibility.monthsSinceStart;
    const totalBalance = customerEligibility.totalDeposits;
    let penalty = 0;
    let penaltyApplied = false;
    
    if (monthsCompleted < 13) {
      // Penalty is 5% of withdrawal amount
      penalty = Math.floor(amount * 0.05);
      penaltyApplied = true;
    }
    
    const netAmount = amount - penalty;
    
    setWithdrawalPenalty({
      originalAmount: amount,
      totalBalance: totalBalance,
      penalty,
      netAmount,
      penaltyApplied,
      monthsCompleted,
      reason: penaltyApplied ? `Early withdrawal before 13 months - 5% penalty on withdrawal amount` : 'No penalty - 13 months completed'
    });
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    
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
        
        // Confirm withdrawal with penalty details
        const confirmMessage = `Process withdrawal for ${selectedCustomer?.name}?\n\n` +
          `Total Balance: ₹${withdrawalPenalty.totalBalance.toLocaleString()}\n` +
          `Withdrawal Amount: ₹${withdrawalPenalty.originalAmount.toLocaleString()}\n` +
          `Penalty (5% of withdrawal): ₹${withdrawalPenalty.penalty.toLocaleString()}\n` +
          `Net Amount to Pay: ₹${withdrawalPenalty.netAmount.toLocaleString()}\n\n` +
          `Months Completed: ${withdrawalPenalty.monthsCompleted} / 13`;
        
        if (!window.confirm(confirmMessage)) {
          return;
        }
        
        // Process withdrawal with penalty
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
            date: newTransaction.date,
            time: new Date().toLocaleTimeString('en-IN')
          }
        );
        
        alert(
          `Withdrawal processed successfully!\n\n` +
          `Original Amount: ₹${result.originalAmount.toLocaleString()}\n` +
          `Penalty: ₹${result.penalty.toLocaleString()}\n` +
          `Net Amount Paid: ₹${result.netAmount.toLocaleString()}\n` +
          `Transaction ID: ${result.transactionId}`
        );
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
          accountNumber: newTransaction.accountNumber,
          receiptNumber: newTransaction.receiptNumber,
          remarks: newTransaction.remarks
        });
        
        alert("Transaction added successfully!");
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
        accountNumber: "",
        receiptNumber: "",
        remarks: "",
        date: new Date().toISOString().split('T')[0]
      });
      setWithdrawalPenalty(null);
      setCustomerEligibility(null);

      setShowAddTransaction(false);
      
      // Reload data
      loadData();
    } catch (error) {
      alert("Error adding transaction: " + error.message);
    }
  };

  const handleAgentChange = async (agentId) => {
    setNewTransaction({...newTransaction, agentId, customerId: "", customerName: "", customerPhone: ""});
    
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
          timestamp: value.timestamp || (value.depositDate ? new Date(`${value.depositDate} ${value.depositTime || '00:00:00'}`).getTime() : Date.now()),
          // Keep original data
          ...value
        }));
        
        // Sort by date (newest first)
        customerTransactions.sort((a, b) => {
          return b.timestamp - a.timestamp;
        });
      }
      
      console.log("Total transactions found:", customerTransactions.length);
      console.log("Transactions:", customerTransactions);
      
      setSelectedCustomerTransactions(customerTransactions);
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
    
    try {
      const updatedData = {
        type: editingTransaction.type,
        amount: Number(editingTransaction.amount),
        date: editingTransaction.date,
        paymentMethod: editingTransaction.paymentMethod,
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
      alert("Transaction updated successfully!");
      
      // Reload transactions
      handleCustomerClick(selectedCustomer);
    } catch (error) {
      console.error("Error updating transaction:", error);
      alert("Error updating transaction: " + error.message);
    }
  };

  // Handle delete transaction
  const handleDeleteTransaction = async (transaction) => {
    console.log("Delete button clicked for transaction:", transaction);
    console.log("Selected Agent:", selectedAgent);
    console.log("Selected Customer:", selectedCustomer);
    
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      try {
        // Delete from Firebase: agents/{agentPhone}/transactions/{customerPhone}/{transactionId}
        const deletePath = `agents/${selectedAgent.phone}/transactions/${selectedCustomer.phone}/${transaction.id}`;
        console.log("Deleting from path:", deletePath);
        
        const transactionRef = ref(db, deletePath);
        await remove(transactionRef);
        
        console.log("Transaction deleted successfully");
        alert("Transaction deleted successfully!");
        
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
    printWindow.document.write('.customer-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }');
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
    <div className="container-fluid fade-in-up">
      <div className="card border-0 mb-4" style={{ background: 'var(--success-gradient)', color: 'white' }}>
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <div className="me-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center"
                     style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.2)' }}>
                  <span style={{ fontSize: '1.5rem' }}>
                    {viewMode === 'agents' ? '👥' : viewMode === 'customers' ? '👤' : '💳'}
                  </span>
                </div>
              </div>
              <div>
                <h4 className="mb-1 fw-bold">
                  {viewMode === 'agents' ? 'Select Agent' : 
                   viewMode === 'customers' ? `${selectedAgent?.name} - Customers` : 
                   `${selectedCustomer?.name} - Transactions`}
                </h4>
                <p className="mb-0 opacity-75">
                  {viewMode === 'agents' ? 'Click on an agent to view their customers' : 
                   viewMode === 'customers' ? 'Click on a customer to view their transactions' : 
                   'View all transactions for this customer'}
                </p>
              </div>
            </div>
            <button 
              className="btn btn-light"
              onClick={() => setShowAddTransaction(true)}
            >
              <span className="me-2">➕</span>Add Transaction
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {viewMode === 'customers' && (
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="stats-card">
              <div className="stats-icon" style={{ background: 'var(--success-gradient)' }}>
                💰
              </div>
              <h3 className="stats-number">₹{totalBalance.toLocaleString()}</h3>
              <p className="stats-label">Total Balance</p>
            </div>
          </div>
          <div className="col-md-3">
            <div className="stats-card">
              <div className="stats-icon" style={{ background: 'var(--primary-gradient)' }}>
                👥
              </div>
              <h3 className="stats-number">{selectedAgentCustomers.length}</h3>
              <p className="stats-label">Total Customers</p>
            </div>
          </div>
          <div className="col-md-3">
            <div className="stats-card">
              <div className="stats-icon" style={{ background: 'var(--success-gradient)' }}>
                ✅
              </div>
              <h3 className="stats-number">{selectedAgentCustomers.filter(c => c.active).length}</h3>
              <p className="stats-label">Active Customers</p>
            </div>
          </div>
          <div className="col-md-3">
            <div className="stats-card">
              <div className="stats-icon" style={{ background: 'var(--warning-gradient)' }}>
                ⏸️
              </div>
              <h3 className="stats-number">{selectedAgentCustomers.filter(c => !c.active).length}</h3>
              <p className="stats-label">Inactive Customers</p>
            </div>
          </div>
        </div>
      )}
      
      {viewMode === 'transactions' && (
        <div className="row mb-4">
          <div className="col-md-4">
            <div className="stats-card">
              <div className="stats-icon" style={{ background: 'var(--success-gradient)' }}>
                💰
              </div>
              <h3 className="stats-number">₹{totalDeposits.toLocaleString()}</h3>
              <p className="stats-label">Total Deposits</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="stats-card">
              <div className="stats-icon" style={{ background: 'var(--danger-color)' }}>
                💸
              </div>
              <h3 className="stats-number">₹{totalWithdrawals.toLocaleString()}</h3>
              <p className="stats-label">Total Withdrawals</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="stats-card">
              <div className="stats-icon" style={{ background: 'var(--primary-gradient)' }}>
                💳
              </div>
              <h3 className="stats-number">₹{(totalDeposits - totalWithdrawals).toLocaleString()}</h3>
              <p className="stats-label">Total Balance</p>
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
                        .map((agent) => {
                          const customerCount = agent.customers ? Object.keys(agent.customers).length : 0;
                          return (
                            <tr key={agent.id} style={{ cursor: 'pointer' }} onClick={() => handleAgentClick(agent)}>
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
                                  <div className="d-flex flex-wrap gap-1">
                                    {agent.routes.map((route, idx) => (
                                      <span key={idx} className="badge bg-info">📍 {route}</span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="badge bg-secondary">No routes</span>
                                )}
                              </td>
                              <td>
                                <span className="badge bg-info" style={{ fontSize: '0.9rem' }}>
                                  👥 {customerCount}
                                </span>
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
                      <th>Customer Name</th>
                      <th>Phone</th>
                      <th>Balance</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAgentCustomers.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-muted">
                          No customers found for this agent
                        </td>
                      </tr>
                    ) : (
                      selectedAgentCustomers
                        .filter(customer => 
                          customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          customer.phone?.includes(searchTerm)
                        )
                        .map((customer) => (
                          <tr key={customer.id} style={{ cursor: 'pointer' }} onClick={() => handleCustomerClick(customer)}>
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
                            <td className="fw-bold text-success">₹{Number(customer.principalAmount || customer.balance || 0).toLocaleString()}</td>
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
                  <div className="col-md-3">
                    <p className="mb-2"><strong>Name:</strong></p>
                    <p className="text-muted">{selectedCustomer.name}</p>
                  </div>
                  <div className="col-md-3">
                    <p className="mb-2"><strong>Phone:</strong></p>
                    <p className="text-muted">{selectedCustomer.phone}</p>
                  </div>
                  <div className="col-md-3">
                    <p className="mb-2"><strong>Account Number:</strong></p>
                    <p className="text-muted">{selectedCustomer.accountNumber || 'N/A'}</p>
                  </div>
                  <div className="col-md-3">
                    <p className="mb-2"><strong>Balance:</strong></p>
                    <p className="text-success fw-bold">₹{(totalDeposits - totalWithdrawals).toLocaleString()}</p>
                    <small className="text-muted">Deposits: ₹{totalDeposits.toLocaleString()} - Withdrawals: ₹{totalWithdrawals.toLocaleString()}</small>
                  </div>
                </div>
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
                <table className="table mb-0">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Receipt No</th>
                      <th>Deposit</th>
                      <th>Withdrawal</th>
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
                        .map((transaction) => {
                          // Check if this is a withdrawal by type only
                          const isWithdrawal = transaction.type === 'withdrawal';
                          const depositAmount = transaction.type === 'deposit' ? Number(transaction.amount || 0) : 0;
                          const originalWithdrawAmount = isWithdrawal ? Number(transaction.originalAmount || transaction.amount || 0) : 0;
                          const penaltyAmount = isWithdrawal ? Number(transaction.penalty || 0) : 0;
                          const netWithdrawAmount = isWithdrawal ? Number(transaction.amount || 0) : 0;
                          
                          return (
                            <tr key={transaction.id}>
                              <td>
                                <div className="fw-semibold">{transaction.date ? new Date(transaction.date).toLocaleDateString() : '-'}</div>
                                {transaction.time && <small className="text-muted">{transaction.time}</small>}
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
                                <span className="badge bg-info">
                                  {(transaction.paymentMethod || transaction.mode) === 'cash' && '💵'}
                                  {(transaction.paymentMethod || transaction.mode) === 'online' && '💳'}
                                  {(transaction.paymentMethod || transaction.mode) === 'cheque' && '📄'}
                                  {!(transaction.paymentMethod || transaction.mode) && '💵'}
                                  {' '}
                                  {transaction.paymentMethod || transaction.mode || 'Cash'}
                                </span>
                              </td>
                              <td>
                                <button 
                                  className="btn btn-sm btn-warning me-2" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditTransaction(transaction);
                                  }}
                                  title="Edit Transaction"
                                >
                                  ✏️
                                </button>
                                <button 
                                  className="btn btn-sm btn-danger" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTransaction(transaction);
                                  }}
                                  title="Delete Transaction"
                                >
                                  🗑️
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
              <div className="modal-header" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: '20px 20px 0 0', padding: '20px 30px' }}>
                <h4 className="modal-title mb-0 fw-bold">
                  <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>💳</span>
                  Add New Transaction
                </h4>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
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
                          onChange={(e) => handleAmountChange(e.target.value)}
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
                        onChange={(e) => setNewTransaction({...newTransaction, paymentMethod: e.target.value})}
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

                  {/* Withdrawal Penalty Display */}
                  {newTransaction.type === 'withdrawal' && withdrawalPenalty && (
                    <div className={`alert ${withdrawalPenalty.penaltyApplied ? 'alert-warning' : 'alert-success'} mb-4`}>
                      <h6 className="alert-heading fw-bold">
                        {withdrawalPenalty.penaltyApplied ? '⚠️ Penalty Applied' : '✅ No Penalty'}
                      </h6>
                      <div className="row mb-3">
                        <div className="col-md-3">
                          <strong>Total Balance:</strong><br />
                          <h5 className="mb-0 text-primary">₹{withdrawalPenalty.totalBalance.toLocaleString()}</h5>
                        </div>
                        <div className="col-md-3">
                          <strong>Withdrawal Amount:</strong><br />
                          <h5 className="mb-0 text-dark">₹{withdrawalPenalty.originalAmount.toLocaleString()}</h5>
                        </div>
                        <div className="col-md-3">
                          <strong>Penalty (5%):</strong><br />
                          <h5 className="mb-0 text-danger">₹{withdrawalPenalty.penalty.toLocaleString()}</h5>
                        </div>
                        <div className="col-md-3">
                          <strong>Net Amount to Pay:</strong><br />
                          <h5 className="mb-0 text-success fw-bold">₹{withdrawalPenalty.netAmount.toLocaleString()}</h5>
                        </div>
                      </div>
                      <div className="alert alert-info mb-0 mt-3" style={{ fontSize: '0.9rem' }}>
                        <strong>💡 Calculation:</strong> Withdrawal (₹{withdrawalPenalty.originalAmount.toLocaleString()}) - Penalty (₹{withdrawalPenalty.penalty.toLocaleString()}) = Net Amount (₹{withdrawalPenalty.netAmount.toLocaleString()})
                      </div>
                      <hr />
                      <small>
                        <strong>Reason:</strong> {withdrawalPenalty.reason}<br />
                        <strong>Months Completed:</strong> {withdrawalPenalty.monthsCompleted} / 13 months
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
                      onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
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
                <div className="modal-footer" style={{ padding: '20px 30px', borderTop: '1px solid #e0e0e0' }}>
                  <button 
                    type="button" 
                    className="btn btn-lg"
                    onClick={() => setShowAddTransaction(false)}
                    style={{
                      borderRadius: '12px',
                      padding: '12px 30px',
                      border: '2px solid #e0e0e0',
                      backgroundColor: 'white',
                      color: '#6c757d',
                      fontWeight: '600'
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-lg"
                    style={{
                      borderRadius: '12px',
                      padding: '12px 40px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      color: 'white',
                      fontWeight: '600',
                      boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                    }}
                  >
                    ✓ Add Transaction
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
                        onChange={(e) => setEditingTransaction({...editingTransaction, type: e.target.value})}
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
                        onChange={(e) => setEditingTransaction({...editingTransaction, receiptNumber: e.target.value})}
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
                          onChange={(e) => setEditingTransaction({...editingTransaction, amount: e.target.value})}
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
                        onChange={(e) => setEditingTransaction({...editingTransaction, paymentMethod: e.target.value})}
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
                        onChange={(e) => setEditingTransaction({...editingTransaction, date: e.target.value})}
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
                        onChange={(e) => setEditingTransaction({...editingTransaction, remarks: e.target.value})}
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
                <div className="modal-footer" style={{ padding: '20px 30px', borderTop: '1px solid #e0e0e0' }}>
                  <button 
                    type="button" 
                    className="btn btn-lg"
                    onClick={() => {
                      setShowEditTransaction(false);
                      setEditingTransaction(null);
                    }}
                    style={{
                      borderRadius: '12px',
                      padding: '12px 30px',
                      border: '2px solid #e0e0e0',
                      backgroundColor: 'white',
                      color: '#6c757d',
                      fontWeight: '600'
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-lg"
                    style={{
                      borderRadius: '12px',
                      padding: '12px 40px',
                      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      border: 'none',
                      color: 'white',
                      fontWeight: '600',
                      boxShadow: '0 4px 15px rgba(245, 87, 108, 0.4)'
                    }}
                  >
                    ✓ Update Transaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
