import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";

export default function AllData() {
  const [allData, setAllData] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('admin');
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    // Listen to the entire database
    const dbRef = ref(db, '/');
    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAllData(data);
        console.log("Complete database data:", data);
      } else {
        setAllData({});
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const renderAdminData = () => {
    const adminData = allData.admin || {};
    
    return (
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">🔐 Admin Users</h5>
        </div>
        <div className="card-body">
          {Object.keys(adminData).length === 0 ? (
            <p className="text-muted">No admin users found</p>
          ) : (
            Object.entries(adminData).map(([adminId, admin]) => (
              <div key={adminId} className="border rounded p-3 mb-3">
                <h6 className="text-primary">Admin ID: {adminId}</h6>
                <p><strong>Email:</strong> {admin.email || 'N/A'}</p>
                <p><strong>Created At:</strong> {formatDate(admin.createdAt)}</p>
                <p><strong>Password:</strong> {admin.password ? '••••••••' : 'N/A'}</p>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderAgentsData = () => {
    const agentsData = allData.agents || {};
    
    return (
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">👨‍💼 Collection Agents ({Object.keys(agentsData).length})</h5>
        </div>
        <div className="card-body">
          {Object.keys(agentsData).length === 0 ? (
            <p className="text-muted">No agents found</p>
          ) : (
            Object.entries(agentsData).map(([mobileNumber, agent]) => {
              const agentInfo = agent.agentInfo || {};
              const customers = agent.customers || {};
              const transactions = agent.transactions || {};
              
              return (
                <div key={mobileNumber} className="border rounded p-3 mb-4">
                  <div 
                    className="d-flex justify-content-between align-items-center cursor-pointer"
                    onClick={() => toggleSection(`agent-${mobileNumber}`)}
                  >
                    <h6 className="text-primary mb-0">
                      📱 {mobileNumber} - {agentInfo.agentName || 'Unknown'}
                    </h6>
                    <span>{expandedSections[`agent-${mobileNumber}`] ? '▼' : '▶'}</span>
                  </div>
                  
                  {expandedSections[`agent-${mobileNumber}`] && (
                    <div className="mt-3">
                      {/* Agent Info */}
                      <div className="row">
                        <div className="col-md-6">
                          <div className="card mb-3">
                            <div className="card-header">
                              <h6 className="mb-0">Agent Information</h6>
                            </div>
                            <div className="card-body">
                              <p><strong>Agent ID:</strong> {agentInfo.agentId || 'N/A'}</p>
                              <p><strong>Name:</strong> {agentInfo.agentName || 'N/A'}</p>
                              <p><strong>Mobile:</strong> {agentInfo.mobileNumber || mobileNumber}</p>
                              <p><strong>Password:</strong> {agentInfo.password ? '••••••••' : 'N/A'}</p>
                              <p><strong>Routes:</strong> {
                                agentInfo.routes ? 
                                  (Array.isArray(agentInfo.routes) ? agentInfo.routes.join(', ') : agentInfo.routes) : 
                                  'N/A'
                              }</p>
                              <p><strong>Status:</strong> 
                                <span className={`badge ms-2 ${agentInfo.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                                  {agentInfo.status || 'N/A'}
                                </span>
                              </p>
                              <p><strong>Created At:</strong> {formatDate(agentInfo.createdAt)}</p>
                              <p><strong>Timestamp:</strong> {agentInfo.timestamp || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Customers */}
                        <div className="col-md-6">
                          <div className="card mb-3">
                            <div className="card-header">
                              <h6 className="mb-0">Customers ({Object.keys(customers).length})</h6>
                            </div>
                            <div className="card-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                              {Object.keys(customers).length === 0 ? (
                                <p className="text-muted">No customers</p>
                              ) : (
                                Object.entries(customers).map(([phoneNumber, customer]) => (
                                  <div key={phoneNumber} className="border-bottom pb-2 mb-2">
                                    <h6 className="text-success">{customer.name || 'Unknown'}</h6>
                                    <small>
                                      <strong>ID:</strong> {customer.customerId || 'N/A'}<br/>
                                      <strong>Phone:</strong> {customer.phoneNumber || customer.phone || phoneNumber}<br/>
                                      <strong>Address:</strong> {customer.address || 'N/A'}<br/>
                                      <strong>Principal:</strong> ₹{customer.principalAmount || 0}<br/>
                                      <strong>Balance:</strong> ₹{customer.balance || 0}<br/>
                                      <strong>Monthly Due:</strong> ₹{customer.monthlyDue || 0}<br/>
                                      <strong>Weekly Amount:</strong> ₹{customer.weeklyAmount || 0}<br/>
                                      <strong>Join Date:</strong> {customer.joinDate || 'N/A'}<br/>
                                      <strong>Active:</strong> 
                                      <span className={`badge ms-1 ${customer.active ? 'bg-success' : 'bg-danger'}`}>
                                        {customer.active ? 'Yes' : 'No'}
                                      </span><br/>
                                      <strong>Missed Payments:</strong> {customer.missedPayments || 0}<br/>
                                      <strong>Last Payment:</strong> {customer.lastPaymentDate || 'N/A'}
                                    </small>
                                    
                                    {/* Customer Transactions */}
                                    {customer.transactions && (
                                      <div className="mt-2">
                                        <small><strong>Transactions ({Object.keys(customer.transactions).length}):</strong></small>
                                        <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                          {Object.entries(customer.transactions).map(([txId, tx]) => (
                                            <div key={txId} className="bg-light p-1 rounded mb-1">
                                              <small>
                                                <strong>{tx.type}:</strong> ₹{tx.amount} | 
                                                <strong> Date:</strong> {tx.date} | 
                                                <strong> Mode:</strong> {tx.mode} |
                                                <strong> Remarks:</strong> {tx.remarks || 'N/A'}
                                              </small>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Agent Transactions */}
                      {Object.keys(transactions).length > 0 && (
                        <div className="card">
                          <div className="card-header">
                            <h6 className="mb-0">Agent Transactions ({Object.keys(transactions).length})</h6>
                          </div>
                          <div className="card-body" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {Object.entries(transactions).map(([txId, tx]) => (
                              <div key={txId} className="border-bottom pb-2 mb-2">
                                <strong>Transaction ID:</strong> {txId}<br/>
                                <strong>Type:</strong> {tx.type}<br/>
                                <strong>Amount:</strong> ₹{tx.amount}<br/>
                                <strong>Date:</strong> {tx.date}<br/>
                                <strong>Customer Phone:</strong> {tx.customerPhone}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderWeeklyCollections = () => {
    const weeklyData = allData.weeklyCollections || {};
    
    return (
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">📅 Weekly Collections ({Object.keys(weeklyData).length} weeks)</h5>
        </div>
        <div className="card-body">
          {Object.keys(weeklyData).length === 0 ? (
            <p className="text-muted">No weekly collections found</p>
          ) : (
            Object.entries(weeklyData).map(([weekNumber, weekData]) => (
              <div key={weekNumber} className="border rounded p-3 mb-3">
                <div 
                  className="d-flex justify-content-between align-items-center cursor-pointer"
                  onClick={() => toggleSection(`week-${weekNumber}`)}
                >
                  <h6 className="text-primary mb-0">Week {weekNumber}</h6>
                  <span>{expandedSections[`week-${weekNumber}`] ? '▼' : '▶'}</span>
                </div>
                
                {expandedSections[`week-${weekNumber}`] && (
                  <div className="mt-3">
                    {Object.entries(weekData).map(([customerPhone, collection]) => (
                      <div key={customerPhone} className="bg-light p-2 rounded mb-2">
                        <strong>Customer:</strong> {customerPhone}<br/>
                        <strong>Agent:</strong> {collection.agentPhone}<br/>
                        <strong>Amount:</strong> ₹{collection.amount}<br/>
                        <strong>Date:</strong> {collection.date}<br/>
                        <strong>Week Number:</strong> {collection.weekNumber}<br/>
                        <strong>Paid:</strong> 
                        <span className={`badge ms-1 ${collection.paid ? 'bg-success' : 'bg-danger'}`}>
                          {collection.paid ? 'Yes' : 'No'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderGlobalTransactions = () => {
    const transactionsData = allData.transactions || {};
    
    return (
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">💳 Global Transactions ({Object.keys(transactionsData).length})</h5>
        </div>
        <div className="card-body" style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {Object.keys(transactionsData).length === 0 ? (
            <p className="text-muted">No global transactions found</p>
          ) : (
            Object.entries(transactionsData).map(([txId, tx]) => (
              <div key={txId} className="border-bottom pb-2 mb-2">
                <strong>Transaction ID:</strong> {txId}<br/>
                <strong>Type:</strong> {tx.type}<br/>
                <strong>Amount:</strong> ₹{tx.amount}<br/>
                <strong>Date:</strong> {tx.date}<br/>
                <strong>Agent Phone:</strong> {tx.agentPhone}<br/>
                <strong>Customer Phone:</strong> {tx.customerPhone}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center mt-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading all database data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid fade-in-up">
      {/* Header */}
      <div className="card border-0 mb-4" style={{ background: 'var(--info-gradient)', color: 'white' }}>
        <div className="card-body p-4">
          <div className="d-flex align-items-center">
            <div className="me-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center"
                   style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.2)' }}>
                <span style={{ fontSize: '1.5rem' }}>🗄️</span>
              </div>
            </div>
            <div>
              <h4 className="mb-1 fw-bold">Complete Database View</h4>
              <p className="mb-0 opacity-75">All data from Firebase Realtime Database</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="card mb-4">
        <div className="card-body">
          <ul className="nav nav-pills">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin')}
              >
                🔐 Admin ({Object.keys(allData.admin || {}).length})
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'agents' ? 'active' : ''}`}
                onClick={() => setActiveTab('agents')}
              >
                👨‍💼 Agents ({Object.keys(allData.agents || {}).length})
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'weekly' ? 'active' : ''}`}
                onClick={() => setActiveTab('weekly')}
              >
                📅 Weekly Collections ({Object.keys(allData.weeklyCollections || {}).length})
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'transactions' ? 'active' : ''}`}
                onClick={() => setActiveTab('transactions')}
              >
                💳 Global Transactions ({Object.keys(allData.transactions || {}).length})
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Content based on active tab */}
      <div className="mb-4">
        {activeTab === 'admin' && renderAdminData()}
        {activeTab === 'agents' && renderAgentsData()}
        {activeTab === 'weekly' && renderWeeklyCollections()}
        {activeTab === 'transactions' && renderGlobalTransactions()}
      </div>

      {/* Raw Data View (Optional) */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">🔍 Raw Database JSON</h5>
        </div>
        <div className="card-body">
          <pre className="bg-light p-3 rounded" style={{ maxHeight: '400px', overflow: 'auto', fontSize: '0.8rem' }}>
            {JSON.stringify(allData, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}