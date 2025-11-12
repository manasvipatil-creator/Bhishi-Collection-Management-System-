import React, { useState } from 'react';
import { 
  createPerfectStructure, 
  verifyStructure, 
  addMoreSampleData 
} from '../utils/perfectStructureCreator';

const PerfectStructureManager = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [structureInfo, setStructureInfo] = useState(null);

  const handleCreateStructure = async () => {
    setLoading(true);
    setMessage('Creating perfect bishi_collection structure...');

    try {
      const result = await createPerfectStructure();
      
      if (result.success) {
        setStructureInfo(result.structure);
        setMessage(`✅ Perfect structure created successfully!
        
📊 Structure Summary:
• Root: ${result.structure.root}
• Agents: ${result.structure.agents}
• Total Customers: ${result.structure.totalCustomers}
• Total Transactions: ${result.structure.totalTransactions}

👥 Agents Created:
${result.structure.agents_details.map(agent => 
  `• ${agent.name} (${agent.id}) - ${agent.customers} customers, ${agent.transactions} transactions`
).join('\n')}`);
      } else {
        setMessage(`❌ Error creating structure: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    }

    setLoading(false);
  };

  const handleVerifyStructure = async () => {
    setLoading(true);
    setMessage('Verifying database structure...');

    try {
      const result = await verifyStructure();
      
      if (result.success) {
        setMessage(`✅ Structure verification completed!
        
📈 Verification Results:
• Agents Found: ${result.verification.agents}
• Customers Found: ${result.verification.customers}
• Transactions Found: ${result.verification.transactions}

Check console for detailed verification logs.`);
      } else {
        setMessage(`❌ Verification error: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    }

    setLoading(false);
  };

  const handleAddSampleData = async () => {
    setLoading(true);
    setMessage('Adding more sample data...');

    try {
      const result = await addMoreSampleData();
      
      if (result.success) {
        setMessage(`✅ ${result.message}
        
🆕 New Data Added:
• Agent ID: ${result.newAgent}
• Customer ID: ${result.newCustomer}
• Additional transactions created`);
      } else {
        setMessage(`❌ Error adding sample data: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    }

    setLoading(false);
  };

  return (
    <div className="container-fluid p-4">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="card shadow-sm">
            <div className="card-header bg-gradient-primary text-white">
              <h4 className="mb-0">🏗️ Perfect Structure Manager</h4>
              <small>Create and manage the exact bishi_collection database structure</small>
            </div>
            
            <div className="card-body">
              {/* Structure Diagram */}
              <div className="row mb-4">
                <div className="col-12">
                  <h6 className="text-primary mb-3">📋 Target Structure</h6>
                  <div className="bg-light p-3 rounded">
                    <pre className="mb-0" style={{ fontSize: '12px', lineHeight: '1.4' }}>
{`bishi_collection/
└── agents/
    ├── agent_001/
    │   ├── agentId, name, phone, password, route, createdAt
    │   └── customers/
    │       ├── cust_001/
    │       │   ├── customerId, name, phone, address, joinDate, monthlyDue, balance, status
    │       │   └── transactions/
    │       │       ├── txn_001/ (transactionId, type, amount, date, mode, remarks)
    │       │       └── txn_002/ (transactionId, type, amount, date, mode, remarks)
    │       └── cust_002/
    │           ├── customer data...
    │           └── transactions/
    └── agent_002/
        └── customers/
            └── transactions/`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="row mb-4">
                <div className="col-md-4 mb-2">
                  <button 
                    className="btn btn-success w-100 py-2" 
                    onClick={handleCreateStructure}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Creating...
                      </>
                    ) : (
                      <>
                        🚀 Create Perfect Structure
                      </>
                    )}
                  </button>
                </div>
                
                <div className="col-md-4 mb-2">
                  <button 
                    className="btn btn-info w-100 py-2" 
                    onClick={handleVerifyStructure}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Verifying...
                      </>
                    ) : (
                      <>
                        🔍 Verify Structure
                      </>
                    )}
                  </button>
                </div>
                
                <div className="col-md-4 mb-2">
                  <button 
                    className="btn btn-warning w-100 py-2" 
                    onClick={handleAddSampleData}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Adding...
                      </>
                    ) : (
                      <>
                        📝 Add More Data
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Structure Info Display */}
              {structureInfo && (
                <div className="row mb-4">
                  <div className="col-12">
                    <h6 className="text-success mb-3">✅ Created Structure Info</h6>
                    <div className="row">
                      <div className="col-md-3">
                        <div className="card bg-primary text-white">
                          <div className="card-body text-center">
                            <h5 className="card-title">{structureInfo.agents}</h5>
                            <p className="card-text">Agents</p>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card bg-success text-white">
                          <div className="card-body text-center">
                            <h5 className="card-title">{structureInfo.totalCustomers}</h5>
                            <p className="card-text">Customers</p>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card bg-info text-white">
                          <div className="card-body text-center">
                            <h5 className="card-title">{structureInfo.totalTransactions}</h5>
                            <p className="card-text">Transactions</p>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="card bg-warning text-white">
                          <div className="card-body text-center">
                            <h5 className="card-title">{structureInfo.root}</h5>
                            <p className="card-text">Root Node</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Message Display */}
              {message && (
                <div className="row mb-4">
                  <div className="col-12">
                    <div className={`alert ${message.includes('❌') ? 'alert-danger' : 'alert-success'}`}>
                      <pre className="mb-0" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                        {message}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="row">
                <div className="col-12">
                  <div className="alert alert-info">
                    <h6>📖 Instructions</h6>
                    <ol className="mb-0">
                      <li><strong>Create Perfect Structure:</strong> Creates the complete bishi_collection structure with sample agents, customers, and transactions</li>
                      <li><strong>Verify Structure:</strong> Checks the created structure and displays detailed information in console</li>
                      <li><strong>Add More Data:</strong> Adds additional sample agents and customers to test the system</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Sample Data Info */}
              <div className="row mt-3">
                <div className="col-12">
                  <div className="alert alert-light">
                    <h6>📊 Sample Data Included</h6>
                    <div className="row">
                      <div className="col-md-6">
                        <strong>Agent 1:</strong> Amit Sharma
                        <ul className="small mb-2">
                          <li>Customer 1: Rajesh Patil (4 transactions)</li>
                          <li>Customer 2: Priya Desai (3 transactions)</li>
                        </ul>
                      </div>
                      <div className="col-md-6">
                        <strong>Agent 2:</strong> Sunita Kumar
                        <ul className="small mb-0">
                          <li>Customer 1: Vikram Singh (3 transactions)</li>
                          <li>Customer 2: Meera Joshi (1 transaction)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerfectStructureManager;
