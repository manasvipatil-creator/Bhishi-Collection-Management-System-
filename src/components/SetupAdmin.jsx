import { useState, useEffect } from "react";
import { setupAdminCredentials, verifyAdminCredentials } from "../utils/setupAdmin";

export default function SetupAdmin() {
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("");
  const [adminData, setAdminData] = useState(null);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    setStatus("checking");
    const result = await verifyAdminCredentials();
    if (result.exists) {
      setStatus("exists");
      setAdminData(result.data);
      setMessage("Admin credentials already exist in Firebase!");
    } else {
      setStatus("not_found");
      setMessage("Admin credentials not found. Click the button to create them.");
    }
  };

  const handleSetup = async () => {
    setStatus("creating");
    setMessage("Creating admin credentials...");
    
    const result = await setupAdminCredentials();
    
    if (result.success) {
      setStatus("success");
      setMessage(result.message);
      // Recheck to get the data
      setTimeout(() => checkAdmin(), 1000);
    } else {
      setStatus("error");
      setMessage(`Error: ${result.message}`);
    }
  };

  return (
    <div className="container mt-5">
      <div className="card shadow-lg" style={{ maxWidth: '600px', margin: '0 auto', borderRadius: '20px' }}>
        <div className="card-body p-5">
          <h2 className="text-center mb-4">🔐 Admin Setup</h2>
          
          {/* Status Message */}
          <div className={`alert ${
            status === 'exists' ? 'alert-success' : 
            status === 'error' ? 'alert-danger' : 
            status === 'success' ? 'alert-success' :
            'alert-info'
          }`}>
            {message}
          </div>

          {/* Admin Data Display */}
          {adminData && (
            <div className="card bg-light mb-3">
              <div className="card-body">
                <h5 className="card-title">Admin Credentials</h5>
                <p className="mb-1"><strong>Email:</strong> {adminData.email}</p>
                <p className="mb-1"><strong>Password:</strong> {adminData.password}</p>
                <p className="mb-1"><strong>Name:</strong> {adminData.name}</p>
                <p className="mb-0"><strong>Role:</strong> {adminData.role}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="d-flex gap-3 justify-content-center">
            {status === 'not_found' && (
              <button 
                className="btn btn-primary btn-lg"
                onClick={handleSetup}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 30px'
                }}
              >
                Create Admin Credentials
              </button>
            )}
            
            <button 
              className="btn btn-outline-secondary btn-lg"
              onClick={checkAdmin}
              disabled={status === 'checking' || status === 'creating'}
              style={{ borderRadius: '12px', padding: '12px 30px' }}
            >
              {status === 'checking' ? 'Checking...' : 'Refresh'}
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-4 p-3 bg-light rounded">
            <h6 className="fw-bold">Instructions:</h6>
            <ol className="mb-0 small">
              <li>Click "Create Admin Credentials" to set up admin access</li>
              <li>Credentials will be stored in Firebase under "Admin" node</li>
              <li>Use these credentials to login to the admin panel</li>
              <li>Default credentials:
                <ul>
                  <li>Email: admin123@gmail.com</li>
                  <li>Password: admin123</li>
                </ul>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
