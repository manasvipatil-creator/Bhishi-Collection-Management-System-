import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

export default function Sidebar() {
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState(null);

  const menuItems = [
    { path: "/", icon: "🏠", label: "Dashboard" },
     { path: "/manage-routes", icon: "🗺️", label: "Manage Routes" },
    { path: "/add-agent", icon: "👨‍💼", label: "Add Agent" },
    { path: "/view-agents", icon: "👥", label: "View Agents" },
    { path: "/view-customers", icon: "👥", label: "View Customers" },
    { path: "/transactions", icon: "💳", label: "Transactions" },
    { path: "/daily-collections", icon: "📅", label: "Daily Collections" },
    { path: "/weekly-collections", icon: "📊", label: "Weekly Collections" },
    { path: "/monthly-collections", icon: "📈", label: "Monthly Collections" },
    { path: "/year-end-bonus", icon: "🎁", label: "Year-End Bonus" },
    { path: "/gift-distribution", icon: "🎁", label: "Gift Distribution" },
    { path: "/reports", icon: "📋", label: "Reports" },
  ];

  return (
    <div className="sidebar no-print" style={{ 
      minHeight: "100vh", 
      maxHeight: "100vh",
      width: "280px",
      overflowY: "auto",
      overflowX: "hidden",
      position: "fixed",
      left: 0,
      top: 0,
      background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)",
      boxShadow: "4px 0 20px rgba(0,0,0,0.1)",
      transition: "all 0.3s ease",
      animation: "slideInLeft 0.5s ease-out"
    }}>
      {/* Logo/Brand Section */}
      <div className="text-center py-4 px-3" style={{
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        marginBottom: "20px"
      }}>
        <div className="mb-3" style={{
          animation: "float 3s ease-in-out infinite"
        }}>
          <div style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            width: "70px",
            height: "70px",
            borderRadius: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto",
            boxShadow: "0 8px 20px rgba(102, 126, 234, 0.4)",
            transform: "rotate(-5deg)",
            transition: "all 0.3s ease"
          }}>
            <span style={{ fontSize: '2rem', transform: "rotate(5deg)" }}>💎</span>
          </div>
        </div>
        <h4 className="mb-1 fw-bold" style={{
          color: "white",
          letterSpacing: "1px",
          textShadow: "0 2px 10px rgba(0,0,0,0.3)"
        }}>SMART BHISHI</h4>
        <small style={{
          color: "rgba(255,255,255,0.6)",
          fontSize: "0.75rem",
          letterSpacing: "0.5px"
        }}>Collection Management</small>
      </div>

      {/* Navigation Menu */}
      <nav className="px-3" style={{ paddingBottom: "100px" }}>
        <ul className="list-unstyled">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            const isHovered = hoveredItem === index;
            
            return (
              <li key={index} className="mb-2" style={{
                animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both`
              }}>
                <Link 
                  to={item.path}
                  onMouseEnter={() => setHoveredItem(index)}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    textDecoration: "none",
                    color: isActive ? "white" : "rgba(255,255,255,0.7)",
                    background: isActive 
                      ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                      : isHovered
                      ? "rgba(255,255,255,0.08)"
                      : "transparent",
                    transform: isHovered ? "translateX(5px)" : "translateX(0)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: isActive 
                      ? "0 4px 15px rgba(102, 126, 234, 0.3)"
                      : "none",
                    border: isActive
                      ? "1px solid rgba(102, 126, 234, 0.5)"
                      : "1px solid transparent",
                    position: "relative",
                    overflow: "hidden"
                  }}
                >
                  {/* Active bar */}
                  {isActive && (
                    <div style={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: "4px",
                      height: "60%",
                      background: "white",
                      borderRadius: "0 4px 4px 0",
                      boxShadow: "0 0 10px rgba(255,255,255,0.5)"
                    }} />
                  )}
                  
                  {/* Icon */}
                  <span style={{
                    fontSize: "1.2rem",
                    marginRight: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "32px",
                    height: "32px",
                    transition: "all 0.3s ease",
                    zIndex: 1
                  }}>
                    {item.icon}
                  </span>
                  
                  {/* Label */}
                  <span style={{
                    fontSize: "0.9rem",
                    fontWeight: isActive ? "600" : "500",
                    letterSpacing: "0.3px",
                    zIndex: 1
                  }}>
                    {item.label}
                  </span>
                  
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer Section */}
      <div className="p-3" style={{ 
        position: 'sticky', 
        bottom: 0,
        background: 'linear-gradient(180deg, transparent 0%, #16213e 50%)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        marginTop: 'auto',
        backdropFilter: "blur(10px)"
      }}>
        <div className="text-center">
          <div style={{
            fontSize: "0.75rem",
            color: "rgba(255,255,255,0.5)",
            marginBottom: "8px"
          }}>
            © 2025 Bishi Collection
          </div>
          <div style={{
            fontSize: "0.7rem",
            color: "rgba(255,255,255,0.3)",
            padding: "4px 12px",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "20px",
            display: "inline-block"
          }}>
            v1.0.0
          </div>
        </div>
      </div>
      
      {/* Animations */}
      <style>{`
        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(-5deg);
          }
          50% {
            transform: translateY(-10px) rotate(-5deg);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.2);
          }
        }
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        /* Custom scrollbar */
        .sidebar::-webkit-scrollbar {
          width: 6px;
        }
        
        .sidebar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 10px;
        }
        
        .sidebar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 10px;
          transition: all 0.3s ease;
        }
        
        .sidebar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.3);
        }
      `}</style>
    </div>
  );
}
