// import React, { useState, useEffect } from "react";
// import { ref, get } from "firebase/database";
// import { db } from "../firebase";
// import { restructureAgentsWithIds, getAllAgentsWithIds } from "../utils/agentIdRestructure";

// export default function AgentIdManager() {
//   const [loading, setLoading] = useState(false);
//   const [currentAgents, setCurrentAgents] = useState([]);
//   const [restructureResult, setRestructureResult] = useState(null);
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
//           firebaseKey: key,
//           agentName: value.agentInfo?.agentName || "Unknown",
//           mobileNumber: value.agentInfo?.mobileNumber || "N/A",
//           route: value.agentInfo?.route || "N/A",
//           hasCustomId: !!value.agentInfo?.agentId
//         }));
//         setCurrentAgents(agentsArray);
//       }
//     } catch (error) {
//       console.error("Error loading agents:", error);
//     }
//   };

//   const handleRestructure = async () => {
//     if (!window.confirm("This will restructure all agents to use proper agent IDs. A backup will be created. Continue?")) {
//       return;
//     }

//     setLoading(true);
//     try {
//       const result = await restructureAgentsWithIds();
//       setRestructureResult(result);
      
//       if (result.success) {
//         alert("Agents restructured successfully!");
//         await loadCurrentAgents(); // Reload to show updated structure
//       } else {
//         alert("Error: " + result.message);
//       }
//     } catch (error) {
//       console.error("Error during restructuring:", error);
//       alert("Error during restructuring: " + error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const previewNewStructure = () => {
//     setShowPreview(!showPreview);
//   };

//   const generatePreviewId = (agentName, mobileNumber) => {
//     const namePrefix = agentName.replace(/\s+/g, '').substring(0, 3).toUpperCase();
//     const mobileSuffix = mobileNumber.slice(-4);
//     return `AGT${namePrefix}${mobileSuffix}`;
//   };

//   return (
//     <div className="container-fluid fade-in-up">
//       {/* Header */}
//       <div className="card border-0 mb-4" style={{ background: 'var(--warning-gradient)', color: 'white' }}>
//         <div className="card-body p-4">
//           <div className="d-flex align-items-center">
//             <div className="me-3">
//               <div className="rounded-circle d-flex align-items-center justify-content-center"
//                    style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.2)' }}>
//                 <span style={{ fontSize: '1.5rem' }}>🔧</span>
//               </div>
//             </div>
//             <div>
//               <h4 className="mb-1 fw-bold">Agent ID Manager</h4>
//               <p className="mb-0 opacity-75">Restructure agents to use proper agent IDs as database keys</p>
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
//               ✅
//             </div>
//             <h3 className="stats-number">{currentAgents.filter(a => a.hasCustomId).length}</h3>
//             <p className="stats-label">With Custom IDs</p>
//           </div>
//         </div>
//         <div className="col-md-4">
//           <div className="stats-card">
//             <div className="stats-icon" style={{ background: 'var(--warning-gradient)' }}>
//               ⚠️
//             </div>
//             <h3 className="stats-number">{currentAgents.filter(a => !a.hasCustomId).length}</h3>
//             <p className="stats-label">Need Restructuring</p>
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
//               {showPreview ? 'Hide Preview' : 'Preview New Structure'}
//             </button>
//             <button
//               className="btn btn-warning"
//               onClick={handleRestructure}
//               disabled={loading || currentAgents.filter(a => !a.hasCustomId).length === 0}
//             >
//               {loading ? (
//                 <>
//                   <div className="spinner-border spinner-border-sm me-2" role="status">
//                     <span className="visually-hidden">Loading...</span>
//                   </div>
//                   Restructuring...
//                 </>
//               ) : (
//                 <>
//                   <span className="me-2">🔧</span>
//                   Restructure Agents
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
//             <h6 className="mb-0">Preview: New Agent ID Structure</h6>
//           </div>
//           <div className="card-body p-0">
//             <div className="table-responsive">
//               <table className="table mb-0">
//                 <thead>
//                   <tr>
//                     <th>Current Firebase Key</th>
//                     <th>Agent Name</th>
//                     <th>Mobile Number</th>
//                     <th>New Agent ID</th>
//                     <th>Status</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {currentAgents.map((agent, index) => (
//                     <tr key={index}>
//                       <td className="font-monospace">{agent.firebaseKey}</td>
//                       <td>{agent.agentName}</td>
//                       <td>{agent.mobileNumber}</td>
//                       <td className="fw-bold text-primary">
//                         {generatePreviewId(agent.agentName, agent.mobileNumber)}
//                       </td>
//                       <td>
//                         {agent.hasCustomId ? (
//                           <span className="badge bg-success">✅ Already has ID</span>
//                         ) : (
//                           <span className="badge bg-warning">⚠️ Needs restructuring</span>
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
//                   <th>Firebase Key</th>
//                   <th>Agent Name</th>
//                   <th>Mobile Number</th>
//                   <th>Route</th>
//                   <th>Status</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {currentAgents.length === 0 ? (
//                   <tr>
//                     <td colSpan="5" className="text-center py-4">
//                       <div className="text-muted">
//                         <span style={{ fontSize: '2rem' }}>📭</span>
//                         <p className="mt-2">No agents found in database</p>
//                       </div>
//                     </td>
//                   </tr>
//                 ) : (
//                   currentAgents.map((agent, index) => (
//                     <tr key={index}>
//                       <td className="font-monospace">{agent.firebaseKey}</td>
//                       <td>{agent.agentName}</td>
//                       <td>{agent.mobileNumber}</td>
//                       <td>{agent.route}</td>
//                       <td>
//                         {agent.hasCustomId ? (
//                           <span className="badge bg-success">✅ Has Custom ID</span>
//                         ) : (
//                           <span className="badge bg-warning">⚠️ Firebase Key Only</span>
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
//       {restructureResult && (
//         <div className={`alert ${restructureResult.success ? 'alert-success' : 'alert-danger'}`}>
//           <h6 className="mb-2">
//             {restructureResult.success ? '✅ Success!' : '❌ Error!'}
//           </h6>
//           <p className="mb-0">{restructureResult.message}</p>
//           {restructureResult.processedAgents && (
//             <div className="mt-3">
//               <small>Processed Agents:</small>
//               <ul className="mb-0 mt-1">
//                 {restructureResult.processedAgents.map((agent, index) => (
//                   <li key={index}>
//                     <small>{agent.agentName} → {agent.newAgentId}</small>
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
//                 <li>Converts Firebase-generated keys to meaningful agent IDs</li>
//                 <li>Creates agent IDs like: <code>AGTMAN8798</code> (AGT + first 3 letters + last 4 digits of mobile)</li>
//                 <li>Maintains all existing data (customers, transactions, etc.)</li>
//                 <li>Creates a backup before making changes</li>
//               </ul>
//             </div>
//             <div className="col-md-6">
//               <h6>Agent ID Format:</h6>
//               <ul>
//                 <li><strong>AGT</strong> - Prefix for all agents</li>
//                 <li><strong>MAN</strong> - First 3 letters of agent name</li>
//                 <li><strong>8798</strong> - Last 4 digits of mobile number</li>
//                 <li>If duplicate, adds number: <code>AGTMAN87981</code></li>
//               </ul>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
