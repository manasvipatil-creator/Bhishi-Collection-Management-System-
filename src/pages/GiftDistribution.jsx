import React, { useEffect, useState, useRef } from "react";
import { getAllAgents } from "../utils/databaseHelpers";
import { ref, get, set } from "firebase/database";
import { db } from "../firebase";
import "./GiftDistribution.css";

// Simple Confetti Component using Canvas
const Confetti = ({ active }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particles = [];
    const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

    for (let i = 0; i < 200; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        speedY: Math.random() * 3 + 2,
        speedX: Math.random() * 2 - 1
      });
    }

    const animate = () => {
      if (!active) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.y += p.speedY;
        p.x += p.speedX;
        if (p.y > canvas.height) p.y = -10;

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [active]);

  if (!active) return null;
  return <canvas ref={canvasRef} className="confetti-canvas" />;
};

export default function GiftDistribution() {
  const [allCustomers, setAllCustomers] = useState([]);
  const [routeData, setRouteData] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [manuallySelectedCustomers, setManuallySelectedCustomers] = useState([]);
  const [goldWinners, setGoldWinners] = useState({});
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [manualSelections, setManualSelections] = useState({});
  const [showManualModal, setShowManualModal] = useState(false);
  const [showVillageModal, setShowVillageModal] = useState(false);
  const [selectedRouteForVillages, setSelectedRouteForVillages] = useState(null);

  // Animation States
  const [showCelebration, setShowCelebration] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [distributionSummary, setDistributionSummary] = useState(null);
  const [savedDistributions, setSavedDistributions] = useState([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [showHistoryDetailModal, setShowHistoryDetailModal] = useState(false);

  useEffect(() => {
    loadCustomersAndRoutes();
    loadSavedDistributions();
  }, []);

  const loadSavedDistributions = async () => {
    try {
      const giftRef = ref(db, 'giftDistribution');
      const snapshot = await get(giftRef);
      if (snapshot.exists()) {
        const data = Object.values(snapshot.val());
        setSavedDistributions(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
    } catch (error) {
      console.error("Error loading saved distributions:", error);
    }
  };

  const loadCustomersAndRoutes = async () => {
    setLoading(true);
    try {
      const agents = await getAllAgents();
      const customers = [];
      const routeMap = {};

      const routesRef = ref(db, 'routes');
      const routesSnapshot = await get(routesRef);
      const routesWithVillages = {};

      if (routesSnapshot.exists()) {
        const routesData = routesSnapshot.val();
        Object.entries(routesData).forEach(([id, route]) => {
          routesWithVillages[route.name] = route.villages || [];
        });
      }

      for (const agent of agents) {
        if (agent.customers) {
          const agentRoutes = agent.routes || [];
          const normalizedRoutes = agentRoutes.map(r => typeof r === 'object' ? r.name : r);

          Object.entries(agent.customers).forEach(([key, customer]) => {
            const customerData = {
              id: key,
              customerKey: key,
              customerId: customer.customerId || key,
              name: customer.name || customer.customerName || '',
              phone: customer.phoneNumber || customer.phone || customer.mobileNumber || key,
              agentName: agent.name,
              agentPhone: agent.phone,
              routes: normalizedRoutes,
              village: customer.village || customer.address || 'Unknown Village',
              status: customer.status || 'active'
            };

            customers.push(customerData);

            normalizedRoutes.forEach(route => {
              if (!routeMap[route]) routeMap[route] = [];
              routeMap[route].push(customerData);
            });
          });
        }
      }

      const routes = Object.entries(routeMap).map(([routeName, customers]) => {
        const villageMap = {};
        const routeVillages = routesWithVillages[routeName] || [];

        customers.forEach(customer => {
          const village = customer.village || 'Unknown Village';
          if (!villageMap[village]) villageMap[village] = [];
          villageMap[village].push(customer);
        });

        routeVillages.forEach(village => {
          if (!villageMap[village]) villageMap[village] = [];
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
          giftEligibleCount: customers.length > 0 ? 1 : 0,
          villages: villageDistribution,
          configuredVillages: routeVillages
        };
      });

      setAllCustomers(customers);
      setRouteData(routes);

    } catch (error) {
      console.error("Error loading customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = async () => {
    setFiltering(true);
    setSelectedCustomers([]);

    // Animated Countdown
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    setCountdown(null);

    // Simulate complex calculation wait
    await new Promise(resolve => setTimeout(resolve, 800));

    const selected = [];
    const selectedPhones = new Set();
    const newManualSelections = {};

    routeData.forEach(route => {
      if (route.villages && route.villages.length > 0) {
        route.villages.forEach(village => {
          const villageCustomers = village.customers || [];
          const villageCustomerCount = villageCustomers.length;
          const villageGiftCount = Math.floor(villageCustomerCount / 10);

          if (villageCustomerCount < 10 && villageCustomerCount > 0) {
            if (!newManualSelections[`${route.name} - ${village.name}`]) {
              newManualSelections[`${route.name} - ${village.name}`] = {
                customers: villageCustomers,
                selected: []
              };
            }
          } else if (villageGiftCount > 0) {
            const customersCopy = [...villageCustomers];
            // Fisher-Yates
            for (let i = customersCopy.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [customersCopy[i], customersCopy[j]] = [customersCopy[j], customersCopy[i]];
            }

            for (const customer of customersCopy) {
              if (selected.filter(s => s.selectedFromVillage === village.name).length >= villageGiftCount) break;
              if (!selectedPhones.has(customer.phone)) {
                selected.push({
                  ...customer,
                  selectedFromVillage: village.name,
                  selectedFromRoute: route.name
                });
                selectedPhones.add(customer.phone);
              }
            }
          }
        });
      } else {
        // Fallback for no village data
        const routeCustomerCount = route.customers.length;
        const routeGiftCount = Math.floor(routeCustomerCount / 10);

        if (routeCustomerCount < 10) {
          newManualSelections[route.name] = { customers: route.customers, selected: [] };
        } else if (routeGiftCount > 0) {
          const customersCopy = [...route.customers];
          for (let i = customersCopy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [customersCopy[i], customersCopy[j]] = [customersCopy[j], customersCopy[i]];
          }
          for (const customer of customersCopy) {
            if (selected.filter(s => s.selectedFromRoute === route.name).length >= routeGiftCount) break;
            if (!selectedPhones.has(customer.phone)) {
              selected.push({ ...customer, selectedFromVillage: 'Route Level', selectedFromRoute: route.name });
              selectedPhones.add(customer.phone);
            }
          }
        }
      }
    });

    // Final shuffle
    for (let i = selected.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selected[i], selected[j]] = [selected[j], selected[i]];
    }

    setSelectedCustomers(selected);
    setManualSelections(newManualSelections);
    setFiltering(false);

    // Show Celebration
    setDistributionSummary({
      count: selected.length,
      manual: Object.keys(newManualSelections).length
    });
    setShowCelebration(true);
    setShowResultModal(true);

    // Hide confetti after 5 seconds
    setTimeout(() => setShowCelebration(false), 5000);
  };

  const selectGoldWinners = () => {
    const winners = {};

    routeData.forEach(route => {
      const previousWinners = goldWinners[route.name] || [];
      const allCustomers = route.customers;
      const available = allCustomers.filter(c => !previousWinners.some(w => w.phone === c.phone));

      if (available.length > 0) {
        winners[route.name] = [...previousWinners, available[Math.floor(Math.random() * available.length)]];
      } else {
        winners[route.name] = [allCustomers[Math.floor(Math.random() * allCustomers.length)]];
      }
    });

    setGoldWinners(winners);
  };

  const saveGiftDistribution = async (giftType = 'regular') => {
    const totalCustomers = selectedCustomers.length + manuallySelectedCustomers.length;
    if (totalCustomers === 0) return alert("Please filter customers first!");

    if (!window.confirm(`Save distribution for ${totalCustomers} customers?`)) return;

    try {
      const allSelected = [
        ...selectedCustomers.map(c => ({ ...c, selectionType: 'auto' })),
        ...manuallySelectedCustomers.map(c => ({ ...c, selectionType: 'manual' }))
      ];

      const distributionId = `dist_${Date.now()}`;
      await set(ref(db, `giftDistribution/${distributionId}`), {
        id: distributionId,
        allCustomers: allSelected,
        goldWinners,
        totalRecipients: totalCustomers,
        date: new Date().toISOString(),
        year: new Date().getFullYear()
      });

      alert("Saved successfully!");
      loadSavedDistributions();
    } catch (error) {
      alert("Error saving: " + error.message);
    }
  };

  // Helper UI functions
  const getLatestGoldWinner = (routeName) => {
    const winners = goldWinners[routeName];
    return winners ? winners[winners.length - 1] : null;
  };

  const handleManualSelection = (routeName, customer) => {
    setManualSelections(prev => {
      const route = prev[routeName];
      const selected = route.selected.some(c => c.phone === customer.phone)
        ? route.selected.filter(c => c.phone !== customer.phone)
        : [...route.selected, customer];
      return { ...prev, [routeName]: { ...route, selected } };
    });
  };

  const addManualSelections = () => {
    const newManuals = [];
    const currentPhones = new Set(manuallySelectedCustomers.map(c => c.phone));

    Object.values(manualSelections).forEach(r => {
      r.selected.forEach(c => {
        if (!currentPhones.has(c.phone)) {
          newManuals.push({ ...c, selectionType: 'manual' });
          currentPhones.add(c.phone);
        }
      });
    });

    setManuallySelectedCustomers(prev => [...prev, ...newManuals]);
    setShowManualModal(false);
  };

  const totalGiftRecipients = selectedCustomers.length + manuallySelectedCustomers.length;

  return (
    <div className="gd-container fade-in-up">
      <Confetti active={showCelebration} />

      {/* Animation Overlay */}
      {filtering && (
        <div className="gift-overlay">
          {countdown ? (
            <div className="countdown-number">{countdown}</div>
          ) : (
            <div className="text-center">
              <div className="gift-box-container">🎁</div>
              <h2 className="gift-count-text">Calculating Winners...</h2>
            </div>
          )}
        </div>
      )}

      {/* Result Modal */}
      {showResultModal && distributionSummary && (
        <div className="gd-modal-overlay">
          <div className="gd-modal celebration-modal">
            <div className="celebration-icon">🎉</div>
            <h2 className="mb-4" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Distribution Complete!</h2>

            <div className="gd-stats-grid mb-4" style={{ justifyContent: 'center' }}>
              <div className="gd-stat-card border" style={{ background: 'var(--success-light)', border: '1px solid var(--success-color)' }}>
                <div className="gd-stat-content" style={{ textAlign: 'center', width: '100%' }}>
                  <h3 style={{ fontSize: '2.5rem', color: 'var(--success-color)' }}>{distributionSummary.count}</h3>
                  <p style={{ fontWeight: 'bold', color: 'var(--gray-800)' }}>Gifts Awarded</p>
                </div>
              </div>
            </div>

            {distributionSummary.manual > 0 && (
              <div className="bg-warning text-dark p-3 rounded mb-4">
                ⚠️ {distributionSummary.manual} villages need manual selection.
              </div>
            )}

            <button
              className="gd-btn gd-btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setShowResultModal(false)}
            >
              View Full List
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="gd-header">
        <div className="gd-title">
          <div className="gd-title-icon">
            🎁
          </div>
          <div className="gd-title-text">
            <h1>Gift Distribution System</h1>
            <p>Automatic customer selection & inventory management</p>
          </div>
        </div>
      </div>

      {/* Stats with Animation Class */}
      <div className="gd-stats-grid">
        <div className="gd-stat-card">
          <div className="gd-stat-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)' }}>👥</div>
          <div className="gd-stat-content">
            <h3 className="animate-number" style={{ '--num': allCustomers.length }}>{allCustomers.length}</h3>
            <p>Total Customers</p>
          </div>
        </div>
        <div className="gd-stat-card">
          <div className="gd-stat-icon" style={{ backgroundColor: 'var(--info-light)', color: 'var(--info-color)' }}>📍</div>
          <div className="gd-stat-content">
            <h3 className="animate-number" style={{ '--num': routeData.length }}>{routeData.length}</h3>
            <p>Active Routes</p>
          </div>
        </div>
        <div className="gd-stat-card">
          <div className="gd-stat-icon" style={{ backgroundColor: 'var(--warning-light)', color: '#d97706' }}>🎁</div>
          <div className="gd-stat-content">
            <h3 key={totalGiftRecipients} className="animate-number" style={{ '--num': totalGiftRecipients }}>{totalGiftRecipients}</h3>
            <p>Recipients</p>
          </div>
        </div>
        <div className="gd-stat-card">
          <div className="gd-stat-icon" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success-color)' }}>🏆</div>
          <div className="gd-stat-content">
            <h3>{Object.keys(goldWinners).length}</h3>
            <p>Gold Winners</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="gd-toolbar">
        <span className="text-muted small fw-bold text-uppercase me-2">Actions:</span>
        <button className="gd-btn gd-btn-primary" onClick={filterCustomers} disabled={loading || filtering}>
          🎯 Process Village Distribution
        </button>
        <button className="gd-btn gd-btn-warning" onClick={selectGoldWinners} disabled={loading || routeData.length === 0}>
          🏆 Select Gold
        </button>
        {Object.keys(manualSelections).length > 0 && (
          <button className="gd-btn gd-btn-secondary" onClick={() => setShowManualModal(true)}>
            ✋ Manual ({Object.keys(manualSelections).length})
          </button>
        )}
        <div style={{ flex: 1 }}></div>
        <button className="gd-btn gd-btn-success" onClick={() => saveGiftDistribution('regular')} disabled={selectedCustomers.length === 0}>
          💾 Save Distribution
        </button>
      </div>

      {/* Main Content Areas */}
      <div className="gd-grid">
        {/* Route List */}
        <div className="gd-card">
          <div className="gd-card-header">
            <div className="gd-card-title">📊 Route Status</div>
          </div>
          <div className="gd-card-body">
            <div className="gd-scroll-area">
              <table className="gd-table">
                <thead>
                  <tr>
                    <th>Route Name</th>
                    <th>Customers</th>
                    <th>Gifts Eligible</th>
                    <th>Gold Winner</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {routeData.map((route, idx) => (
                    <tr key={idx}>
                      <td className="fw-semibold">{route.name}</td>
                      <td>{route.totalCustomers}</td>
                      <td>
                        {route.customers.length === 0 ?
                          <span className="gd-badge gd-badge-warning">0</span> :
                          <span className="gd-badge gd-badge-success">{route.giftEligibleCount}</span>
                        }
                      </td>
                      <td>
                        {getLatestGoldWinner(route.name) ?
                          <span className="text-success fw-bold">🏆 {getLatestGoldWinner(route.name).name}</span> :
                          <span className="text-muted">-</span>
                        }
                      </td>
                      <td>
                        <button className="gd-btn gd-btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => { setSelectedRouteForVillages(route); setShowVillageModal(true); }}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Selected List */}
        <div>
          {selectedCustomers.length > 0 && (
            <div className="gd-card list-item-animate">
              <div className="gd-card-header" style={{ borderLeft: '4px solid var(--success-color)' }}>
                <div className="gd-card-title">🎁 Selected ({selectedCustomers.length})</div>
              </div>
              <div className="gd-card-body">
                <div className="gd-scroll-area">
                  <table className="gd-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>From</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCustomers.map((c, i) => (
                        <tr key={i} className="list-item-animate" style={{ animationDelay: `${i * 0.05}s` }}>
                          <td className="fw-bold">{c.name}</td>
                          <td className="small text-muted">{c.phone}</td>
                          <td><span className="gd-badge gd-badge-info">{c.selectedFromVillage}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {manuallySelectedCustomers.length > 0 && (
            <div className="gd-card list-item-animate">
              <div className="gd-card-header" style={{ borderLeft: '4px solid var(--warning-color)' }}>
                <div className="gd-card-title">✋ Manual ({manuallySelectedCustomers.length})</div>
                <button className="gd-btn gd-btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  onClick={() => setManuallySelectedCustomers([])}>Clear</button>
              </div>
              <div className="gd-list-group">
                {manuallySelectedCustomers.map((c, i) => (
                  <div key={i} className="gd-list-item">
                    <div>
                      <div className="fw-bold">{c.name}</div>
                      <div className="small text-muted">{c.village}</div>
                    </div>
                    <button className="text-danger" onClick={() => setManuallySelectedCustomers(prev => prev.filter(x => x.phone !== c.phone))}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Modal */}
      {showManualModal && (
        <div className="gd-modal-overlay">
          <div className="gd-modal gd-modal-lg">
            <div className="gd-modal-header item-center">
              <h5 className="m-0 font-bold text-lg">✋ Manual Selection</h5>
              <button className="gd-close-btn" onClick={() => setShowManualModal(false)}>×</button>
            </div>
            <div className="gd-modal-body bg-gray-50">
              {Object.entries(manualSelections).map(([rName, rData]) => (
                <div key={rName} className="mb-4 bg-white p-3 rounded shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h6 className="font-bold">📍 {rName}</h6>
                    <span className="gd-badge gd-badge-success">{rData.selected.length} Selected</span>
                  </div>
                  <div className="gd-list-group">
                    {rData.customers.map((c, i) => {
                      const isSel = rData.selected.some(x => x.phone === c.phone);
                      return (
                        <div key={i} className={`gd-list-item ${isSel ? 'bg-green-50' : ''}`}
                          onClick={() => handleManualSelection(rName, c)}>
                          <div>
                            <div className="fw-semibold">{c.name}</div>
                            <div className="small text-muted">{c.phone}</div>
                          </div>
                          {isSel && <span className="text-success">✓</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="gd-modal-footer">
              <button className="gd-btn gd-btn-secondary" onClick={() => setShowManualModal(false)}>Cancel</button>
              <button className="gd-btn gd-btn-success" onClick={addManualSelections}>Add Selected</button>
            </div>
          </div>
        </div>
      )}

      {/* Village Details Modal */}
      {showVillageModal && selectedRouteForVillages && (
        <div className="gd-modal-overlay">
          <div className="gd-modal gd-modal-lg">
            <div className="gd-modal-header" style={{ background: 'var(--primary-color)', color: 'white' }}>
              <h5 className="m-0">📍 {selectedRouteForVillages.name}</h5>
              <button className="gd-close-btn text-white" onClick={() => setShowVillageModal(false)}>×</button>
            </div>
            <div className="gd-modal-body">
              <table className="gd-table">
                <thead>
                  <tr>
                    <th>Village</th>
                    <th>Customers</th>
                    <th>Gifts</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRouteForVillages.villages?.map((v, i) => (
                    <tr key={i}>
                      <td className="fw-semibold">{v.name}</td>
                      <td>{v.totalCustomers}</td>
                      <td>
                        {v.totalCustomers < 10 ? <span className="gd-badge gd-badge-warning">Manual</span> : <span className="gd-badge gd-badge-success">{v.giftEligibleCount}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Recent Distributions History */}
      <div className="gd-card mt-4 mb-5">
        <div className="gd-card-header" style={{ background: '#f8fafc' }}>
          <div className="gd-card-title">📜 Distribution History (Admin Panel Data)</div>
        </div>
        <div className="gd-card-body">
          <div className="table-responsive">
            <table className="gd-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Total Recipients</th>
                  <th>Gold Winners</th>
                  <th>Year</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {savedDistributions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center text-muted py-4">No saved distributions yet</td>
                  </tr>
                ) : (
                  savedDistributions.map((dist, idx) => (
                    <tr key={idx}>
                      <td>{new Date(dist.date).toLocaleString()}</td>
                      <td><span className="gd-badge gd-badge-success">{dist.totalRecipients}</span></td>
                      <td><span className="gd-badge gd-badge-warning">{Object.keys(dist.goldWinners || {}).length} winners</span></td>
                      <td>{dist.year}</td>
                      <td>
                        <button
                          className="gd-btn gd-btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => {
                            setSelectedHistoryItem(dist);
                            setShowHistoryDetailModal(true);
                          }}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* History Detail Modal */}
      {showHistoryDetailModal && selectedHistoryItem && (
        <div className="gd-modal-overlay">
          <div className="gd-modal gd-modal-lg">
            <div className="gd-modal-header" style={{ background: 'var(--primary-color)', color: 'white' }}>
              <div>
                <h5 className="m-0">📜 Distribution Details</h5>
                <small className="opacity-75">{new Date(selectedHistoryItem.date).toLocaleString()}</small>
              </div>
              <button className="gd-close-btn text-white" onClick={() => setShowHistoryDetailModal(false)}>×</button>
            </div>
            <div className="gd-modal-body">
              {/* Summary Stats */}
              <div className="gd-stats-grid mb-4">
                <div className="gd-stat-card py-2">
                  <div className="gd-stat-content">
                    <h3>{selectedHistoryItem.totalRecipients}</h3>
                    <p>Total Recipients</p>
                  </div>
                </div>
                <div className="gd-stat-card py-2">
                  <div className="gd-stat-content">
                    <h3>{Object.keys(selectedHistoryItem.goldWinners || {}).length}</h3>
                    <p>Gold Winners</p>
                  </div>
                </div>
              </div>

              {/* Gold Winners List */}
              <div className="mb-4">
                <h6 className="fw-bold mb-3">🏆 Gold Winners</h6>
                <div className="table-responsive">
                  <table className="gd-table">
                    <thead>
                      <tr>
                        <th>Route</th>
                        <th>Winner Name</th>
                        <th>Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(selectedHistoryItem.goldWinners || {}).map(([route, winners], i) => (
                        <tr key={i}>
                          <td className="fw-bold">{route}</td>
                          <td className="text-success">{winners[winners.length - 1]?.name}</td>
                          <td>{winners[winners.length - 1]?.phone}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recipients List */}
              <div>
                <h6 className="fw-bold mb-3">👥 All Recipients</h6>
                <div className="gd-scroll-area" style={{ maxHeight: '400px' }}>
                  <table className="gd-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Type</th>
                        <th>From</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedHistoryItem.allCustomers?.map((c, i) => (
                        <tr key={i}>
                          <td className="fw-bold">{c.name}</td>
                          <td>{c.phone}</td>
                          <td>
                            <span className={`gd-badge ${c.selectionType === 'manual' ? 'gd-badge-warning' : 'gd-badge-success'}`}>
                              {c.selectionType === 'manual' ? '✋ Manual' : '🎯 Auto'}
                            </span>
                          </td>
                          <td>{c.selectedFromVillage || c.village || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="gd-modal-footer no-print">
              <button className="gd-btn gd-btn-secondary" onClick={() => setShowHistoryDetailModal(false)}>Close</button>
              <button className="gd-btn gd-btn-primary" onClick={() => window.print()}>🖨️ Print Details</button>
            </div>
          </div>
        </div>
      )}

      {/* Professional Printable Template (Hidden in UI) */}
      {selectedHistoryItem && (
        <div className="print-area">
          <div className="print-header">
            <h1>Bishi Collection Management</h1>
            <p>Gift Distribution Report</p>
            <div style={{ marginTop: '10px', fontSize: '10pt' }}>
              <strong>Date:</strong> {new Date(selectedHistoryItem.date).toLocaleString()} |
              <strong> Year:</strong> {selectedHistoryItem.year}
            </div>
          </div>

          <div className="print-grid">
            <div className="print-stat-box">
              <div style={{ fontSize: '18pt', fontWeight: 'bold' }}>{selectedHistoryItem.totalRecipients}</div>
              <div style={{ fontSize: '10pt', color: '#666' }}>Total Recipients</div>
            </div>
            <div className="print-stat-box">
              <div style={{ fontSize: '18pt', fontWeight: 'bold' }}>{Object.keys(selectedHistoryItem.goldWinners || {}).length}</div>
              <div style={{ fontSize: '10pt', color: '#666' }}>Gold Winners</div>
            </div>
          </div>

          <div className="print-section">
            <div className="print-section-title">🏆 Gold Winners List</div>
            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Route Name</th>
                  <th style={{ width: '30%' }}>Winner Name</th>
                  <th style={{ width: '30%' }}>Phone Number</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(selectedHistoryItem.goldWinners || {}).map(([route, winners], i) => (
                  <tr key={i}>
                    <td>{route}</td>
                    <td style={{ fontWeight: 'bold' }}>{winners[winners.length - 1]?.name}</td>
                    <td>{winners[winners.length - 1]?.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="print-section">
            <div className="print-section-title">👥 All Gift Recipients</div>
            <table className="print-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Customer Name</th>
                  <th>Phone Number</th>
                  <th>Selection Type</th>
                  <th>Village/Route</th>
                </tr>
              </thead>
              <tbody>
                {selectedHistoryItem.allCustomers?.map((c, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: 'bold' }}>{c.name}</td>
                    <td>{c.phone}</td>
                    <td>{c.selectionType === 'manual' ? '✋ Manual' : '🎯 Auto'}</td>
                    <td>{c.selectedFromVillage || c.village || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="print-footer">
            Generated on {new Date().toLocaleString()} | Bishi Collection Management System
          </div>
        </div>
      )}
    </div>
  );
}
