import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ref, push, set, update, onValue } from "firebase/database";
import { db } from "../firebase";
import { addAgentWithId, generateUniqueAgentId } from "../utils/agentIdRestructure";

export default function AddAgent() {
  const navigate = useNavigate();
  const location = useLocation();
  const editAgent = location.state?.editAgent;
  const isEditMode = !!editAgent;

  const [agent, setAgent] = useState({
    agentName: "",
    mobileNumber: "",
    password: "",
    routes: [],
    status: "active"
  });
  
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [previewAgentId, setPreviewAgentId] = useState("");

  // Load routes from Firebase
  useEffect(() => {
    const routesRef = ref(db, 'routes');
    const unsubscribe = onValue(routesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const routesList = Object.entries(data).map(([id, route]) => ({
          id,
          ...route
        })).filter(route => route.status === 'active');
        setAvailableRoutes(routesList);
      } else {
        setAvailableRoutes([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Load agent data in edit mode
  useEffect(() => {
    if (isEditMode && editAgent) {
      setAgent({
        agentName: editAgent.agentName || "",
        mobileNumber: editAgent.mobileNumber || editAgent.id || "",
        password: editAgent.password || "",
        routes: editAgent.routes || [],
        status: editAgent.status || "active"
      });
      setPreviewAgentId(editAgent.agentId || editAgent.id);
    }
  }, [isEditMode, editAgent]);

  const fieldLabels = {
    agentName: "Agent Name",
    mobileNumber: "Mobile Number",
    password: "Password"
  };

  const validateField = (name, value) => {
    let error = "";
    
    switch (name) {
      case "mobileNumber":
        if (value && !/^\d{10}$/.test(value)) {
          error = "Mobile number must be 10 digits";
        }
        break;
      case "agentName":
        if (value && value.length < 2) {
          error = "Agent name must be at least 2 characters";
        }
        break;
      case "password":
        if (value && value.length < 6) {
          error = "Password must be at least 6 characters";
        }
        break;
      default:
        break;
    }
    
    return error;
  };

  // Generate preview agent ID
  const generatePreviewId = async (agentName, mobileNumber) => {
    if (agentName && mobileNumber && mobileNumber.length >= 4) {
      try {
        const namePrefix = agentName.replace(/\s+/g, '').substring(0, 3).toUpperCase();
        const mobileSuffix = mobileNumber.slice(-4);
        const baseId = `AGT${namePrefix}${mobileSuffix}`;
        setPreviewAgentId(baseId);
      } catch (error) {
        setPreviewAgentId("");
      }
    } else {
      setPreviewAgentId("");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    const updatedAgent = {
      ...agent,
      [name]: value
    };
    
    setAgent(updatedAgent);

    // Generate preview ID when name or mobile changes
    if (name === 'agentName' || name === 'mobileNumber') {
      generatePreviewId(
        name === 'agentName' ? value : updatedAgent.agentName,
        name === 'mobileNumber' ? value : updatedAgent.mobileNumber
      );
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ""
      });
    }

    // Validate field
    const error = validateField(name, value);
    if (error) {
      setErrors({
        ...errors,
        [name]: error
      });
    }
  };

  const handleAddRouteFromDropdown = () => {
    if (!selectedRouteId) {
      alert("Please select a route from the dropdown");
      return;
    }

    const selectedRoute = availableRoutes.find(r => r.id === selectedRouteId);
    if (!selectedRoute) {
      alert("Selected route not found");
      return;
    }

    if (agent.routes.includes(selectedRoute.name)) {
      alert("This route is already added!");
      return;
    }

    setAgent({
      ...agent,
      routes: [...agent.routes, selectedRoute.name]
    });
    setSelectedRouteId("");
  };

  const handleRemoveRoute = (routeToRemove) => {
    setAgent({
      ...agent,
      routes: agent.routes.filter(route => route !== routeToRemove)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoadingMessage("Validating data...");

    // Validate all fields
    const newErrors = {};
    Object.keys(fieldLabels).forEach(field => {
      const error = validateField(field, agent[field]);
      if (error) newErrors[field] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      setLoadingMessage("");
    }

    try {
      if (isEditMode) {
        // Update existing agent
        setLoadingMessage("Updating agent...");
        
        const agentRef = ref(db, `agents/${editAgent.id}/agentInfo`);
        await update(agentRef, {
          agentName: agent.agentName,
          routes: agent.routes,
          password: agent.password,
          status: agent.status
        });

        console.log("Agent updated successfully");
        setLoadingMessage("Success! Redirecting...");
        
        setTimeout(() => {
          navigate("/view-agents");
        }, 500);
        
      } else {
        // Add new agent
        setLoadingMessage("Generating Agent ID...");
        
        const result = await addAgentWithId({
          agentName: agent.agentName,
          mobileNumber: agent.mobileNumber,
          password: agent.password,
          routes: agent.routes,
          status: agent.status
        });

        if (result.success) {
          console.log("Agent saved successfully with ID:", result.agentId);
          setLoadingMessage("Success! Redirecting...");

          // Reset form
          setAgent({
            agentName: "",
            mobileNumber: "",
            password: "",
            routes: [],
            status: "active"
          });
          setPreviewAgentId("");
          setSelectedRouteId("");

          // Navigate directly without alert
          navigate("/view-agents");
        } else {
          throw new Error(result.message);
        }
      }
      
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} agent:`, error);
      setLoadingMessage("");
      alert(`Error ${isEditMode ? 'updating' : 'adding'} agent: ` + error.message);
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  return (
    <div className="container-fluid fade-in-up">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          {/* Header Card */}
          <div className="card border-0 mb-4" style={{ background: 'var(--primary-gradient)', color: 'white' }}>
            <div className="card-body p-4">
              <div className="d-flex align-items-center">
                <div className="me-3">
                  <div className="rounded-circle d-flex align-items-center justify-content-center"
                       style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.2)' }}>
                    <span style={{ fontSize: '1.5rem' }}>👨‍💼</span>
                  </div>
                </div>
                <div>
                  <h4 className="mb-1 fw-bold">{isEditMode ? 'Edit Agent' : 'Add New Agent'}</h4>
                  <p className="mb-0 opacity-75">{isEditMode ? 'Update agent information' : 'Register a new collection agent in the system'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Agent Information</h6>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSubmit} autoComplete="off">
                <div className="row">
                  {Object.entries(fieldLabels).map(([field, label]) => (
                    <div key={field} className="col-md-6 mb-3">
                      <label className="form-label">{label}</label>
                      <input
                        type={field === "password" ? "password" : "text"}
                        className={`form-control ${errors[field] ? 'is-invalid' : ''}`}
                        name={field}
                        value={agent[field]}
                        onChange={handleChange}
                        placeholder={`Enter ${label.toLowerCase()}`}
                        required={field !== "password" || !isEditMode}
                        disabled={field === "mobileNumber" && isEditMode}
                        autoComplete={field === "mobileNumber" ? "off" : field === "password" ? "new-password" : "off"}
                      />
                      {field === "mobileNumber" && isEditMode && (
                        <small className="text-muted">Mobile number cannot be changed</small>
                      )}
                      {errors[field] && (
                        <div className="invalid-feedback">
                          {errors[field]}
                        </div>
                      )}
                      {field === "password" && agent[field] && (
                        <div className="mt-1">
                          <small className={`text-${agent[field].length >= 8 ? 'success' : agent[field].length >= 6 ? 'warning' : 'danger'}`}>
                            Password strength: {agent[field].length >= 8 ? 'Strong' : agent[field].length >= 6 ? 'Medium' : 'Weak'}
                          </small>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Routes Section */}
                <div className="mb-4">
                  <label className="form-label">Routes</label>
                  
                  {/* Select from existing routes */}
                  {availableRoutes.length > 0 ? (
                    <div className="input-group mb-2">
                      <select
                        className="form-select"
                        value={selectedRouteId}
                        onChange={(e) => setSelectedRouteId(e.target.value)}
                      >
                        <option value="">-- Select a route --</option>
                        {availableRoutes.map(route => (
                          <option key={route.id} value={route.id}>
                            📍 {route.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleAddRouteFromDropdown}
                      >
                        <span className="me-1">➕</span>
                        ADD ROUTE
                      </button>
                    </div>
                  ) : (
                    <div className="alert alert-warning mb-2">
                      <small>
                        ⚠️ No routes found in the system. Please add routes from the <strong>Manage Routes</strong> page first.
                      </small>
                    </div>
                  )}
                  
                  {/* Display added routes */}
                  {agent.routes.length > 0 && (
                    <div className="d-flex flex-wrap gap-2 mt-2">
                      {agent.routes.map((route, index) => (
                        <div
                          key={index}
                          className="badge bg-primary d-flex align-items-center gap-2 p-2"
                          style={{ fontSize: '0.9rem' }}
                        >
                          <span>📍 {route}</span>
                          <button
                            type="button"
                            className="btn-close btn-close-white"
                            style={{ fontSize: '0.6rem' }}
                            onClick={() => handleRemoveRoute(route)}
                            aria-label="Remove route"
                          ></button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {agent.routes.length === 0 && (
                    <small className="text-muted">No routes added yet. Add at least one route.</small>
                  )}
                </div>

                {/* Agent Summary */}
                <div className={`alert ${isEditMode ? 'alert-warning' : 'alert-info'} mb-4`}>
                  <h6 className="mb-2">👨‍💼 Agent Summary {isEditMode && <span className="badge bg-warning text-dark ms-2">Edit Mode</span>}</h6>
                  <div className="row">
                    <div className="col-md-3">
                      <small className="text-muted">Agent Name:</small>
                      <div className="fw-bold">{agent.agentName || "Not set"}</div>
                    </div>
                    <div className="col-md-3">
                      <small className="text-muted">Routes:</small>
                      <div className="fw-bold">{agent.routes.length > 0 ? `${agent.routes.length} route(s)` : "Not set"}</div>
                    </div>
                    <div className="col-md-3">
                      <small className="text-muted">Agent ID:</small>
                      <div className="fw-bold text-primary">
                        {previewAgentId || "Enter name & mobile"}
                      </div>
                    </div>
                    <div className="col-md-3">
                      <small className="text-muted">Status:</small>
                      <div className="fw-bold text-success">{agent.status === 'active' ? 'Active' : 'Inactive'}</div>
                    </div>
                  </div>
                  {isEditMode && (
                    <div className="mt-2">
                      <small className="text-muted">
                        ✏️ You are editing agent: <strong className="text-primary">{editAgent?.agentName}</strong> (ID: {previewAgentId})
                      </small>
                    </div>
                  )}
                  {!isEditMode && previewAgentId && (
                    <div className="mt-2">
                      <small className="text-muted">
                        💡 This agent will be saved with ID: <strong className="text-primary">{previewAgentId}</strong>
                      </small>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="d-flex justify-content-between">
                  <button
                    type="button"
                    className="btn btn-outline-info"
                    onClick={() => navigate("/view-agents")}
                  >
                    <span className="me-2">👥</span>
                    View All Agents
                  </button>
                  <div className="d-flex gap-3">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => window.history.back()}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="spinner-border spinner-border-sm me-2" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                          {loadingMessage || "Processing..."}
                        </>
                      ) : (
                        <>
                          <span className="me-2">{isEditMode ? '✏️' : '💾'}</span>
                          {isEditMode ? 'Update Agent' : 'Save Agent'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
