import React, { useEffect, useState } from "react";
import { getAllAgents, getAgentCustomers, getAllTransactions, addTransactionToAgent } from "../utils/databaseHelpers";
import { exportToExcelWithFormat } from "../utils/excelExport";
import {
  FiCalendar,
  FiUsers,
  FiUser,
  FiUserCheck,
  FiSearch,
  FiPlus,
  FiPrinter,
  FiDownload,
  FiRefreshCcw,
  FiArrowLeft,
  FiMapPin,
  FiPhone,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiEdit2,
  FiTrash2
} from "react-icons/fi";

export default function WeeklyCollections() {
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [loading, setLoading] = useState(true);

  function getCurrentWeek() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now - startOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  }

  function getWeekStartDate(weekNumber, year = new Date().getFullYear()) {
    const startOfYear = new Date(year, 0, 1);
    const daysToAdd = (weekNumber - 1) * 7 - startOfYear.getDay();
    return new Date(year, 0, 1 + daysToAdd);
  }

  function getWeekNumber(date) {
    const d = new Date(date);
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const pastDaysOfYear = (d - startOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch all agents
      const agentsData = await getAllAgents();
      setAgents(agentsData);

      // Fetch all customers from all agents
      const allCustomers = [];
      for (const agent of agentsData) {
        const agentCustomers = await getAgentCustomers(agent.phone);
        allCustomers.push(...agentCustomers.map(c => ({
          ...c,
          agentPhone: agent.phone,
          agentName: agent.name
        })));
      }
      setCustomers(allCustomers);

      // Fetch all transactions
      const allTransactions = await getAllTransactions();
      console.log("Weekly Collections - Total transactions loaded:", allTransactions.length);
      console.log("Weekly Collections - Sample transaction:", allTransactions[0]);
      setTransactions(allTransactions);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    !selectedAgent || customer.agentPhone === selectedAgent
  );

  const getCustomerWeeklyStatus = (customer) => {
    // Check if customer has deposit transaction in selected week
    const weekStart = getWeekStartDate(selectedWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weeklyTransactions = transactions.filter(t =>
      t.customerPhone === customer.phone &&
      t.type === 'deposit' &&
      new Date(t.date) >= weekStart &&
      new Date(t.date) <= weekEnd
    );

    const totalPaid = weeklyTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

    // Extract time from transaction
    let timeString = null;
    let paymentDate = null;
    if (weeklyTransactions.length > 0) {
      const firstTxn = weeklyTransactions[0];
      paymentDate = firstTxn.date;

      if (firstTxn.time) {
        timeString = firstTxn.time;
      } else if (firstTxn.createdAt) {
        // Extract time from createdAt ISO string
        const dateObj = new Date(firstTxn.createdAt);
        timeString = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      } else if (firstTxn.timestamp) {
        // Extract time from timestamp
        const dateObj = new Date(firstTxn.timestamp);
        timeString = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      }
    }

    return {
      paid: weeklyTransactions.length > 0,
      amount: totalPaid,
      date: paymentDate,
      time: timeString,
      transactions: weeklyTransactions,
      weeklyTarget: getCustomerWeeklyTarget(customer),
      paymentStatus: totalPaid > 0 ? 'Paid' : 'No Payment'
    };
  };

  const getCustomerWeeklyTarget = (customer) => {
    // Calculate dynamic weekly target based on customer's plan
    // This could be based on monthly due, total plan amount, or custom weekly amount
    if (customer.weeklyAmount) {
      return Number(customer.weeklyAmount);
    } else if (customer.monthlyDue) {
      return Number(customer.monthlyDue) / 4; // Approximate weekly from monthly
    } else if (customer.totalAmount) {
      // If total amount for 12 months, divide by 52 weeks
      return Number(customer.totalAmount) / 52;
    } else {
      // Default weekly amount if no other data available
      return 1000; // Default ₹1000 per week
    }
  };

  const calculatePenalty = (customer) => {
    // Calculate penalty from penalty transactions
    const penaltyTransactions = transactions.filter(t =>
      t.customerPhone === customer.phone &&
      t.type === 'penalty'
    );
    return penaltyTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
  };

  const calculateTotalDeposits = (customer) => {
    const depositTransactions = transactions.filter(t =>
      t.customerPhone === customer.phone &&
      t.type === 'deposit'
    );
    return depositTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
  };

  const calculateYearEndBonus = (customer) => {
    const totalSubmitted = calculateTotalDeposits(customer);
    return totalSubmitted * 0.10; // 10% bonus
  };

  const recordPayment = async (customer, amount) => {
    try {
      // Record transaction under agent
      await addTransactionToAgent(customer.agentPhone, {
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        type: "deposit",
        amount: Number(amount),
        date: new Date().toISOString().split('T')[0],
        paymentMethod: "cash",
        remarks: `Weekly collection - Week ${selectedWeek}`
      });

      alert("Payment recorded successfully!");
      // Reload data
      loadData();
    } catch (error) {
      alert("Error recording payment: " + error.message);
    }
  };

  const applyPenalty = async (customer) => {
    try {
      const monthlyDue = Number(customer.monthlyDue) || 0;
      const penaltyAmount = monthlyDue * 0.05; // 5% penalty

      if (penaltyAmount > 0) {
        // Record penalty transaction
        await addTransactionToAgent(customer.agentPhone, {
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          type: "penalty",
          amount: penaltyAmount,
          date: new Date().toISOString().split('T')[0],
          paymentMethod: "system",
          remarks: `Penalty for missed weekly payment`
        });

        alert(`Penalty of ₹${penaltyAmount} applied successfully!`);
        loadData();
      }
    } catch (error) {
      alert("Error applying penalty: " + error.message);
    }
  };

  const weekStartDate = getWeekStartDate(selectedWeek);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Group customers by agent for print view
  const getCustomersByAgent = () => {
    const grouped = {};
    filteredCustomers.forEach(customer => {
      const agentPhone = customer.agentPhone || 'unassigned';
      if (!grouped[agentPhone]) {
        grouped[agentPhone] = {
          agentName: customer.agentName || 'Unassigned',
          agentPhone: agentPhone,
          customers: []
        };
      }
      const status = getCustomerWeeklyStatus(customer);
      grouped[agentPhone].customers.push({
        ...customer,
        status
      });
    });
    return grouped;
  };

  const customersByAgent = getCustomersByAgent();

  // Calculate dynamic statistics
  const getWeeklyStatistics = () => {
    const totalCustomers = filteredCustomers.length;
    const paidCustomers = filteredCustomers.filter(c => getCustomerWeeklyStatus(c).paid);
    const unpaidCustomers = filteredCustomers.filter(c => !getCustomerWeeklyStatus(c).paid);

    const totalTargetAmount = filteredCustomers.reduce((sum, c) => sum + getCustomerWeeklyStatus(c).weeklyTarget, 0);
    const totalCollectedAmount = filteredCustomers.reduce((sum, c) => sum + getCustomerWeeklyStatus(c).amount, 0);

    const collectionRate = totalCustomers > 0 ? (paidCustomers.length / totalCustomers) * 100 : 0;
    const amountCollectionRate = totalTargetAmount > 0 ? (totalCollectedAmount / totalTargetAmount) * 100 : 0;

    return {
      totalCustomers,
      paidCount: paidCustomers.length,
      unpaidCount: unpaidCustomers.length,
      totalTargetAmount,
      totalCollectedAmount,
      collectionRate,
      amountCollectionRate,
      shortfall: totalTargetAmount - totalCollectedAmount
    };
  };

  const weeklyStats = getWeeklyStatistics();

  return (
    <div className="container-fluid fade-in-up">
      {/* Header */}
      <div className="card border-0 mb-4" style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}>
        <div className="card-body p-4 d-flex align-items-center gap-3">
          <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 60, height: 60, background: '#eef2ff', color: '#4f46e5' }}>
            <FiCalendar size={28} />
          </div>
          <div>
            <h4 className="mb-1 fw-bold text-dark">Weekly Collections</h4>
            <p className="mb-0 text-muted">
              Track weekly payments and manage penalties · Week {selectedWeek} ({weekStartDate.toLocaleDateString()} - {weekEndDate.toLocaleDateString()})
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4 border-0" style={{ border: '1px solid #e5e7eb' }}>
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-4">
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
            <div className="col-md-4">
              <label className="form-label">Week Number</label>
              <input
                type="number"
                className="form-control"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                min="1"
                max="52"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Quick Actions</label>
              <div>
                <button
                  className="btn btn-outline-primary me-2 d-inline-flex align-items-center gap-2"
                  onClick={() => setSelectedWeek(getCurrentWeek())}
                >
                  <FiRefreshCcw size={16} /> Current Week
                </button>
                <button
                  className="btn btn-outline-secondary me-2 d-inline-flex align-items-center gap-2"
                  onClick={() => setSelectedWeek(selectedWeek - 1)}
                  disabled={selectedWeek <= 1}
                >
                  <FiArrowLeft size={16} /> Previous
                </button>
                <button
                  className="btn btn-outline-secondary me-2 d-inline-flex align-items-center gap-2"
                  onClick={handlePrint}
                >
                  <FiPrinter size={16} /> Print
                </button>
                <button
                  className="btn btn-success d-inline-flex align-items-center gap-2"
                  onClick={() => {
                    const exportData = filteredCustomers.map(customer => {
                      const status = getCustomerWeeklyStatus(customer);
                      return {
                        'Customer Name': customer.name,
                        'Phone': customer.phone,
                        'Agent': customer.agentName,
                        'Weekly Target': status.weeklyTarget,
                        'Amount Paid': status.amount,
                        'Status': status.paymentStatus,
                        'Payment Date': status.date ? new Date(status.date).toLocaleDateString('en-IN') : 'N/A',
                        'Payment Time': status.time || 'N/A',
                        'Week Number': selectedWeek,
                        'Collection Rate': status.amount > 0 ? ((status.amount / status.weeklyTarget) * 100).toFixed(1) + '%' : '0%'
                      };
                    });
                    exportToExcelWithFormat(exportData, `weekly_collections_week_${selectedWeek}`);
                  }}
                >
                  <FiDownload size={16} /> Export to Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Header - Only visible in print */}
      <div className="print-only" style={{ display: 'none' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #333', paddingBottom: '15px' }}>
          <h2 style={{ margin: '0', color: '#333' }}>SMART BHISHI</h2>
          <h4 style={{ margin: '5px 0', color: '#666' }}>Weekly Collection Report</h4>
          <p style={{ margin: '5px 0', color: '#666' }}>
            Week {selectedWeek} - {weekStartDate.toLocaleDateString('en-IN')} to {weekEndDate.toLocaleDateString('en-IN')}
            {selectedAgent && ` - Agent: ${agents.find(a => a.phone === selectedAgent)?.name || selectedAgent}`}
          </p>
          <p style={{ margin: '5px 0', fontSize: '14px', color: '#888' }}>
            Generated on: {new Date().toLocaleDateString('en-IN')} at {new Date().toLocaleTimeString('en-IN')}
          </p>
        </div>
      </div>

      {/* Agent-wise Customer Report - Only visible in print */}
      <div className="print-only" style={{ display: 'none' }}>
        {Object.entries(customersByAgent).map(([agentPhone, agentData]) => {
          const paidCustomers = agentData.customers.filter(c => c.status.paid);
          const unpaidCustomers = agentData.customers.filter(c => !c.status.paid);
          const totalCollected = paidCustomers.reduce((sum, c) => sum + c.status.amount, 0);

          return (
            <div key={agentPhone} style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
              <div style={{ background: '#4f46e5', color: 'white', padding: '10px 15px', marginBottom: '10px' }}>
                <h5 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FiUsers size={14} /> Agent: {agentData.agentName}
                </h5>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>Phone: {agentData.agentPhone}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '12px' }}>
                  <span>Total Customers: {agentData.customers.length}</span>
                  <span style={{ color: '#bbf7d0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FiCheckCircle size={12} /> Paid: {paidCustomers.length}</span>
                  <span style={{ color: '#fecaca', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FiXCircle size={12} /> Unpaid: {unpaidCustomers.length}</span>
                  <span style={{ fontWeight: 'bold' }}>Collected: ₹{totalCollected.toLocaleString()}</span>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Customer</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Phone</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>Weekly Amt</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>Status</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>Paid Amt</th>
                    <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {paidCustomers.map((customer, idx) => {
                    const weeklyAmt = getCustomerWeeklyTarget(customer);
                    return (
                      <tr key={`${agentPhone}-paid-${idx}`} style={{ background: '#f0fff0' }}>
                        <td style={{ border: '1px solid #ddd', padding: '6px' }}>{customer.name}</td>
                        <td style={{ border: '1px solid #ddd', padding: '6px' }}>{customer.phone}</td>
                        <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>₹{weeklyAmt.toLocaleString()}</td>
                        <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>
                          <span style={{ background: '#27ae60', color: 'white', padding: '2px 8px', borderRadius: '3px', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FiCheckCircle size={10} /> PAID</span>
                        </td>
                        <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', color: '#27ae60', fontWeight: 'bold' }}>₹{customer.status.amount.toLocaleString()}</td>
                        <td style={{ border: '1px solid #ddd', padding: '6px' }}>
                          {new Date(customer.status.date).toLocaleDateString('en-IN')}
                          <br />
                          <small>{customer.status.time || 'N/A'}</small>
                        </td>
                      </tr>
                    );
                  })}
                  {unpaidCustomers.map((customer, idx) => {
                    const weeklyAmt = getCustomerWeeklyTarget(customer);
                    return (
                      <tr key={`${agentPhone}-unpaid-${idx}`} style={{ background: '#fff8f0' }}>
                        <td style={{ border: '1px solid #ddd', padding: '6px' }}>{customer.name}</td>
                        <td style={{ border: '1px solid #ddd', padding: '6px' }}>{customer.phone}</td>
                        <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>₹{weeklyAmt.toLocaleString()}</td>
                        <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>
                          <span style={{ background: '#e74c3c', color: 'white', padding: '2px 8px', borderRadius: '3px', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FiXCircle size={10} /> UNPAID</span>
                        </td>
                        <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', color: '#999' }}>₹0</td>
                        <td style={{ border: '1px solid #ddd', padding: '6px', color: '#999' }}>-</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8f9fa', fontWeight: 'bold' }}>
                    <td colSpan="4" style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>Agent Subtotal:</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right', color: '#27ae60' }}>₹{totalCollected.toLocaleString()}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{paidCustomers.length}/{agentData.customers.length} paid</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })}

        <div style={{ marginTop: '30px', borderTop: '2px solid #333', paddingTop: '15px' }}>
          <table style={{ width: '100%', fontSize: '14px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '5px', fontWeight: 'bold' }}>Total Customers:</td>
                <td style={{ padding: '5px', textAlign: 'right', fontWeight: 'bold' }}>{filteredCustomers.length}</td>
              </tr>
              <tr>
                <td style={{ padding: '5px', fontWeight: 'bold' }}>Paid Customers:</td>
                <td style={{ padding: '5px', textAlign: 'right', color: '#27ae60', fontWeight: 'bold' }}>
                  {filteredCustomers.filter(c => getCustomerWeeklyStatus(c).paid).length}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '5px', fontWeight: 'bold' }}>Unpaid Customers:</td>
                <td style={{ padding: '5px', textAlign: 'right', color: '#e74c3c', fontWeight: 'bold' }}>
                  {filteredCustomers.filter(c => !getCustomerWeeklyStatus(c).paid).length}
                </td>
              </tr>
              <tr style={{ borderTop: '2px solid #333' }}>
                <td style={{ padding: '10px 5px', fontSize: '16px', fontWeight: 'bold' }}>Total Collection:</td>
                <td style={{ padding: '10px 5px', textAlign: 'right', fontSize: '16px', fontWeight: 'bold', color: '#27ae60' }}>
                  ₹{filteredCustomers.reduce((sum, c) => sum + getCustomerWeeklyStatus(c).amount, 0).toLocaleString()}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '5px', fontWeight: 'bold' }}>Collection Rate:</td>
                <td style={{ padding: '5px', textAlign: 'right', fontWeight: 'bold' }}>
                  {filteredCustomers.length > 0 ? ((filteredCustomers.filter(c => getCustomerWeeklyStatus(c).paid).length / filteredCustomers.length) * 100).toFixed(1) : 0}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      {/* Print Styles */}
      <style>{`
        @media print {
          .sidebar,
          .navbar,
          button,
          .btn,
          .form-control,
          .form-label,
          select,
          input,
          .card:not(.print-only),
          .screen-only {
            display: none !important;
          }

          .print-only {
            display: block !important;
          }

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

          @page {
            margin: 1.5cm;
            size: A4;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

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
        }

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
