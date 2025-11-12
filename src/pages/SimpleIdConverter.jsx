// import React, { useState } from "react";
// import { convertAndAddAll } from "../utils/convertToSimpleIds";

// export default function SimpleIdConverter() {
//   const [loading, setLoading] = useState(false);
//   const [result, setResult] = useState(null);

//   const handleConversion = async () => {
//     if (!window.confirm("This will:\n1. Convert your agent AGTAVN8746 to agent ID '1'\n2. Add customers with IDs 1, 2, 3 to agent 1\n\nA backup will be created. Continue?")) {
//       return;
//     }

//     setLoading(true);
//     try {
//       const result = await convertAndAddAll();
//       setResult(result);
      
//       if (result.success) {
//         alert("Conversion completed successfully!");
//       } else {
//         alert("Error: " + result.message);
//       }
//     } catch (error) {
//       alert("Error: " + error.message);
//       setResult({ success: false, message: error.message });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="container-fluid fade-in-up">
//       {/* Header */}
//       <div className="card border-0 mb-4" style={{ background: 'var(--primary-gradient)', color: 'white' }}>
//         <div className="card-body p-4">
//           <div className="d-flex align-items-center">
//             <div className="me-3">
//               <div className="rounded-circle d-flex align-items-center justify-content-center"
//                    style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.2)' }}>
//                 <span style={{ fontSize: '1.5rem' }}>🔢</span>
//               </div>
//             </div>
//             <div>
//               <h4 className="mb-1 fw-bold">Simple ID Converter</h4>
//               <p className="mb-0 opacity-75">Convert agents to simple IDs (1, 2, 3...) and add customers</p>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Action Card */}
//       <div className="card mb-4">
//         <div className="card-header">
//           <h6 className="mb-0">🎯 One-Click Complete Setup</h6>
//         </div>
//         <div className="card-body">
//           <div className="alert alert-info">
//             <h6>📋 What this will do:</h6>
//             <ol className="mb-0">
//               <li><strong>Convert Agent ID:</strong> AGTAVN8746 → 1</li>
//               <li><strong>Add Customer 1:</strong> Rajesh Kumar (₹5,000 monthly, ₹1,250 weekly)</li>
//               <li><strong>Add Customer 2:</strong> Priya Sharma (₹3,000 monthly, ₹750 weekly)</li>
//               <li><strong>Add Customer 3:</strong> Amit Patel (₹4,000 monthly, ₹1,000 weekly)</li>
//             </ol>
//           </div>

//           <div className="d-flex gap-3">
//             <button
//               className="btn btn-success btn-lg"
//               onClick={handleConversion}
//               disabled={loading}
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
//                   <span className="me-2">🚀</span>
//                   Convert to Simple IDs & Add Customers
//                 </>
//               )}
//             </button>
//           </div>

//           {result && (
//             <div className={`alert ${result.success ? 'alert-success' : 'alert-danger'} mt-3`}>
//               <h6 className="mb-2">
//                 {result.success ? '✅ Success!' : '❌ Error!'}
//               </h6>
//               <p className="mb-0">{result.message}</p>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Before & After Comparison */}
//       <div className="row">
//         <div className="col-md-6">
//           <div className="card">
//             <div className="card-header bg-warning text-dark">
//               <h6 className="mb-0">📋 Before (Current Structure)</h6>
//             </div>
//             <div className="card-body">
//               <pre className="bg-light p-3 rounded small">
// {`agents/
// └── AGTAVN8746/
//     ├── agentInfo/
//     │   ├── agentId: "AGTAVN8746"
//     │   ├── agentName: "..."
//     │   └── mobileNumber: "..."
//     └── customers/
//         └── (empty)`}
//               </pre>
//             </div>
//           </div>
//         </div>
        
//         <div className="col-md-6">
//           <div className="card">
//             <div className="card-header bg-success text-white">
//               <h6 className="mb-0">✅ After (Simple Structure)</h6>
//             </div>
//             <div className="card-body">
//               <pre className="bg-light p-3 rounded small">
// {`agents/
// └── 1/
//     ├── agentInfo/
//     │   ├── agentId: "1"
//     │   ├── agentName: "..."
//     │   └── mobileNumber: "..."
//     └── customers/
//         ├── 1/ (Rajesh Kumar)
//         ├── 2/ (Priya Sharma)
//         └── 3/ (Amit Patel)`}
//               </pre>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Benefits */}
//       <div className="card mt-4">
//         <div className="card-header">
//           <h6 className="mb-0">🎉 Benefits of Simple IDs</h6>
//         </div>
//         <div className="card-body">
//           <div className="row">
//             <div className="col-md-4">
//               <h6>✅ Easy to Remember</h6>
//               <ul>
//                 <li>Agent 1, 2, 3 instead of AGTAVN8746</li>
//                 <li>Customer 1, 2, 3 under each agent</li>
//                 <li>Simple and clean structure</li>
//               </ul>
//             </div>
//             <div className="col-md-4">
//               <h6>📊 Better Management</h6>
//               <ul>
//                 <li>Easy to reference in reports</li>
//                 <li>Quick identification</li>
//                 <li>Scalable numbering system</li>
//               </ul>
//             </div>
//             <div className="col-md-4">
//               <h6>🔒 Safe Conversion</h6>
//               <ul>
//                 <li>Automatic backup creation</li>
//                 <li>All data preserved</li>
//                 <li>Can be reversed if needed</li>
//               </ul>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
