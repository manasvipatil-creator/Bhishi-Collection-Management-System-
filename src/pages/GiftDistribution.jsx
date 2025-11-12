import React, { useEffect, useState } from "react";
import { getAllAgents } from "../utils/databaseHelpers";
import { ref, get, set } from "firebase/database";
import { db } from "../firebase";

export default function GiftDistribution() {
  const [allCustomers, setAllCustomers] = useState([]);
  const [routeData, setRouteData] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [goldWinners, setGoldWinners] = useState({});
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false); // Loading state for filter button
  const [countdown, setCountdown] = useState(null); // Countdown number (3, 2, 1)
  const [manualSelections, setManualSelections] = useState({});
  const [showManualModal, setShowManualModal] = useState(false);
  const [currentRoute, setCurrentRoute] = useState(null);

  useEffect(() => {
    loadCustomersAndRoutes();
  }, []);

  const loadCustomersAndRoutes = async () => {
    setLoading(true);
    try {
      const agents = await getAllAgents();
      const customers = [];
      const routeMap = {};

      // Collect all customers and organize by routes
      for (const agent of agents) {
        if (agent.customers) {
          const agentRoutes = agent.routes || [];
          
          Object.entries(agent.customers).forEach(([key, customer]) => {
            const customerData = {
              id: key,
              customerKey: key,
              customerId: customer.customerId || key,
              name: customer.name || '',
              phone: customer.phoneNumber || customer.phone || key,
              agentName: agent.name,
              agentPhone: agent.phone,
              routes: agentRoutes,
              principalAmount: customer.principalAmount || 0,
              balance: customer.balance || 0,
              status: customer.status || 'active'
            };

            customers.push(customerData);

            // Add customer to each route
            agentRoutes.forEach(route => {
              if (!routeMap[route]) {
                routeMap[route] = [];
              }
              routeMap[route].push(customerData);
            });
          });
        }
      }

      // Convert route map to array
      const routes = Object.entries(routeMap).map(([routeName, customers]) => ({
        name: routeName,
        customers: customers,
        totalCustomers: customers.length,
        giftEligibleCount: Math.floor(customers.length / 10)
      }));

      setAllCustomers(customers);
      setRouteData(routes);
    } catch (error) {
      console.error("Error loading customers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter 250 random customers based on proportional logic
  // Each click will show DIFFERENT random customers (including manual selection routes)
  // NO DUPLICATE CUSTOMERS - using phone number as unique identifier
  const filterCustomers = async () => {
    setFiltering(true); // Start loading animation
    setSelectedCustomers([]); // Clear previous selection
    
    // Countdown: 3...2...1
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    setCountdown(null); // Clear countdown
    
    // Show loading animation
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const selected = [];
    const selectedPhones = new Set(); // Track phone numbers to avoid duplicates
    const newManualSelections = {};

    routeData.forEach(route => {
      const eligibleCount = Math.floor(route.customers.length / 10);
      
      if (route.customers.length < 10) {
        // Routes with less than 10 customers - automatically select random customers
        // Fisher-Yates shuffle for random selection
        const customersCopy = [...route.customers];
        for (let i = customersCopy.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [customersCopy[i], customersCopy[j]] = [customersCopy[j], customersCopy[i]];
        }
        
        // Auto-select random customers from small routes (can select 1 or more based on route size)
        const autoSelectCount = Math.max(1, Math.floor(route.customers.length / 5)); // Select at least 1
        const autoSelected = [];
        
        for (const customer of customersCopy) {
          if (autoSelected.length >= autoSelectCount) break;
          // Only add if phone number not already selected
          if (!selectedPhones.has(customer.phone)) {
            autoSelected.push(customer);
            selectedPhones.add(customer.phone);
          }
        }
        
        selected.push(...autoSelected);
        
        // Also keep for manual selection if admin wants to add more
        newManualSelections[route.name] = {
          customers: route.customers,
          selected: autoSelected // Pre-select the auto-selected ones
        };
      } else if (eligibleCount > 0) {
        // Randomly select customers from this route using Fisher-Yates shuffle
        // This ensures truly random selection each time
        const customersCopy = [...route.customers];
        
        // Fisher-Yates shuffle algorithm for better randomization
        for (let i = customersCopy.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [customersCopy[i], customersCopy[j]] = [customersCopy[j], customersCopy[i]];
        }
        
        // Select customers, avoiding duplicates
        const routeSelected = [];
        for (const customer of customersCopy) {
          if (routeSelected.length >= eligibleCount) break;
          // Only add if phone number not already selected
          if (!selectedPhones.has(customer.phone)) {
            routeSelected.push(customer);
            selectedPhones.add(customer.phone);
          }
        }
        
        selected.push(...routeSelected);
      }
    });

    // Shuffle the final selected array to mix customers from different routes
    for (let i = selected.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selected[i], selected[j]] = [selected[j], selected[i]];
    }

    // Limit to 250 total (should already be unique)
    const finalSelected = selected.slice(0, 250);
    setSelectedCustomers(finalSelected);
    setManualSelections(newManualSelections);
    setFiltering(false); // Stop loading animation

    console.log(`Total selected: ${finalSelected.length}, Unique phones: ${selectedPhones.size}`);

    if (Object.keys(newManualSelections).length > 0) {
      alert(`${Object.keys(newManualSelections).length} route(s) have less than 10 customers. Random customers auto-selected. You can manually add more if needed.`);
    }
  };

  // Select gold gift winner for each route
  const selectGoldWinners = () => {
    const winners = {};
    
    routeData.forEach(route => {
      if (route.customers.length > 0) {
        // Get previously selected winners for this route
        const previousWinners = goldWinners[route.name] || [];
        
        // Filter out previously selected winners
        const availableCustomers = route.customers.filter(
          c => !previousWinners.some(w => w.phone === c.phone)
        );

        if (availableCustomers.length > 0) {
          // Randomly select one customer
          const randomIndex = Math.floor(Math.random() * availableCustomers.length);
          const winner = availableCustomers[randomIndex];
          
          // Add to previous winners list
          winners[route.name] = [...previousWinners, winner];
        } else {
          // All customers have been selected, reset
          const randomIndex = Math.floor(Math.random() * route.customers.length);
          winners[route.name] = [route.customers[randomIndex]];
        }
      }
    });

    setGoldWinners(winners);
  };

  // Get the latest gold winner for a route
  const getLatestGoldWinner = (routeName) => {
    const winners = goldWinners[routeName];
    if (winners && winners.length > 0) {
      return winners[winners.length - 1];
    }
    return null;
  };

  // Handle manual selection for routes with < 10 customers
  const handleManualSelection = (routeName, customer) => {
    setManualSelections(prev => {
      const route = prev[routeName];
      const isSelected = route.selected.some(c => c.phone === customer.phone);
      
      return {
        ...prev,
        [routeName]: {
          ...route,
          selected: isSelected
            ? route.selected.filter(c => c.phone !== customer.phone)
            : [...route.selected, customer]
        }
      };
    });
  };

  // Add manually selected customers to main selection
  // Only add customers that are NOT already in the selected list
  const addManualSelections = () => {
    const manuallySelected = [];
    const existingPhones = new Set(selectedCustomers.map(c => c.phone));
    
    Object.values(manualSelections).forEach(route => {
      route.selected.forEach(customer => {
        // Only add if not already in the list
        if (!existingPhones.has(customer.phone)) {
          manuallySelected.push(customer);
          existingPhones.add(customer.phone);
        }
      });
    });

    if (manuallySelected.length > 0) {
      setSelectedCustomers(prev => [...prev, ...manuallySelected]);
      alert(`Added ${manuallySelected.length} additional manually selected customers to the gift list.`);
    } else {
      alert('All selected customers are already in the list.');
    }
    
    setShowManualModal(false);
  };

  // Save gift distribution to database
  const saveGiftDistribution = async () => {
    if (selectedCustomers.length === 0) {
      alert("Please filter customers first!");
      return;
    }

    if (!window.confirm(`Save gift distribution for ${selectedCustomers.length} customers?`)) {
      return;
    }

    try {
      const giftRef = ref(db, `giftDistribution/${new Date().getFullYear()}`);
      await set(giftRef, {
        customers: selectedCustomers,
        goldWinners: goldWinners,
        date: new Date().toISOString(),
        timestamp: Date.now()
      });

      alert("Gift distribution saved successfully!");
    } catch (error) {
      alert("Error saving gift distribution: " + error.message);
    }
  };

  const totalGiftRecipients = selectedCustomers.length + 
    Object.values(manualSelections).reduce((sum, route) => sum + route.selected.length, 0);

  return (
    <div className="container-fluid fade-in-up">
      {/* Header */}
      <div className="card border-0 mb-4" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <div className="me-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center"
                     style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.2)' }}>
                  <span style={{ fontSize: '1.5rem' }}>🎁</span>
                </div>
              </div>
              <div>
                <h4 className="mb-1 fw-bold">Gift Distribution System</h4>
                <p className="mb-0 opacity-75">Automatic customer selection for gift distribution</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--primary-gradient)' }}>
              👥
            </div>
            <h3 className="stats-number">{allCustomers.length}</h3>
            <p className="stats-label">Total Customers</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--success-gradient)' }}>
              📍
            </div>
            <h3 className="stats-number">{routeData.length}</h3>
            <p className="stats-label">Total Routes</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--warning-gradient)' }}>
              🎁
            </div>
            <h3 className="stats-number">{totalGiftRecipients}</h3>
            <p className="stats-label">Gift Recipients</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--secondary-gradient)' }}>
              🏆
            </div>
            <h3 className="stats-number">{Object.keys(goldWinners).length}</h3>
            <p className="stats-label">Gold Winners</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="card mb-4">
        <div className="card-body text-center p-4">
          <h5 className="mb-3">Gift Distribution Actions</h5>
          <div className="d-flex gap-3 justify-content-center flex-wrap">
            <button
              className="btn btn-primary btn-lg"
              onClick={filterCustomers}
              disabled={loading}
            >
              <span className="me-2">🎯</span>
              Filter 250 Customers
            </button>
            
            <button
              className="btn btn-warning btn-lg"
              onClick={selectGoldWinners}
              disabled={loading || routeData.length === 0}
            >
              <span className="me-2">🏆</span>
              Select Gold Winners
            </button>

            {Object.keys(manualSelections).length > 0 && (
              <button
                className="btn btn-info btn-lg"
                onClick={() => setShowManualModal(true)}
              >
                <span className="me-2">✋</span>
                Manual Selection ({Object.keys(manualSelections).length} routes)
              </button>
            )}

            <button
              className="btn btn-success btn-lg"
              onClick={saveGiftDistribution}
              disabled={selectedCustomers.length === 0}
            >
              <span className="me-2">💾</span>
              Save Distribution
            </button>
          </div>
        </div>
      </div>

      {/* Gift Distribution Rules */}
      <div className="card mb-4 border-info">
        <div className="card-header bg-info text-white">
          <h6 className="mb-0">📋 Gift Distribution Rules</h6>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-4">
              <div className="p-3 bg-primary bg-opacity-10 rounded mb-3">
                <h6 className="text-primary mb-2">🎁 Regular Gifts (250 Customers)</h6>
                <ul className="mb-0 small">
                  <li>Proportional selection based on route size</li>
                  <li>10 customers = 1 gift</li>
                  <li>20 customers = 2 gifts</li>
                  <li>30 customers = 3 gifts (and so on)</li>
                </ul>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 bg-warning bg-opacity-10 rounded mb-3">
                <h6 className="text-warning mb-2">✋ Manual Selection</h6>
                <ul className="mb-0 small">
                  <li>Routes with less than 10 customers</li>
                  <li>Admin can manually select multiple customers</li>
                  <li>Added to the filtered list after selection</li>
                </ul>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 bg-success bg-opacity-10 rounded mb-3">
                <h6 className="text-success mb-2">🏆 Gold Gift (One per Route)</h6>
                <ul className="mb-0 small">
                  <li>One random customer per route</li>
                  <li>Different customer on each click</li>
                  <li>No repeats until all customers selected</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Route-wise Gift Allocation */}
      <div className="card mb-4">
        <div className="card-header">
          <h6 className="mb-0">📊 Route-wise Gift Allocation</h6>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-5">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table mb-0">
                <thead>
                  <tr>
                    <th>Route Name</th>
                    <th>Total Customers</th>
                    <th>Gift Eligible Count</th>
                    <th>Latest Gold Winner</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {routeData.map((route, index) => {
                    const goldWinner = getLatestGoldWinner(route.name);
                    const isSmallRoute = route.customers.length < 10;

                    return (
                      <tr key={index} className={isSmallRoute ? 'table-warning' : ''}>
                        <td className="fw-semibold">{route.name}</td>
                        <td>{route.totalCustomers}</td>
                        <td>
                          {isSmallRoute ? (
                            <span className="badge bg-warning text-dark">
                              Manual Selection Required
                            </span>
                          ) : (
                            <span className="badge bg-success">
                              {route.giftEligibleCount} gifts
                            </span>
                          )}
                        </td>
                        <td>
                          {goldWinner ? (
                            <div>
                              <div className="fw-semibold text-success">🏆 {goldWinner.name}</div>
                              <small className="text-muted">{goldWinner.phone}</small>
                            </div>
                          ) : (
                            <span className="text-muted">Not selected yet</span>
                          )}
                        </td>
                        <td>
                          {isSmallRoute && (
                            <span className="badge bg-warning">
                              &lt; 10 customers
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Selected Customers for Gifts */}
      {selectedCustomers.length > 0 && (
        <div className="card mb-4">
          <div className="card-header bg-success text-white">
            <h6 className="mb-0">🎁 Selected Customers for Gifts ({selectedCustomers.length})</h6>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="table mb-0">
                <thead className="sticky-top bg-light">
                  <tr>
                    <th>#</th>
                    <th>Customer Name</th>
                    <th>Phone</th>
                    <th>Agent</th>
                    <th>Routes</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCustomers.map((customer, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td className="fw-semibold">{customer.name}</td>
                      <td>{customer.phone}</td>
                      <td>{customer.agentName}</td>
                      <td>
                        {customer.routes.map((route, i) => (
                          <span key={i} className="badge bg-primary me-1">{route}</span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manual Selection Modal */}
      {showManualModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-warning">
                <h5 className="modal-title">✋ Manual Customer Selection</h5>
                <button type="button" className="btn-close" onClick={() => setShowManualModal(false)}></button>
              </div>
              <div className="modal-body">
                <p className="alert alert-info">
                  Select customers from routes with less than 10 customers. You can select multiple customers per route.
                </p>
                
                {Object.entries(manualSelections).map(([routeName, routeData]) => (
                  <div key={routeName} className="mb-4">
                    <h6 className="bg-light p-2 rounded">
                      📍 {routeName} ({routeData.customers.length} customers) - 
                      <span className="text-success ms-2">{routeData.selected.length} selected</span>
                    </h6>
                    <div className="list-group">
                      {routeData.customers.map((customer, index) => {
                        const isSelected = routeData.selected.some(c => c.phone === customer.phone);
                        return (
                          <div
                            key={index}
                            className={`list-group-item list-group-item-action ${isSelected ? 'active' : ''}`}
                            onClick={() => handleManualSelection(routeName, customer)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <div className="fw-semibold">{customer.name}</div>
                                <small>{customer.phone} - Agent: {customer.agentName}</small>
                              </div>
                              {isSelected && <span className="badge bg-success">✓ Selected</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowManualModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-success" onClick={addManualSelections}>
                  Add Selected Customers ({Object.values(manualSelections).reduce((sum, route) => sum + route.selected.length, 0)})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
