import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ref, get, query, orderByChild, equalTo } from "firebase/database";
import { db } from "../firebase";
import { authenticateAgent } from "../utils/agentCredentials";

export default function AgentLogin() {
  const navigate = useNavigate();
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  // Check for prefilled email from ViewAgents
  useEffect(() => {
    const prefilledEmail = localStorage.getItem('prefilledEmail');
    if (prefilledEmail) {
      setLoginData(prev => ({ ...prev, email: prefilledEmail }));
      localStorage.removeItem('prefilledEmail'); // Clear after use
    }
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLoginData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Use the new authentication function
      const result = await authenticateAgent(loginData.email, loginData.password);

      if (result.success) {
        // Login successful
        const agentInfo = {
          id: result.agentId,
          agentName: result.agentData.name,
          email: result.agentData.email,
          firmName: result.agentData.firmName,
          phone: result.agentData.phone,
          route: result.agentData.route,
          role: result.agentData.role,
          address: result.agentData.address
        };

        // Store agent info in localStorage
        localStorage.setItem('loggedInAgent', JSON.stringify(agentInfo));
        
        // Show success message
        alert(`Welcome ${result.agentData.name}! Login successful.`);
        
        // Navigate to agent dashboard
        navigate("/agent-dashboard");
      } else {
        setError(result.message || "Login failed. Please check your credentials.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" 
         style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-5 col-md-7">
            <div className="card border-0 shadow-lg">
              <div className="card-body p-5">
                {/* Header */}
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <div className="rounded-circle mx-auto d-flex align-items-center justify-content-center"
                         style={{ 
                           width: '80px', 
                           height: '80px', 
                           background: 'var(--primary-gradient)',
                           color: 'white',
                           fontSize: '2rem'
                         }}>
                      👨‍💼
                    </div>
                  </div>
                  <h4 className="fw-bold mb-2">Agent Login</h4>
                  <p className="text-muted">Sign in to access your collection dashboard</p>
                </div>

                {/* Error Alert */}
                {error && (
                  <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
                    <span className="me-2">⚠️</span>
                    {error}
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Email Address</label>
                    <div className="input-group">
                      <span className="input-group-text">📧</span>
                      <input
                        type="email"
                        className="form-control"
                        name="email"
                        value={loginData.email}
                        onChange={handleChange}
                        placeholder="Enter your email address"
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold">Password</label>
                    <div className="input-group">
                      <span className="input-group-text">🔒</span>
                      <input
                        type="password"
                        className="form-control"
                        name="password"
                        value={loginData.password}
                        onChange={handleChange}
                        placeholder="Enter your password"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-100 py-2 mb-3"
                    disabled={loading}
                    style={{ background: 'var(--primary-gradient)', border: 'none' }}
                  >
                    {loading ? (
                      <>
                        <div className="spinner-border spinner-border-sm me-2" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        Signing In...
                      </>
                    ) : (
                      <>
                        <span className="me-2">🚀</span>
                        Sign In
                      </>
                    )}
                  </button>
                </form>

                {/* Footer Links */}
                <div className="text-center">
                  <hr className="my-4" />
                  <div className="d-flex justify-content-between">
                    <button 
                      className="btn btn-link text-decoration-none p-0"
                      onClick={() => navigate("/")}
                    >
                      ← Back to Dashboard
                    </button>
                    <button 
                      className="btn btn-link text-decoration-none p-0"
                      onClick={() => navigate("/add-agent")}
                    >
                      New Agent? Register →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Demo Credentials */}
            <div className="card mt-3 border-0" style={{ background: 'rgba(255,255,255,0.9)' }}>
              <div className="card-body p-3">
                <h6 className="mb-2">🔍 Demo Credentials:</h6>
                <small className="text-muted">
                  Use any registered agent's email and password to login.
                  <br />
                  <strong>Example:</strong> Email: amit@gmail.com, Password: amit123
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
