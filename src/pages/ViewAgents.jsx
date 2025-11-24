import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { ref, onValue, remove } from "firebase/database";

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
          
          // Calculate total collections from all customer principal amounts
          const totalCollections = customersArray.reduce((sum, customer) => {
            return sum + Number(customer.principalAmount || 0);
          }, 0);
          
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
      {/* Header */}
      <div className="card border-0 mb-4" style={{ background: 'var(--primary-gradient)', color: 'white' }}>
        <div className="card-body p-4">
          <div className="d-flex align-items-center">
            <div className="me-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center"
                   style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.2)' }}>
                <span style={{ fontSize: '1.5rem' }}>👥</span>
              </div>
            </div>
            <div>
              <h4 className="mb-1 fw-bold">All Agents</h4>
              <p className="mb-0 opacity-75">Manage and monitor all collection agents</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--primary-gradient)' }}>
              👥
            </div>
            <h3 className="stats-number">{totalAgents}</h3>
            <p className="stats-label">Total Agents</p>
          </div>
        </div>
        <div className="col-md-4">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--success-gradient)' }}>
              ✅
            </div>
            <h3 className="stats-number">{activeAgents}</h3>
            <p className="stats-label">Active Agents</p>
          </div>
        </div>
        <div className="col-md-4">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--warning-gradient)' }}>
              👥
            </div>
            <h3 className="stats-number">{totalCustomers}</h3>
            <p className="stats-label">Total Customers</p>
          </div>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text">🔍</span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name, mobile number, or route..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-6 text-end">
              <span className="badge bg-info me-2">{filteredAgents.length} agents found</span>
              <button className="btn btn-primary" onClick={() => window.location.href = '/add-agent'}>
                <span className="me-2">➕</span>Add Agent
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
                          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👨‍💼</div>
                          <h5>No agents found</h5>
                          <p>Start by adding your first agent to the system.</p>
                          <button 
                            className="btn btn-primary mt-2"
                            onClick={() => window.location.href = '/add-agent'}
                          >
                            <span className="me-2">➕</span>Add First Agent
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
                              👨‍💼
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
                                  <span key={idx} className="badge bg-info" title={villages.length > 0 ? villages.join(', ') : ''}>
                                    📍 {route}
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
                          <span className={`badge ${agent.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                            {agent.status === 'active' ? '✅ Active' : '❌ Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button 
                              className="btn btn-outline-info" 
                              title="View Details"
                              onClick={() => handleViewAgent(agent)}
                            >
                              👁️
                            </button>
                            <button 
                              className="btn btn-outline-warning" 
                              title="Edit Agent"
                              onClick={() => handleEditAgent(agent)}
                            >
                              ✏️
                            </button>
                            <button 
                              className="btn btn-outline-danger" 
                              title="Delete Agent"
                              onClick={() => handleDeleteAgent(agent)}
                            >
                              🗑️
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

      {/* Agent Details Modal */}
      {showModal && selectedAgent && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header" style={{ background: 'var(--primary-gradient)', color: 'white' }}>
                <h5 className="modal-title">
                  <span className="me-2">👨‍💼</span>
                  Agent Details - {selectedAgent.agentName}
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <div className="card mb-3">
                      <div className="card-header">
                        <h6 className="mb-0">📋 Basic Information</h6>
                      </div>
                      <div className="card-body">
                        <p><strong>Agent Name:</strong> {selectedAgent.agentName}</p>
                        <p><strong>Mobile Number:</strong> {selectedAgent.mobileNumber}</p>
                        <p><strong>Routes:</strong> 
                          {selectedAgent.routes && selectedAgent.routes.length > 0 ? (
                            <div className="d-flex flex-wrap gap-1 mt-1">
                              {selectedAgent.routes.map((route, idx) => {
                                const villages = routesData[route] || [];
                                
                                return (
                                  <div key={idx} className="badge bg-info p-2">
                                    <div>📍 {route}</div>
                                    {villages.length > 0 && (
                                      <small className="d-block mt-1" style={{ fontSize: '0.7rem', opacity: 0.9 }}>
                                        Villages: {villages.join(', ')}
                                      </small>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-muted"> No routes assigned</span>
                          )}
                        </p>
                        <p><strong>Status:</strong> 
                          <span className={`badge ms-2 ${selectedAgent.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                            {selectedAgent.status === 'active' ? '✅ Active' : '❌ Inactive'}
                          </span>
                        </p>
                        <p><strong>Created:</strong> {selectedAgent.createdAt ? new Date(selectedAgent.createdAt).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card mb-3">
                      <div className="card-header">
                        <h6 className="mb-0">📊 Statistics</h6>
                      </div>
                      <div className="card-body">
                        <p><strong>Total Customers:</strong> {selectedAgent.totalCustomers || 0}</p>
                        <p><strong>Active Customers:</strong> {selectedAgent.activeCustomers || 0}</p>
                        <p><strong>Total Collections:</strong> ₹{(selectedAgent.totalCollections || 0).toLocaleString()}</p>
                        <p><strong>Total Commission:</strong> ₹{(selectedAgent.totalCommission || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-warning"
                  onClick={() => handleEditAgent(selectedAgent)}
                >
                  ✏️ Edit Agent
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
