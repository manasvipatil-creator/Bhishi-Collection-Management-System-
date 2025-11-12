import { useEffect, useState } from "react";
import { ref, get } from "firebase/database";
import { db } from "../firebase";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalAgents: 0,
    totalCustomers: 0,
    totalCollections: 0,
    totalAmount: 0,
    pendingCollections: 0,
    totalPenalties: 0,
    totalBonuses: 0,
    totalBalance: 0
  });

  const [firebaseStatus, setFirebaseStatus] = useState("connecting");
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setFirebaseStatus("connecting");
      
      // Fetch all agents directly from Firebase
      const agentsRef = ref(db, "agents");
      const agentsSnapshot = await get(agentsRef);
      
      let totalAgents = 0;
      let totalCustomers = 0;
      let totalBalance = 0;
      let allTransactions = [];
      
      if (agentsSnapshot.exists()) {
        const agentsData = agentsSnapshot.val();
        totalAgents = Object.keys(agentsData).length;
        
        // Loop through each agent
        Object.entries(agentsData).forEach(([agentPhone, agentData]) => {
          const customers = agentData.customers || {};
          const customersArray = Object.values(customers);
          
          // Count customers and calculate total balance
          totalCustomers += customersArray.length;
          customersArray.forEach(customer => {
            totalBalance += Number(customer.principalAmount || 0);
          });
          
          // Get transactions for this agent
          const transactions = agentData.transactions || {};
          Object.entries(transactions).forEach(([customerPhone, customerTransactions]) => {
            Object.entries(customerTransactions || {}).forEach(([txnId, txn]) => {
              allTransactions.push({
                id: txnId,
                ...txn,
                agentPhone,
                customerPhone,
                agentName: agentData.agentInfo?.agentName || 'Unknown',
                // Support both old and new field formats
                amount: txn.amount || txn.amountDeposited || 0,
                date: txn.depositDate || txn.date || '',
                type: txn.type || 'deposit',
                customerName: 'Customer', // We'd need to look this up from customers
                timestamp: txn.timestamp || (txn.depositDate ? new Date(`${txn.depositDate} ${txn.depositTime || '00:00:00'}`).getTime() : Date.now())
              });
            });
          });
        });
      }
      
      // Sort transactions by timestamp (newest first)
      allTransactions.sort((a, b) => b.timestamp - a.timestamp);
      
      // Calculate transaction statistics
      const totalDeposits = allTransactions
        .filter(t => t.type === 'deposit')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      
      const totalPenalties = allTransactions
        .filter(t => t.type === 'penalty')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      
      const totalBonuses = allTransactions
        .filter(t => t.type === 'bonus')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      setStats({
        totalAgents,
        totalCustomers,
        totalCollections: allTransactions.length,
        totalAmount: totalDeposits,
        totalBalance,
        totalPenalties,
        totalBonuses,
        pendingCollections: 0
      });

      // Get recent 5 transactions
      setRecentTransactions(allTransactions.slice(0, 5));
      
      setFirebaseStatus("connected");
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setFirebaseStatus("error");
    }
  };

  const statsCards = [
    {
      title: "Total Agents",
      value: stats.totalAgents,
      icon: "👨‍💼",
      gradient: "var(--primary-gradient)",
      change: "+5%",
      changeType: "positive"
    },
    {
      title: "Total Customers",
      value: stats.totalCustomers,
      icon: "👥",
      gradient: "var(--success-gradient)",
      change: "+12%",
      changeType: "positive"
    },
    {
      title: "Total Submitted",
      value: `₹${stats.totalAmount.toLocaleString()}`,
      icon: "💰",
      gradient: "var(--warning-gradient)",
      change: "+15%",
      changeType: "positive"
    },
    {
      title: "Weekly Collections",
      value: stats.totalCollections,
      icon: "📅",
      gradient: "var(--secondary-gradient)",
      change: "+8%",
      changeType: "positive"
    }
  ];

  // Removed Total Penalties and Total Bonuses cards

  return (
    <div className="container-fluid fade-in-up">
      {/* Welcome Section */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0" style={{ background: 'var(--primary-gradient)', color: 'white' }}>
            <div className="card-body p-4">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h2 className="mb-2 fw-bold">Welcome to Bishi Collection Dashboard</h2>
                  <p className="mb-0 opacity-75">
                    Manage your collection business efficiently with our comprehensive management system.
                  </p>
                </div>
                <div className="col-md-4 text-end">
                  <div style={{ fontSize: '4rem', opacity: 0.3 }}>💎</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="row mb-4">
        {statsCards.map((stat, index) => (
          <div key={index} className="col-lg-3 col-md-6 mb-3">
            <div className="stats-card">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="stats-icon" style={{ background: stat.gradient }}>
                  {stat.icon}
                </div>
                <span className={`badge ${stat.changeType === 'positive' ? 'bg-success' : 'bg-danger'}`}>
                  {stat.change}
                </span>
              </div>
              <h3 className="stats-number">{stat.value}</h3>
              <p className="stats-label">{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity & System Status */}
      <div className="row">
        {/* Recent Activity */}
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Recent Transactions</h6>
            </div>
            <div className="card-body">
              {recentTransactions.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <p>No recent transactions</p>
                </div>
              ) : (
                recentTransactions.map((transaction, index) => {
                  const getTransactionIcon = (type) => {
                    switch (type) {
                      case 'deposit': return '💰';
                      case 'withdrawal': return '💸';
                      case 'penalty': return '⚠️';
                      case 'bonus': return '🎁';
                      default: return '📝';
                    }
                  };

                  const getTransactionGradient = (type) => {
                    switch (type) {
                      case 'deposit': return 'var(--success-gradient)';
                      case 'withdrawal': return 'var(--danger-color)';
                      case 'penalty': return 'var(--warning-gradient)';
                      case 'bonus': return 'var(--primary-gradient)';
                      default: return 'var(--secondary-gradient)';
                    }
                  };

                  return (
                    <div key={index} className={`d-flex align-items-center ${index < recentTransactions.length - 1 ? 'mb-3' : ''} p-3 rounded`}
                      style={{ background: 'var(--bg-primary)' }}>
                      <div className="me-3">
                        <div className="rounded-circle d-flex align-items-center justify-content-center"
                          style={{ width: '40px', height: '40px', background: getTransactionGradient(transaction.type) }}>
                          <span style={{ fontSize: '1rem' }}>{getTransactionIcon(transaction.type)}</span>
                        </div>
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="mb-1">{transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} - ₹{Number(transaction.amount).toLocaleString()}</h6>
                        <small className="text-muted">{transaction.customerName} (Agent: {transaction.agentName})</small>
                      </div>
                      <small className="text-muted">{new Date(transaction.date).toLocaleDateString()}</small>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

       
      </div>
    </div>
  );
}
