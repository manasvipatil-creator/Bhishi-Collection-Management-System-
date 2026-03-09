import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { ref, onValue, remove } from "firebase/database";
import { FiUsers, FiUser, FiUserCheck, FiSearch, FiPlus, FiEye, FiEdit2, FiTrash2, FiMapPin, FiCheckCircle, FiXCircle, FiUserPlus } from 'react-icons/fi';

export default function ViewAgents() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [routesData, setRoutesData] = useState({});

  useEffect(() => {
    // Load routes data first
    const routesRef = ref(db, 'routes');
    onValue(routesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const routesMap = {};
        Object.entries(data).forEach(([id, route]) => {
          routesMap[route.name] = route.villages || [];
        });
        setRoutesData(routesMap);
      }
    });

    const query = ref(db, "agents");
    onValue(query, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const agentsArray = Object.entries(data).map(([key, value]) => {
          const customers = value.customers || {};
          const customersArray = Object.values(customers);

          // Calculate dynamic statistics from customer data
          const totalCustomers = customersArray.length;
          const activeCustomers = customersArray.filter(c => c.active === true).length;

          // Calculate total collections from transactions
          let totalCollections = 0;
          const agentTransactions = value.transactions || {};

          Object.values(agentTransactions).forEach(customerTxns => {
            if (customerTxns) {
              Object.values(customerTxns).forEach(txn => {
                const type = txn.type || 'deposit';
                if (type === 'deposit') {
                  totalCollections += Number(txn.amount || txn.amountDeposited || 0);
                }
              });
            }
          });

          // Calculate commission (assuming 2% of total collections)
          const totalCommission = totalCollections * 0.02;

          // Normalize routes to ensure they're always in the correct format
          let routes = value.agentInfo?.routes || (value.agentInfo?.route ? [value.agentInfo.route] : []);
          // Ensure routes is always an array
          if (!Array.isArray(routes)) {
            routes = [];
          }
          // Convert any route objects to strings (for backward compatibility)
          routes = routes.map(route => {
            if (typeof route === 'object' && route !== null) {
              return route.name || 'Unknown Route';
            }
            return route;
          });

          return {
            id: key,
            agentName: value.agentInfo?.agentName,
            mobileNumber: value.agentInfo?.mobileNumber,
            password: value.agentInfo?.password,
            routes: routes,
            status: value.agentInfo?.status,
            createdAt: value.agentInfo?.createdAt,
            totalCustomers: totalCustomers,
            totalCollections: totalCollections,
            totalCommission: totalCommission,
            activeCustomers: activeCustomers,
            customers: customers
          };
        });
        setAgents(agentsArray);
        console.log("Agents loaded with dynamic stats:", agentsArray); // Debug log
      } else {
        setAgents([]);
        console.log("No agents found in database"); // Debug log
      }
      setLoading(false);
    });
  }, []);

  const filteredAgents = agents.filter(agent => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = agent.agentName?.toLowerCase().includes(searchLower);
    const phoneMatch = agent.mobileNumber?.includes(searchTerm);
    const routeMatch = agent.routes?.some(route => route?.toLowerCase().includes(searchLower));
    return nameMatch || phoneMatch || routeMatch;
  }
  );

  const totalAgents = filteredAgents.length;
  const activeAgents = filteredAgents.filter(agent => agent.status === 'active').length;
  const totalCollections = filteredAgents.reduce((sum, agent) => sum + (agent.totalCollections || 0), 0);
  const totalCustomers = filteredAgents.reduce((sum, agent) => sum + (agent.totalCustomers || 0), 0);

  // Handler functions for action buttons
  const handleViewAgent = (agent) => {
    setSelectedAgent(agent);
    setShowModal(true);
  };

  const handleEditAgent = (agent) => {
    // Navigate to edit page with agent data
    navigate('/add-agent', { state: { editAgent: agent } });
  };

  const handleDeleteAgent = async (agent) => {
    if (window.confirm(`Are you sure you want to delete agent "${agent.agentName}"? This will also delete all associated customers and data.`)) {
      try {
        const agentRef = ref(db, `agents/${agent.id}`);
        await remove(agentRef);
        alert('Agent deleted successfully!');
      } catch (error) {
        console.error('Error deleting agent:', error);
        alert('Error deleting agent. Please try again.');
      }
    }
  };

  return (
    <div className="container-fluid fade-in-up">
      <style>{`
        /* ViewAgents - simple & professional (scoped) */
        .va-header { display:flex; gap:14px; align-items:center; padding:14px; background:#ffffff; border:1px solid #e8eef6; border-radius:8px; margin-bottom:18px }
        .va-avatar { width:52px; height:52px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:#f1f6ff; color:#0d6efd; font-size:1.25rem }
        .va-title { margin:0 }
        .va-sub { margin:0; color:#6b7280; font-size:0.95rem }

        .va-stats { margin-bottom:16px }
        .va-stat { background:#fff; border:1px solid #eef2f6; border-radius:8px; padding:12px; text-align:left; display:flex; gap:12px; align-items:center }
        .va-stat-icon { width:44px; height:44px; border-radius:8px; display:flex; align-items:center; justify-content:center; color:white }
        .va-stat-number { font-weight:700; font-size:1.2rem }
        .va-stat-label { color:#6b7280; font-size:0.85rem }

        .search-actions .input-group-text { background:#fff; border-right:0 }
        .search-actions .form-control { border-left:0 }

        .route-badge { background:#f1f5f9; border:1px solid #e2e8f0; color:#0f172a; border-radius:6px; padding:6px 8px; display:inline-block }

        .actions .btn { min-width:40px }

        .modal-backdrop-custom { background-color: rgba(0,0,0,0.45) }

        /* Modal Styling to match design */
        .va-modal-content { border:none; border-radius:12px; overflow:hidden; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25) }
        .va-modal-header { padding:20px 24px; border-bottom:1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center; background:#fff }
        .va-modal-title { font-size:1.25rem; font-weight:600; color:#111827; margin:0; display:flex; align-items:center; gap:10px }
        
        .va-info-card { border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; height:100%; background:#fff }
        .va-card-header-purple { background: linear-gradient(90deg, #7c3aed, #8b5cf6); padding:12px 20px; color:white; font-weight:600; font-size:1rem; display:flex; align-items:center; gap:8px }
        
        .va-detail-row { margin-bottom:12px; font-size:0.95rem }
        .va-label { font-weight:700; color:#374151; margin-right:6px }
        .va-value { color:#111827 }
        
        .va-route-block { background:#3b82f6; border-radius:6px; padding:12px 16px; margin-bottom:10px; color:white }
        .va-route-header { font-weight:700; display:flex; align-items:center; gap:8px; margin-bottom:4px; font-size:1rem }
        .va-route-villages { font-size:0.85rem; opacity:0.95; line-height:1.4 }
        
        .va-modal-footer { padding:20px 24px; border-top:1px solid #e5e7eb; display:flex; justify-content:flex-end; gap:12px; background:#f9fafb }
        .btn-green { background:#10b981; border:none; color:white; padding:8px 20px; font-weight:600; border-radius:6px }
        .btn-green:hover { background:#059669 }
        .btn-grey { background:#6b7280; border:none; color:white; padding:8px 20px; font-weight:600; border-radius:6px }
        .btn-grey:hover { background:#4b5563 }

        @media (max-width:991px){ .modal-cards{flex-direction:column} }
        @media (max-width:767px){ .va-header{flex-direction:column;align-items:flex-start} }
      `}</style>

      {/* Header (simple) */}
      <div className="va-header">
        <div className="va-avatar"><FiUsers size={22} /></div>
        <div>
          <h4 className="va-title">All Agents</h4>
          <p className="va-sub">Manage and monitor all collection agents</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row g-3 mb-4 va-stats">
        <div className="col-md-4">
          <div className="va-stat">
            <div className="va-stat-icon" style={{ background: '#0d6efd' }}><FiUsers /></div>
            <div>
              <div className="va-stat-number">{totalAgents}</div>
              <div className="va-stat-label">Total Agents</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="va-stat">
            <div className="va-stat-icon" style={{ background: '#198754' }}><FiUserCheck /></div>
            <div>
              <div className="va-stat-number">{activeAgents}</div>
              <div className="va-stat-label">Active Agents</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="va-stat">
            <div className="va-stat-icon" style={{ background: '#f59e0b' }}><FiUser /></div>
            <div>
              <div className="va-stat-number">{totalCustomers}</div>
              <div className="va-stat-label">Total Customers</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="card mb-4 search-actions">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-6 mb-2 mb-md-0">
              <div className="input-group">
                <span className="input-group-text"><FiSearch /></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name, mobile number, or route..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-6 text-md-end">
              <span className="badge bg-light text-dark me-2">{filteredAgents.length} agents</span>
              <button className="btn btn-primary" onClick={() => navigate('/add-agent')}>
                <FiPlus className="me-1" /> Add Agent
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
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
                    <th>Mobile Number</th>
                    <th>Routes</th>
                    <th>Customers</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAgents.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-5">
                        <div className="text-muted">
                          <FiUsers size={48} className="mb-3 text-secondary" />
                          <h5>No agents found</h5>
                          <p>Start by adding your first agent to the system.</p>
                          <button
                            className="btn btn-primary mt-2"
                            onClick={() => window.location.href = '/add-agent'}
                          >
                            <FiUserPlus className="me-2" />Add First Agent
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAgents.map((agent, index) => (
                      <tr key={agent.id || index}>
                        <td className="fw-semibold">
                          <div className="d-flex align-items-center">
                            <div className="rounded-circle me-2 d-flex align-items-center justify-content-center"
                              style={{ width: '35px', height: '35px', background: 'var(--primary-gradient)', color: 'white', fontSize: '0.8rem' }}>
                              <FiUsers size={16} />
                            </div>
                            {agent.agentName}
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark">{agent.mobileNumber}</span>
                        </td>
                        <td>
                          {agent.routes && agent.routes.length > 0 ? (
                            <div className="d-flex flex-wrap gap-1">
                              {agent.routes.map((route, idx) => {
                                const villages = routesData[route] || [];

                                return (
                                  <span key={idx} className="route-badge me-1" title={villages.length > 0 ? villages.join(', ') : ''}>
                                    <FiMapPin className="me-1" /> {route}
                                    {villages.length > 0 && (
                                      <small className="d-block" style={{ fontSize: '0.7rem', opacity: 0.9 }}>
                                        ({villages.length} villages)
                                      </small>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="badge bg-secondary">No routes</span>
                          )}
                        </td>
                        <td className="fw-bold">{agent.totalCustomers || 0}</td>
                        <td>
                          <span className={`badge d-inline-flex align-items-center gap-1 ${agent.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                            {agent.status === 'active' ? (
                              <>
                                <FiCheckCircle size={14} /> Active
                              </>
                            ) : (
                              <>
                                <FiXCircle size={14} /> Inactive
                              </>
                            )}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm actions">
                            <button className="btn btn-outline-secondary" title="View Details" onClick={() => handleViewAgent(agent)}>
                              <FiEye />
                            </button>
                            <button className="btn btn-outline-secondary" title="Edit Agent" onClick={() => handleEditAgent(agent)}>
                              <FiEdit2 />
                            </button>
                            <button className="btn btn-outline-danger" title="Delete Agent" onClick={() => handleDeleteAgent(agent)}>
                              <FiTrash2 />
                            </button>
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

      {/* Agent Details Modal - Redesigned */}
      {showModal && selectedAgent && (
        <div className="modal fade show" style={{ display: 'block' }}>
          <div className="modal-backdrop-custom" style={{ position: 'fixed', inset: 0, zIndex: 1040, backgroundColor: 'rgba(0,0,0,0.45)' }} onClick={() => setShowModal(false)}></div>
          <div className="modal-dialog modal-lg modal-dialog-centered" style={{ zIndex: 1050 }}>
            <div className="modal-content va-modal-content">
              {/* Modal Header */}
              <div className="va-modal-header">
                <h5 className="va-modal-title">
                  <FiUsers className="me-2" /> Agent Details - {selectedAgent.agentName}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} aria-label="Close"></button>
              </div>

              {/* Modal Body */}
              <div className="modal-body p-4">
                <div className="row g-4">
                  {/* Basic Information Column */}
                  <div className="col-md-6">
                    <div className="va-info-card">
                      <div className="va-card-header-purple">
                        <FiUsers size={18} /> Basic Information
                      </div>
                      <div className="p-4">
                        <div className="va-detail-row">
                          <span className="va-label">Agent Name:</span>
                          <span className="va-value">{selectedAgent.agentName}</span>
                        </div>
                        <div className="va-detail-row mb-4">
                          <span className="va-label">Mobile Number:</span>
                          <span className="va-value">{selectedAgent.mobileNumber}</span>
                        </div>

                        <div className="mb-2 fb-bold fw-bold text-dark mb-2">Routes:</div>
                        <div className="mb-4">
                          {selectedAgent.routes && selectedAgent.routes.length > 0 ? (
                            selectedAgent.routes.map((route, idx) => {
                              const villages = routesData[route] || [];
                              return (
                                <div key={idx} className="va-route-block">
                                  <div className="va-route-header">
                                    <FiMapPin size={16} /> {route}
                                  </div>
                                  {villages.length > 0 && (
                                    <div className="va-route-villages">
                                      Villages: {villages.join(', ')}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-muted small fst-italic">No routes assigned</div>
                          )}
                        </div>

                        <div className="va-detail-row">
                          <span className="va-label">Status:</span>
                          <span className={`badge rounded-pill ${selectedAgent.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                            {selectedAgent.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="va-detail-row mt-2">
                          <span className="va-label">Created:</span>
                          <span className="va-value">{selectedAgent.createdAt ? new Date(selectedAgent.createdAt).toLocaleDateString('en-GB') : 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Statistics Column */}
                  <div className="col-md-6">
                    <div className="va-info-card">
                      <div className="va-card-header-purple">
                        <FiUsers size={18} /> Statistics
                      </div>
                      <div className="p-4">
                        <div className="va-detail-row mb-3">
                          <span className="va-label">Total Customers:</span>
                          <span className="va-value">{selectedAgent.totalCustomers || 0}</span>
                        </div>
                        <div className="va-detail-row mb-3">
                          <span className="va-label">Active Customers:</span>
                          <span className="va-value">{selectedAgent.activeCustomers || 0}</span>
                        </div>
                        <div className="va-detail-row mb-3">
                          <span className="va-label">Total Collections:</span>
                          <span className="va-value">₹{(selectedAgent.totalCollections || 0).toLocaleString()}</span>
                        </div>
                        <div className="va-detail-row">
                          <span className="va-label">Total Commission:</span>
                          <span className="va-value">₹{(selectedAgent.totalCommission || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="va-modal-footer">
                <button type="button" className="btn-green" onClick={() => handleEditAgent(selectedAgent)}>
                  <FiEdit2 className="me-1" /> EDIT AGENT
                </button>
                <button type="button" className="btn-grey" onClick={() => setShowModal(false)}>
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
