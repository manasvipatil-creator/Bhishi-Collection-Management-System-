import React, { useState } from "react";
import { ref, push } from "firebase/database";
import { db } from "../firebase";

export default function AddCollection() {
  const [data, setData] = useState({
    receiptNo: "",
    customerId: "",
    amountDeposited: "",
    depositDate: new Date().toISOString().split('T')[0],
  });

  const [loading, setLoading] = useState(false);

  const fieldLabels = {
    receiptNo: "Receipt Number",
    customerId: "Customer ID",
    amountDeposited: "Amount Deposited",
    depositDate: "Deposit Date"
  };

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await push(ref(db, "collections"), {
        ...data,
        officeDeposit: true,
        smsSent: false,
        status: 'completed',
        createdAt: new Date().toISOString()
      });

      // Reset form
      setData({
        receiptNo: "",
        customerId: "",
        amountDeposited: "",
        depositDate: new Date().toISOString().split('T')[0],
      });

      alert("Collection Added Successfully!");
    } catch (error) {
      alert("Error adding collection: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid fade-in-up">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          {/* Header Card */}
          <div className="card border-0 mb-4" style={{ background: 'var(--success-gradient)', color: 'white' }}>
            <div className="card-body p-4">
              <div className="d-flex align-items-center">
                <div className="me-3">
                  <div className="rounded-circle d-flex align-items-center justify-content-center"
                       style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.2)' }}>
                    <span style={{ fontSize: '1.5rem' }}>💰</span>
                  </div>
                </div>
                <div>
                  <h4 className="mb-1 fw-bold">Record Collection</h4>
                  <p className="mb-0 opacity-75">Add a new collection entry to the system</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Collection Details</h6>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  {Object.entries(fieldLabels).map(([field, label]) => (
                    <div key={field} className="col-md-6 mb-3">
                      <label className="form-label">{label}</label>
                      <input
                        type={field === "amountDeposited" ? "number" : field === "depositDate" ? "date" : "text"}
                        className="form-control"
                        name={field}
                        value={data[field]}
                        onChange={handleChange}
                        placeholder={field === "depositDate" ? "" : `Enter ${label.toLowerCase()}`}
                        required
                      />
                    </div>
                  ))}
                </div>

                {/* Collection Summary */}
                {data.amountDeposited && (
                  <div className="alert alert-success mb-4">
                    <h6 className="mb-2">💰 Collection Summary</h6>
                    <div className="row">
                      <div className="col-md-6">
                        <small className="text-muted">Amount Deposited:</small>
                        <div className="fw-bold">₹{Number(data.amountDeposited).toLocaleString()}</div>
                      </div>
                      <div className="col-md-6">
                        <small className="text-muted">Deposit Date:</small>
                        <div className="fw-bold">{new Date(data.depositDate).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="d-flex justify-content-end gap-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => window.history.back()}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="spinner-border spinner-border-sm me-2" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        Recording...
                      </>
                    ) : (
                      <>
                        <span className="me-2">💾</span>
                        Record Collection
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
