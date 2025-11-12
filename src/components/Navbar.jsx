import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const currentTime = new Date().toLocaleString();
  const navigate = useNavigate();
  
  // Safely get auth context
  let logout, user;
  try {
    const auth = useAuth();
    logout = auth.logout;
    user = auth.user;
  } catch (error) {
    console.error("Auth context error:", error);
    logout = () => {};
    user = null;
  }

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      logout();
      navigate("/login");
    }
  };

  return (
    <nav className="navbar px-4 py-3 fade-in-up no-print"
         style={{ 
           background: 'var(--bg-secondary)', 
           boxShadow: 'var(--shadow-sm)',
           borderBottom: '1px solid var(--border-color)'
         }}>
      <div className="d-flex justify-content-between align-items-center w-100">
        {/* Left Section - Page Title */}
        <div className="d-flex align-items-center">
          <h4 className="mb-0 fw-bold" style={{ color: 'var(--text-primary)' }}>
            SMART BHISHI
          </h4>
          <span className="badge ms-3 px-3 py-2" 
                style={{ 
                  background: 'var(--success-gradient)', 
                  color: 'white',
                  borderRadius: '20px',
                  fontSize: '0.75rem'
                }}>
            ACTIVE
          </span>
        </div>

        {/* Right Section - User Info & Actions */}
        <div className="d-flex align-items-center">
          {/* Current Time */}
          <div className="me-4 text-center">
            <small className="d-block text-muted">Current Time</small>
            <span className="fw-semibold" style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
              {currentTime}
            </span>
          </div>

         

          {/* User Profile */}
          <div className="d-flex align-items-center">
            <div className="me-3 text-end">
              <div className="fw-semibold" style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                {user?.name || "Admin User"}
              </div>
              <small className="text-muted">{user?.role || "Administrator"}</small>
            </div>
            <div className="rounded-circle d-flex align-items-center justify-content-center"
                 style={{ 
                   width: '45px', 
                   height: '45px', 
                   background: 'var(--primary-gradient)',
                   color: 'white',
                   fontSize: '1.2rem'
                 }}>
              👤
            </div>
            
            {/* Logout Button */}
            <button 
              onClick={handleLogout}
              className="btn btn-outline-danger ms-3"
              title="Logout"
              style={{ 
                borderRadius: '12px',
                border: '2px solid #dc3545',
                color: '#dc3545',
                padding: '8px 16px',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#dc3545';
                e.target.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#dc3545';
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>🚪</span>
              <span className="ms-2 fw-semibold">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
