import { useEffect, useState } from "react";
import {
  FiUsers,
  FiUserCheck,
  FiDollarSign,
  FiCalendar
} from "react-icons/fi";
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
      Icon: FiUsers,
      color: "#007bff"
    },
    {
      title: "Total Customers",
      value: stats.totalCustomers,
      Icon: FiUserCheck,
      color: "#28a745"
    },
    {
      title: "Total Amount",
      value: `₹${stats.totalAmount.toLocaleString()}`,
      Icon: FiDollarSign,
      color: "#ffc107"
    },
    {
      title: "Total Collections",
      value: stats.totalCollections,
      Icon: FiCalendar,
      color: "#6f42c1"
    }
  ];

  // Removed Total Penalties and Total Bonuses cards

  return (
    <div className="container-fluid">
      {/* Welcome Section */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <h3 className="mb-2">Bhishi Collection Dashboard</h3>
              <p className="text-muted mb-0">Manage your collection business efficiently</p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="row mb-4">
        {statsCards.map((stat, index) => (
          <div key={index} className="col-lg-3 col-md-6 mb-3">
            <div className="card">
              <div className="card-body text-center">
                <div className="mb-3 d-inline-flex align-items-center justify-content-center rounded-circle" style={{ width: 56, height: 56, backgroundColor: `${stat.color}1a`, color: stat.color }}>
                  <stat.Icon size={28} />
                </div>
                <h4 className="mb-2">{stat.value}</h4>
                <p className="text-muted mb-0">{stat.title}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Transactions */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Recent Transactions</h5>
            </div>
            <div className="card-body">
              {recentTransactions.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <p>No recent transactions</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Agent</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTransactions.map((transaction, index) => (
                        <tr key={index}>
                          <td>
                            <span className="badge bg-secondary">
                              {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                            </span>
                          </td>
                          <td>₹{Number(transaction.amount).toLocaleString()}</td>
                          <td>{transaction.agentName}</td>
                          <td>{new Date(transaction.date).toLocaleDateString('en-GB')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
