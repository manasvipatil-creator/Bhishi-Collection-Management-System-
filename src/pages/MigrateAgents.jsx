import React, { useState } from "react";
import { migrateAgentRoutes, migrateAllAgents } from "../utils/migrateAgentRoutes";

export default function MigrateAgents() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [specificPhone, setSpecificPhone] = useState("8978988789");

  const handleMigrateSpecific = async () => {
    if (!specificPhone) {
      alert("Please enter a phone number");
      return;
    }
    
    setLoading(true);
    setResult(null);
    
    try {
      const migrationResult = await migrateAgentRoutes(specificPhone);
      setResult(migrationResult);
    } catch (error) {
      setResult({ success: false, message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateAll = async () => {
    if (!window.confirm("Are you sure you want to migrate all agents? This will update all agent routes to the new format.")) {
      return;
    }
    
    setLoading(true);
    setResult(null);
    
    try {
      const migrationResult = await migrateAllAgents();
      setResult(migrationResult);
    } catch (error) {
      setResult({ success: false, message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid fade-in-up">
      <div className="card mb-4">
        <div className="card-body">
          <h4 className="mb-0">🔄 Migrate Agent Routes</h4>
          <small className="text-muted">
            Convert agent routes from string array to structured object format
          </small>
        </div>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Migrate Specific Agent</h6>
            </div>
            <div className="card-body">
              <p className="text-muted">
                Migrate routes for a specific agent by phone number.
              </p>
              
              <div className="mb-3">
                <label className="form-label">Agent Phone Number</label>
                <input
                  type="text"
                  className="form-control"
                  value={specificPhone}
                  onChange={(e) => setSpecificPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
              
              <button
                className="btn btn-primary"
                onClick={handleMigrateSpecific}
                disabled={loading}
              >
                {loading ? "Migrating..." : "Migrate This Agent"}
              </button>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Migrate All Agents</h6>
            </div>
            <div className="card-body">
              <p className="text-muted">
                Migrate routes for all agents in the database.
              </p>
              
              <div className="alert alert-warning">
                <small>
                  ⚠️ This will update all agents. Make sure you have a backup before proceeding.
                </small>
              </div>
              
              <button
                className="btn btn-warning"
                onClick={handleMigrateAll}
                disabled={loading}
              >
                {loading ? "Migrating..." : "Migrate All Agents"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {result && (
        <div className="card mt-4">
          <div className="card-header">
            <h6 className="mb-0">Migration Result</h6>
          </div>
          <div className="card-body">
            {result.success ? (
              <div className="alert alert-success">
                <h6>✅ {result.message}</h6>
                
                {result.oldRoutes && (
                  <div className="mt-3">
                    <strong>Old Format:</strong>
                    <pre className="bg-light p-2 mt-2">
                      {JSON.stringify(result.oldRoutes, null, 2)}
                    </pre>
                  </div>
                )}
                
                {result.newRoutes && (
                  <div className="mt-3">
                    <strong>New Format:</strong>
                    <pre className="bg-light p-2 mt-2">
                      {JSON.stringify(result.newRoutes, null, 2)}
                    </pre>
                  </div>
                )}
                
                {result.structureMigrated && (
                  <div className="mt-3">
                    <div className="alert alert-info">
                      ✅ Structure migrated from <code>/agents/{'{phone}'}/agentInfo</code> to <code>/agents/{'{phone}'}</code>
                    </div>
                  </div>
                )}
                
                {result.results && (
                  <div className="mt-3">
                    <strong>Migration Results:</strong>
                    <div className="table-responsive mt-2">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Phone</th>
                            <th>Agent Name</th>
                            <th>Status</th>
                            <th>Message</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.results.map((r, idx) => (
                            <tr key={idx}>
                              <td>{r.phone}</td>
                              <td>{r.agentName}</td>
                              <td>
                                <span className={`badge ${r.success ? 'bg-success' : 'bg-danger'}`}>
                                  {r.success ? '✓' : '✗'}
                                </span>
                              </td>
                              <td>{r.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="alert alert-danger">
                <h6>❌ Migration Failed</h6>
                <p className="mb-0">{result.message}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card mt-4">
        <div className="card-header">
          <h6 className="mb-0">ℹ️ About Route Migration</h6>
        </div>
        <div className="card-body">
          <p><strong>Old Format (String Array):</strong></p>
          <pre className="bg-light p-2">
{`["Mumbai", "Palus", "Pune"]`}
          </pre>
          
          <p className="mt-3"><strong>New Format (Object Array with Villages):</strong></p>
          <pre className="bg-light p-2">
{`[
  { "name": "Mumbai", "villages": ["Andheri", "Bandra"] },
  { "name": "Palus", "villages": ["Village1", "Village2"] },
  { "name": "Pune", "villages": ["Kothrud", "Shivajinagar"] }
]`}
          </pre>
          
          <div className="alert alert-info mt-3">
            <small>
              <strong>What this migration does:</strong><br/>
              1. Converts routes from string array to object array with villages<br/>
              2. Migrates structure from <code>/agents/{'{phone}'}/agentInfo</code> to <code>/agents/{'{phone}'}</code><br/>
              3. Automatically matches route names with existing routes in the database<br/>
              4. Preserves all existing agent data (customers, transactions, etc.)
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
