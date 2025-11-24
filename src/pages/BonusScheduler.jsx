import React, { useEffect, useState } from "react";
import { getAllEligibleCustomers, addTransactionToAgent } from "../utils/databaseHelpers";
import { ref, set, get } from "firebase/database";
import { db } from "../firebase";

export default function BonusScheduler() {
  const [eligibleCustomers, setEligibleCustomers] = useState([]);
  const [scheduledBonuses, setScheduledBonuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [customers, scheduled, notifs] = await Promise.all([
        getAllEligibleCustomers(),
        loadScheduledBonuses(),
        loadNotifications()
      ]);
      
      setEligibleCustomers(customers);
      setScheduledBonuses(scheduled);
      setNotifications(notifs);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadScheduledBonuses = async () => {
    try {
      const scheduledRef = ref(db, 'scheduledBonuses');
      const snapshot = await get(scheduledRef);
      return snapshot.exists() ? Object.values(snapshot.val()) : [];
    } catch (error) {
      console.error("Error loading scheduled bonuses:", error);
      return [];
    }
  };

  const loadNotifications = async () => {
    try {
      const notifsRef = ref(db, 'bonusNotifications');
      const snapshot = await get(notifsRef);
      return snapshot.exists() ? Object.values(snapshot.val()) : [];
    } catch (error) {
      console.error("Error loading notifications:", error);
      return [];
    }
  };

  const scheduleBonus = async (customer, scheduledDate) => {
    try {
      const bonusId = `bonus_${customer.agentPhone}_${customer.customerPhone}_${Date.now()}`;
      const bonusData = {
        id: bonusId,
        ...customer,
        scheduledDate,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
        processedAt: null
      };

      const scheduledRef = ref(db, `scheduledBonuses/${bonusId}`);
      await set(scheduledRef, bonusData);

      // Create notification
      const notificationId = `notif_${Date.now()}`;
      const notification = {
        id: notificationId,
        type: 'bonus_scheduled',
        title: 'Bonus Scheduled',
        message: `Bonus of ₹${customer.bonusAmount.toLocaleString()} scheduled for ${customer.customerName} on ${scheduledDate}`,
        date: new Date().toISOString(),
        read: false,
        bonusId
      };

      const notifRef = ref(db, `bonusNotifications/${notificationId}`);
      await set(notifRef, notification);

      return true;
    } catch (error) {
      console.error("Error scheduling bonus:", error);
      return false;
    }
  };

  const processBonuses = async (date) => {
    if (!date) {
      alert("Please select a date to process bonuses");
      return;
    }

    const bonusesToProcess = scheduledBonuses.filter(
      bonus => bonus.scheduledDate === date && bonus.status === 'scheduled'
    );

    if (bonusesToProcess.length === 0) {
      alert("No bonuses scheduled for this date");
      return;
    }

    if (!window.confirm(`Process ${bonusesToProcess.length} bonuses for ${date}?`)) {
      return;
    }

    setProcessing(true);
    try {
      let processed = 0;
      let totalAmount = 0;

      for (const bonus of bonusesToProcess) {
        // Process the bonus transaction
        await addTransactionToAgent(bonus.agentPhone, {
          customerPhone: bonus.customerPhone,
          customerId: bonus.customerId,
          customerName: bonus.customerName,
          type: "bonus",
          amount: bonus.bonusAmount,
          remarks: `Scheduled year-end bonus - ${bonus.bonusAmount === 13000 ? 'Full Bonus' : 'Accumulated Amount'}`,
          date: date,
          scheduledBonusId: bonus.id
        });

        // Update bonus status
        const bonusRef = ref(db, `scheduledBonuses/${bonus.id}`);
        await set(bonusRef, {
          ...bonus,
          status: 'processed',
          processedAt: new Date().toISOString()
        });

        processed++;
        totalAmount += bonus.bonusAmount;
      }

      // Create completion notification
      const notificationId = `notif_${Date.now()}`;
      const notification = {
        id: notificationId,
        type: 'bonuses_processed',
        title: 'Bonuses Processed',
        message: `${processed} bonuses processed for ${date}. Total: ₹${totalAmount.toLocaleString()}`,
        date: new Date().toISOString(),
        read: false
      };

      const notifRef = ref(db, `bonusNotifications/${notificationId}`);
      await set(notifRef, notification);

      alert(`Successfully processed ${processed} bonuses!\nTotal amount: ₹${totalAmount.toLocaleString()}`);
      loadData();
    } catch (error) {
      alert("Error processing bonuses: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const scheduleAllBonuses = async () => {
    if (!selectedDate) {
      alert("Please select a date for scheduling bonuses");
      return;
    }

    const eligibleForScheduling = eligibleCustomers.filter(
      customer => !scheduledBonuses.some(
        scheduled => scheduled.customerPhone === customer.customerPhone && 
                    scheduled.status === 'scheduled'
      )
    );

    if (eligibleForScheduling.length === 0) {
      alert("No eligible customers found for scheduling");
      return;
    }

    if (!window.confirm(`Schedule bonuses for ${eligibleForScheduling.length} customers on ${selectedDate}?`)) {
      return;
    }

    setProcessing(true);
    try {
      let scheduled = 0;
      for (const customer of eligibleForScheduling) {
        const success = await scheduleBonus(customer, selectedDate);
        if (success) scheduled++;
      }

      alert(`Successfully scheduled ${scheduled} bonuses for ${selectedDate}`);
      loadData();
    } catch (error) {
      alert("Error scheduling bonuses: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getUpcomingBonuses = () => {
    const today = new Date().toISOString().split('T')[0];
    return scheduledBonuses.filter(
      bonus => bonus.status === 'scheduled' && bonus.scheduledDate >= today
    ).sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
  };

  const getTodaysBonuses = () => {
    const today = new Date().toISOString().split('T')[0];
    return scheduledBonuses.filter(
      bonus => bonus.status === 'scheduled' && bonus.scheduledDate === today
    );
  };

  const upcomingBonuses = getUpcomingBonuses();
  const todaysBonuses = getTodaysBonuses();
  const totalScheduledAmount = upcomingBonuses.reduce((sum, bonus) => sum + bonus.bonusAmount, 0);

  return (
    <div className="container-fluid fade-in-up">
      {/* Header */}
      <div className="card border-0 mb-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <div className="card-body p-4">
          <div className="d-flex align-items-center">
            <div className="me-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center"
                   style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.2)' }}>
                <span style={{ fontSize: '1.5rem' }}>⏰</span>
              </div>
            </div>
            <div>
              <h4 className="mb-1 fw-bold">Bonus Scheduler & Notifications</h4>
              <p className="mb-0 opacity-75">Schedule and manage year-end bonus distributions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Bonuses Alert */}
      {todaysBonuses.length > 0 && (
        <div className="alert alert-warning mb-4">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <h6 className="alert-heading mb-1">⚠️ Bonuses Due Today</h6>
              <p className="mb-0">
                {todaysBonuses.length} bonuses scheduled for today. 
                Total: ₹{todaysBonuses.reduce((sum, b) => sum + b.bonusAmount, 0).toLocaleString()}
              </p>
            </div>
            <button 
              className="btn btn-warning"
              onClick={() => processBonuses(new Date().toISOString().split('T')[0])}
              disabled={processing}
            >
              Process Today's Bonuses
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--primary-gradient)' }}>
              👥
            </div>
            <h3 className="stats-number">{eligibleCustomers.length}</h3>
            <p className="stats-label">Eligible Customers</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--warning-gradient)' }}>
              ⏰
            </div>
            <h3 className="stats-number">{upcomingBonuses.length}</h3>
            <p className="stats-label">Scheduled Bonuses</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--success-gradient)' }}>
              💰
            </div>
            <h3 className="stats-number">₹{totalScheduledAmount.toLocaleString()}</h3>
            <p className="stats-label">Total Scheduled</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--info-gradient)' }}>
              🔔
            </div>
            <h3 className="stats-number">{notifications.filter(n => !n.read).length}</h3>
            <p className="stats-label">Unread Notifications</p>
          </div>
        </div>
      </div>

      {/* Schedule Bonuses Section */}
      <div className="card mb-4">
        <div className="card-header">
          <h6 className="mb-0">📅 Schedule New Bonuses</h6>
        </div>
        <div className="card-body">
          <div className="row align-items-end">
            <div className="col-md-4">
              <label className="form-label">Select Date</label>
              <input
                type="date"
                className="form-control"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="col-md-8">
              <button
                className="btn btn-primary me-2"
                onClick={scheduleAllBonuses}
                disabled={processing || !selectedDate}
              >
                {processing ? 'Scheduling...' : 'Schedule All Eligible Bonuses'}
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={loadData}
                disabled={loading}
              >
                🔄 Refresh Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduled Bonuses Table */}
      <div className="card">
        <div className="card-header">
          <h6 className="mb-0">📋 Upcoming Scheduled Bonuses</h6>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-5">
              <div className="spinner-border" role="status"></div>
              <p className="mt-3">Loading scheduled bonuses...</p>
            </div>
          ) : upcomingBonuses.length === 0 ? (
            <div className="text-center p-5">
              <p className="text-muted">No bonuses scheduled</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table mb-0">
                <thead>
                  <tr>
                    <th>Scheduled Date</th>
                    <th>Customer</th>
                    <th>Agent</th>
                    <th>Bonus Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingBonuses.map((bonus, index) => (
                    <tr key={index}>
                      <td>
                        <span className="badge bg-info">
                          {new Date(bonus.scheduledDate).toLocaleDateString('en-IN')}
                        </span>
                      </td>
                      <td>
                        <div>
                          <div className="fw-semibold">{bonus.customerName}</div>
                          <small className="text-muted">{bonus.customerPhone}</small>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div>{bonus.agentName}</div>
                          <small className="text-muted">{bonus.agentPhone}</small>
                        </div>
                      </td>
                      <td>
                        {bonus.bonusAmount === 13000 ? (
                          <span className="badge bg-success">Full Bonus</span>
                        ) : (
                          <span className="badge bg-warning">Accumulated</span>
                        )}
                      </td>
                      <td className="fw-bold">₹{bonus.bonusAmount.toLocaleString()}</td>
                      <td>
                        <span className="badge bg-warning">Scheduled</span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => processBonuses(bonus.scheduledDate)}
                          disabled={processing}
                        >
                          Process
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
