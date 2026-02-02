import React, { useEffect, useState } from "react";
import { ref, get, remove } from "firebase/database";
import { db } from "../firebase";
import { FiEye, FiTrash2 } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

export default function ViewCustomers() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedAgents, setExpandedAgents] = useState([]); // Track which agents are expanded

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Toggle agent expansion
  const toggleAgent = (agentMobile) => {
    if (expandedAgents.includes(agentMobile)) {
      setExpandedAgents(expandedAgents.filter(id => id !== agentMobile));
    } else {
      setExpandedAgents([...expandedAgents, agentMobile]);
    }
  };

  // Fetch all customers from Firebase
  const fetchAllCustomers = async () => {
    try {
      setLoading(true);
      setError("");

      const agentsRef = ref(db, "agents");
      const snapshot = await get(agentsRef);

      if (!snapshot.exists()) {
        setAgents([]);
        setFilteredAgents([]);
        setLoading(false);
        return;
      }

      const agentsData = snapshot.val();
      const agentsList = [];

      Object.entries(agentsData).forEach(([mobile, agent]) => {
        const agentInfo = agent.agentInfo || {};
        const agentName = agentInfo.agentName || "Unknown";
        const agentId = agentInfo.agentId || "Unknown";
        const agentRoute = agentInfo.route || "N/A";
        const agentStatus = agentInfo.status || "active";
        const agentCustomers = agent.customers || {};

        const customerList = Object.entries(agentCustomers).map(
          ([customerKey, customer]) => ({
            ...customer,
            customerKey,
            agentMobile: mobile,
            phoneNumber: customer.phoneNumber || customer.phone || customerKey,
            name: customer.name || "Unknown",
            balance: customer.balance || customer.principalAmount || 0,
            accountNumber: customer.accountNumber || "N/A",
            address: customer.address || "N/A",
            village: customer.village || (customer.address && customer.address !== "N/A" ? customer.address.split(',')[0].replace('Village ', '').trim() : "N/A"),
            active: customer.active !== undefined ? customer.active : true
          })
        );

        agentsList.push({
          agentName,
          agentId,
          agentMobile: mobile,
          agentRoute,
          agentStatus,
          customers: customerList
        });
      });

      setAgents(agentsList);
      setFilteredAgents(agentsList);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching customers:", err);
      setError("Failed to fetch customers.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCustomers();
  }, []);

  // Filter agents based on search input
  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setSearchTerm(value);

    if (!value) {
      setFilteredAgents(agents);
      return;
    }

    const filtered = agents.filter(
      (agent) =>
        agent.agentName.toLowerCase().includes(value) ||
        agent.agentId.toLowerCase().includes(value) ||
        agent.customers.some(customer =>
          customer.name.toLowerCase().includes(value) ||
          customer.phoneNumber.includes(value) ||
          customer.village.toLowerCase().includes(value)
        )
    );
    setFilteredAgents(filtered);
  };

  // Delete customer and update UI immediately
  const handleDelete = async (agentMobile, customerKey) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      try {
        // Remove from Firebase
        await remove(ref(db, `agents/${agentMobile}/customers/${customerKey}`));

        // Update local state immediately
        const updatedAgents = agents.map((agent) => {
          if (agent.agentMobile === agentMobile) {
            return {
              ...agent,
              customers: agent.customers.filter(
                (cust) => cust.customerKey !== customerKey
              ),
            };
          }
          return agent;
        });

        setAgents(updatedAgents);
        setFilteredAgents(updatedAgents); // update filtered view

        alert("Customer deleted successfully!");
      } catch (err) {
        console.error("Error deleting customer:", err);
        alert("Failed to delete customer.");
      }
    }
  };

  // Open View Modal
  const handleView = (customer) => {
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  // Close Modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedCustomer(null);
  };

  // Navigate to transactions page with customer details
  const handleViewTransactions = (customer, agent) => {
    navigate('/transactions', {
      state: {
        agentPhone: agent.agentMobile,
        agentName: agent.agentName,
        customerPhone: customer.phoneNumber,
        customerName: customer.name,
        customerId: customer.customerKey
      }
    });
  };

  if (loading) return <div className="text-center mt-5">Loading customers...</div>;
  if (error) return <div className="text-center text-danger mt-5">{error}</div>;

  return (
    <div className="container-fluid fade-in-up">
      {/* Header */}
      <div className="card border-0 mb-4" style={{ background: 'var(--success-gradient)', color: 'white' }}>
        <div className="card-body p-4">
          <div className="d-flex align-items-center">
            <div className="me-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.2)' }}>
                <span style={{ fontSize: '1.5rem' }}>👥</span>
              </div>
            </div>
            <div>
              <h4 className="mb-1 fw-bold">All Customers (Grouped by Agent)</h4>
              <p className="mb-0 opacity-75">Click on an agent to view their customers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card mb-4">
        <div className="card-body">
          <input
            type="text"
            className="form-control"
            placeholder="🔍 Search by Agent Name, ID, Customer Name, Phone, or Village..."
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
      </div>

      {/* Agent Cards */}
      {filteredAgents.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <span style={{ fontSize: '3rem' }}>📭</span>
            <p className="mt-3 text-muted">No agents or customers found.</p>
          </div>
        </div>
      ) : (
        filteredAgents.map((agent) => {
          const isExpanded = expandedAgents.includes(agent.agentMobile);
          const totalCustomers = agent.customers.length;

          return (
            <div key={agent.agentMobile} className="card mb-3">
              {/* Agent Header - Clickable */}
              <div
                className="card-header d-flex justify-content-between align-items-center"
                style={{
                  cursor: 'pointer',
                  background: isExpanded ? 'var(--primary-gradient)' : '#f8f9fa',
                  color: isExpanded ? 'white' : '#333',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => toggleAgent(agent.agentMobile)}
              >
                <div className="d-flex align-items-center">
                  <div className="me-3">
                    <div className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{
                        width: '50px',
                        height: '50px',
                        background: isExpanded ? 'rgba(255,255,255,0.2)' : 'var(--primary-gradient)',
                        color: isExpanded ? 'white' : 'white'
                      }}>
                      <span style={{ fontSize: '1.5rem' }}>👨‍💼</span>
                    </div>
                  </div>
                  <div>
                    <h5 className="mb-0 fw-bold">{agent.agentName}</h5>
                    <small className={isExpanded ? 'opacity-75' : 'text-muted'}>
                      ID: {agent.agentId} | Mobile: {agent.agentMobile}
                    </small>
                  </div>
                </div>
                <div className="d-flex align-items-center">
                  <span className={`badge ${isExpanded ? 'bg-light text-dark' : 'bg-primary'} me-3`}>
                    {totalCustomers} Customer{totalCustomers !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontSize: '1.5rem', transition: 'transform 0.3s ease', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    ▼
                  </span>
                </div>
              </div>

              {/* Customer Table - Collapsible */}
              {isExpanded && (
                <div className="card-body p-0" style={{ animation: 'fadeIn 0.3s ease' }}>
                  {agent.customers.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      <span style={{ fontSize: '2rem' }}>📋</span>
                      <p className="mt-2">No customers for this agent.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead style={{ background: '#f8f9fa' }}>
                          <tr>
                            <th>#</th>
                            <th>Customer Name</th>
                            <th>Phone</th>
                            <th>Village</th>
                            <th>Account Number</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agent.customers.map((cust, index) => (
                            <tr key={cust.customerKey}>
                              <td>{index + 1}</td>
                              <td className="fw-semibold">{cust.name}</td>
                              <td>{cust.phoneNumber}</td>
                              <td className="text-primary fw-semibold">{cust.village}</td>
                              <td className="text-muted">{cust.accountNumber}</td>
                              <td>
                                <span className={`badge ${cust.active ? 'bg-success' : 'bg-danger'}`}>
                                  {cust.active ? 'active' : 'inactive'}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="btn btn-sm btn-info me-2 text-white"
                                  onClick={() => navigate(`/agents/${agent.agentMobile}/customers/${cust.customerKey}`)}
                                  title="View Profile"
                                >
                                  PROFILE
                                </button>
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={() => handleViewTransactions(cust, agent)}
                                  title="View Transactions"
                                >
                                  TRANSACTIONS
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Modal */}
      {showModal && selectedCustomer && (
        <div
          className="modal d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={closeModal}
        >
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Customer Details</h5>
                <button className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                <p><strong>Name:</strong> {selectedCustomer.name}</p>
                <p><strong>Phone:</strong> {selectedCustomer.phoneNumber}</p>
                <p><strong>Village:</strong> <span className="text-primary fw-semibold">{selectedCustomer.village}</span></p>
                <p><strong>Account Number:</strong> {selectedCustomer.accountNumber}</p>
                <p><strong>Principal Amount:</strong> {selectedCustomer.principalAmount}</p>
                <p><strong>Interest Rate:</strong> {selectedCustomer.interestRate}</p>
                <p><strong>Address:</strong> {selectedCustomer.address}</p>
                <p><strong>Start Date:</strong> {selectedCustomer.startDate}</p>
                <p><strong>Active:</strong> {selectedCustomer.active ? "Yes" : "No"}</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeModal}>
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
