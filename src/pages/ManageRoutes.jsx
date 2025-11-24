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
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1 fw-bold text-primary">Route Management</h2>
          <p className="text-muted">Manage collection routes and their associated villages</p>
        </div>
        <div className="bg-light rounded-pill px-3 py-2 d-flex align-items-center">
          <FiMapPin className="me-2 text-primary" />
          <span className="fw-bold">{routes.length}</span>
          <span className="ms-1 text-muted">Routes</span>
        </div>
      </div>

      <div className="row g-4">
        {/* Add Route Card */}
        <div className="col-lg-4">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-header bg-white border-0 py-3">
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
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 py-3">
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
                <div className="list-group list-group-flush">
                  {filteredRoutes.map((route) => (
                    <div 
                      key={route.id} 
                      className="list-group-item list-group-item-action p-3 border-0 border-bottom"
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1 fw-semibold">{route.name}</h6>
                          <small className="text-muted">
                            {route.villages?.length || 0} villages • 
                            {route.status === 'active' ? (
                              <span className="text-success">Active</span>
                            ) : (
                              <span className="text-danger">Inactive</span>
                            )}
                          </small>
                        </div>
                        <div className="btn-group">
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleManageVillages(route)}
                            type="button"
                          >
                            <FiEdit size={16} className="me-1" />
                            Manage Villages
                          </button>
                          <button 
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteRoute(route.id, route.name)}
                            type="button"
                          >
                            <FiTrash2 size={16} />
                          </button>
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

      {/* Village Management Modal */}
      {showVillageModal && selectedRoute && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-semibold">
                  <FiMapPin className="me-2" />
                  {selectedRoute.name} - Villages
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowVillageModal(false)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Add new village"
                      value={newVillage}
                      onChange={(e) => setNewVillage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddVillage()}
                    />
                    <button 
                      className="btn btn-primary"
                      onClick={handleAddVillage}
                      disabled={!newVillage.trim()}
                      type="button"
                    >
                      <FiPlus className="me-1" /> Add
                    </button>
                  </div>
                </div>

                {selectedRoute.villages?.length > 0 ? (
                  <div className="list-group">
                    {selectedRoute.villages.map((village, index) => (
                      <div key={index} className="list-group-item d-flex justify-content-between align-items-center">
                        <span>{village}</span>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteVillage(village)}
                          type="button"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted">
                    No villages added yet. Start by adding a village above.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary"
                  onClick={() => setShowVillageModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
