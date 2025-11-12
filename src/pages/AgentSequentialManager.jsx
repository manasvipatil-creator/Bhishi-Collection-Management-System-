// import React, { useState, useEffect } from "react";
// import { ref, get } from "firebase/database";
// import { db } from "../firebase";
// import { convertAgentsToSequentialIds, getAllSequentialAgents } from "../utils/agentSequentialId";

// export default function AgentSequentialManager() {
//   const [loading, setLoading] = useState(false);
//   const [currentAgents, setCurrentAgents] = useState([]);
//   const [conversionResult, setConversionResult] = useState(null);
//   const [showPreview, setShowPreview] = useState(false);

//   useEffect(() => {
//     loadCurrentAgents();
//   }, []);

//   const loadCurrentAgents = async () => {
//     try {
//       const agentsRef = ref(db, 'agents');
//       const snapshot = await get(agentsRef);
      
//       if (snapshot.exists()) {
//         const agents = snapshot.val();
//         const agentsArray = Object.entries(agents).map(([key, value]) => ({
//           currentId: key,
//           agentName: value.agentInfo?.agentName || "Unknown",
//           mobileNumber: value.agentInfo?.mobileNumber || "N/A",
//           route: value.agentInfo?.route || "N/A",
//           isSequential: !isNaN(parseInt(key)),
//           customersCount: value.customers ? Object.keys(value.customers).length : 0
//         }));
//         setCurrentAgents(agentsArray);
//       }
//     } catch (error) {
//       console.error("Error loading agents:", error);
//     }
//   };

//   const handleConversion = async () => {
//     if (!window.confirm("This will convert all agents to use sequential IDs (1, 2, 3...). A backup will be created. Continue?")) {
//       return;
//     }

//     setLoading(true);
//     try {
//       const result = await convertAgentsToSequentialIds();
//       setConversionResult(result);
      
//       if (result.success) {
//         alert("Agents converted to sequential IDs successfully!");
//         await loadCurrentAgents(); // Reload to show updated structure
//       } else {
//         alert("Error: " + result.message);
//       }
//     } catch (error) {
//       console.error("Error during conversion:", error);
//       alert("Error during conversion: " + error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const previewNewStructure = () => {
//     setShowPreview(!showPreview);
//   };

//   const generatePreviewId = (index) => {
//     return (index + 1).toString();
//   };

//   return (
//     <div className="container-fluid fade-in-up">
//       {/* Header */}
//       <div className="card border-0 mb-4" style={{ background: 'var(--secondary-gradient)', color: 'white' }}>
//         <div className="card-body p-4">
//           <div className="d-flex align-items-center">
//             <div className="me-3">
//               <div className="rounded-circle d-flex align-items-center justify-content-center"
//                    style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.2)' }}>
//                 <span style={{ fontSize: '1.5rem' }}>🔢</span>
//               </div>
//             </div>
//             <div>
//               <h4 className="mb-1 fw-bold">Agent Sequential ID Manager</h4>
//               <p className="mb-0 opacity-75">Convert agents to simple sequential IDs like 1, 2, 3, 4...</p>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Current Status */}
//       <div className="row mb-4">
//         <div className="col-md-4">
//           <div className="stats-card">
//             <div className="stats-icon" style={{ background: 'var(--primary-gradient)' }}>
//               👥
//             </div>
//             <h3 className="stats-number">{currentAgents.length}</h3>
//             <p className="stats-label">Total Agents</p>
//           </div>
//         </div>
//         <div className="col-md-4">
//           <div className="stats-card">
//             <div className="stats-icon" style={{ background: 'var(--success-gradient)' }}>
//               🔢
//             </div>
//             <h3 className="stats-number">{currentAgents.filter(a => a.isSequential).length}</h3>
//             <p className="stats-label">Sequential IDs</p>
//           </div>
//         </div>
//         <div className="col-md-4">
//           <div className="stats-card">
//             <div className="stats-icon" style={{ background: 'var(--warning-gradient)' }}>
//               🔤
//             </div>
//             <h3 className="stats-number">{currentAgents.filter(a => !a.isSequential).length}</h3>
//             <p className="stats-label">Need Conversion</p>
//           </div>
//         </div>
//       </div>

