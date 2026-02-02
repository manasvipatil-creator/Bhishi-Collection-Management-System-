import React, { useState, useEffect } from "react";
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import { getAllAgents, getAllTransactions, getAgentCustomers } from "../utils/databaseHelpers";
import { exportToExcelWithFormat } from "../utils/excelExport";

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState("");
  const [agents, setAgents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [giftDistributions, setGiftDistributions] = useState([]);
  const [selectedGiftDist, setSelectedGiftDist] = useState(null);
  const [showGiftModal, setShowGiftModal] = useState(false);

  // Filter states
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [weekNumber, setWeekNumber] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [agentsData, transactionsData] = await Promise.all([
        getAllAgents(),
        getAllTransactions()
      ]);

      setAgents(agentsData);
      setTransactions(transactionsData);

      // Get all customers
      const allCustomers = [];
      for (const agent of agentsData) {
        const agentCustomers = await getAgentCustomers(agent.phone);
        allCustomers.push(...agentCustomers.map(c => ({ ...c, agentPhone: agent.phone, agentName: agent.name })));
      }
      setCustomers(allCustomers);

      // Get gift distributions
      const giftRef = ref(db, 'giftDistribution');
      const giftSnapshot = await get(giftRef);
      if (giftSnapshot.exists()) {
        setGiftDistributions(Object.values(giftSnapshot.val()));
      }
    } catch (error) {
      console.error("Error loading report data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = () => {
    switch (selectedReport) {
      case "agentwise":
        return generateAgentWiseReport();
      case "customerwise":
        return generateCustomerWiseReport();
      case "transactions":
        return generateTransactionReport();
      case "daily":
        return generateDailyTransactionReport();
      case "summary":
        return generateSummaryReport();
      case "gifts":
        return generateGiftReport();
      default:
        return null;
    }
  };

  const generateAgentWiseReport = () => {
    let filteredAgents = agents;
    if (selectedAgent) {
      filteredAgents = agents.filter(a => a.phone === selectedAgent);
    }

    return filteredAgents.map(agent => {
      let agentTransactions = transactions.filter(t => t.agentPhone === agent.phone);

      // Apply date filter
      if (fromDate) {
        agentTransactions = agentTransactions.filter(t => new Date(t.date) >= new Date(fromDate));
      }
      if (toDate) {
        agentTransactions = agentTransactions.filter(t => new Date(t.date) <= new Date(toDate));
      }

      const agentCustomers = customers.filter(c => c.agentPhone === agent.phone);

      return {
        agentName: agent.name || 'N/A',
        agentPhone: agent.phone || 'N/A',
        totalCustomers: agentCustomers.length || 0,
        totalTransactions: agentTransactions.length || 0,
        totalDeposits: agentTransactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + (t.amount || 0), 0),
        totalWithdrawals: agentTransactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + (t.amount || 0), 0)
      };
    });
  };

  const generateCustomerWiseReport = () => {
    let filteredCustomers = customers;

    if (selectedAgent) {
      filteredCustomers = filteredCustomers.filter(c => c.agentPhone === selectedAgent);
    }
    if (selectedCustomer) {
      filteredCustomers = filteredCustomers.filter(c => c.phone === selectedCustomer);
    }

    return filteredCustomers.map(customer => {
      const customerTransactions = transactions.filter(t => t.customerPhone === customer.phone);
      const totalDeposits = customerTransactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + (t.amount || 0), 0);
      const totalWithdrawals = customerTransactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + (t.amount || 0), 0);

      return {
        customerName: customer.name,
        customerPhone: customer.phone,
        agentName: customer.agentName,
        totalDeposits,
        totalWithdrawals,
        balance: customer.balance || 0,
        status: customer.status,
        joinDate: customer.joinDate
      };
    });
  };

  const generateTransactionReport = () => {
    let filteredTransactions = transactions;

    // Apply filters
    if (fromDate) {
      filteredTransactions = filteredTransactions.filter(t => new Date(t.date) >= new Date(fromDate));
    }
    if (toDate) {
      filteredTransactions = filteredTransactions.filter(t => new Date(t.date) <= new Date(toDate));
    }
    if (selectedAgent) {
      filteredTransactions = filteredTransactions.filter(t => t.agentPhone === selectedAgent);
    }
    if (selectedCustomer) {
      filteredTransactions = filteredTransactions.filter(t => t.customerPhone === selectedCustomer);
    }

    return filteredTransactions.map(t => ({
      date: t.date || 'N/A',
      customerName: t.customerName || 'N/A',
      agentName: t.agentName || 'N/A',
      type: t.type || 'N/A',
      amount: t.amount || 0,
      mode: t.mode || 'N/A',
      remarks: t.remarks || ''
    }));
  };

  const generateDailyTransactionReport = () => {
    let filteredTransactions = transactions;

    // Apply filters
    if (fromDate) {
      filteredTransactions = filteredTransactions.filter(t => new Date(t.date) >= new Date(fromDate));
    }
    if (toDate) {
      filteredTransactions = filteredTransactions.filter(t => new Date(t.date) <= new Date(toDate));
    }
    if (selectedAgent) {
      filteredTransactions = filteredTransactions.filter(t => t.agentPhone === selectedAgent);
    }
    if (selectedCustomer) {
      filteredTransactions = filteredTransactions.filter(t => t.customerPhone === selectedCustomer);
    }

    // Group transactions by date
    const dailyGroups = {};
    filteredTransactions.forEach(t => {
      const date = t.date || 'Unknown Date';
      if (!dailyGroups[date]) {
        dailyGroups[date] = {
          date: date,
          transactions: [],
          totalDeposits: 0,
          totalWithdrawals: 0,
          totalTransactions: 0,
          uniqueCustomers: new Set(),
          uniqueAgents: new Set()
        };
      }

      dailyGroups[date].transactions.push(t);
      dailyGroups[date].totalTransactions++;
      dailyGroups[date].uniqueCustomers.add(t.customerPhone);
      dailyGroups[date].uniqueAgents.add(t.agentPhone);

      if (t.type === 'deposit') {
        dailyGroups[date].totalDeposits += (t.amount || 0);
      } else if (t.type === 'withdrawal') {
        dailyGroups[date].totalWithdrawals += (t.netAmount || t.amount || 0);
      }
    });

    // Convert to array and add calculated fields
    return Object.values(dailyGroups)
      .map(group => ({
        ...group,
        uniqueCustomers: group.uniqueCustomers.size,
        uniqueAgents: group.uniqueAgents.size,
        netCollection: group.totalDeposits - group.totalWithdrawals
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending
  };

  const generateSummaryReport = () => {
    let filteredTransactions = transactions;

    // Apply date filter
    if (fromDate) {
      filteredTransactions = filteredTransactions.filter(t => new Date(t.date) >= new Date(fromDate));
    }
    if (toDate) {
      filteredTransactions = filteredTransactions.filter(t => new Date(t.date) <= new Date(toDate));
    }

    const totalDeposits = filteredTransactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalWithdrawals = filteredTransactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalPenalties = filteredTransactions.filter(t => t.type === 'penalty').reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalBonuses = filteredTransactions.filter(t => t.type === 'bonus').reduce((sum, t) => sum + (t.amount || 0), 0);

    return {
      totalAgents: agents.length,
      totalCustomers: customers.length,
      totalTransactions: filteredTransactions.length,
      totalDeposits,
      totalWithdrawals,
      totalPenalties,
      totalBonuses,
      netBalance: totalDeposits - totalWithdrawals + totalBonuses - totalPenalties
    };
  };

  const generateGiftReport = () => {
    let filteredGifts = giftDistributions || [];

    if (fromDate) {
      filteredGifts = filteredGifts.filter(g => new Date(g.date) >= new Date(fromDate));
    }
    if (toDate) {
      filteredGifts = filteredGifts.filter(g => new Date(g.date) <= new Date(toDate));
    }

    return [...filteredGifts].sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  useEffect(() => {
    if (selectedReport) {
      const data = generateReport();
      setReportData(data);
    }
  }, [selectedReport, agents, transactions, customers, fromDate, toDate, selectedAgent, selectedCustomer, weekNumber]);

  const handleResetFilters = () => {
    setFromDate("");
    setToDate("");
    setSelectedAgent("");
    setSelectedCustomer("");
    setWeekNumber("");
  };

  const handleGenerateReport = (e) => {
    e.preventDefault();
    const data = generateReport();
    setReportData(data);
  };

  // Calculate real-time statistics
  const getQuickStats = () => {
    const activeAgents = agents.filter(a => a.status === 'active').length;
    const totalCollections = transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalPenalties = transactions.filter(t => t.type === 'penalty').reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalBonuses = transactions.filter(t => t.type === 'bonus').reduce((sum, t) => sum + (t.amount || 0), 0);

    return {
      activeAgents: activeAgents || agents.length,
      totalCollections,
      totalPenalties,
      totalBonuses
    };
  };

  const quickStats = getQuickStats();

  const reportTypes = [
    {
      id: "agentwise",
      title: "Agent-wise Report",
      description: "Generate reports for individual agents and their performance",
      icon: "👨‍💼",
      color: "var(--primary-gradient)"
    },
    {
      id: "customerwise",
      title: "Customer-wise Report",
      description: "Generate detailed customer reports with balances and transactions",
      icon: "👥",
      color: "var(--success-gradient)"
    },
    {
      id: "daily",
      title: "Daily Transactions Report",
      description: "View daily transaction summaries with deposits, withdrawals and statistics",
      icon: "📅",
      color: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
    },
    {
      id: "weekly",
      title: "Weekly Collections Report",
      description: "Track weekly collection performance and missed payments",
      icon: "📊",
      color: "var(--warning-gradient)"
    },
    {
      id: "penalties",
      title: "Penalties & Bonuses Report",
      description: "View all penalties applied and year-end bonuses calculated",
      icon: "⚖️",
      color: "var(--secondary-gradient)"
    },
    {
      id: "transactions",
      title: "Transaction Report",
      description: "Comprehensive transaction history with deposits and withdrawals",
      icon: "💳",
      color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    },
    {
      id: "gifts",
      title: "Gift Distribution History",
      description: "View all past gift distributions and winners",
      icon: "🎁",
      color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
    }
  ];

  return (
    <div className="container-fluid fade-in-up">
      {/* Header */}
      <div className="card border-0 mb-4" style={{ background: 'var(--warning-gradient)', color: 'white' }}>
        <div className="card-body p-4">
          <div className="d-flex align-items-center">
            <div className="me-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.2)' }}>
                <span style={{ fontSize: '1.5rem' }}>📊</span>
              </div>
            </div>
            <div>
              <h4 className="mb-1 fw-bold">Reports & Analytics</h4>
              <p className="mb-0 opacity-75">Generate comprehensive reports for your collection business</p>
            </div>
          </div>
        </div>
      </div>

      {/* Report Types */}
      <div className="row mb-4">
        {reportTypes.map((report) => (
          <div key={report.id} className="col-lg-4 col-md-6 mb-3">
            <div
              className={`card border-0 h-100 ${selectedReport === report.id ? 'shadow-lg' : ''}`}
              style={{ cursor: 'pointer', transform: selectedReport === report.id ? 'scale(1.02)' : 'scale(1)' }}
              onClick={() => setSelectedReport(report.id)}
            >
              <div className="card-body text-center p-4">
                <div className="mb-3">
                  <div className="rounded-circle mx-auto d-flex align-items-center justify-content-center"
                    style={{
                      width: '70px',
                      height: '70px',
                      background: report.color,
                      fontSize: '2rem'
                    }}>
                    {report.icon}
                  </div>
                </div>
                <h6 className="fw-bold mb-2">{report.title}</h6>
                <p className="text-muted small mb-0">{report.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Report Display */}
      {selectedReport && reportData && (
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">{reportTypes.find(r => r.id === selectedReport)?.title}</h5>
          </div>
          <div className="card-body">
            {selectedReport === 'summary' ? (
              <div className="row">
                <div className="col-md-3 mb-3">
                  <div className="stats-card">
                    <h3 className="stats-number">{reportData.totalAgents}</h3>
                    <p className="stats-label">Total Agents</p>
                  </div>
                </div>
                <div className="col-md-3 mb-3">
                  <div className="stats-card">
                    <h3 className="stats-number">{reportData.totalCustomers}</h3>
                    <p className="stats-label">Total Customers</p>
                  </div>
                </div>
                <div className="col-md-3 mb-3">
                  <div className="stats-card">
                    <h3 className="stats-number">₹{(reportData.totalDeposits || 0).toLocaleString()}</h3>
                    <p className="stats-label">Total Deposits</p>
                  </div>
                </div>
                <div className="col-md-3 mb-3">
                  <div className="stats-card">
                    <h3 className="stats-number">₹{(reportData.netBalance || 0).toLocaleString()}</h3>
                    <p className="stats-label">Net Balance</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      {selectedReport === 'agentwise' && (
                        <>
                          <th>Agent Name</th>
                          <th>Phone</th>
                          <th>Customers</th>
                          <th>Transactions</th>
                          <th>Deposits</th>
                          <th>Withdrawals</th>
                        </>
                      )}
                      {selectedReport === 'customerwise' && (
                        <>
                          <th>Customer Name</th>
                          <th>Phone</th>
                          <th>Agent</th>
                          <th>Total Deposits</th>
                          <th>Total Withdrawals</th>
                          <th>Balance</th>
                          <th>Status</th>
                          <th>Join Date</th>
                        </>
                      )}
                      {selectedReport === 'daily' && (
                        <>
                          <th>Date</th>
                          <th>Total Transactions</th>
                          <th>Deposits</th>
                          <th>Withdrawals</th>
                          <th>Net Collection</th>
                          <th>Customers</th>
                          <th>Agents</th>
                        </>
                      )}
                      {selectedReport === 'transactions' && (
                        <>
                          <th>Date</th>
                          <th>Customer</th>
                          <th>Agent</th>
                          <th>Type</th>
                          <th>Amount</th>
                          <th>Mode</th>
                        </>
                      )}
                      {selectedReport === 'gifts' && (
                        <>
                          <th>Date</th>
                          <th>Year</th>
                          <th>Recipients</th>
                          <th>Gold Winners</th>
                          <th>Actions</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(reportData) && reportData.map((row, index) => (
                      <tr key={index}>
                        {selectedReport === 'agentwise' && (
                          <>
                            <td>{row.agentName}</td>
                            <td>{row.agentPhone}</td>
                            <td>{row.totalCustomers}</td>
                            <td>{row.totalTransactions}</td>
                            <td>₹{(row.totalDeposits || 0).toLocaleString()}</td>
                            <td>₹{(row.totalWithdrawals || 0).toLocaleString()}</td>
                          </>
                        )}
                        {selectedReport === 'customerwise' && (
                          <>
                            <td>{row.customerName}</td>
                            <td>{row.customerPhone}</td>
                            <td>{row.agentName}</td>
                            <td style={{ color: '#27ae60', fontWeight: 'bold' }}>₹{(row.totalDeposits || 0).toLocaleString()}</td>
                            <td style={{ color: '#e74c3c', fontWeight: 'bold' }}>₹{(row.totalWithdrawals || 0).toLocaleString()}</td>
                            <td>₹{(row.balance || 0).toLocaleString()}</td>
                            <td><span className={`badge bg-${row.status === 'active' ? 'success' : 'danger'}`}>{row.status}</span></td>
                            <td>{row.joinDate}</td>
                          </>
                        )}
                        {selectedReport === 'daily' && (
                          <>
                            <td>
                              <strong>{new Date(row.date).toLocaleDateString('en-IN', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}</strong>
                            </td>
                            <td>
                              <span className="badge bg-primary">{row.totalTransactions}</span>
                            </td>
                            <td style={{ color: '#27ae60', fontWeight: 'bold' }}>
                              ₹{(row.totalDeposits || 0).toLocaleString()}
                            </td>
                            <td style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                              ₹{(row.totalWithdrawals || 0).toLocaleString()}
                            </td>
                            <td style={{
                              color: row.netCollection >= 0 ? '#27ae60' : '#e74c3c',
                              fontWeight: 'bold'
                            }}>
                              ₹{(row.netCollection || 0).toLocaleString()}
                            </td>
                            <td>
                              <span className="badge bg-info">{row.uniqueCustomers}</span>
                            </td>
                            <td>
                              <span className="badge bg-secondary">{row.uniqueAgents}</span>
                            </td>
                          </>
                        )}
                        {selectedReport === 'transactions' && (
                          <>
                            <td>{row.date ? new Date(row.date).toLocaleDateString() : 'N/A'}</td>
                            <td>{row.customerName}</td>
                            <td>{row.agentName}</td>
                            <td><span className={`badge bg-${row.type === 'deposit' ? 'success' : 'danger'}`}>{row.type}</span></td>
                            <td>₹{(row.amount || 0).toLocaleString()}</td>
                            <td>{row.mode}</td>
                          </>
                        )}
                        {selectedReport === 'gifts' && (
                          <>
                            <td>{new Date(row.date).toLocaleString()}</td>
                            <td>{row.year}</td>
                            <td>{row.totalRecipients} customers</td>
                            <td>{Object.keys(row.goldWinners || {}).length} routes</td>
                            <td>
                              <button
                                className="btn btn-sm btn-info"
                                onClick={() => {
                                  setSelectedGiftDist(row);
                                  setShowGiftModal(true);
                                }}
                              >
                                View Details
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-3">
              <button className="btn btn-primary me-2" onClick={() => window.print()}>
                🖨️ Print Report
              </button>
              <button className="btn btn-success" onClick={() => {
                if (reportData) {
                  const filename = `${selectedReport}_report`;
                  exportToExcelWithFormat(Array.isArray(reportData) ? reportData : [reportData], filename);
                }
              }}>
                📊 Export to Excel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Generation Form */}
      {selectedReport && (
        <div className="card">
          <div className="card-header">
            <h6 className="mb-0">
              {reportTypes.find(r => r.id === selectedReport)?.icon} {reportTypes.find(r => r.id === selectedReport)?.title}
            </h6>
          </div>
          <div className="card-body">
            <form onSubmit={handleGenerateReport}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">From Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">To Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
                {(selectedReport === 'agentwise' || selectedReport === 'transactions' || selectedReport === 'customerwise' || selectedReport === 'daily') && (
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Select Agent</label>
                    <select
                      className="form-control"
                      value={selectedAgent}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                    >
                      <option value="">All Agents</option>
                      {agents.map(agent => (
                        <option key={agent.phone} value={agent.phone}>
                          {agent.name} ({agent.phone})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {(selectedReport === 'customerwise' || selectedReport === 'transactions' || selectedReport === 'daily') && (
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Select Customer</label>
                    <select
                      className="form-control"
                      value={selectedCustomer}
                      onChange={(e) => setSelectedCustomer(e.target.value)}
                    >
                      <option value="">All Customers</option>
                      {customers.map(customer => (
                        <option key={customer.phone} value={customer.phone}>
                          {customer.name} ({customer.phone})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {selectedReport === 'weekly' && (
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Week Number</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Enter week number (1-52)"
                      min="1"
                      max="52"
                      value={weekNumber}
                      onChange={(e) => setWeekNumber(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="d-flex justify-content-end gap-3 mt-4">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleResetFilters}
                >
                  Reset
                </button>
                <button type="submit" className="btn btn-primary">
                  <span className="me-2">📄</span>
                  Generate Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Stats - Dynamic */}
      <div className="row mt-4">
        <div className="col-md-3">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--primary-gradient)' }}>
              👨‍💼
            </div>
            <h3 className="stats-number" style={{ fontSize: '1.5rem' }}>{quickStats.activeAgents}</h3>
            <p className="stats-label">Active Agents</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--success-gradient)' }}>
              📈
            </div>
            <h3 className="stats-number" style={{ fontSize: '1.5rem' }}>₹{quickStats.totalCollections.toLocaleString()}</h3>
            <p className="stats-label">Total Collections</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--warning-gradient)' }}>
              ⚠️
            </div>
            <h3 className="stats-number" style={{ fontSize: '1.5rem' }}>₹{quickStats.totalPenalties.toLocaleString()}</h3>
            <p className="stats-label">Total Penalties</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--secondary-gradient)' }}>
              🎁
            </div>
            <h3 className="stats-number" style={{ fontSize: '1.5rem' }}>₹{quickStats.totalBonuses.toLocaleString()}</h3>
            <p className="stats-label">Year-End Bonuses</p>
          </div>
        </div>
      </div>

      {/* Gift Distribution Detail Modal */}
      {showGiftModal && selectedGiftDist && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">Gift Distribution Details</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowGiftModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-4">
                  <p><strong>Date:</strong> {new Date(selectedGiftDist.date).toLocaleString()}</p>
                  <p><strong>Year:</strong> {selectedGiftDist.year}</p>
                  <p><strong>Total Recipients:</strong> {selectedGiftDist.totalRecipients}</p>
                </div>

                <h6 className="fw-bold mb-3">🏆 Gold Winners</h6>
                <div className="table-responsive mb-4">
                  <table className="table table-bordered table-sm">
                    <thead className="table-light">
                      <tr>
                        <th>Route</th>
                        <th>Winner Name</th>
                        <th>Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(selectedGiftDist.goldWinners || {}).map(([route, winners], i) => (
                        <tr key={i}>
                          <td>{route}</td>
                          <td className="text-success fw-bold">{winners[winners.length - 1]?.name}</td>
                          <td>{winners[winners.length - 1]?.phone}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h6 className="fw-bold mb-3">👥 Recipients List</h6>
                <div className="table-responsive" style={{ maxHeight: '400px' }}>
                  <table className="table table-bordered table-sm">
                    <thead className="table-light">
                      <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Selection</th>
                        <th>Village</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedGiftDist.allCustomers?.map((c, i) => (
                        <tr key={i}>
                          <td>{c.name}</td>
                          <td>{c.phone}</td>
                          <td>
                            <span className={`badge bg-${c.selectionType === 'manual' ? 'warning text-dark' : 'success'}`}>
                              {c.selectionType === 'manual' ? 'Manual' : 'Auto'}
                            </span>
                          </td>
                          <td>{c.selectedFromVillage || c.village}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer no-print">
                <button type="button" className="btn btn-secondary" onClick={() => setShowGiftModal(false)}>Close</button>
                <button type="button" className="btn btn-primary" onClick={() => window.print()}>Print</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Professional Printable Template (Hidden in UI) */}
      {selectedGiftDist && (
        <div className="print-area">
          <div className="print-header">
            <h1>Bishi Collection Management</h1>
            <p>Gift Distribution Report</p>
            <div style={{ marginTop: '10px', fontSize: '10pt' }}>
              <strong>Date:</strong> {new Date(selectedGiftDist.date).toLocaleString()} |
              <strong> Year:</strong> {selectedGiftDist.year}
            </div>
          </div>

          <div className="print-grid">
            <div className="print-stat-box">
              <div style={{ fontSize: '18pt', fontWeight: 'bold' }}>{selectedGiftDist.totalRecipients}</div>
              <div style={{ fontSize: '10pt', color: '#666' }}>Total Recipients</div>
            </div>
            <div className="print-stat-box">
              <div style={{ fontSize: '18pt', fontWeight: 'bold' }}>{Object.keys(selectedGiftDist.goldWinners || {}).length}</div>
              <div style={{ fontSize: '10pt', color: '#666' }}>Gold Winners</div>
            </div>
          </div>

          <div className="print-section">
            <div className="print-section-title">🏆 Gold Winners List</div>
            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Route Name</th>
                  <th style={{ width: '30%' }}>Winner Name</th>
                  <th style={{ width: '30%' }}>Phone Number</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(selectedGiftDist.goldWinners || {}).map(([route, winners], i) => (
                  <tr key={i}>
                    <td>{route}</td>
                    <td style={{ fontWeight: 'bold' }}>{winners[winners.length - 1]?.name}</td>
                    <td>{winners[winners.length - 1]?.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="print-section">
            <div className="print-section-title">👥 All Gift Recipients</div>
            <table className="print-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Customer Name</th>
                  <th>Phone Number</th>
                  <th>Selection Type</th>
                  <th>Village/Route</th>
                </tr>
              </thead>
              <tbody>
                {selectedGiftDist.allCustomers?.map((c, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: 'bold' }}>{c.name}</td>
                    <td>{c.phone}</td>
                    <td>{c.selectionType === 'manual' ? '✋ Manual' : '🎯 Auto'}</td>
                    <td>{c.selectedFromVillage || c.village || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="print-footer">
            Generated on {new Date().toLocaleString()} | Bishi Collection Management System
          </div>
        </div>
      )}
    </div>
  );
}
