import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ref, get, update, remove } from "firebase/database";
import { db } from "../firebase";
import { FiUser, FiArrowLeft, FiEdit2, FiSave, FiCheckCircle, FiXCircle, FiTrash2 } from "react-icons/fi";

export default function CustomerProfile() {
    const { agentId, customerId } = useParams();
    const navigate = useNavigate();

    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        const fetchCustomer = async () => {
            try {
                const customerRef = ref(db, `agents/${agentId}/customers/${customerId}`);
                const snapshot = await get(customerRef);
                if (snapshot.exists()) {
                    setCustomer(snapshot.val());
                } else {
                    setMessage("Customer not found");
                }
            } catch (error) {
                console.error("Error fetching customer:", error);
                setMessage("Error fetching data");
            } finally {
                setLoading(false);
            }
        };
        fetchCustomer();
    }, [agentId, customerId]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCustomer({
            ...customer,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const customerRef = ref(db, `agents/${agentId}/customers/${customerId}`);
            await update(customerRef, {
                ...customer
            });
            setEditMode(false);
            alert("Customer updated successfully!");
        } catch (error) {
            console.error("Error updating customer:", error);
            alert("Failed to update customer");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this customer? This action cannot be undone.")) {
            setSaving(true);
            try {
                const customerRef = ref(db, `agents/${agentId}/customers/${customerId}`);
                await remove(customerRef);
                alert("Customer deleted successfully!");
                navigate("/view-customers");
            } catch (error) {
                console.error("Error deleting customer:", error);
                alert("Failed to delete customer");
            } finally {
                setSaving(false);
            }
        }
    };

    if (loading) return <div className="text-center p-5"><div className="spinner-border text-primary"></div><p>Loading Customer...</p></div>;
    if (!customer) return <div className="text-center p-5 text-danger"><h3>{message}</h3><button className="btn btn-primary mt-3" onClick={() => navigate(-1)}>Go Back</button></div>;

    return (
        <div className="container-fluid fade-in-up">
            <style>{`
        .profile-card { border-radius: 20px; border: none; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .hero-section { background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; padding: 3rem 2rem; position: relative; }
        .avatar-container { width: 100px; height: 100px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); border: 2px solid rgba(255,255,255,0.5); font-size: 3rem; margin-bottom: 1.5rem; }
        .info-label { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: #6c757d; font-weight: 700; margin-bottom: 0.25rem; }
        .info-value { font-size: 1.1rem; color: #2d3436; font-weight: 500; }
        .stats-card { background: #f8fbff; border-radius: 15px; padding: 1.5rem; border: 1px solid #eaf2ff; height: 100%; transition: all 0.3s ease; }
        .stats-card:hover { transform: translateY(-5px); box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
      `}</style>

            <div className="row justify-content-center">
                <div className="col-lg-10">
                    <div className="card profile-card">
                        <div className="hero-section">
                            <button
                                className="btn btn-link text-white p-0 mb-4 text-decoration-none d-flex align-items-center opacity-75 hover-opacity-100"
                                onClick={() => navigate(-1)}
                            >
                                <FiArrowLeft className="me-2" /> Back to List
                            </button>

                            <div className="d-md-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center">
                                    <div className="avatar-container me-4">
                                        <FiUser />
                                    </div>
                                    <div>
                                        <h2 className="mb-1 fw-bold">{customer.name}</h2>
                                        <div className="d-flex align-items-center">
                                            <span className={`badge rounded-pill ${customer.active ? 'bg-success' : 'bg-danger'} me-2`}>
                                                {customer.active ? <FiCheckCircle className="me-1" /> : <FiXCircle className="me-1" />}
                                                {customer.active ? 'Active' : 'Inactive'}
                                            </span>
                                            <span className="opacity-75">ID: {customerId.substring(0, 8)}...</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 mt-md-0">
                                    <button
                                        className={`btn ${editMode ? 'btn-light' : 'btn-outline-light'} rounded-pill px-4 me-2`}
                                        onClick={() => setEditMode(!editMode)}
                                    >
                                        {editMode ? 'Cancel Editing' : <><FiEdit2 className="me-2" /> Edit Details</>}
                                    </button>
                                    {!editMode && (
                                        <button
                                            className="btn btn-outline-danger rounded-pill px-4"
                                            onClick={handleDelete}
                                            disabled={saving}
                                        >
                                            <FiTrash2 className="me-2" /> Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="card-body p-4 p-md-5">
                            {editMode ? (
                                <form onSubmit={handleSave}>
                                    <div className="row g-4">
                                        <div className="col-md-6">
                                            <label className="form-label">Full Name</label>
                                            <input type="text" className="form-control" name="name" value={customer.name} onChange={handleChange} required />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Phone Number</label>
                                            <input type="text" className="form-control" name="phoneNumber" value={customer.phoneNumber || customer.phone || ""} onChange={handleChange} required />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Village</label>
                                            <input type="text" className="form-control" name="village" value={customer.village || ""} onChange={handleChange} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Joining Date</label>
                                            <input type="date" className="form-control" name="startDate" value={customer.startDate || ""} onChange={handleChange} />
                                        </div>
                                        <div className="col-12 d-flex justify-content-between mt-4">
                                            <button
                                                type="button"
                                                className="btn btn-danger rounded-pill px-4 py-2 fw-bold"
                                                onClick={handleDelete}
                                                disabled={saving}
                                            >
                                                <FiTrash2 className="me-2" /> Delete Customer
                                            </button>
                                            <button type="submit" className="btn btn-primary rounded-pill px-5 py-2 fw-bold" disabled={saving}>
                                                {saving ? <div className="spinner-border spinner-border-sm me-2"></div> : <FiSave className="me-2" />}
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            ) : (
                                <div className="row g-4">
                                    <div className="col-md-6">
                                        <div className="info-label">Phone</div>
                                        <div className="info-value text-primary fs-3 fw-bold">{customer.phoneNumber || customer.phone || 'N/A'}</div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="info-label">Village</div>
                                        <div className="info-value text-primary fs-3 fw-bold">{customer.village || 'N/A'}</div>
                                    </div>

                                    <div className="col-12 mt-5">
                                        <h5 className="mb-4 fw-bold">Detailed Information</h5>
                                        <div className="row g-4 border-top pt-4">
                                            <div className="col-md-6">
                                                <div className="info-label">Account Number</div>
                                                <div className="info-value">{customer.accountNumber || 'Not assigned'}</div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="info-label">Joining Date</div>
                                                <div className="info-value">{customer.startDate ? new Date(customer.startDate).toLocaleDateString() : 'N/A'}</div>
                                            </div>
                                            <div className="col-12">
                                                <div className="info-label">Agent Mobile</div>
                                                <div className="info-value text-muted">{agentId}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
