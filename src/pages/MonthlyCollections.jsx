import { useEffect, useState } from "react";
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import { exportToExcelWithFormat } from "../utils/excelExport";

export default function MonthlyCollections() {
  const [transactions, setTransactions] = useState([]);
  const [agents, setAgents] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedAgent, setSelectedAgent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch all agents directly from Firebase
      const agentsRef = ref(db, "agents");
      const agentsSnapshot = await get(agentsRef);
      
      let agentsData = [];
      let allTransactions = [];
      let allCustomers = [];
      
      if (agentsSnapshot.exists()) {
        const agentsFirebase = agentsSnapshot.val();
        
        // Process each agent
        Object.entries(agentsFirebase).forEach(([agentPhone, agentData]) => {
          const agentInfo = {
            phone: agentPhone,
            name: agentData.agentInfo?.agentName || 'Unknown',
            agentId: agentData.agentInfo?.agentId || agentPhone,
            route: agentData.agentInfo?.route || ''
          };
          agentsData.push(agentInfo);
          
          // Get customers for this agent
          const customers = agentData.customers || {};
          Object.entries(customers).forEach(([customerPhone, customerData]) => {
            allCustomers.push({
              phone: customerPhone,
              name: customerData.name || 'Unknown',
              agentPhone: agentPhone,
              agentName: agentInfo.name
            });

            // Get transactions for this customer
            const customerTransactions = customerData.transactions || {};
            Object.entries(customerTransactions).forEach(([txnId, txn]) => {
              allTransactions.push({
                id: txnId,
                agentPhone,
                agentName: agentInfo.name,
                customerPhone,
                customerName: txn.customerName || customerData.name || customerPhone,
                // Support both old and new field formats
                amount: Number(txn.amount || 0),
                date: txn.date || '',
                time: txn.time || '',
                type: txn.type || 'deposit',
                mode: txn.mode || txn.paymentMethod || 'cash',
                paymentMethod: txn.paymentMethod || txn.mode || 'cash',
                remarks: txn.remarks || txn.notes || '',
                notes: txn.notes || txn.remarks || '',
                interest: Number(txn.interest || 0),
                receiptNumber: txn.receiptNumber || '',
                accountNumber: txn.accountNumber || '',
                customerId: txn.customerId || '',
                timestamp: txn.timestamp || Date.now()
              });
            });
          });
          
          // Also get agent-level transactions (legacy support)
          const agentTransactions = agentData.transactions || {};
          Object.entries(agentTransactions).forEach(([customerPhone, customerTransactions]) => {
            Object.entries(customerTransactions || {}).forEach(([txnId, txn]) => {
              // Find customer name
              const customer = allCustomers.find(c => c.phone === customerPhone && c.agentPhone === agentPhone);
              
              allTransactions.push({
                id: txnId,
                agentPhone,
                agentName: agentInfo.name,
                customerPhone,
                customerName: txn.customerName || customer?.name || customerPhone,
                // Support both old and new field formats
                amount: Number(txn.amount || txn.amountDeposited || 0),
                date: txn.depositDate || txn.date || '',
                time: txn.depositTime || txn.time || '',
                type: txn.type || 'deposit',
                mode: txn.mode || txn.paymentMethod || 'cash',
                paymentMethod: txn.paymentMethod || txn.mode || 'cash',
                remarks: txn.remarks || txn.notes || '',
                notes: txn.notes || txn.remarks || '',
                interest: Number(txn.interest || 0),
                receiptNumber: txn.receiptNumber || txn.receiptNo || '',
                accountNumber: txn.accountNumber || '',
                customerId: txn.customerId || '',
                timestamp: txn.timestamp || (txn.depositDate ? new Date(`${txn.depositDate} ${txn.depositTime || '00:00:00'}`).getTime() : Date.now())
              });
            });
          });
        });
      }
      
      setAgents(agentsData);
      setCustomers(allCustomers);
      setTransactions(allTransactions);
      
      console.log("Loaded agents:", agentsData.length);
      console.log("Loaded customers:", allCustomers.length);
      console.log("Loaded transactions:", allTransactions.length);
      console.log("Transaction types:", [...new Set(allTransactions.map(t => t.type))]);
      console.log("Sample transactions:", allTransactions.slice(0, 5));
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions by selected month, year, and agent
  const getFilteredCollections = () => {
    return transactions.filter(transaction => {
      if (!transaction.date) return false; // Skip transactions without date
      
      const transactionDate = new Date(transaction.date);
      const matchesMonth = transactionDate.getMonth() + 1 === selectedMonth;
      const matchesYear = transactionDate.getFullYear() === selectedYear;
      const matchesAgent = !selectedAgent || transaction.agentPhone === selectedAgent;
      
      return matchesMonth && matchesYear && matchesAgent;
    }).map(transaction => ({
      ...transaction,
      amount: Number(transaction.amount) || 0,
      depositAmount: transaction.type === 'deposit' ? Number(transaction.amount) || 0 : 0,
      withdrawAmount: transaction.type === 'withdrawal' ? Number(transaction.amount) || 0 : 0,
      interest: Number(transaction.interest) || 0
    })).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const filteredCollections = getFilteredCollections();

  // Calculate monthly statistics
  const calculateMonthlyStats = () => {
    const totalDeposits = filteredCollections.reduce((sum, collection) => sum + collection.depositAmount, 0);
    const totalWithdrawals = filteredCollections.reduce((sum, collection) => sum + collection.withdrawAmount, 0);
    const totalAmount = totalDeposits - totalWithdrawals;
    const totalCollections = filteredCollections.length;
    const averageAmount = totalCollections > 0 ? totalAmount / totalCollections : 0;

    // Group by agent
    const byAgent = filteredCollections.reduce((acc, collection) => {
      const agentPhone = collection.agentPhone || 'unassigned';
      if (!acc[agentPhone]) {
        acc[agentPhone] = { deposits: 0, withdrawals: 0, count: 0 };
      }
      acc[agentPhone].deposits += collection.depositAmount;
      acc[agentPhone].withdrawals += collection.withdrawAmount;
      acc[agentPhone].count += 1;
      return acc;
    }, {});

    return {
      totalDeposits,
      totalWithdrawals,
      totalAmount,
      totalCollections,
      averageAmount,
      byAgent
    };
  };

  const stats = calculateMonthlyStats();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getTypeIcon = (type) => {
    return '💰';
  };

  const getTypeBadge = (type) => {
    return 'bg-success';
  };

  // Print function
  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=800,width=900');
    const currentDate = new Date().toLocaleDateString('en-IN');
    const currentTime = new Date().toLocaleTimeString('en-IN');
    
    printWindow.document.write('<html><head><title>Monthly Collections Report</title>');
    printWindow.document.write('<style>');
    printWindow.document.write('@page { margin: 10mm; size: A4; }');
    printWindow.document.write('* { margin: 0; padding: 0; box-sizing: border-box; }');
    printWindow.document.write('body { font-family: "Segoe UI", Arial, sans-serif; padding: 0; background: white; color: #333; margin: 0; font-size: 12px; }');
    printWindow.document.write('.report-container { background: white; padding: 0; max-width: 100%; margin: 0; }');
    printWindow.document.write('.header { border-bottom: 2px solid #2c5aa0; padding: 10px 0; margin-bottom: 15px; text-align: center; }');
    printWindow.document.write('.company-name { font-size: 22px; font-weight: bold; color: #2c5aa0; margin-bottom: 5px; }');
    printWindow.document.write('.report-title { font-size: 16px; color: #2c5aa0; margin-bottom: 5px; }');
    printWindow.document.write('.report-period { font-size: 13px; color: #666; margin-bottom: 3px; }');
    printWindow.document.write('.generation-info { font-size: 10px; color: #888; }');
    printWindow.document.write('.agent-section { margin-bottom: 20px; page-break-inside: avoid; margin-top: 0; }');
    printWindow.document.write('.agent-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 10px 15px; border-radius: 5px 5px 0 0; }');
    printWindow.document.write('.agent-name { font-size: 14px; font-weight: bold; margin-bottom: 3px; }');
    printWindow.document.write('.agent-info { font-size: 11px; opacity: 0.9; }');
    printWindow.document.write('table { width: 100%; border-collapse: collapse; margin-top: 0; font-size: 11px; }');
    printWindow.document.write('thead { background: #f8f9fa; }');
    printWindow.document.write('th { padding: 8px 6px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; border: 1px solid #e0e0e0; }');
    printWindow.document.write('tbody tr { border-bottom: 1px solid #e0e0e0; }');
    printWindow.document.write('td { padding: 6px; border: 1px solid #e0e0e0; font-size: 10px; }');
    printWindow.document.write('.date-col { width: 100px; }');
    printWindow.document.write('.customer-col { width: 200px; }');
    printWindow.document.write('.amount-col { width: 100px; text-align: right; font-weight: 600; }');
    printWindow.document.write('.mode-col { width: 80px; text-align: center; font-size: 12px; }');
    printWindow.document.write('.text-success { color: #10b981; }');
    printWindow.document.write('.text-danger { color: #ef4444; }');
    printWindow.document.write('.subtotal-row { background: #f8f9fa; font-weight: bold; }');
    printWindow.document.write('.grand-total { margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px; border: 2px solid #2c5aa0; }');
    printWindow.document.write('.grand-total-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }');
    printWindow.document.write('.total-item { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #ddd; font-size: 12px; }');
    printWindow.document.write('.total-item:last-child { border-bottom: 2px solid #2c5aa0; font-size: 14px; font-weight: bold; }');
    printWindow.document.write('.footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 9px; color: #888; }');
    printWindow.document.write('@media print { body { background: white !important; padding: 0 !important; margin: 0 !important; } .report-container { box-shadow: none !important; padding: 0 !important; margin: 0 !important; } }');
    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<div class="report-container">');
    
    // Header
    printWindow.document.write('<div class="header">');
    printWindow.document.write('<div class="company-name">SMART BHISHI</div>');
    printWindow.document.write('<div class="report-title">Monthly Collection Report</div>');
    printWindow.document.write('<div class="report-period">');
    printWindow.document.write(monthNames[selectedMonth - 1] + ' ' + selectedYear);
    if (selectedAgent) {
      const agent = agents.find(a => a.phone === selectedAgent);
      printWindow.document.write(' - Agent: ' + (agent?.name || selectedAgent));
    }
    printWindow.document.write('</div>');
    printWindow.document.write('<div class="generation-info">Generated on: ' + currentDate + ' at ' + currentTime + '</div>');
    printWindow.document.write('</div>');
    
    // Agent-wise transactions
    Object.entries(transactionsByAgent).forEach(([agentPhone, agentData]) => {
      const agentTotal = agentData.transactions.reduce((sum, t) => sum + t.depositAmount - t.withdrawAmount, 0);
      const totalDeposits = agentData.transactions.reduce((sum, t) => sum + t.depositAmount, 0);
      const totalWithdrawals = agentData.transactions.reduce((sum, t) => sum + t.withdrawAmount, 0);
      
      printWindow.document.write('<div class="agent-section">');
      printWindow.document.write('<div class="agent-header">');
      printWindow.document.write('<div class="agent-name">👨‍💼 ' + agentData.agentName + '</div>');
      printWindow.document.write('<div class="agent-info">Phone: ' + agentData.agentPhone + ' | Transactions: ' + agentData.transactions.length + ' | Net Amount: ₹' + agentTotal.toLocaleString() + '</div>');
      printWindow.document.write('</div>');
      
      printWindow.document.write('<table>');
      printWindow.document.write('<thead>');
      printWindow.document.write('<tr>');
      printWindow.document.write('<th class="date-col">Date</th>');
      printWindow.document.write('<th class="customer-col">Customer</th>');
      printWindow.document.write('<th class="amount-col">Deposit</th>');
      printWindow.document.write('<th class="amount-col">Withdrawal</th>');
      printWindow.document.write('<th class="mode-col">Mode</th>');
      printWindow.document.write('</tr>');
      printWindow.document.write('</thead>');
      printWindow.document.write('<tbody>');
      
      agentData.transactions.forEach(txn => {
        printWindow.document.write('<tr>');
        printWindow.document.write('<td class="date-col">' + new Date(txn.date).toLocaleDateString('en-IN') + '</td>');
        printWindow.document.write('<td class="customer-col">' + (txn.customerName || txn.customerPhone) + '</td>');
        printWindow.document.write('<td class="amount-col text-success">' + (txn.depositAmount > 0 ? '₹' + txn.depositAmount.toLocaleString() : '-') + '</td>');
        printWindow.document.write('<td class="amount-col text-danger">' + (txn.withdrawAmount > 0 ? '₹' + txn.withdrawAmount.toLocaleString() : '-') + '</td>');
        printWindow.document.write('<td class="mode-col">' + (txn.paymentMethod || txn.mode || 'Cash').toUpperCase() + '</td>');
        printWindow.document.write('</tr>');
      });
      
      printWindow.document.write('<tr class="subtotal-row">');
      printWindow.document.write('<td colspan="2" style="text-align: right; padding-right: 15px;">Subtotal:</td>');
      printWindow.document.write('<td class="amount-col text-success">₹' + totalDeposits.toLocaleString() + '</td>');
      printWindow.document.write('<td class="amount-col text-danger">₹' + totalWithdrawals.toLocaleString() + '</td>');
      printWindow.document.write('<td class="amount-col" style="font-weight: bold; color: #2c5aa0;">₹' + agentTotal.toLocaleString() + '</td>');
      printWindow.document.write('</tr>');
      
      printWindow.document.write('</tbody>');
      printWindow.document.write('</table>');
      printWindow.document.write('</div>');
    });
    
    // Grand Total
    printWindow.document.write('<div class="grand-total">');
    printWindow.document.write('<h3 style="color: #2c5aa0; margin: 0 0 12px 0; text-align: center; font-size: 14px;">📋 Grand Total</h3>');
    printWindow.document.write('<div class="total-item">');
    printWindow.document.write('<span>Total Deposits:</span>');
    printWindow.document.write('<span class="text-success">₹' + stats.totalDeposits.toLocaleString() + '</span>');
    printWindow.document.write('</div>');
    printWindow.document.write('<div class="total-item">');
    printWindow.document.write('<span>Total Withdrawals:</span>');
    printWindow.document.write('<span class="text-danger">₹' + stats.totalWithdrawals.toLocaleString() + '</span>');
    printWindow.document.write('</div>');
    printWindow.document.write('<div class="total-item">');
    printWindow.document.write('<span>Net Amount:</span>');
    printWindow.document.write('<span style="color: #2c5aa0;">₹' + stats.totalAmount.toLocaleString() + '</span>');
    printWindow.document.write('</div>');
    printWindow.document.write('</div>');
    
    // Footer
    printWindow.document.write('<div class="footer">');
    printWindow.document.write('<p>This is a computer-generated report from SMART BHISHI Collection Management System</p>');
    printWindow.document.write('<p>Report generated on ' + currentDate + ' at ' + currentTime + '</p>');
    printWindow.document.write('</div>');
    
    printWindow.document.write('</div>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  // Group transactions by agent for print view
  const getTransactionsByAgent = () => {
    const grouped = {};
    filteredCollections.forEach(txn => {
      const agentPhone = txn.agentPhone || 'unassigned';
      if (!grouped[agentPhone]) {
        grouped[agentPhone] = {
          agentName: txn.agentName || 'Unassigned',
          agentPhone: agentPhone,
          transactions: []
        };
      }
      grouped[agentPhone].transactions.push(txn);
    });
    return grouped;
  };

  const transactionsByAgent = getTransactionsByAgent();

  return (
    <div className="container-fluid fade-in-up">
      {/* Header */}
      <div className="card border-0 mb-4" style={{ background: 'var(--primary-gradient)', color: 'white' }}>
        <div className="card-body p-4">
          <div className="d-flex align-items-center">
            <div className="me-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center"
                   style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.2)' }}>
                <span style={{ fontSize: '1.5rem' }}>📊</span>
              </div>
            </div>
            <div>
              <h4 className="mb-1 fw-bold">Monthly Collections</h4>
              <p className="mb-0 opacity-75">
                View and analyze monthly collection data - {monthNames[selectedMonth - 1]} {selectedYear}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-3">
              <label className="form-label">Select Month</label>
              <select
                className="form-control"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {monthNames.map((month, index) => (
                  <option key={index} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Select Year</label>
              <select
                className="form-control"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {[2023, 2024, 2025, 2026].map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Select Agent</label>
              <select
                className="form-control"
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
              >
                <option value="">All Agents</option>
                {agents.map((agent) => (
                  <option key={agent.phone} value={agent.phone}>
                    {agent.name} ({agent.phone})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Quick Actions</label>
              <div>
                <button 
                  className="btn btn-outline-primary me-2"
                  onClick={() => {
                    setSelectedMonth(new Date().getMonth() + 1);
                    setSelectedYear(new Date().getFullYear());
                  }}
                >
                  Current Month
                </button>
                <button 
                  className="btn btn-outline-secondary me-2"
                  onClick={() => {
                    setSelectedAgent("");
                  }}
                >
                  Clear Filters
                </button>
                <button 
                  className="btn btn-primary me-2"
                  onClick={handlePrint}
                >
                  🖨️ Print
                </button>
                <button 
                  className="btn btn-success"
                  onClick={() => {
                    const exportData = filteredCollections.map(txn => ({
                      'Date': txn.date,
                      'Customer Name': txn.customerName,
                      'Agent Name': txn.agentName,
                      'Type': txn.type,
                      'Amount': txn.amount || 0,
                      'Mode': txn.mode,
                      'Remarks': txn.remarks || ''
                    }));
                    exportToExcelWithFormat(exportData, `monthly_collections_${selectedMonth}_${selectedYear}`);
                  }}
                >
                  📊 Export to Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--success-gradient)' }}>
              💰
            </div>
            <h3 className="stats-number">₹{stats.totalDeposits.toLocaleString()}</h3>
            <p className="stats-label">Total Deposits</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--danger-gradient)' }}>
              💸
            </div>
            <h3 className="stats-number">₹{stats.totalWithdrawals.toLocaleString()}</h3>
            <p className="stats-label">Total Withdrawals</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--primary-gradient)' }}>
              📊
            </div>
            <h3 className="stats-number">₹{stats.totalAmount.toLocaleString()}</h3>
            <p className="stats-label">Net Amount</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--warning-gradient)' }}>
              📋
            </div>
            <h3 className="stats-number">{stats.totalCollections}</h3>
            <p className="stats-label">Total Transactions</p>
          </div>
        </div>
      </div>

      {/* Agent Performance */}
      <div className="row mb-4">
        <div className="col-md-12">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Agent Performance</h6>
            </div>
            <div className="card-body">
              {Object.entries(stats.byAgent).map(([agentPhone, data]) => {
                const agent = agents.find(a => a.phone === agentPhone);
                const netAmount = data.deposits - data.withdrawals;
                return (
                  <div key={agentPhone} className="border-bottom pb-2 mb-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <span className="me-2">👨‍💼</span>
                        <span className="fw-semibold">{agent?.name || agentPhone}</span>
                        <small className="text-muted ms-1">({data.count} transactions)</small>
                      </div>
                      <span className="fw-bold">₹{netAmount.toLocaleString()}</span>
                    </div>
                    <div className="mt-1">
                      <small className="text-success me-3">Deposits: ₹{data.deposits.toLocaleString()}</small>
                      <small className="text-danger">Withdrawals: ₹{data.withdrawals.toLocaleString()}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      {transactions.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            <h6 className="mb-0">Debug Information</h6>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-3">
                <small className="text-muted">Total Transactions Loaded:</small>
                <div className="fw-bold">{transactions.length}</div>
              </div>
              <div className="col-md-3">
                <small className="text-muted">Transaction Types:</small>
                <div className="fw-bold">{[...new Set(transactions.map(t => t.type))].join(', ')}</div>
              </div>
              <div className="col-md-3">
                <small className="text-muted">Deposits:</small>
                <div className="fw-bold">{transactions.filter(t => t.type === 'deposit').length}</div>
              </div>
              <div className="col-md-3">
                <small className="text-muted">Withdrawals:</small>
                <div className="fw-bold">{transactions.filter(t => t.type === 'withdrawal').length}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Header - Only visible in print */}
      <div className="print-only" style={{ display: 'none' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #333', paddingBottom: '15px' }}>
          <h2 style={{ margin: '0', color: '#333' }}>SMART BHISHI</h2>
          <h4 style={{ margin: '5px 0', color: '#666' }}>Monthly Collection Report</h4>
          <p style={{ margin: '5px 0', color: '#666' }}>
            {monthNames[selectedMonth - 1]} {selectedYear}
            {selectedAgent && ` - Agent: ${agents.find(a => a.phone === selectedAgent)?.name || selectedAgent}`}
          </p>
          <p style={{ margin: '5px 0', fontSize: '14px', color: '#888' }}>
            Generated on: {new Date().toLocaleDateString('en-IN')} at {new Date().toLocaleTimeString('en-IN')}
          </p>
        </div>
      </div>

      {/* Agent-wise Transaction Report - Only visible in print */}
      <div className="print-only" style={{ display: 'none' }}>
        {Object.entries(transactionsByAgent).map(([agentPhone, agentData]) => {
          const agentTotal = agentData.transactions.reduce((sum, t) => sum + t.depositAmount - t.withdrawAmount, 0);
          return (
            <div key={agentPhone} style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
              {/* Agent Header */}
              <div style={{ background: '#667eea', color: 'white', padding: '10px 15px', marginBottom: '10px' }}>
                <h5 style={{ margin: '0', fontSize: '16px' }}>
                  👨‍💼 Agent: {agentData.agentName}
                </h5>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>Phone: {agentData.agentPhone}</p>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>Total Transactions: {agentData.transactions.length}</p>
                <p style={{ margin: '5px 0 0 0', fontSize: '14px', fontWeight: 'bold' }}>Net Amount: ₹{agentTotal.toLocaleString()}</p>
              </div>

              {/* Agent Transactions Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Date</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Customer</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>Deposit</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>Withdrawal</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {agentData.transactions.map((txn, idx) => (
                    <tr key={idx}>
                      <td style={{ border: '1px solid #ddd', padding: '6px' }}>
                        {new Date(txn.date).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '6px' }}>
                        {txn.customerName || txn.customerPhone}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', color: '#27ae60' }}>
                        {txn.depositAmount > 0 ? `₹${txn.depositAmount.toLocaleString()}` : '-'}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', color: '#e74c3c' }}>
                        {txn.withdrawAmount > 0 ? `₹${txn.withdrawAmount.toLocaleString()}` : '-'}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>
                        {txn.paymentMethod || txn.mode || 'Cash'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8f9fa', fontWeight: 'bold' }}>
                    <td colSpan="2" style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>Subtotal:</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', color: '#27ae60' }}>
                      ₹{agentData.transactions.reduce((sum, t) => sum + t.depositAmount, 0).toLocaleString()}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', color: '#e74c3c' }}>
                      ₹{agentData.transactions.reduce((sum, t) => sum + t.withdrawAmount, 0).toLocaleString()}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                      ₹{agentTotal.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })}

        {/* Grand Total */}
        <div style={{ marginTop: '30px', borderTop: '2px solid #333', paddingTop: '15px' }}>
          <table style={{ width: '100%', fontSize: '14px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '5px', fontWeight: 'bold' }}>Total Deposits:</td>
                <td style={{ padding: '5px', textAlign: 'right', color: '#27ae60', fontWeight: 'bold' }}>₹{stats.totalDeposits.toLocaleString()}</td>
              </tr>
              <tr>
                <td style={{ padding: '5px', fontWeight: 'bold' }}>Total Withdrawals:</td>
                <td style={{ padding: '5px', textAlign: 'right', color: '#e74c3c', fontWeight: 'bold' }}>₹{stats.totalWithdrawals.toLocaleString()}</td>
              </tr>
              <tr style={{ borderTop: '2px solid #333' }}>
                <td style={{ padding: '10px 5px', fontSize: '16px', fontWeight: 'bold' }}>Grand Total:</td>
                <td style={{ padding: '10px 5px', textAlign: 'right', fontSize: '16px', fontWeight: 'bold' }}>₹{stats.totalAmount.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Collections Table - Screen view only */}
      <div className="card screen-only">
        <div className="card-header">
          <h6 className="mb-0">
            Monthly Collections - {monthNames[selectedMonth - 1]} {selectedYear}
            <span className="badge bg-info ms-2">{filteredCollections.length} records</span>
          </h6>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-5">
              <div className="spinner"></div>
              <p className="mt-3">Loading collections...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table mb-0">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Customer</th>
                    <th>Deposit</th>
                    <th>Withdrawal</th>
                    <th>Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCollections.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-4">
                        <div className="text-muted">
                          <span style={{ fontSize: '2rem' }}>📭</span>
                          <p className="mt-2">No collections found for {monthNames[selectedMonth - 1]} {selectedYear}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCollections.map((collection, index) => (
                      <tr key={index}>
                        <td className="fw-semibold">
                          <div>{new Date(collection.date).toLocaleDateString()}</div>
                          {collection.time && (
                            <small className="text-muted">{collection.time}</small>
                          )}
                        </td>
                        <td>
                          <div className="fw-semibold">{collection.customerName || collection.customerPhone}</div>
                          <small className="text-muted">{collection.agentName || 'Unassigned'}</small>
                        </td>
                        <td>
                          {collection.depositAmount > 0 ? (
                            <span className="fw-bold text-success">₹{collection.depositAmount.toLocaleString()}</span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          {collection.withdrawAmount > 0 ? (
                            <span className="fw-bold text-danger">₹{collection.withdrawAmount.toLocaleString()}</span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <div>
                            <span className={`badge ${collection.type === 'deposit' ? 'bg-success' : 'bg-danger'} mb-1`}>
                              {collection.type === 'deposit' ? '💰 Deposit' : '💸 Withdrawal'}
                            </span>
                            <br/>
                            <span className="badge bg-info">
                              {(collection.paymentMethod || collection.mode) === 'cash' && '💵'}
                              {(collection.paymentMethod || collection.mode) === 'online' && '💳'}
                              {(collection.paymentMethod || collection.mode) === 'cheque' && '📄'}
                              {!(collection.paymentMethod || collection.mode) && '💵'}
                              {' '}
                              {collection.paymentMethod || collection.mode || 'Cash'}
                            </span>
                          </div>
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

      {/* Print Styles */}
      <style>{`
        @media print {
          /* Hide everything except print content */
          .sidebar,
          .navbar,
          button,
          .btn,
          .form-control,
          .form-label,
          select,
          input,
          .stats-card,
          .row,
          .screen-only,
          .card:not(.print-only) {
            display: none !important;
          }

          /* Show print-only content */
          .print-only {
            display: block !important;
          }

          /* Page setup */
          body {
            background: white !important;
            margin: 0;
            padding: 0;
          }

          .container-fluid {
            padding: 20px !important;
            margin: 0 !important;
            max-width: 100% !important;
          }

          /* Page break settings */
          @page {
            margin: 1.5cm;
            size: A4;
          }

          /* Ensure colors print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Table styling */
          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          thead {
            display: table-header-group;
          }

          tfoot {
            display: table-footer-group;
          }

          /* Agent section page breaks */
          .agent-section {
            page-break-inside: avoid;
          }
        }

        /* Screen-only class */
        .screen-only {
          display: block;
        }

        .print-only {
          display: none;
        }
      `}</style>
    </div>
  );
}
