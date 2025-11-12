import React, { useState, useEffect } from 'react';
import { 
  checkCurrentDatabase, 
  setupNestedStructureDemo,
  addCustomerWithTransactions,
  addTransactionToCustomer,
  getAgentCustomersWithTransactions
} from '../utils/quickDatabaseSetup';
import { checkDatabaseStructure, migrateToNestedStructure, createBackup } from '../utils/databaseMigration';

const DatabaseManager = () => {
  const [loading, setLoading] = useState(false);
  const [dbInfo, setDbInfo] = useState(null);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [customers, setCustomers] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkDatabase();
  }, []);

  const checkDatabase = async () => {
    setLoading(true);
    try {
      const info = await checkCurrentDatabase();
      setDbInfo(info);
      
      if (info.success && info.agentCount > 0) {
        setAgents(info.agentIds.map(id => ({ id, name: `Agent ${id.slice(-6)}` })));
        setMessage(`Found ${info.agentCount} agents in your database`);
      } else {
        setMessage('No agents found in database');
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
    setLoading(false);
  };

  const handleMigration = async () => {
    setLoading(true);
    setMessage('Starting migration...');
    
    try {
      // Create backup first
      const backup = await createBackup();
      if (backup.success) {
        setMessage('Backup created, starting migration...');
      }
      
      // Run migration
      const result = await migrateToNestedStructure();
      
      if (result.success) {
        setMessage(`✅ Migration successful! ${result.message}`);
        await checkDatabase(); // Refresh data
      } else {
        setMessage(`❌ Migration failed: ${result.message}`);
      }
    } catch (error) {
      setMessage(`❌ Migration error: ${error.message}`);
    }
    setLoading(false);
  };

  const handleDemoSetup = async () => {
    setLoading(true);
    setMessage('Setting up demo...');
    
    try {
      const result = await setupNestedStructureDemo();
      
      if (result.success) {
        setMessage(`✅ Demo setup complete! Customer balance: ₹${result.customerBalance}, Transactions: ${result.transactionCount}`);
        if (result.agentId) {
          setSelectedAgent(result.agentId);
          await loadCustomers(result.agentId);
        }
      } else {
        setMessage(`❌ Demo setup failed: ${result.message}`);
      }
    } catch (error) {
      setMessage(`❌ Demo error: ${error.message}`);
    }
    setLoading(false);
  };

  const loadCustomers = async (agentId) => {
    if (!agentId) return;
    
    setLoading(true);
    try {
      const customerList = await getAgentCustomersWithTransactions(agentId);
      setCustomers(customerList);
      setMessage(`Loaded ${customerList.length} customers for agent ${agentId.slice(-6)}`);
    } catch (error) {
      setMessage(`Error loading customers: ${error.message}`);
    }
    setLoading(false);
  };

  const addSampleCustomer = async () => {
    if (!selectedAgent) {
      setMessage('Please select an agent first');
      return;
    }

    setLoading(true);
    try {
      const customerData = {
        name: `Customer ${Date.now().toString().slice(-4)}`,
        phone: `98765${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        address: 'Sample Village, Sample Taluka',
        joinDate: new Date().toISOString().split('T')[0],
        monthlyDue: 1000 + Math.floor(Math.random() * 2000)
      };

      const customerId = await addCustomerWithTransactions(selectedAgent, customerData);
      
      // Add sample transaction
      await addTransactionToCustomer(selectedAgent, customerId, {
        type: 'deposit',
        amount: customerData.monthlyDue,
        date: new Date().toISOString().split('T')[0],
        mode: 'cash',
        remarks: 'Initial deposit'
      });

      setMessage(`✅ Added customer: ${customerData.name}`);
      await loadCustomers(selectedAgent);
    } catch (error) {
      setMessage(`❌ Error adding customer: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="container-fluid p-4">
      <div className="row">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header bg-gradient-primary text-white">
              <h4 className="mb-0">🗄️ Database Manager</h4>
              <small>Manage your Bishi Collection Firebase Database</small>
            </div>
            
            <div className="card-body">
              {/* Status Section */}
              <div className="row mb-4">
                <div className="col-12">
                  <div className="alert alert-info">
                    <h6>📊 Database Status</h6>
                    {dbInfo ? (
                      <div>
                        <p className="mb-1">
                          <strong>Agents:</strong> {dbInfo.agentCount || 0}
                        </p>
                        <p className="mb-1">
                          <strong>Database URL:</strong> bishi-collection-project-default-rtdb.firebaseio.com
                        </p>
                        <p className="mb-0">
                          <strong>Structure:</strong> {dbInfo.sampleAgent?.agentInfo ? 'Old Structure' : 'New Structure'}
                        </p>
                      </div>
                    ) : (
                      <p className="mb-0">Loading database information...</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="row mb-4">
                <div className="col-md-4 mb-2">
                  <button 
                    className="btn btn-primary w-100" 
                    onClick={checkDatabase}
                    disabled={loading}
                  >
                    🔍 Check Database
                  </button>
                </div>
                <div className="col-md-4 mb-2">
                  <button 
                    className="btn btn-warning w-100" 
                    onClick={handleMigration}
                    disabled={loading || !dbInfo?.agentCount}
                  >
                    🔄 Migrate to Nested Structure
                  </button>
                </div>
                <div className="col-md-4 mb-2">
                  <button 
                    className="btn btn-success w-100" 
                    onClick={handleDemoSetup}
                    disabled={loading || !dbInfo?.agentCount}
                  >
                    🚀 Setup Demo Data
                  </button>
                </div>
              </div>

              {/* Agent Selection */}
              {agents.length > 0 && (
                <div className="row mb-4">
                  <div className="col-md-6">
                    <label className="form-label">Select Agent:</label>
                    <select 
                      className="form-select"
                      value={selectedAgent}
                      onChange={(e) => {
                        setSelectedAgent(e.target.value);
                        loadCustomers(e.target.value);
                      }}
                    >
                      <option value="">Choose an agent...</option>
                      {agents.map(agent => (
                        <option key={agent.id} value={agent.id}>
                          Agent {agent.id.slice(-6)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">&nbsp;</label>
                    <button 
                      className="btn btn-outline-primary w-100"
                      onClick={addSampleCustomer}
                      disabled={loading || !selectedAgent}
                    >
                      👤 Add Sample Customer
                    </button>
                  </div>
                </div>
              )}

              {/* Customers List */}
              {customers.length > 0 && (
                <div className="row mb-4">
                  <div className="col-12">
                    <h6>👥 Customers for Selected Agent</h6>
                    <div className="table-responsive">
                      <table className="table table-sm table-striped">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Balance</th>
                            <th>Transactions</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customers.map(customer => (
                            <tr key={customer.id}>
                              <td>{customer.name}</td>
                              <td>{customer.phone}</td>
                              <td>₹{customer.balance || 0}</td>
                              <td>{customer.transactionCount}</td>
                              <td>
                                <span className={`badge ${customer.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                                  {customer.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Message Display */}
              {message && (
                <div className="row">
                  <div className="col-12">
                    <div className={`alert ${message.includes('❌') ? 'alert-danger' : message.includes('✅') ? 'alert-success' : 'alert-info'}`}>
                      {message}
                    </div>
                  </div>
                </div>
              )}

              {/* Loading Indicator */}
              {loading && (
                <div className="row">
                  <div className="col-12 text-center">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Processing...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseManager;
