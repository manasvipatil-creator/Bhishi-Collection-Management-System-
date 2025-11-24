import React, { useEffect, useState } from "react";
import { ref, set, get, push } from "firebase/database";
import { db } from "../firebase";

export default function GiftInventory() {
  const [inventory, setInventory] = useState([]);
  const [giftHistory, setGiftHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGift, setNewGift] = useState({
    name: '',
    category: 'regular',
    quantity: 0,
    cost: 0,
    description: '',
    supplier: ''
  });

  const giftCategories = [
    { value: 'regular', label: 'Regular Gift', color: 'primary' },
    { value: 'gold', label: 'Gold Gift', color: 'warning' },
    { value: 'special', label: 'Special Gift', color: 'success' },
    { value: 'seasonal', label: 'Seasonal Gift', color: 'info' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [inventoryData, historyData] = await Promise.all([
        loadInventory(),
        loadGiftHistory()
      ]);
      
      setInventory(inventoryData);
      setGiftHistory(historyData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadInventory = async () => {
    try {
      const inventoryRef = ref(db, 'giftInventory');
      const snapshot = await get(inventoryRef);
      return snapshot.exists() ? Object.values(snapshot.val()) : [];
    } catch (error) {
      console.error("Error loading inventory:", error);
      return [];
    }
  };

  const loadGiftHistory = async () => {
    try {
      const historyRef = ref(db, 'giftDistributionHistory');
      const snapshot = await get(historyRef);
      return snapshot.exists() ? Object.values(snapshot.val()) : [];
    } catch (error) {
      console.error("Error loading gift history:", error);
      return [];
    }
  };

  const addGiftToInventory = async () => {
    if (!newGift.name || !newGift.quantity) {
      alert("Please fill in required fields");
      return;
    }

    try {
      const giftId = `gift_${Date.now()}`;
      const giftData = {
        id: giftId,
        ...newGift,
        quantity: Number(newGift.quantity),
        cost: Number(newGift.cost),
        addedDate: new Date().toISOString(),
        distributed: 0,
        available: Number(newGift.quantity)
      };

      const giftRef = ref(db, `giftInventory/${giftId}`);
      await set(giftRef, giftData);

      // Add to history
      const historyId = `history_${Date.now()}`;
      const historyData = {
        id: historyId,
        type: 'inventory_add',
        giftId,
        giftName: newGift.name,
        quantity: Number(newGift.quantity),
        date: new Date().toISOString(),
        description: `Added ${newGift.quantity} ${newGift.name} to inventory`
      };

      const historyRef = ref(db, `giftDistributionHistory/${historyId}`);
      await set(historyRef, historyData);

      setNewGift({
        name: '',
        category: 'regular',
        quantity: 0,
        cost: 0,
        description: '',
        supplier: ''
      });
      setShowAddModal(false);
      loadData();
      alert("Gift added to inventory successfully!");
    } catch (error) {
      alert("Error adding gift: " + error.message);
    }
  };

  const distributeGift = async (giftId, quantity, recipients) => {
    try {
      const gift = inventory.find(g => g.id === giftId);
      if (!gift || gift.available < quantity) {
        alert("Insufficient quantity available");
        return false;
      }

      // Update inventory
      const updatedGift = {
        ...gift,
        distributed: gift.distributed + quantity,
        available: gift.available - quantity
      };

      const giftRef = ref(db, `giftInventory/${giftId}`);
      await set(giftRef, updatedGift);

      // Add to history
      const historyId = `history_${Date.now()}`;
      const historyData = {
        id: historyId,
        type: 'gift_distribution',
        giftId,
        giftName: gift.name,
        quantity,
        recipients: recipients || [],
        date: new Date().toISOString(),
        description: `Distributed ${quantity} ${gift.name} to ${recipients?.length || 0} recipients`
      };

      const historyRef = ref(db, `giftDistributionHistory/${historyId}`);
      await set(historyRef, historyData);

      return true;
    } catch (error) {
      console.error("Error distributing gift:", error);
      return false;
    }
  };

  const getCategoryBadge = (category) => {
    const cat = giftCategories.find(c => c.value === category);
    return cat ? { label: cat.label, color: cat.color } : { label: 'Unknown', color: 'secondary' };
  };

  const getTotalValue = () => {
    return inventory.reduce((sum, gift) => sum + (gift.quantity * gift.cost), 0);
  };

  const getTotalDistributed = () => {
    return inventory.reduce((sum, gift) => sum + gift.distributed, 0);
  };

  const getLowStockItems = () => {
    return inventory.filter(gift => gift.available <= 5);
  };

  const getRecentDistributions = () => {
    return giftHistory
      .filter(h => h.type === 'gift_distribution')
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);
  };

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
                <h4 className="mb-1 fw-bold">Gift Inventory Management</h4>
                <p className="mb-0 opacity-75">Track and manage gift distribution inventory</p>
              </div>
            </div>
            <button
              className="btn btn-light"
              onClick={() => setShowAddModal(true)}
            >
              <span className="me-2">➕</span>
              Add New Gift
            </button>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {getLowStockItems().length > 0 && (
        <div className="alert alert-warning mb-4">
          <h6 className="alert-heading">⚠️ Low Stock Alert</h6>
          <p className="mb-0">
            {getLowStockItems().length} items are running low on stock (≤5 items remaining)
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--primary-gradient)' }}>
              📦
            </div>
            <h3 className="stats-number">{inventory.length}</h3>
            <p className="stats-label">Total Gift Types</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--success-gradient)' }}>
              🎯
            </div>
            <h3 className="stats-number">{getTotalDistributed()}</h3>
            <p className="stats-label">Total Distributed</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--warning-gradient)' }}>
              💰
            </div>
            <h3 className="stats-number">₹{getTotalValue().toLocaleString()}</h3>
            <p className="stats-label">Total Inventory Value</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--danger-gradient)' }}>
              ⚠️
            </div>
            <h3 className="stats-number">{getLowStockItems().length}</h3>
            <p className="stats-label">Low Stock Items</p>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Inventory Table */}
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">📋 Current Inventory</h6>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center p-5">
                  <div className="spinner-border" role="status"></div>
                  <p className="mt-3">Loading inventory...</p>
                </div>
              ) : inventory.length === 0 ? (
                <div className="text-center p-5">
                  <p className="text-muted">No gifts in inventory</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table mb-0">
                    <thead>
                      <tr>
                        <th>Gift Name</th>
                        <th>Category</th>
                        <th>Total Qty</th>
                        <th>Distributed</th>
                        <th>Available</th>
                        <th>Cost/Unit</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((gift, index) => {
                        const category = getCategoryBadge(gift.category);
                        const isLowStock = gift.available <= 5;
                        
                        return (
                          <tr key={index} className={isLowStock ? 'table-warning' : ''}>
                            <td>
                              <div>
                                <div className="fw-semibold">{gift.name}</div>
                                <small className="text-muted">{gift.description}</small>
                              </div>
                            </td>
                            <td>
                              <span className={`badge bg-${category.color}`}>
                                {category.label}
                              </span>
                            </td>
                            <td className="fw-bold">{gift.quantity}</td>
                            <td className="text-success">{gift.distributed}</td>
                            <td className={`fw-bold ${isLowStock ? 'text-warning' : 'text-primary'}`}>
                              {gift.available}
                            </td>
                            <td>₹{gift.cost.toLocaleString()}</td>
                            <td>
                              {isLowStock ? (
                                <span className="badge bg-warning">Low Stock</span>
                              ) : gift.available === 0 ? (
                                <span className="badge bg-danger">Out of Stock</span>
                              ) : (
                                <span className="badge bg-success">In Stock</span>
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
        </div>

        {/* Recent Distributions */}
        <div className="col-md-4">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">📈 Recent Distributions</h6>
            </div>
            <div className="card-body">
              {getRecentDistributions().length === 0 ? (
                <p className="text-muted text-center">No recent distributions</p>
              ) : (
                <div className="timeline">
                  {getRecentDistributions().map((distribution, index) => (
                    <div key={index} className="timeline-item mb-3">
                      <div className="timeline-marker bg-primary"></div>
                      <div className="timeline-content">
                        <h6 className="mb-1">{distribution.giftName}</h6>
                        <p className="mb-1 small text-muted">
                          {distribution.description}
                        </p>
                        <small className="text-muted">
                          {new Date(distribution.date).toLocaleDateString('en-IN')}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Gift Modal */}
      {showAddModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New Gift to Inventory</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Gift Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newGift.name}
                    onChange={(e) => setNewGift(prev => ({...prev, name: e.target.value}))}
                    placeholder="Enter gift name"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={newGift.category}
                    onChange={(e) => setNewGift(prev => ({...prev, category: e.target.value}))}
                  >
                    {giftCategories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Quantity *</label>
                      <input
                        type="number"
                        className="form-control"
                        value={newGift.quantity}
                        onChange={(e) => setNewGift(prev => ({...prev, quantity: e.target.value}))}
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Cost per Unit</label>
                      <input
                        type="number"
                        className="form-control"
                        value={newGift.cost}
                        onChange={(e) => setNewGift(prev => ({...prev, cost: e.target.value}))}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    value={newGift.description}
                    onChange={(e) => setNewGift(prev => ({...prev, description: e.target.value}))}
                    rows="2"
                    placeholder="Gift description"
                  ></textarea>
                </div>
                <div className="mb-3">
                  <label className="form-label">Supplier</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newGift.supplier}
                    onChange={(e) => setNewGift(prev => ({...prev, supplier: e.target.value}))}
                    placeholder="Supplier name"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={addGiftToInventory}
                >
                  Add to Inventory
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
