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
  const [villageData, setVillageData] = useState({});
  const [showVillageModal, setShowVillageModal] = useState(false);
  const [selectedRouteForVillages, setSelectedRouteForVillages] = useState(null);

  useEffect(() => {
    loadCustomersAndRoutes();
  }, []);

  const loadCustomersAndRoutes = async () => {
    setLoading(true);
    try {
      const agents = await getAllAgents();
      const customers = [];
      const routeMap = {};

      // Load routes with villages from Firebase
      const routesRef = ref(db, 'routes');
      const routesSnapshot = await get(routesRef);
      const routesWithVillages = {};
      
      if (routesSnapshot.exists()) {
        const routesData = routesSnapshot.val();
        Object.entries(routesData).forEach(([id, route]) => {
          routesWithVillages[route.name] = route.villages || [];
        });
      }

      // Collect all customers and organize by routes
      for (const agent of agents) {
        if (agent.customers) {
          const agentRoutes = agent.routes || [];
          // Normalize routes to strings
          const normalizedRoutes = agentRoutes.map(r => typeof r === 'object' ? r.name : r);
          
          Object.entries(agent.customers).forEach(([key, customer]) => {
            // Debug: Log customer data structure to see available fields
            if (customers.length === 0) {
              console.log("Sample customer data structure:", customer);
              console.log("Available fields:", Object.keys(customer));
            }
            
            const customerData = {
              id: key,
              customerKey: key,
              customerId: customer.customerId || key,
              name: customer.name || customer.customerName || '',
              phone: customer.phoneNumber || customer.phone || customer.mobileNumber || key,
              agentName: agent.name,
              agentPhone: agent.phone,
              routes: normalizedRoutes,
              village: customer.village || customer.address || customer.location || customer.city || 'Unknown Village',
              principalAmount: customer.principalAmount || 0,
              balance: customer.balance || 0,
              status: customer.status || 'active'
            };

            customers.push(customerData);

            // Add customer to each route
            normalizedRoutes.forEach(route => {
              if (!routeMap[route]) {
                routeMap[route] = [];
              }
              routeMap[route].push(customerData);
            });
          });
        }
      }

      // Convert route map to array and organize by villages
      const routes = Object.entries(routeMap).map(([routeName, customers]) => {
        const villageMap = {};
        const routeVillages = routesWithVillages[routeName] || [];
        
        // Group customers by village
        customers.forEach(customer => {
          const village = customer.village || 'Unknown Village';
          if (!villageMap[village]) {
            villageMap[village] = [];
          }
          villageMap[village].push(customer);
        });

        // Add empty villages from route configuration
        routeVillages.forEach(village => {
          if (!villageMap[village]) {
            villageMap[village] = [];
          }
        });

        const villageDistribution = Object.entries(villageMap).map(([villageName, villageCustomers]) => ({
          name: villageName,
          customers: villageCustomers,
          totalCustomers: villageCustomers.length,
          giftEligibleCount: Math.floor(villageCustomers.length / 10)
        }));

        return {
          name: routeName,
          customers: customers,
          totalCustomers: customers.length,
          giftEligibleCount: Math.floor(customers.length / 10),
          villages: villageDistribution,
          configuredVillages: routeVillages
        };
      });

      setAllCustomers(customers);
      setRouteData(routes);
      
      // Initialize village data for detailed view
      const initialVillageData = {};
      routes.forEach(route => {
        initialVillageData[route.name] = route.villages;
      });
      setVillageData(initialVillageData);
      
    } catch (error) {
      console.error("Error loading customers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter customers based on VILLAGE-WISE proportional logic
  // Each village within a route gets gifts based on its customer count
  // 10 customers = 1 gift, 20 customers = 2 gifts, 30 customers = 3 gifts, etc.
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
    const villageGiftSummary = {}; // Track village-wise gift distribution

    routeData.forEach(route => {
      console.log(`\n🔍 Processing Route: ${route.name}`);
      villageGiftSummary[route.name] = [];
      
      // Process each village within the route
      if (route.villages && route.villages.length > 0) {
        route.villages.forEach(village => {
          const villageCustomers = village.customers || [];
          const villageCustomerCount = villageCustomers.length;
          const villageGiftCount = Math.floor(villageCustomerCount / 10); // 1 gift per 10 customers
          
          console.log(`  🏘️ Village: ${village.name} - ${villageCustomerCount} customers - ${villageGiftCount} gifts`);
          
          villageGiftSummary[route.name].push({
            villageName: village.name,
            totalCustomers: villageCustomerCount,
            giftsAllocated: villageGiftCount
          });
          
          if (villageCustomerCount < 10 && villageCustomerCount > 0) {
            // Villages with less than 10 customers - add to manual selection
            if (!newManualSelections[`${route.name} - ${village.name}`]) {
              newManualSelections[`${route.name} - ${village.name}`] = {
                customers: villageCustomers,
                selected: [] // Will be manually selected
              };
            }
          } else if (villageGiftCount > 0) {
            // Villages with 10+ customers - automatic gift distribution
            // Fisher-Yates shuffle for random selection
            const customersCopy = [...villageCustomers];
            for (let i = customersCopy.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [customersCopy[i], customersCopy[j]] = [customersCopy[j], customersCopy[i]];
            }
            
            // Select customers from this village, avoiding duplicates
            const villageSelected = [];
            for (const customer of customersCopy) {
              if (villageSelected.length >= villageGiftCount) break;
              // Only add if phone number not already selected
              if (!selectedPhones.has(customer.phone)) {
                villageSelected.push({
                  ...customer,
                  selectedFromVillage: village.name,
                  selectedFromRoute: route.name
                });
                selectedPhones.add(customer.phone);
              }
            }
            
            selected.push(...villageSelected);
            console.log(`    ✅ Selected ${villageSelected.length} customers from ${village.name}`);
          }
        });
      } else {
        // Fallback: If no village data, treat entire route as one unit (old logic)
        const routeCustomerCount = route.customers.length;
        const routeGiftCount = Math.floor(routeCustomerCount / 10);
        
        console.log(`  📍 Route (no villages): ${route.name} - ${routeCustomerCount} customers - ${routeGiftCount} gifts`);
        
        if (routeCustomerCount < 10) {
          // Small routes - manual selection
          newManualSelections[route.name] = {
            customers: route.customers,
            selected: []
          };
        } else if (routeGiftCount > 0) {
          // Large routes - automatic selection
          const customersCopy = [...route.customers];
          for (let i = customersCopy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [customersCopy[i], customersCopy[j]] = [customersCopy[j], customersCopy[i]];
          }
          
          const routeSelected = [];
          for (const customer of customersCopy) {
            if (routeSelected.length >= routeGiftCount) break;
            if (!selectedPhones.has(customer.phone)) {
              routeSelected.push({
                ...customer,
                selectedFromVillage: 'Route Level',
                selectedFromRoute: route.name
              });
              selectedPhones.add(customer.phone);
            }
          }
          
          selected.push(...routeSelected);
        }
      }
    });

    // Shuffle the final selected array to mix customers from different villages/routes
    for (let i = selected.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selected[i], selected[j]] = [selected[j], selected[i]];
    }

    // No limit - select all eligible customers based on village-wise logic
    const finalSelected = selected;
    setSelectedCustomers(finalSelected);
    setManualSelections(newManualSelections);
    setFiltering(false); // Stop loading animation

    // Display village-wise gift distribution summary
    console.log(`\n🎁 VILLAGE-WISE GIFT DISTRIBUTION SUMMARY:`);
    console.log(`Total selected: ${finalSelected.length}, Unique phones: ${selectedPhones.size}`);
    
    Object.entries(villageGiftSummary).forEach(([routeName, villages]) => {
      console.log(`\n📍 Route: ${routeName}`);
      villages.forEach(village => {
        console.log(`  🏘️ ${village.villageName}: ${village.totalCustomers} customers → ${village.giftsAllocated} gifts`);
      });
    });

    // Show summary alert
    let summaryMessage = `🎁 Village-wise Gift Distribution Complete!\n\n`;
    summaryMessage += `✅ Total Gifts Distributed: ${finalSelected.length}\n`;
    summaryMessage += `📍 Routes Processed: ${Object.keys(villageGiftSummary).length}\n`;
    
    if (Object.keys(newManualSelections).length > 0) {
      summaryMessage += `\n⚠️ Manual Selection Required:\n`;
      summaryMessage += `${Object.keys(newManualSelections).length} village(s) have less than 10 customers.\n`;
      summaryMessage += `Please use manual selection to add customers from these villages.`;
    }
    
    alert(summaryMessage);
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

  // Show village-wise distribution for a route
  const showVillageDistribution = (route) => {
    setSelectedRouteForVillages(route);
    setShowVillageModal(true);
  };

  // Get village statistics for a route
  const getVillageStats = (route) => {
    if (!route.villages) return { totalVillages: 0, villagesWithCustomers: 0 };
    
    const totalVillages = route.villages.length;
    const villagesWithCustomers = route.villages.filter(v => v.totalCustomers > 0).length;
    
    return { totalVillages, villagesWithCustomers };
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

  // Save gift distribution to database and update inventory
  const saveGiftDistribution = async (giftType = 'regular') => {
    if (selectedCustomers.length === 0) {
      alert("Please filter customers first!");
      return;
    }

    if (!window.confirm(`Save gift distribution for ${selectedCustomers.length} customers?`)) {
      return;
    }

    try {
      // Save distribution record
      const distributionId = `dist_${Date.now()}`;
      const giftRef = ref(db, `giftDistribution/${distributionId}`);
      await set(giftRef, {
        id: distributionId,
        customers: selectedCustomers,
        goldWinners: goldWinners,
        giftType: giftType,
        totalRecipients: selectedCustomers.length,
        date: new Date().toISOString(),
        timestamp: Date.now(),
        year: new Date().getFullYear()
      });

      // Add to gift distribution history
      const historyId = `history_${Date.now()}`;
      const historyRef = ref(db, `giftDistributionHistory/${historyId}`);
      await set(historyRef, {
        id: historyId,
        type: 'gift_distribution',
        giftType: giftType,
        quantity: selectedCustomers.length,
        recipients: selectedCustomers.map(c => ({
          name: c.name,
          phone: c.phone,
          agentName: c.agentName,
          village: c.village
        })),
        date: new Date().toISOString(),
        description: `Distributed ${selectedCustomers.length} ${giftType} gifts to customers`
      });

      // Update inventory if gift type is specified
      if (giftType !== 'regular') {
        // This would integrate with the inventory system
        // For now, we'll just log it
        console.log(`Would update inventory for ${giftType} gifts: ${selectedCustomers.length} units`);
      }

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
              Village-wise Gift Distribution
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
          {/* Village-wise Distribution Rules */}
          <div className="row mb-3">
            <div className="col-md-4">
              <div className="p-3 bg-primary bg-opacity-10 rounded mb-3">
                <h6 className="text-primary mb-2">🎁 Village-wise Gift Distribution</h6>
                <ul className="mb-0 small">
                  <li><strong>Village-based allocation:</strong> Each village gets gifts based on its customer count</li>
                  <li><strong>10 customers = 1 gift</strong></li>
                  <li><strong>20 customers = 2 gifts</strong></li>
                  <li><strong>30 customers = 3 gifts</strong> (and so on)</li>
                  <li>No customer limit - all eligible customers selected</li>
                </ul>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 bg-warning bg-opacity-10 rounded mb-3">
                <h6 className="text-warning mb-2">✋ Manual Selection</h6>
                <ul className="mb-0 small">
                  <li><strong>Villages with less than 10 customers</strong></li>
                  <li>Admin can manually select multiple customers</li>
                  <li>Added to the filtered list after selection</li>
                  <li>Ensures fair distribution for small villages</li>
                </ul>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 bg-success bg-opacity-10 rounded mb-3">
                <h6 className="text-success mb-2">🏆 Gold Gift (One per Route)</h6>
                <ul className="mb-0 small">
                  <li>One random customer per route (not village-based)</li>
                  <li>Different customer on each click</li>
                  <li>No repeats until all customers selected</li>
                  <li>Independent of village-wise distribution</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Village-wise Distribution Rules */}
          <div className="border-top pt-3">
            <h6 className="text-info mb-3">🏘️ Village-wise Distribution Rules</h6>
            <div className="row">
              <div className="col-md-6">
                <div className="p-3 bg-info bg-opacity-10 rounded mb-3">
                  <h6 className="text-info mb-2">📍 Village Distribution Logic</h6>
                  <ul className="mb-0 small">
                    <li><strong>Within each route:</strong> Villages get proportional gifts</li>
                    <li><strong>Village size ≥ 10:</strong> 1 gift per 10 customers</li>
                    <li><strong>Village size &lt; 10:</strong> Manual selection required</li>
                    <li><strong>Fair distribution:</strong> Larger villages get more gifts</li>
                  </ul>
                </div>
              </div>
              <div className="col-md-6">
                <div className="p-3 bg-secondary bg-opacity-10 rounded mb-3">
                  <h6 className="text-secondary mb-2">🎯 Village Examples</h6>
                  <ul className="mb-0 small">
                    <li><strong>Village A (25 customers):</strong> 2 gifts</li>
                    <li><strong>Village B (15 customers):</strong> 1 gift</li>
                    <li><strong>Village C (8 customers):</strong> Manual selection</li>
                    <li><strong>Total route gifts:</strong> Sum of all village gifts</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Live Village Statistics */}
            {routeData.length > 0 && (
              <div className="mt-3">
                <h6 className="text-success mb-3">📊 Live Village Statistics</h6>
                <div className="row">
                  {routeData.slice(0, 3).map((route, index) => (
                    <div key={index} className="col-md-4">
                      <div className="p-3 bg-light rounded mb-3 border">
                        <h6 className="text-dark mb-2">📍 {route.name}</h6>
                        <div className="small">
                          <div className="d-flex justify-content-between">
                            <span>Total Villages:</span>
                            <strong>{route.villages?.length || 0}</strong>
                          </div>
                          <div className="d-flex justify-content-between">
                            <span>Villages with Customers:</span>
                            <strong>{route.villages?.filter(v => v.totalCustomers > 0).length || 0}</strong>
                          </div>
                          <div className="d-flex justify-content-between">
                            <span>Total Customers:</span>
                            <strong>{route.totalCustomers}</strong>
                          </div>
                          <div className="d-flex justify-content-between">
                            <span>Total Gifts:</span>
                            <strong className="text-success">{route.giftEligibleCount}</strong>
                          </div>
                          <hr className="my-2" />
                          <div className="text-muted">
                            <strong>Top Villages:</strong>
                            {route.villages?.slice(0, 2).map((village, vIndex) => (
                              <div key={vIndex} className="d-flex justify-content-between">
                                <span className="text-truncate" style={{maxWidth: '120px'}}>{village.name}:</span>
                                <span>{village.totalCustomers} customers</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {routeData.length > 3 && (
                  <div className="text-center">
                    <small className="text-muted">
                      Showing 3 of {routeData.length} routes. Click "📍 View" in the table below for detailed village breakdown.
                    </small>
                  </div>
                )}
              </div>
            )}
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
                    <th>Villages</th>
                    <th>Gift Eligible Count</th>
                    <th>Latest Gold Winner</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {routeData.map((route, index) => {
                    const goldWinner = getLatestGoldWinner(route.name);
                    const isSmallRoute = route.customers.length < 10;
                    const villageStats = getVillageStats(route);

                    return (
                      <tr key={index} className={isSmallRoute ? 'table-warning' : ''}>
                        <td className="fw-semibold">{route.name}</td>
                        <td>{route.totalCustomers}</td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-info">
                              {villageStats.villagesWithCustomers}/{villageStats.totalVillages} villages
                            </span>
                            <button 
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => showVillageDistribution(route)}
                              title="View village details"
                            >
                              📍 View
                            </button>
                          </div>
                        </td>
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
                    <th>Sr no</th>
                    <th>Customer Name</th>
                    <th>Phone</th>
                    <th>Agent</th>
                    <th>Village</th>
                    <th>Selected From</th>
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
                        <span className="badge bg-info">
                          {customer.village || 'Unknown Village'}
                        </span>
                      </td>
                      <td>
                        {customer.selectedFromVillage ? (
                          <div>
                            <span className="badge bg-success mb-1">
                              🏘️ {customer.selectedFromVillage}
                            </span>
                            <br/>
                            <small className="text-muted">in {customer.selectedFromRoute}</small>
                          </div>
                        ) : (
                          <span className="badge bg-secondary">Route Level</span>
                        )}
                      </td>
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

      {/* Village Distribution Modal */}
      {showVillageModal && selectedRouteForVillages && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  📍 Village Distribution - {selectedRouteForVillages.name}
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowVillageModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-4">
                    <div className="card bg-info text-white">
                      <div className="card-body text-center">
                        <h4>{selectedRouteForVillages.totalCustomers}</h4>
                        <p className="mb-0">Total Customers</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card bg-success text-white">
                      <div className="card-body text-center">
                        <h4>{selectedRouteForVillages.villages?.length || 0}</h4>
                        <p className="mb-0">Total Villages</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card bg-warning text-white">
                      <div className="card-body text-center">
                        <h4>{selectedRouteForVillages.giftEligibleCount}</h4>
                        <p className="mb-0">Gift Eligible</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Village Name</th>
                        <th>Total Customers</th>
                        <th>Gift Eligible Count</th>
                        <th>Gift Distribution Logic</th>
                        <th>Customer Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRouteForVillages.villages?.map((village, index) => (
                        <tr key={index}>
                          <td className="fw-semibold">
                            <span className="me-2">🏘️</span>
                            {village.name}
                          </td>
                          <td>
                            <span className="badge bg-primary">
                              {village.totalCustomers}
                            </span>
                          </td>
                          <td>
                            {village.totalCustomers < 10 ? (
                              <span className="badge bg-warning text-dark">
                                Manual Selection
                              </span>
                            ) : (
                              <span className="badge bg-success">
                                {village.giftEligibleCount} gifts
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="small">
                              {village.totalCustomers < 10 ? (
                                <div className="text-warning">
                                  <strong>Manual Selection Required:</strong><br/>
                                  • Less than 10 customers<br/>
                                  • Admin can select multiple customers<br/>
                                  • Proportional to village size
                                </div>
                              ) : (
                                <div className="text-success">
                                  <strong>Automatic Selection:</strong><br/>
                                  • 1 gift per 10 customers<br/>
                                  • Random selection algorithm<br/>
                                  • {Math.floor(village.totalCustomers / 10)} gifts allocated
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            {village.customers.length > 0 ? (
                              <div className="small">
                                <strong>Sample Customers:</strong><br/>
                                {village.customers.slice(0, 3).map((customer, idx) => (
                                  <div key={idx} className="text-muted">
                                    • {customer.name || 'Unknown'} ({customer.phone})
                                  </div>
                                ))}
                                {village.customers.length > 3 && (
                                  <div className="text-muted">
                                    ... and {village.customers.length - 3} more
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted">No customers</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Village-wise Gift Distribution Logic Summary */}
                <div className="card mt-4 border-info">
                  <div className="card-header bg-info text-white">
                    <h6 className="mb-0">🎯 Village-wise Gift Distribution Logic</h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <h6 className="text-primary">Automatic Distribution Rules:</h6>
                        <ul className="small">
                          <li><strong>10+ customers per village:</strong> 1 gift per 10 customers</li>
                          <li><strong>Random selection:</strong> Fisher-Yates shuffle algorithm</li>
                          <li><strong>No duplicates:</strong> Phone number based uniqueness</li>
                          <li><strong>Proportional allocation:</strong> Larger villages get more gifts</li>
                        </ul>
                      </div>
                      <div className="col-md-6">
                        <h6 className="text-warning">Manual Selection Rules:</h6>
                        <ul className="small">
                          <li><strong>&lt;10 customers per village:</strong> Manual selection required</li>
                          <li><strong>Admin control:</strong> Can select multiple customers</li>
                          <li><strong>Flexible allocation:</strong> Based on village importance</li>
                          <li><strong>Minimum guarantee:</strong> At least 1 customer per small village</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
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
