import React, { useState } from 'react';
import { sendDepositNotification, sendWithdrawalNotification, sendCreditNotification } from '../utils/whatsappNotification';

export default function TestWhatsApp() {
  const [formData, setFormData] = useState({
    customerPhone: '7058363608',
    customerName: 'Test Customer',
    amount: 1000,
    accountNumber: 'ACC12345',
    totalAmount: 5000,
    agentName: 'Test Agent'
  });
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' || name === 'totalAmount' ? Number(value) : value
    }));
  };

  const testDeposit = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await sendDepositNotification(formData);
      setResult({ type: 'deposit', ...res });
    } catch (error) {
      setResult({ type: 'deposit', success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testWithdrawal = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await sendWithdrawalNotification(formData);
      setResult({ type: 'withdrawal', ...res });
    } catch (error) {
      setResult({ type: 'withdrawal', success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testCredit = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await sendCreditNotification(formData);
      setResult({ type: 'credit', ...res });
    } catch (error) {
      setResult({ type: 'credit', success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid fade-in-up">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          {/* Header */}
          <div className="card border-0 mb-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <div className="card-body p-4">
              <div className="d-flex align-items-center">
                <div className="me-3">
                  <div className="rounded-circle d-flex align-items-center justify-content-center"
                       style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.2)' }}>
                    <span style={{ fontSize: '1.5rem' }}>📱</span>
                  </div>
                </div>
                <div>
                  <h4 className="mb-1 fw-bold">Test WhatsApp Notifications</h4>
                  <p className="mb-0 opacity-75">Test deposit, withdrawal, and credit notifications</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="card mb-4">
            <div className="card-header">
              <h6 className="mb-0">Test Data</h6>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Customer Phone</label>
                  <input
                    type="text"
                    className="form-control"
                    name="customerPhone"
                    value={formData.customerPhone}
                    onChange={handleChange}
                    placeholder="7058363608"
                  />
                  <small className="text-muted">Without country code (91 will be added automatically)</small>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Customer Name</label>
                  <input
                    type="text"
                    className="form-control"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleChange}
                    placeholder="Test Customer"
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Amount</label>
                  <input
                    type="number"
                    className="form-control"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="1000"
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Total Amount</label>
                  <input
                    type="number"
                    className="form-control"
                    name="totalAmount"
                    value={formData.totalAmount}
                    onChange={handleChange}
                    placeholder="5000"
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Account Number</label>
                  <input
                    type="text"
                    className="form-control"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleChange}
                    placeholder="ACC12345"
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Agent Name</label>
                  <input
                    type="text"
                    className="form-control"
                    name="agentName"
                    value={formData.agentName}
                    onChange={handleChange}
                    placeholder="Test Agent"
                  />
                </div>
              </div>

              {/* Test Buttons */}
              <div className="d-flex gap-3 mt-3">
                <button
                  className="btn btn-success flex-grow-1"
                  onClick={testDeposit}
                  disabled={loading}
                >
                  {loading ? 'Sending...' : '💰 Test Deposit'}
                </button>
                <button
                  className="btn btn-danger flex-grow-1"
                  onClick={testWithdrawal}
                  disabled={loading}
                >
                  {loading ? 'Sending...' : '💸 Test Withdrawal'}
                </button>
                <button
                  className="btn btn-primary flex-grow-1"
                  onClick={testCredit}
                  disabled={loading}
                >
                  {loading ? 'Sending...' : '💳 Test Credit'}
                </button>
              </div>
            </div>
          </div>

          {/* Result Card */}
          {result && (
            <div className={`card border-${result.success ? 'success' : 'danger'}`}>
              <div className={`card-header bg-${result.success ? 'success' : 'danger'} text-white`}>
                <h6 className="mb-0">
                  {result.success ? '✅ Success' : '❌ Failed'} - {result.type?.toUpperCase()} Notification
                </h6>
              </div>
              <div className="card-body">
                <pre className="mb-0" style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Info Card */}
          <div className="card border-info mt-4">
            <div className="card-header bg-info text-white">
              <h6 className="mb-0">ℹ️ Information</h6>
            </div>
            <div className="card-body">
              <h6>Webhook URL:</h6>
              <code className="d-block mb-3 p-2 bg-light rounded">
                https://webhook.whatapi.in/webhook/69213b981b9845c02d533ccb
              </code>

              <h6>Parameters sent:</h6>
              <ul className="mb-0">
                <li><code>number</code>: Customer phone with 91 prefix</li>
                <li><code>message</code>: "bhishi" (fixed identifier)</li>
                <li><code>name</code>: Customer name</li>
                <li><code>amount</code>: Transaction amount</li>
                <li><code>deposit/withdrawal/credit</code>: Transaction amount (based on type)</li>
                <li><code>accountno</code>: Account number</li>
                <li><code>totalamount</code>: Total balance</li>
                <li><code>agentname</code>: Agent name</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
