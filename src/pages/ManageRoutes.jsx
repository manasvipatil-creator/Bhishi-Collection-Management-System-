import React, { useState, useEffect } from "react";
import { ref, push, set, remove, onValue } from "firebase/database";
import { db } from "../firebase";

export default function ManageRoutes() {
  const [routes, setRoutes] = useState([]);
  const [newRoute, setNewRoute] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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
        status: 'active'
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

  const filteredRoutes = routes.filter(route =>
    route.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container-fluid fade-in-up">
      {/* Header */}
      <div className="card border-0 mb-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <div className="me-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center"
                     style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.2)' }}>
                  <span style={{ fontSize: '1.5rem' }}>🗺️</span>
                </div>
              </div>
              <div>
                <h4 className="mb-1 fw-bold">Manage Routes</h4>
                <p className="mb-0 opacity-75">Add and manage collection routes for agents</p>
              </div>
            </div>
            <div className="text-end">
              <h2 className="mb-0 fw-bold">{routes.length}</h2>
              <small className="opacity-75">Total Routes</small>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Add Route Card */}
        <div className="col-lg-4">
          <div className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h6 className="mb-0">➕ Add New Route</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Route Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={newRoute}
                  onChange={(e) => setNewRoute(e.target.value)}
                  placeholder="Enter route name (e.g., Pune City, Mumbai East)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddRoute();
                    }
                  }}
                />
                <small className="text-muted">Enter a unique route name</small>
              </div>
              <button
                className="btn btn-primary w-100"
                onClick={handleAddRoute}
              >
                <span className="me-2">➕</span>
                Add Route
              </button>
            </div>
          </div>

          {/* Info Card */}
          <div className="card border-info">
            <div className="card-header bg-info text-white">
              <h6 className="mb-0">ℹ️ Information</h6>
            </div>
            <div className="card-body">
              <ul className="small mb-0">
                <li>Routes are used to organize agents by collection areas</li>
                <li>Each agent can be assigned multiple routes</li>
                <li>Route names should be clear and descriptive</li>
                <li>Deleting a route won't affect existing agents</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Routes List Card */}
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">📋 All Routes</h6>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  style={{ maxWidth: '250px' }}
                  placeholder="🔍 Search routes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center p-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3">Loading routes...</p>
                </div>
              ) : filteredRoutes.length === 0 ? (
                <div className="text-center p-5">
                  <div style={{ fontSize: '3rem', opacity: 0.3 }}>🗺️</div>
                  <p className="text-muted">
                    {searchTerm ? 'No routes found matching your search' : 'No routes added yet. Add your first route!'}
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '50px' }}>#</th>
                        <th>Route Name</th>
                        <th>Created Date</th>
                        <th>Status</th>
                        <th style={{ width: '100px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRoutes.map((route, index) => (
                        <tr key={route.id}>
                          <td>{index + 1}</td>
                          <td>
                            <div className="d-flex align-items-center">
                              <span className="me-2">📍</span>
                              <strong>{route.name}</strong>
                            </div>
                          </td>
                          <td>
                            <small className="text-muted">
                              {route.createdAt ? new Date(route.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                            </small>
                          </td>
                          <td>
                            <span className={`badge ${route.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                              {route.status === 'active' ? '✓ Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteRoute(route.id, route.name)}
                              title="Delete Route"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {filteredRoutes.length > 0 && (
              <div className="card-footer bg-light">
                <small className="text-muted">
                  Showing {filteredRoutes.length} of {routes.length} route(s)
                </small>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
