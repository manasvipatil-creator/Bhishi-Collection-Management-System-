import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";

export default function ViewCollections() {
  const [collections, setCollections] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const query = ref(db, "collections");
    onValue(query, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setCollections(Object.values(data));
      }
      setLoading(false);
    });
  }, []);

  const filteredCollections = collections.filter(collection =>
    collection.receiptNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    collection.customerId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAmount = filteredCollections.reduce((sum, collection) => 
    sum + (Number(collection.amountDeposited) || 0), 0
  );

  return (
    <div className="container-fluid fade-in-up">
      {/* Header */}
      <div className="card border-0 mb-4" style={{ background: 'var(--success-gradient)', color: 'white' }}>
        <div className="card-body p-4">
          <div className="d-flex align-items-center">
            <div className="me-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center"
                   style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.2)' }}>
                <span style={{ fontSize: '1.5rem' }}>📋</span>
              </div>
            </div>
            <div>
              <h4 className="mb-1 fw-bold">Collections List</h4>
              <p className="mb-0 opacity-75">View and manage all collection records</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--success-gradient)' }}>
              📋
            </div>
            <h3 className="stats-number">{filteredCollections.length}</h3>
            <p className="stats-label">Total Collections</p>
          </div>
        </div>
        <div className="col-md-4">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--warning-gradient)' }}>
              💰
            </div>
            <h3 className="stats-number">₹{totalAmount.toLocaleString()}</h3>
            <p className="stats-label">Total Amount</p>
          </div>
        </div>
        <div className="col-md-4">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--primary-gradient)' }}>
              📊
            </div>
            <h3 className="stats-number">₹{Math.round(totalAmount / (filteredCollections.length || 1)).toLocaleString()}</h3>
            <p className="stats-label">Average Amount</p>
          </div>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text">🔍</span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search collections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-6 text-end">
              <span className="badge bg-info me-2">{filteredCollections.length} collections found</span>
              <button className="btn btn-success" onClick={() => window.location.href = '/add-collection'}>
                <span className="me-2">➕</span>Add Collection
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-5">
              <div className="spinner"></div>
              <p className="mt-3">Loading collections...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table mb-0">
                <thead>
                  <tr>
                    <th>Receipt No</th>
                    <th>Customer ID</th>
                    <th>Amount Deposited</th>
                    <th>Deposit Date</th>
                    <th>Status</th>
                    <th>Office Deposit</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCollections.map((collection, index) => (
                    <tr key={index}>
                      <td className="fw-semibold">{collection.receiptNo}</td>
                      <td>{collection.customerId}</td>
                      <td className="fw-bold">₹{Number(collection.amountDeposited).toLocaleString()}</td>
                      <td>{new Date(collection.depositDate).toLocaleDateString('en-GB')}</td>
                      <td>
                        <span className="badge bg-success">
                          ✅ {collection.status || 'Completed'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${collection.officeDeposit ? 'bg-primary' : 'bg-warning'}`}>
                          {collection.officeDeposit ? '🏢 Yes' : '⏳ Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
