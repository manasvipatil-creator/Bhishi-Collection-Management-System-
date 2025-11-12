import React, { useState } from 'react';
import { 
  addAgentWithCredentials, 
  checkEmailExists,
  createSampleAgentsWithCredentials 
} from '../utils/agentCredentials';

const AddAgentWithCredentials = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    firmName: '',
    phone: '',
    address: '',
    route: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = async () => {
    const newErrors = {};

    // Required fields validation
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (!formData.firmName.trim()) newErrors.firmName = 'Firm name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Phone validation
    const phoneRegex = /^[6-9]\d{9}$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    // Check if email already exists
    if (formData.email && !newErrors.email) {
      const emailExists = await checkEmailExists(formData.email);
      if (emailExists) {
        newErrors.email = 'This email is already registered';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const isValid = await validateForm();
      
      if (!isValid) {
        setLoading(false);
        return;
      }

      const result = await addAgentWithCredentials({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        firmName: formData.firmName.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        route: formData.route.trim(),
        contactPerson: formData.name.trim()
      });

      if (result.success) {
        setMessage(`✅ Agent added successfully! Agent ID: ${result.agentId}`);
        
        // Reset form
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          firmName: '',
          phone: '',
          address: '',
          route: ''
        });
        setErrors({});
      } else {
        setMessage(`❌ Error: ${result.error || result.message}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    }

    setLoading(false);
  };

  const handleCreateSampleAgents = async () => {
    setLoading(true);
    setMessage('Creating sample agents...');

    try {
      const result = await createSampleAgentsWithCredentials();
      
      if (result.success) {
        setMessage(`✅ ${result.message}`);
      } else {
        setMessage(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    }

    setLoading(false);
  };

  return (
    <div className="container-fluid p-4">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-header bg-gradient-primary text-white">
              <h4 className="mb-0">👤 Add Agent with Credentials</h4>
              <small>Register new collection agent with login credentials</small>
            </div>
            
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  {/* Personal Information */}
                  <div className="col-12">
                    <h6 className="text-primary mb-3">📋 Personal Information</h6>
                  </div>
                  
                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      Agent Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter agent name"
                    />
                    {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      Phone Number <span className="text-danger">*</span>
                    </label>
                    <input
                      type="tel"
                      className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter 10-digit phone number"
                    />
                    {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
                  </div>

                  <div className="col-12 mb-3">
                    <label className="form-label">Address</label>
                    <textarea
                      className="form-control"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows="2"
                      placeholder="Enter complete address"
                    />
                  </div>

                  <div className="col-12 mb-3">
                    <label className="form-label">Route</label>
                    <input
                      type="text"
                      className="form-control"
                      name="route"
                      value={formData.route}
                      onChange={handleInputChange}
                      placeholder="Enter collection route (e.g., Route A - Central Area)"
                    />
                  </div>

                  {/* Credentials */}
                  <div className="col-12 mt-4">
                    <h6 className="text-primary mb-3">🔐 Login Credentials</h6>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      Email Address <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter email address"
                    />
                    {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      Firm Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${errors.firmName ? 'is-invalid' : ''}`}
                      name="firmName"
                      value={formData.firmName}
                      onChange={handleInputChange}
                      placeholder="Enter firm/company name"
                    />
                    {errors.firmName && <div className="invalid-feedback">{errors.firmName}</div>}
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      Password <span className="text-danger">*</span>
                    </label>
                    <input
                      type="password"
                      className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter password (min 6 characters)"
                    />
                    {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      Confirm Password <span className="text-danger">*</span>
                    </label>
                    <input
                      type="password"
                      className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm password"
                    />
                    {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword}</div>}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="row mt-4">
                  <div className="col-md-6 mb-2">
                    <button
                      type="submit"
                      className="btn btn-primary w-100"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Adding Agent...
                        </>
                      ) : (
                        '✅ Add Agent'
                      )}
                    </button>
                  </div>
                  
                  <div className="col-md-6 mb-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary w-100"
                      onClick={handleCreateSampleAgents}
                      disabled={loading}
                    >
                      🚀 Create Sample Agents
                    </button>
                  </div>
                </div>
              </form>

              {/* Message Display */}
              {message && (
                <div className="row mt-3">
                  <div className="col-12">
                    <div className={`alert ${message.includes('❌') ? 'alert-danger' : 'alert-success'}`}>
                      {message}
                    </div>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="row mt-4">
                <div className="col-12">
                  <div className="alert alert-info">
                    <h6>ℹ️ Agent Credentials Structure</h6>
                    <p className="mb-1">Each agent will have:</p>
                    <ul className="mb-0">
                      <li><strong>Email & Password:</strong> For login authentication</li>
                      <li><strong>Firm Name:</strong> Business/company identification</li>
                      <li><strong>Role:</strong> Agent permissions (default: agent)</li>
                      <li><strong>Agent Info:</strong> Name, phone, route, status</li>
                      <li><strong>Collections:</strong> Empty customers and stats objects</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddAgentWithCredentials;
