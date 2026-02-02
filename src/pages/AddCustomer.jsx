import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ref, get, push, set, update } from "firebase/database";
import { db } from "../firebase";
import { FiUserPlus, FiUsers, FiArrowLeft, FiSave } from "react-icons/fi";

export default function AddCustomer() {
    const navigate = useNavigate();
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingAgents, setLoadingAgents] = useState(true);
    const [message, setMessage] = useState("");
    const [selectedAgentRoutes, setSelectedAgentRoutes] = useState([]);
    const [selectedRouteName, setSelectedRouteName] = useState("");
    const [availableVillages, setAvailableVillages] = useState([]);

    const [customer, setCustomer] = useState({
        name: "",
        phoneNumber: "",
        accountNumber: "",
        village: "",
        startDate: new Date().toISOString().split('T')[0],
        agentId: "", // Mobile number of the agent
        active: true
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        const fetchAgents = async () => {
            try {
                const agentsRef = ref(db, "agents");
                const snapshot = await get(agentsRef);
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const agentsList = Object.entries(data).map(([mobile, agent]) => ({
                        mobile,
                        name: agent.agentInfo?.agentName || "Unknown",
                        id: agent.agentInfo?.agentId || "N/A",
                        routes: agent.agentInfo?.routes || []
                    }));
                    setAgents(agentsList);
                }
            } catch (error) {
                console.error("Error fetching agents:", error);
            } finally {
                setLoadingAgents(false);
            }
        };
        fetchAgents();
    }, []);

    const handleAgentChange = (e) => {
        const agentMobile = e.target.value;
        setCustomer({ ...customer, agentId: agentMobile, village: "" });
        setSelectedRouteName("");
        setAvailableVillages([]);

        if (agentMobile) {
            const agent = agents.find(a => a.mobile === agentMobile);
            setSelectedAgentRoutes(agent?.routes || []);
        } else {
            setSelectedAgentRoutes([]);
        }

        if (errors.agentId) {
            setErrors({ ...errors, agentId: "" });
        }
    };

    const handleRouteChange = (e) => {
        const routeName = e.target.value;
        setSelectedRouteName(routeName);
        setCustomer({ ...customer, village: "" });

        if (routeName) {
            const route = selectedAgentRoutes.find(r => {
                const rName = typeof r === 'string' ? r : (r.name || "");
                return rName === routeName;
            });
            setAvailableVillages(route?.villages || []);
        } else {
            setAvailableVillages([]);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCustomer({
            ...customer,
            [name]: type === 'checkbox' ? checked : value
        });

        if (errors[name]) {
            setErrors({ ...errors, [name]: "" });
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!customer.name.trim()) newErrors.name = "Customer name is required";
        if (!customer.phoneNumber.trim()) newErrors.phoneNumber = "Phone number is required";
        else if (!/^\d{10}$/.test(customer.phoneNumber)) newErrors.phoneNumber = "Phone number must be 10 digits";

        if (!customer.agentId) newErrors.agentId = "Please select an agent";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        setMessage("Saving customer...");

        try {
            const { agentId, ...customerData } = customer;

            // Generate exact structure requested by user
            const now = new Date();
            const createdDate = now.toISOString().split('T')[0];
            const createdTime = now.toLocaleTimeString('en-GB'); // HH:mm:ss

            const fullCustomerData = {
                accountNumber: customerData.accountNumber || "",
                active: customerData.active,
                address: customerData.village || "", // Use village as address
                balance: 0,
                createdDate: createdDate,
                createdTime: createdTime,
                id: 0,
                interestRate: 0,
                lastUpdated: now.toISOString(),
                name: customerData.name,
                phoneNumber: customerData.phoneNumber,
                principalAmount: 0,
                routeId: 1, // Default as per example
                routeName: selectedRouteName || "N/A",
                startDate: customerData.startDate || createdDate,
                totalBonuses: 0,
                totalDeposits: 0,
                totalPenalties: 0,
                totalWithdrawals: 0,
                village: customerData.village || "N/A"
            };

            // Use phoneNumber as the unique key under customers
            const customerRef = ref(db, `agents/${agentId}/customers/${customerData.phoneNumber}`);

            // Check if customer already exists
            const snapshot = await get(customerRef);
            if (snapshot.exists()) {
                if (!window.confirm("A customer with this phone number already exists under this agent. Overwrite?")) {
                    setLoading(false);
                    return;
                }
            }

            await set(customerRef, fullCustomerData);

            setMessage("Customer added successfully!");
            setTimeout(() => {
                navigate("/view-customers");
            }, 1000);
        } catch (error) {
            console.error("Error adding customer:", error);
            alert("Failed to add customer: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container-fluid fade-in-up">
            <style>{`
        .customer-card { border-radius: 15px; border: none; box-shadow: 0 5px 20px rgba(0,0,0,0.05); }
        .form-label { font-weight: 500; color: #444; margin-bottom: 0.5rem; }
        .form-control, .form-select { padding: 0.75rem; border-radius: 10px; border: 1px solid #e1e5ea; }
        .form-control:focus { box-shadow: 0 0 0 0.25rem rgba(102, 126, 234, 0.1); border-color: #667eea; }
        .btn-save { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; padding: 0.75rem 2rem; border-radius: 10px; font-weight: 600; transition: all 0.3s ease; }
        .btn-save:hover { transform: translateY(-2px); boxShadow: 0 5px 15px rgba(102, 126, 234, 0.4); }
        .gradient-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 15px 15px 0 0; padding: 2rem; }
      `}</style>

            <div className="row justify-content-center">
                <div className="col-lg-10">
                    <div className="card customer-card">
                        <div className="gradient-header">
                            <div className="d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center">
                                    <div className="rounded-circle bg-white bg-opacity-25 p-3 me-3">
                                        <FiUserPlus size={24} />
                                    </div>
                                    <div>
                                        <h3 className="mb-0 fw-bold">Add New Customer</h3>
                                        <p className="mb-0 opacity-75">Register a new customer under an agent</p>
                                    </div>
                                </div>
                                <button
                                    className="btn btn-light rounded-pill px-4"
                                    onClick={() => navigate("/view-customers")}
                                >
                                    <FiUsers className="me-2" /> View All
                                </button>
                            </div>
                        </div>

                        <div className="card-body p-4 p-md-5">
                            <form onSubmit={handleSubmit}>
                                <div className="row g-4">
                                    {/* Agent Selection */}
                                    <div className="col-md-6">
                                        <label className="form-label">Select Agent</label>
                                        <select
                                            className={`form-select ${errors.agentId ? 'is-invalid' : ''}`}
                                            name="agentId"
                                            value={customer.agentId}
                                            onChange={handleAgentChange}
                                            disabled={loadingAgents}
                                        >
                                            <option value="">-- Select Agent --</option>
                                            {agents.map((agent) => (
                                                <option key={agent.mobile} value={agent.mobile}>
                                                    {agent.name} ({agent.mobile})
                                                </option>
                                            ))}
                                        </select>
                                        {errors.agentId && <div className="invalid-feedback">{errors.agentId}</div>}
                                    </div>

                                    {/* Route Selection - Appears after Agent is selected */}
                                    <div className="col-md-6">
                                        <label className="form-label">Select Route</label>
                                        <select
                                            className="form-select"
                                            value={selectedRouteName}
                                            onChange={handleRouteChange}
                                            disabled={!customer.agentId || selectedAgentRoutes.length === 0}
                                        >
                                            <option value="">{selectedAgentRoutes.length === 0 ? "-- No routes assigned --" : "-- Select Route --"}</option>
                                            {selectedAgentRoutes.map((route, idx) => {
                                                const routeName = typeof route === 'string' ? route : (route.name || "Unknown");
                                                return (
                                                    <option key={idx} value={routeName}>
                                                        📍 {routeName}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    {/* Village Selection - Appears after Route is selected */}
                                    <div className="col-md-6">
                                        <label className="form-label">Select Village / Area</label>
                                        <select
                                            className="form-select"
                                            name="village"
                                            value={customer.village}
                                            onChange={handleChange}
                                            disabled={!selectedRouteName || availableVillages.length === 0}
                                        >
                                            <option value="">{availableVillages.length === 0 ? "-- No villages found --" : "-- Select Village --"}</option>
                                            {availableVillages.map((village, idx) => (
                                                <option key={idx} value={village}>
                                                    🏡 {village}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Customer Name */}
                                    <div className="col-md-6">
                                        <label className="form-label">Customer Name</label>
                                        <input
                                            type="text"
                                            className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                            placeholder="Full Name"
                                            name="name"
                                            value={customer.name}
                                            onChange={handleChange}
                                        />
                                        {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                                    </div>

                                    {/* Phone Number */}
                                    <div className="col-md-6">
                                        <label className="form-label">Phone Number</label>
                                        <input
                                            type="text"
                                            className={`form-control ${errors.phoneNumber ? 'is-invalid' : ''}`}
                                            placeholder="10 digit mobile number"
                                            name="phoneNumber"
                                            value={customer.phoneNumber}
                                            onChange={handleChange}
                                        />
                                        {errors.phoneNumber && <div className="invalid-feedback">{errors.phoneNumber}</div>}
                                    </div>

                                    {/* Account Number */}
                                    <div className="col-md-6">
                                        <label className="form-label">Account Number (Optional)</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Bank account or unique identifier"
                                            name="accountNumber"
                                            value={customer.accountNumber}
                                            onChange={handleChange}
                                        />
                                    </div>


                                    {/* Start Date */}
                                    <div className="col-md-6">
                                        <label className="form-label">Joining Date</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            name="startDate"
                                            value={customer.startDate}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    {/* Status Toggle */}
                                    <div className="col-12">
                                        <div className="form-check form-switch p-3 bg-light rounded-3">
                                            <input
                                                className="form-check-input ms-0 me-3"
                                                type="checkbox"
                                                id="activeStatus"
                                                name="active"
                                                checked={customer.active}
                                                onChange={handleChange}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            <label className="form-check-label fw-bold" htmlFor="activeStatus" style={{ cursor: 'pointer' }}>
                                                Customer is Active
                                            </label>
                                            <p className="mb-0 text-muted small ms-5">Inactive customers will not appear in daily collection lists</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 d-flex justify-content-between align-items-center">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary px-4 h-100"
                                        onClick={() => navigate(-1)}
                                    >
                                        <FiArrowLeft className="me-2" /> Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className="btn btn-primary btn-save text-white d-flex align-items-center"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                {message}
                                            </>
                                        ) : (
                                            <>
                                                <FiSave className="me-2" /> Save Customer
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
