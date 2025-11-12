import { useState } from 'react';
import { runCompleteTest, displayDatabaseStructure } from '../utils/testFirebaseStructure.js';
import { createSampleData } from '../utils/sampleDataCreator.js';

const TestFirebaseStructure = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState('');
  const [structureDisplay, setStructureDisplay] = useState('');

  const handleRunTests = async () => {
    setIsLoading(true);
    setTestResults('');
    
    try {
      // Capture console output
      const originalLog = console.log;
      let output = '';
      
      console.log = (...args) => {
        output += args.join(' ') + '\n';
        originalLog(...args);
      };
      
      await runCompleteTest();
      
      // Restore console.log
      console.log = originalLog;
      
      setTestResults(output);
    } catch (error) {
      setTestResults(`Error running tests: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSampleData = async () => {
    setIsLoading(true);
    
    try {
      const originalLog = console.log;
      let output = '';
      
      console.log = (...args) => {
        output += args.join(' ') + '\n';
        originalLog(...args);
      };
      
      await createSampleData();
      
      console.log = originalLog;
      
      setTestResults(output);
    } catch (error) {
      setTestResults(`Error creating sample data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisplayStructure = async () => {
    setIsLoading(true);
    
    try {
      const originalLog = console.log;
      let output = '';
      
      console.log = (...args) => {
        output += args.join(' ') + '\n';
        originalLog(...args);
      };
      
      await displayDatabaseStructure();
      
      console.log = originalLog;
      
      setStructureDisplay(output);
    } catch (error) {
      setStructureDisplay(`Error displaying structure: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container-fluid p-4">
      <div className="row">
        <div className="col-12">
          <div className="card shadow-lg">
            <div className="card-header bg-gradient-primary text-white">
              <h4 className="mb-0">
                <i className="fas fa-database me-2"></i>
                Firebase Structure Testing
              </h4>
              <p className="mb-0 mt-2 opacity-75">
                Test and verify the nested Firebase Realtime Database structure
              </p>
            </div>
            
            <div className="card-body">
              {/* Control Buttons */}
              <div className="row mb-4">
                <div className="col-md-4 mb-2">
                  <button 
                    className="btn btn-success w-100"
                    onClick={handleCreateSampleData}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-plus me-2"></i>
                        Create Sample Data
                      </>
                    )}
                  </button>
                </div>
                
                <div className="col-md-4 mb-2">
                  <button 
                    className="btn btn-primary w-100"
                    onClick={handleRunTests}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Testing...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-play me-2"></i>
                        Run Complete Tests
                      </>
                    )}
                  </button>
                </div>
                
                <div className="col-md-4 mb-2">
                  <button 
                    className="btn btn-info w-100"
                    onClick={handleDisplayStructure}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Loading...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sitemap me-2"></i>
                        Display Structure
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Database Structure Info */}
              <div className="alert alert-info">
                <h5><i className="fas fa-info-circle me-2"></i>Expected Database Structure:</h5>
                <pre className="mb-0" style={{ fontSize: '0.9rem' }}>
{`bishi_collection/
│
└── agents/
    │
    ├── agent_001/
    │   ├── agentId
    │   ├── name
    │   ├── phone
    │   ├── password
    │   ├── route
    │   ├── createdAt
    │   │
    │   └── customers/
    │       │
    │       ├── cust_001/
    │       │   ├── customerId
    │       │   ├── name
    │       │   ├── phone
    │       │   ├── address
    │       │   ├── joinDate
    │       │   ├── monthlyDue
    │       │   ├── balance
    │       │   ├── status
    │       │   │
    │       │   └── transactions/
    │       │       └── txn_001/
    │       │           ├── transactionId
    │       │           ├── type
    │       │           ├── amount
    │       │           ├── date
    │       │           ├── mode
    │       │           └── remarks
    │       │
    │       └── cust_002/
    │           └── transactions/
    │
    └── agent_002/
        └── customers/
            └── transactions/`}
                </pre>
              </div>

              {/* Test Results */}
              {testResults && (
                <div className="row">
                  <div className="col-12">
                    <div className="card">
                      <div className="card-header bg-light">
                        <h5 className="mb-0">
                          <i className="fas fa-terminal me-2"></i>
                          Test Results
                        </h5>
                      </div>
                      <div className="card-body">
                        <pre 
                          className="bg-dark text-light p-3 rounded"
                          style={{ 
                            maxHeight: '400px', 
                            overflow: 'auto',
                            fontSize: '0.85rem',
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {testResults}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Structure Display */}
              {structureDisplay && (
                <div className="row mt-3">
                  <div className="col-12">
                    <div className="card">
                      <div className="card-header bg-light">
                        <h5 className="mb-0">
                          <i className="fas fa-sitemap me-2"></i>
                          Current Database Structure
                        </h5>
                      </div>
                      <div className="card-body">
                        <pre 
                          className="bg-dark text-light p-3 rounded"
                          style={{ 
                            maxHeight: '500px', 
                            overflow: 'auto',
                            fontSize: '0.8rem',
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {structureDisplay}
                        </pre>
                      </div>
                    </div>
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

export default TestFirebaseStructure;
