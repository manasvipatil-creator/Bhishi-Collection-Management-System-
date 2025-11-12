import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Get admin credentials from Firebase
      const adminRef = ref(db, "Admin");
      const snapshot = await get(adminRef);

      console.log("Snapshot exists:", snapshot.exists());
      console.log("Snapshot data:", snapshot.val());

      if (snapshot.exists()) {
        const adminData = snapshot.val();
        
        console.log("Admin data from Firebase:", adminData);
        console.log("Entered email:", email);
        console.log("Entered password:", password);
        console.log("Stored email:", adminData.email);
        console.log("Stored password:", adminData.password);
        
        // Check credentials
        if (email === adminData.email && password === adminData.password) {
          // Login successful
          console.log("✅ Login successful!");
          login({
            email: adminData.email,
            name: adminData.name || "Admin User",
            role: adminData.role || "Administrator"
          });
          navigate("/");
        } else {
          console.log("❌ Credentials don't match");
          setError("Invalid email or password");
        }
      } else {
        console.log("❌ Admin node not found in Firebase");
        setError("Admin credentials not found. Please contact support.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred during login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div className="login-card" style={{
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        padding: '40px',
        width: '100%',
        maxWidth: '450px',
        animation: 'fadeInUp 0.5s ease-out'
      }}>
        {/* Logo/Header */}
        <div className="text-center mb-4">
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '2.5rem'
          }}>
            🔐
          </div>
          <h2 className="fw-bold mb-2" style={{ color: '#2d3748' }}>
            SMART BHISHI
          </h2>
          <p className="text-muted">Admin Login</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-danger" role="alert" style={{
            borderRadius: '12px',
            border: 'none',
            background: '#fee',
            color: '#c33'
          }}>
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label fw-semibold" style={{ color: '#4a5568' }}>
              Email Address
            </label>
            <input
              type="email"
              className="form-control"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin123@gmail.com"
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                border: '2px solid #e2e8f0',
                fontSize: '1rem',
                transition: 'all 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="form-label fw-semibold" style={{ color: '#4a5568' }}>
              Password
            </label>
            <input
              type="password"
              className="form-control"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                border: '2px solid #e2e8f0',
                fontSize: '1rem',
                transition: 'all 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          <button
            type="submit"
            className="btn w-100"
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '1.1rem',
              fontWeight: '600',
              transition: 'transform 0.2s',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => !loading && (e.target.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-4">
          <small className="text-muted">
            Bishi Collection Management System v1.0
          </small>
        </div>
      </div>
    </div>
  );
}
