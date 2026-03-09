import React, { useState, useEffect } from "react";
import { getAllAgents, getAllTransactions } from "../utils/databaseHelpers";

export default function DailyCollections() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [agents, setAgents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dailyTransactions, setDailyTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [stats, setStats] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [availableCustomers, setAvailableCustomers] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (agents.length > 0 && transactions.length > 0) {
      calculateDailyData();
      loadAvailableCustomers();
    }
  }, [selectedDate, agents, transactions, selectedAgent, selectedCustomers]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [agentsData, transactionsData] = await Promise.all([
        getAllAgents(),
        getAllTransactions()
      ]);

      setAgents(agentsData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableCustomers = () => {
    // Get unique customers from transactions for the selected date
    const dateTransactions = transactions.filter(t => t.date === selectedDate);
    const uniqueCustomers = [];
    const customerMap = new Map();

    dateTransactions.forEach(txn => {
      if (txn.customerPhone && !customerMap.has(txn.customerPhone)) {
        const agent = agents.find(a => a.phone === txn.agentPhone);
        customerMap.set(txn.customerPhone, {
          phone: txn.customerPhone,
          name: txn.customerName || 'Unknown Customer',
          agentName: agent?.name || txn.agentName || 'Unknown Agent',
          agentPhone: txn.agentPhone
        });
        uniqueCustomers.push(customerMap.get(txn.customerPhone));
      }
    });

    // Sort customers by name
    uniqueCustomers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    setAvailableCustomers(uniqueCustomers);
  };

  const handleCustomerSelection = (customer) => {
    const isSelected = selectedCustomers.some(c => c.phone === customer.phone);
    if (isSelected) {
      setSelectedCustomers(selectedCustomers.filter(c => c.phone !== customer.phone));
    } else {
      setSelectedCustomers([...selectedCustomers, customer]);
    }
  };

  const handleApplyCustomerFilter = () => {
    setShowCustomerModal(false);
  };

  const clearCustomerFilter = () => {
    setSelectedCustomers([]);
    setShowCustomerModal(false);
  };

  const calculateDailyData = () => {
    // Filter transactions for selected date
    let filteredTransactions = transactions.filter(t => t.date === selectedDate);

    // Filter by agent if selected
    if (selectedAgent) {
      filteredTransactions = filteredTransactions.filter(t => t.agentPhone === selectedAgent);
    }

    // Filter by selected customers if any
    if (selectedCustomers.length > 0) {
      const selectedCustomerPhones = selectedCustomers.map(c => c.phone);
      filteredTransactions = filteredTransactions.filter(t =>
        selectedCustomerPhones.includes(t.customerPhone)
      );
    }

    // Filter by search term
    if (searchTerm) {
      filteredTransactions = filteredTransactions.filter(t =>
        (t.customerName && t.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.customerPhone && t.customerPhone.includes(searchTerm)) ||
        (t.agentName && t.agentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.agentPhone && t.agentPhone.includes(searchTerm))
      );
    }

    // Add agent details to transactions
    const enrichedTransactions = filteredTransactions.map(txn => {
      const agent = agents.find(a => a.phone === txn.agentPhone);
      const routes = agent?.routes || [];
      // Normalize routes to strings
      const normalizedRoutes = routes.map(r => typeof r === 'object' ? r.name : r);
      return {
        ...txn,
        agentName: agent?.name || txn.agentName || 'Unknown Agent',
        routes: normalizedRoutes
      };
    });

    // Sort by time (latest first)
    enrichedTransactions.sort((a, b) => {
      const timeA = a.time || '00:00:00';
      const timeB = b.time || '00:00:00';
      return timeB.localeCompare(timeA);
    });

    // Calculate basic statistics
    const totalDeposits = filteredTransactions
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalWithdrawals = filteredTransactions
      .filter(t => t.type === 'withdrawal')
      .reduce((sum, t) => sum + (Number(t.amount || 0) + Number(t.penalty || 0)), 0);

    setDailyTransactions(enrichedTransactions);
    setStats({
      totalTransactions: filteredTransactions.length,
      totalDeposits,
      totalWithdrawals,
      netCollection: totalDeposits - totalWithdrawals
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="container-fluid fade-in-up">
        <div className="text-center p-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading daily collection data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid fade-in-up">
      {/* Header - Enhanced for Print */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-6">
              <h4 className="mb-0">📅 Daily Collections</h4>
              <small className="text-muted">
                {new Date(selectedDate).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </small>
            </div>
            <div className="col-md-6 text-end no-print">
              <button className="btn btn-primary btn-sm" onClick={handlePrint}>
                🖨️ Print / Save as PDF
              </button>
            </div>
            {/* Print-only header info */}
            <div className="col-12 d-none d-print-block mt-3 pt-3" style={{ borderTop: '1px solid #ddd' }}>
              <div className="row">
                <div className="col-6">
                  <small><strong>Generated:</strong> {new Date().toLocaleString('en-IN')}</small>
                </div>
                <div className="col-6 text-end">
                  <small><strong>Report Type:</strong> Daily Collection Statement</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Filters */}
      <div className="row mb-4 no-print">
        <div className="col-md-2">
          <label className="form-label">Select Date</label>
          <input
            type="date"
            className="form-control"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div className="col-md-2">
          <label className="form-label">Filter by Agent</label>
          <select
            className="form-select"
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
          >
            <option value="">All Agents</option>
            {agents.map(agent => (
              <option key={agent.phone} value={agent.phone}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-8">
          <label className="form-label">Search</label>
          <input
            type="text"
            className="form-control"
            placeholder="Search by customer name, phone, agent..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Simple Statistics */}
      {stats && (
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h5 className="text-success">₹{stats.totalDeposits.toLocaleString()}</h5>
                <small>Total Deposits</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h5 className="text-danger">₹{stats.totalWithdrawals.toLocaleString()}</h5>
                <small>Total Withdrawals</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h5 className="text-primary">₹{stats.netCollection.toLocaleString()}</h5>
                <small>Net Collection</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h5 className="text-info">{stats.totalTransactions}</h5>
                <small>Total Transactions</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction List */}
      {dailyTransactions.length > 0 ? (
        <div className="card">
          <div className="card-header">
            <h6 className="mb-0">Transaction List ({dailyTransactions.length} transactions)</h6>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-hover" id="transactions-table">
                <thead className="table-light">
                  <tr>
                    <th>Date & Time</th>
                    <th>Customer</th>
                    <th>Agent</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyTransactions.map((txn, index) => (
                    <tr key={index}>
                      <td>
                        <div>
                          <strong>{txn.date ? new Date(txn.date).toLocaleDateString('en-IN') : 'N/A'}</strong>
                          {txn.time && (
                            <>
                              <br />
                              <small className="text-muted">{txn.time}</small>
                            </>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <strong>{txn.customerName || 'N/A'}</strong>
                          <br />
                          <small className="text-muted">{txn.customerPhone}</small>
                        </div>
                      </td>
                      <td>
                        <div>
                          <strong>{txn.agentName}</strong>
                          <br />
                          <small className="text-muted">{txn.agentPhone}</small>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${txn.type === 'deposit' ? 'bg-success' :
                          txn.type === 'withdrawal' ? 'bg-danger' : 'bg-secondary'
                          }`}>
                          {txn.type?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div>
                          <strong className={txn.type === 'deposit' ? 'text-success' : 'text-danger'}>
                            ₹{(Number(txn.amount || 0) + Number(txn.penalty || 0)).toLocaleString()}
                          </strong>
                          {txn.bonusIncluded && (
                            <div>
                              <small className="text-success">+₹{txn.bonusAmount} bonus</small>
                            </div>
                          )}
                          {txn.penaltyApplied && (
                            <div>
                              <small className="text-warning">-₹{txn.penalty} penalty</small>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>{txn.paymentMethod || txn.mode || 'Cash'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Print-only footer */}
            <div className="d-none d-print-block mt-4 pt-4" style={{ borderTop: '2px solid #000' }}>
              <div className="row">
                <div className="col-6">
                  <p className="mb-1"><strong>Summary:</strong></p>
                  <small>
                    Total Transactions: {dailyTransactions.length}<br />
                    Total Deposits: ₹{stats?.totalDeposits.toLocaleString()}<br />
                    Total Withdrawals: ₹{stats?.totalWithdrawals.toLocaleString()}<br />
                    <strong>Net Collection: ₹{stats?.netCollection.toLocaleString()}</strong>
                  </small>
                </div>
                <div className="col-6 text-end">
                  <p className="mb-1"><strong>Authorized Signature</strong></p>
                  <div style={{ height: '40px', borderBottom: '1px solid #000', width: '200px', marginLeft: 'auto', marginTop: '20px' }}></div>
                  <small className="mt-2 d-block">Date: {new Date().toLocaleDateString('en-IN')}</small>
                </div>
              </div>
              <div className="row mt-4">
                <div className="col-12 text-center">
                  <small className="text-muted">
                    This is a computer-generated statement and does not require a signature.<br />
                    For any queries, please contact your branch.
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body text-center py-5">
            <div className="mb-3">
              <span style={{ fontSize: '3rem', opacity: 0.5 }}>📅</span>
            </div>
            <h5 className="text-muted">No Transactions Found</h5>
            <p className="text-muted">
              No transactions were recorded on {new Date(selectedDate).toLocaleDateString('en-IN')}
              {selectedAgent && ' for the selected agent'}
              {searchTerm && ' matching your search criteria'}.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                setSelectedDate(new Date().toISOString().split('T')[0]);
                setSelectedAgent("");
                setSearchTerm("");
                setSelectedCustomers([]);
              }}
            >
              View Today's Collections
            </button>
          </div>
        </div>
      )}

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header" style={{ background: 'linear-gradient(135deg, #ffa726 0%, #fb8c00 100%)', color: 'white' }}>
                <h5 className="modal-title">👥 Manual Customer Selection</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowCustomerModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-info">
                  <small>
                    Select customers from the list below. You can select multiple customers to filter transactions.
                  </small>
                </div>

                {availableCustomers.length > 0 ? (
                  <div className="list-group" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {availableCustomers.map((customer, index) => {
                      const isSelected = selectedCustomers.some(c => c.phone === customer.phone);
                      return (
                        <div
                          key={customer.phone}
                          className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${isSelected ? 'active' : ''}`}
                          onClick={() => handleCustomerSelection(customer)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div>
                            <strong>{customer.name}</strong>
                            <br />
                            <small className={isSelected ? 'text-white-50' : 'text-muted'}>
                              {customer.phone} - Agent: {customer.agentName}
                            </small>
                          </div>
                          {isSelected && (
                            <span className="badge bg-light text-primary">✓ Selected</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <span style={{ fontSize: '2rem', opacity: 0.5 }}>👥</span>
                    <h6 className="text-muted mt-2">No customers found</h6>
                    <p className="text-muted">No customers have transactions on the selected date.</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCustomerModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleApplyCustomerFilter}
                >
                  Apply Filter ({selectedCustomers.length} selected)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print-only structured layout */}
      <div className="print-only-view">
        <div style={{ padding: '20mm', fontFamily: 'Arial, sans-serif', fontSize: '12px', lineHeight: '1.4' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '3px solid #000', paddingBottom: '15px' }}>
            <h2 style={{ margin: '0 0 5px 0', fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a' }}>
              शिवराप्त भिशी (ग्राहक भेटगिरदस्त संचयन योजना २०१६-१७)
            </h2>
            <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>Daily Collection Report</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '11px' }}>
              <div style={{ textAlign: 'left' }}>
                <strong>Date:</strong> {new Date(selectedDate).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong>Generated:</strong> {new Date().toLocaleString('en-IN')}
              </div>
            </div>
            {(selectedAgent || selectedCustomers.length > 0) && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
                {selectedAgent && <div><strong>Filtered by Agent:</strong> {agents.find(a => a.phone === selectedAgent)?.name}</div>}
                {selectedCustomers.length > 0 && <div><strong>Filtered Customers:</strong> {selectedCustomers.length} selected</div>}
              </div>
            )}
          </div>

          {/* Summary Stats */}
          {stats && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '15px',
              marginBottom: '25px',
              padding: '15px',
              background: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '4px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>
                  ₹{stats.totalDeposits.toLocaleString()}
                </div>
                <div style={{ fontSize: '10px', color: '#666', marginTop: '3px' }}>Total Deposits</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc3545' }}>
                  ₹{stats.totalWithdrawals.toLocaleString()}
                </div>
                <div style={{ fontSize: '10px', color: '#666', marginTop: '3px' }}>Total Withdrawals</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#007bff' }}>
                  ₹{stats.netCollection.toLocaleString()}
                </div>
                <div style={{ fontSize: '10px', color: '#666', marginTop: '3px' }}>Net Collection</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#17a2b8' }}>
                  {stats.totalTransactions}
                </div>
                <div style={{ fontSize: '10px', color: '#666', marginTop: '3px' }}>Total Transactions</div>
              </div>
            </div>
          )}

          {/* Transaction Table */}
          <div style={{ marginBottom: '25px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold', color: '#1a1a1a' }}>
              Transaction List ({dailyTransactions.length} transactions)
            </h4>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '10px',
              border: '1px solid #000'
            }}>
              <thead>
                <tr style={{ background: '#e9ecef' }}>
                  <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'left', fontWeight: 'bold' }}>DATE & TIME</th>
                  <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'left', fontWeight: 'bold' }}>CUSTOMER</th>
                  <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'left', fontWeight: 'bold' }}>AGENT</th>
                  <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'center', fontWeight: 'bold' }}>TYPE</th>
                  <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'right', fontWeight: 'bold' }}>AMOUNT</th>
                  <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'center', fontWeight: 'bold' }}>MODE</th>
                </tr>
              </thead>
              <tbody>
                {dailyTransactions.map((txn, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ border: '1px solid #000', padding: '6px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 'bold' }}>
                        {txn.date ? new Date(txn.date).toLocaleDateString('en-IN') : 'N/A'}
                      </div>
                      {txn.time && (
                        <div style={{ fontSize: '9px', color: '#666' }}>{txn.time}</div>
                      )}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 'bold' }}>{txn.customerName || 'N/A'}</div>
                      <div style={{ fontSize: '9px', color: '#666' }}>{txn.customerPhone}</div>
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 'bold' }}>{txn.agentName}</div>
                      <div style={{ fontSize: '9px', color: '#666' }}>{txn.agentPhone}</div>
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '3px',
                        background: txn.type === 'deposit' ? '#d4edda' : txn.type === 'withdrawal' ? '#f8d7da' : '#e2e3e5',
                        color: txn.type === 'deposit' ? '#155724' : txn.type === 'withdrawal' ? '#721c24' : '#383d41',
                        fontWeight: 'bold',
                        fontSize: '9px'
                      }}>
                        {txn.type?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right', verticalAlign: 'top' }}>
                      <div style={{
                        fontWeight: 'bold',
                        color: txn.type === 'deposit' ? '#28a745' : '#dc3545',
                        fontSize: '11px'
                      }}>
                        ₹{(Number(txn.amount || 0) + Number(txn.penalty || 0)).toLocaleString()}
                      </div>
                      {txn.bonusIncluded && (
                        <div style={{ fontSize: '8px', color: '#28a745' }}>+₹{txn.bonusAmount} bonus</div>
                      )}
                      {txn.penaltyApplied && (
                        <div style={{ fontSize: '8px', color: '#ffc107' }}>-₹{txn.penalty} penalty</div>
                      )}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', verticalAlign: 'middle' }}>
                      {txn.paymentMethod || txn.mode || 'Cash'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer with Summary and Signature */}
          <div style={{
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: '2px solid #000'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
              {/* Summary Section */}
              <div style={{ flex: '1', paddingRight: '20px' }}>
                <h5 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 'bold' }}>Payment Summary:</h5>
                <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Total Transactions:</span>
                    <strong>{dailyTransactions.length}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#28a745' }}>
                    <span>Total Deposits:</span>
                    <strong>₹{stats?.totalDeposits.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#dc3545' }}>
                    <span>Total Withdrawals:</span>
                    <strong>₹{stats?.totalWithdrawals.toLocaleString()}</strong>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid #000',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    <span>Net Collection:</span>
                    <span style={{ color: stats?.netCollection >= 0 ? '#28a745' : '#dc3545' }}>
                      ₹{stats?.netCollection.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signature Section */}
              <div style={{ flex: '1', paddingLeft: '20px', textAlign: 'right' }}>
                <h5 style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 'bold' }}>Verification:</h5>
                <div style={{ marginTop: '40px', marginBottom: '10px' }}>
                  <div style={{
                    height: '1px',
                    background: '#000',
                    width: '200px',
                    marginLeft: 'auto',
                    marginBottom: '5px'
                  }}></div>
                  <div style={{ fontSize: '10px', fontWeight: 'bold' }}>Authorized Signature</div>
                </div>
                <div style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>
                  Date: {new Date().toLocaleDateString('en-IN')}
                </div>
              </div>
            </div>

            {/* Footer Note */}
            <div style={{
              marginTop: '25px',
              padding: '12px',
              background: '#f8f9fa',
              border: '1px solid #dee2e6',
              textAlign: 'center',
              fontSize: '9px',
              color: '#666',
              borderRadius: '4px'
            }}>
              <div style={{ marginBottom: '3px' }}>
                <strong>Note:</strong> This is a computer-generated statement and does not require a physical signature.
              </div>
              <div>
                For any queries or discrepancies, please contact your branch office immediately.
              </div>
            </div>
          </div>

          {/* Page Number - Footer */}
          <div style={{
            position: 'fixed',
            bottom: '10mm',
            left: '0',
            right: '0',
            textAlign: 'center',
            fontSize: '9px',
            color: '#999'
          }}>
            Page 1 of 1 | Generated on {new Date().toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        .print-only-view {
          display: none;
        }
        
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          
          .no-print {
            display: none !important;
          }
          
          body {
            margin: 0;
            padding: 0;
            font-family: 'Arial', sans-serif;
            color: #000 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .container-fluid {
            display: none !important;
          }
          
          .print-only-view {
            display: block !important;
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

          /* Ensure borders are visible in PDF */
          table, th, td {
            border-color: #000 !important;
          }
        }
      `}</style>
    </div>
  );
}
