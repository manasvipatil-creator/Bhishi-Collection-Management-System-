import React, { useState, useEffect } from "react";
import { ref, push, set, remove, onValue } from "firebase/database";
import { db } from "../firebase";
import { FiPlus, FiTrash2, FiEdit, FiSearch, FiX, FiMapPin } from "react-icons/fi";
import 'bootstrap/dist/css/bootstrap.min.css';

export default function ManageRoutes() {
  const [routes, setRoutes] = useState([]);
  const [newRoute, setNewRoute] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showVillageModal, setShowVillageModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [newVillage, setNewVillage] = useState("");

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = () => {
    const routesRef = ref(db, 'routes');
    onValue(routesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const routesList = Object.entries(data).map(([id, route]) => ({
          id,
          ...route
        }));
        setRoutes(routesList);
      } else {
        setRoutes([]);
      }
      setLoading(false);
    });
  };

  const handleAddRoute = async () => {
    if (!newRoute.trim()) {
      alert("Please enter a route name");
      return;
    }

    if (newRoute.trim().length < 2) {
      alert("Route name must be at least 2 characters");
      return;
    }

    // Check if route already exists
    const routeExists = routes.some(
      route => route.name.toLowerCase() === newRoute.trim().toLowerCase()
    );

    if (routeExists) {
      alert("This route already exists!");
      return;
    }

    try {
      const routesRef = ref(db, 'routes');
      const newRouteRef = push(routesRef);

      await set(newRouteRef, {
        name: newRoute.trim(),
        createdAt: new Date().toISOString(),
        timestamp: Date.now(),
        status: 'active',
        villages: []
      });

      setNewRoute("");
      alert("Route added successfully!");
    } catch (error) {
      console.error("Error adding route:", error);
      alert("Error adding route: " + error.message);
    }
  };

  const handleDeleteRoute = async (routeId, routeName) => {
    if (!window.confirm(`Are you sure you want to delete route "${routeName}"?`)) {
      return;
    }

    try {
      const routeRef = ref(db, `routes/${routeId}`);
      await remove(routeRef);
      alert("Route deleted successfully!");
    } catch (error) {
      console.error("Error deleting route:", error);
      alert("Error deleting route: " + error.message);
    }
  };

  const handleManageVillages = (route) => {
    setSelectedRoute(route);
    setShowVillageModal(true);
    setNewVillage("");
  };

  const handleAddVillage = async () => {
    if (!newVillage.trim()) {
      alert("Please enter a village name");
      return;
    }

    if (!selectedRoute) {
      alert("No route selected");
      return;
    }

    // Check if village already exists in this route
    const existingVillages = selectedRoute.villages || [];
    const villageExists = existingVillages.some(
      village => village.toLowerCase() === newVillage.trim().toLowerCase()
    );

    if (villageExists) {
      alert("This village already exists in this route!");
      return;
    }

    try {
      const updatedVillages = [...existingVillages, newVillage.trim()];
      const routeRef = ref(db, `routes/${selectedRoute.id}/villages`);
      await set(routeRef, updatedVillages);

      // Update the selected route in state
      setSelectedRoute({
        ...selectedRoute,
        villages: updatedVillages
      });

      setNewVillage("");
    } catch (error) {
      console.error("Error adding village:", error);
      alert("Error adding village: " + error.message);
    }
  };

  const handleDeleteVillage = async (villageToDelete) => {
    if (!window.confirm(`Are you sure you want to delete village "${villageToDelete}"?`)) {
      return;
    }

    try {
      const existingVillages = selectedRoute.villages || [];
      const updatedVillages = existingVillages.filter(village => village !== villageToDelete);
      const routeRef = ref(db, `routes/${selectedRoute.id}/villages`);
      await set(routeRef, updatedVillages);

      // Update the selected route in state
      setSelectedRoute({
        ...selectedRoute,
        villages: updatedVillages
      });

    } catch (error) {
      console.error("Error deleting village:", error);
      alert("Error deleting village: " + error.message);
    }
  };

  const filteredRoutes = routes.filter(route =>
    route.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  return (
    <div className="container-fluid px-4 py-3">
      <style>{`
        .mr-header { display:flex; justify-content:space-between; align-items:center; gap:16px }
        .mr-count { font-weight:600; color:#0d6efd }
        .mr-card { border-radius:8px; box-shadow:0 1px 6px rgba(34,41,47,0.06); border:1px solid rgba(34,41,47,0.06); background:#fff; position: relative; }
        .mr-card .card-header { background:#fff; border-bottom:0; padding:12px 16px; color: #1f2937 }
        .mr-card .card-header h5 { color: inherit; margin:0 }
        .mr-list-item { padding:14px 16px; border-bottom:1px solid #f1f3f5 }
        .mr-list-item:last-child { border-bottom:0 }
        .mr-small { color:#6c757d; font-size:0.9rem }
        .mr-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; z-index:9999; backdrop-filter: blur(4px); }
        .mr-modal { width:95%; max-width:480px; max-height: 90vh; background:#fff; border-radius:12px; overflow:hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.2); border: 1px solid rgba(0,0,0,0.05); display: flex; flex-direction: column; }
        .mr-modal-header { padding: 16px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
        .mr-modal-body { padding: 20px; display: flex; flex-direction: column; overflow: hidden; }
        .mr-add-btn { background: linear-gradient(90deg, #8b5cf6, #a78bfa); border: none; font-weight: 600; color: white; padding: 0 24px; }
        .mr-add-btn:hover { background: linear-gradient(90deg, #7c3aed, #8b5cf6); color: white; }
        .mr-village-list { border: 1px solid #e5e7eb; border-radius: 8px; margin-top: 16px; background: #f9fafb; overflow-y: auto; max-height: 400px; }
        .mr-village-list::-webkit-scrollbar { width: 6px; }
        .mr-village-list::-webkit-scrollbar-track { background: #f1f3f5; }
        .mr-village-list::-webkit-scrollbar-thumb { background: #dee2e6; border-radius: 10px; }
        .mr-village-list::-webkit-scrollbar-thumb:hover { background: #adb5bd; }
        .mr-village-item { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: #fff; }
        .mr-village-item:last-child { border-bottom: none; }
        .mr-actions .btn { min-width:46px }
        @media(max-width:767px){ .mr-header{flex-direction:column;align-items:flex-start} }
      `}</style>
      {/* Header */}
      <div className="mr-header mb-4">
        <div>
          <h2 className="mb-1 fw-bold text-primary">Route Management</h2>
          <p className="text-muted">Manage collection routes and their associated villages</p>
        </div>
        <div className="mr-count d-flex align-items-center">
          <FiMapPin className="me-2" />
          <span>{routes.length} Routes</span>
        </div>
      </div>

      <div className="row g-4">
        {/* Add Route Card */}
        <div className="col-lg-4">
          <div className="card h-100 mr-card">
            <div className="card-header py-3">
              <h5 className="mb-0 fw-semibold">
                <FiPlus className="me-2" /> Add New Route
              </h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small text-muted mb-1">ROUTE NAME</label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control form-control-lg border-end-0"
                    value={newRoute}
                    onChange={(e) => setNewRoute(e.target.value)}
                    placeholder="E.g., North Route"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddRoute()}
                  />
                  <button
                    className="btn btn-primary px-4"
                    onClick={handleAddRoute}
                    disabled={!newRoute.trim()}
                  >
                    <FiPlus className="me-1" /> Add
                  </button>
                </div>
                <small className="text-muted">Minimum 2 characters required</small>
              </div>
            </div>
          </div>
        </div>

        {/* Routes List */}
        <div className="col-lg-8">
          <div className="card h-100 mr-card">
            <div className="card-header py-3">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-semibold">All Routes</h5>
                <div className="w-50">
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0">
                      <FiSearch className="text-muted" />
                    </span>
                    <input
                      type="text"
                      className="form-control border-start-0"
                      placeholder="Search routes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button
                        className="btn btn-outline-secondary"
                        onClick={() => setSearchTerm('')}
                        type="button"
                      >
                        <FiX />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : filteredRoutes.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  {searchTerm ? 'No matching routes found' : 'No routes added yet'}
                </div>
              ) : (
                <div>
                  {filteredRoutes.map((route) => (
                    <div key={route.id} className="mr-list-item">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1 fw-semibold">{route.name}</h6>
                          <div className="mr-small">{route.villages?.length || 0} villages • {route.status === 'active' ? <span className="text-success">Active</span> : <span className="text-danger">Inactive</span>}</div>
                        </div>
                        <div className="mr-actions btn-group">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => handleManageVillages(route)} type="button"><FiEdit size={16} /></button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteRoute(route.id, route.name)} type="button"><FiTrash2 size={16} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Village Management Modal (Fixed Position at end) */}
      {showVillageModal && selectedRoute && (
        <div className="mr-modal-overlay" onClick={() => setShowVillageModal(false)}>
          <div className="mr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mr-modal-header">
              <h5 className="mb-0 fw-bold text-dark d-flex align-items-center">
                <FiMapPin className="me-2 text-primary" style={{ strokeWidth: 2.5 }} />
                {selectedRoute.name}
              </h5>
              <button type="button" className="btn-close" onClick={() => setShowVillageModal(false)} aria-label="Close" style={{ opacity: 0.5 }}></button>
            </div>
            <div className="mr-modal-body">
              <div className="input-group mb-0">
                <input
                  type="text"
                  className="form-control form-control-lg border-end-0"
                  placeholder="Add village..."
                  style={{ fontSize: '1rem', padding: '10px 16px', borderColor: '#dee2e6' }}
                  value={newVillage}
                  onChange={(e) => setNewVillage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddVillage()}
                />
                <button className="btn mr-add-btn" onClick={handleAddVillage} disabled={!newVillage.trim()} type="button">
                  <FiPlus className="me-1" strokeWidth={3} /> ADD
                </button>
              </div>

              <div className="mr-village-list">
                {selectedRoute.villages?.length > 0 ? (
                  selectedRoute.villages.map((village, index) => (
                    <div key={index} className="mr-village-item">
                      <span className="text-dark fw-medium">{village}</span>
                      <button className="btn btn-link text-danger p-0 border-0" onClick={() => handleDeleteVillage(village)} type="button">
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="mr-village-item justify-content-center text-muted">
                    No villages added yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
