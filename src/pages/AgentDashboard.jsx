import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, onValue, query, orderByChild, equalTo } from "firebase/database";
import { db } from "../firebase";

export default function AgentDashboard() {
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalCollections: 0,
    pendingCollections: 0,
    totalAmount: 0
  });
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if agent is logged in
    const loggedInAgent = localStorage.getItem('loggedInAgent');
    if (!loggedInAgent) {
      navigate('/agent-login');
      return;
    }

    const agentInfo = JSON.parse(loggedInAgent);
    setAgent(agentInfo);

    // Fetch agent's customers from new structure
    const agentCustomersRef = ref(db, `agents/${agentInfo.id}/customers`);
    
    onValue(agentCustomersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const customersList = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value
        }));
        
        setCustomers(customersList);
        
        // Calculate stats
        const totalCustomers = customersList.length;
        const totalAmount = customersList.reduce((sum, customer) => sum + (customer.totalSubmitted || 0), 0);
        const totalCollections = customersList.reduce((sum, customer) => sum + (customer.totalSubmitted || 0), 0);
        const pendingCollections = customersList.filter(customer => customer.status === 'active').length;
        
        setStats({
          totalCustomers,
          totalCollections,
          pendingCollections,
          totalAmount
        });
      } else {
        setCustomers([]);
        setStats({
          totalCustomers: 0,
          totalCollections: 0,
          pendingCollections: 0,
          totalAmount: 0
        });
      }
      setLoading(false);
    });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('loggedInAgent');
    navigate('/agent-login');
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container-fluid">
          <div className="d-flex justify-content-between align-items-center py-3">
            <div className="d-flex align-items-center">
              <div className="rounded-circle me-3 d-flex align-items-center justify-content-center"
                   style={{ 
                     width: '50px', 
                     height: '50px', 
                     background: 'var(--primary-gradient)',
                     color: 'white'
                   }}>
                👨‍💼
              </div>
              <div>
                <h5 className="mb-0">Welcome, {agent?.agentName}</h5>
                <small className="text-muted">Route: {agent?.route} | Mobile: {agent?.mobileNumber}</small>
              </div>
            </div>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-outline-primary btn-sm"
                onClick={() => navigate('/')}
              >
                🏠 Main Dashboard
              </button>
              <button 
                className="btn btn-outline-danger btn-sm"
                onClick={handleLogout}
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-fluid p-4">
        {/* Stats Cards */}
        <div className="row mb-4">
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="stats-card">
              <div className="stats-icon" style={{ background: 'var(--primary-gradient)' }}>
                👥
              </div>
              <h3 className="stats-number">{stats.totalCustomers}</h3>
              <p className="stats-label">My Customers</p>
            </div>
          </div>
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="stats-card">
              <div className="stats-icon" style={{ background: 'var(--success-gradient)' }}>
                💰
              </div>
              <h3 className="stats-number">₹{stats.totalAmount.toLocaleString()}</h3>
              <p className="stats-label">Total Collections</p>
            </div>
          </div>
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="stats-card">
              <div className="stats-icon" style={{ background: 'var(--warning-gradient)' }}>
                📋
              </div>
              <h3 className="stats-number">{stats.pendingCollections}</h3>
              <p className="stats-label">Active Customers</p>
            </div>
          </div>
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="stats-card">
              <div className="stats-icon" style={{ background: 'var(--secondary-gradient)' }}>
                🎯
              </div>
              <h3 className="stats-number">{((stats.totalAmount / 100000) * 100).toFixed(1)}%</h3>
              <p className="stats-label">Collection Rate</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">🚀 Quick Actions</h6>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-lg-3 col-md-6 mb-3">
                    <button 
                      className="btn btn-outline-primary w-100 p-3"
                      onClick={() => navigate('/weekly-collections')}
                    >
                      <div className="mb-2" style={{ fontSize: '2rem' }}>📅</div>
                      <div>Weekly Collections</div>
                    </button>
                  </div>
                  <div className="col-lg-3 col-md-6 mb-3">
                    <button 
                      className="btn btn-outline-success w-100 p-3"
                      onClick={() => navigate('/add-customer')}
                    >
                      <div className="mb-2" style={{ fontSize: '2rem' }}>➕</div>
                      <div>Add Customer</div>
                    </button>
                  </div>
                  <div className="col-lg-3 col-md-6 mb-3">
                    <button 
                      className="btn btn-outline-info w-100 p-3"
                      onClick={() => navigate('/view-customers')}
                    >
                      <div className="mb-2" style={{ fontSize: '2rem' }}>👥</div>
                      <div>My Customers</div>
                    </button>
                  </div>
                  <div className="col-lg-3 col-md-6 mb-3">
                    <button 
                      className="btn btn-outline-warning w-100 p-3"
                      onClick={() => navigate('/reports')}
                    >
                      <div className="mb-2" style={{ fontSize: '2rem' }}>📊</div>
                      <div>Reports</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Customers */}
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h6 className="mb-0">👥 My Customers</h6>
                <span className="badge bg-primary">{customers.length} customers</span>
              </div>
              <div className="card-body p-0">
                {customers.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table mb-0">
                      <thead>
                        <tr>
                          <th>Customer Name</th>
                          <th>Village</th>
                          <th>Mobile</th>
                          <th>Total Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.slice(0, 10).map((customer) => (
                          <tr key={customer.id}>
                            <td className="fw-semibold">{customer.customerName}</td>
                            <td>{customer.village}</td>
                            <td>{customer.mobileNumber}</td>
                            <td className="fw-bold">₹{customer.totalAmount?.toLocaleString()}</td>
                            <td>
                              <span className={`badge ${customer.status === 'active' ? 'bg-success' : 'bg-warning'}`}>
                                {customer.status === 'active' ? '✅ Active' : '⏸️ Inactive'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center p-5">
                    <div style={{ fontSize: '3rem' }}>👥</div>
                    <h6 className="mt-3">No customers assigned yet</h6>
                    <p className="text-muted">Start by adding customers to your route</p>
                    <button 
                      className="btn btn-primary"
                      onClick={() => navigate('/add-customer')}
                    >
                      Add First Customer
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