//       {/* Actions */}
//       <div className="card mb-4">
//         <div className="card-header">
//           <h6 className="mb-0">Actions</h6>
//         </div>
//         <div className="card-body">
//           <div className="d-flex gap-3">
//             <button
//               className="btn btn-info"
//               onClick={previewNewStructure}
//               disabled={loading}
//             >
//               <span className="me-2">👁️</span>
//               {showPreview ? 'Hide Preview' : 'Preview Sequential Structure'}
//             </button>
//             <button
//               className="btn btn-warning"
//               onClick={handleConversion}
//               disabled={loading || currentAgents.filter(a => !a.isSequential).length === 0}
//             >
//               {loading ? (
//                 <>
//                   <div className="spinner-border spinner-border-sm me-2" role="status">
//                     <span className="visually-hidden">Loading...</span>
//                   </div>
//                   Converting...
//                 </>
//               ) : (
//                 <>
//                   <span className="me-2">🔢</span>
//                   Convert to Sequential IDs
//                 </>
//               )}
//             </button>
//             <button
//               className="btn btn-outline-secondary"
//               onClick={loadCurrentAgents}
//               disabled={loading}
//             >
//               <span className="me-2">🔄</span>
//               Refresh
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Preview */}
//       {showPreview && (
//         <div className="card mb-4">
//           <div className="card-header">
//             <h6 className="mb-0">Preview: Sequential Agent ID Structure</h6>
//           </div>
//           <div className="card-body p-0">
//             <div className="table-responsive">
//               <table className="table mb-0">
//                 <thead>
//                   <tr>
//                     <th>Current Agent ID</th>
//                     <th>Agent Name</th>
//                     <th>Customers</th>
//                     <th>New Sequential ID</th>
//                     <th>Status</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {currentAgents.map((agent, index) => (
//                     <tr key={index}>
//                       <td className="font-monospace">{agent.currentId}</td>
//                       <td>{agent.agentName}</td>
//                       <td>{agent.customersCount} customers</td>
//                       <td className="fw-bold text-primary">
//                         {agent.isSequential ? agent.currentId : generatePreviewId(index)}
//                       </td>
//                       <td>
//                         {agent.isSequential ? (
//                           <span className="badge bg-success">✅ Already Sequential</span>
//                         ) : (
//                           <span className="badge bg-warning">🔄 Will Convert</span>
//                         )}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Current Agents */}
//       <div className="card mb-4">
//         <div className="card-header">
//           <h6 className="mb-0">Current Agents in Database</h6>
//         </div>
//         <div className="card-body p-0">
//           <div className="table-responsive">
//             <table className="table mb-0">
//               <thead>
//                 <tr>
//                   <th>Agent ID</th>
//                   <th>Agent Name</th>
//                   <th>Mobile Number</th>
//                   <th>Route</th>
//                   <th>Customers</th>
//                   <th>Status</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {currentAgents.length === 0 ? (
//                   <tr>
//                     <td colSpan="6" className="text-center py-4">
//                       <div className="text-muted">
//                         <span style={{ fontSize: '2rem' }}>📭</span>
//                         <p className="mt-2">No agents found in database</p>
//                       </div>
//                     </td>
//                   </tr>
//                 ) : (
//                   currentAgents.map((agent, index) => (
//                     <tr key={index}>
//                       <td className="font-monospace fw-bold">{agent.currentId}</td>
//                       <td>{agent.agentName}</td>
//                       <td>{agent.mobileNumber}</td>
//                       <td>{agent.route}</td>
//                       <td>{agent.customersCount}</td>
//                       <td>
//                         {agent.isSequential ? (
//                           <span className="badge bg-success">🔢 Sequential</span>
//                         ) : (
//                           <span className="badge bg-warning">🔤 Custom ID</span>
//                         )}
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>

//       {/* Result */}
//       {conversionResult && (
//         <div className={`alert ${conversionResult.success ? 'alert-success' : 'alert-danger'}`}>
//           <h6 className="mb-2">
//             {conversionResult.success ? '✅ Success!' : '❌ Error!'}
//           </h6>
//           <p className="mb-0">{conversionResult.message}</p>
//           {conversionResult.conversionMap && (
//             <div className="mt-3">
//               <small>Conversion Details:</small>
//               <ul className="mb-0 mt-1">
//                 {conversionResult.conversionMap.map((conversion, index) => (
//                   <li key={index}>
//                     <small>
//                       {conversion.agentName}: {conversion.originalId} → {conversion.newId}
//                       {conversion.status === 'converted' && ' ✅'}
//                     </small>
//                   </li>
//                 ))}
//               </ul>
//             </div>
//           )}
//         </div>
//       )}

//       {/* Instructions */}
//       <div className="card">
//         <div className="card-header">
//           <h6 className="mb-0">📋 Instructions</h6>
//         </div>
//         <div className="card-body">
//           <div className="row">
//             <div className="col-md-6">
//               <h6>What this tool does:</h6>
//               <ul>
//                 <li>Converts agent IDs like <code>AGTMAY8746</code> to simple numbers like <code>1</code></li>
//                 <li>Maintains all existing data (customers, transactions, etc.)</li>
//                 <li>Updates customer records to reference new agent IDs</li>
//                 <li>Creates a backup before making changes</li>
//               </ul>
//             </div>
//             <div className="col-md-6">
//               <h6>Result Structure:</h6>
//               <pre className="bg-light p-2 rounded small">
// {`agents/
// ├── 1/
// │   ├── agentInfo/ (Manasvi)
// │   └── customers/
// │       ├── 1/ (Rajesh Kumar)
// │       ├── 2/ (Priya Sharma)
// │       └── 3/ (Amit Patel)
// ├── 2/
// │   └── agentInfo/ (Next Agent)
// └── 3/
//     └── agentInfo/ (Another Agent)`}
//               </pre>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
