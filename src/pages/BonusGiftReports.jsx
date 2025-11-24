import React, { useEffect, useState } from "react";
import { getAllEligibleCustomers } from "../utils/databaseHelpers";
import { ref, get } from "firebase/database";
import { db } from "../firebase";

export default function BonusGiftReports() {
  const [reportData, setReportData] = useState({
    bonuses: [],
    gifts: [],
    distributions: [],
    inventory: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [reportType, setReportType] = useState('summary');

  useEffect(() => {
    loadReportData();
  }, [selectedYear, selectedMonth]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const [bonuses, gifts, distributions, inventory] = await Promise.all([
        getAllEligibleCustomers(),
        loadGiftHistory(),
        loadDistributionHistory(),
        loadInventory()
      ]);

      setReportData({
        bonuses,
        gifts,
        distributions,
        inventory
      });
    } catch (error) {
      console.error("Error loading report data:", error);
    } finally {
      setLoading(false);
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

  const loadDistributionHistory = async () => {
    try {
      const distributionRef = ref(db, 'scheduledBonuses');
      const snapshot = await get(distributionRef);
      return snapshot.exists() ? Object.values(snapshot.val()) : [];
    } catch (error) {
      console.error("Error loading distribution history:", error);
      return [];
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

  const getFilteredData = () => {
    const yearFilter = (date) => new Date(date).getFullYear() === selectedYear;
    const monthFilter = (date) => {
      if (selectedMonth === 'all') return true;
      return new Date(date).getMonth() === parseInt(selectedMonth);
    };

    return {
      bonuses: reportData.bonuses.filter(b => 
        b.startDate && yearFilter(b.startDate) && monthFilter(b.startDate)
      ),
      gifts: reportData.gifts.filter(g => 
        g.date && yearFilter(g.date) && monthFilter(g.date)
      ),
      distributions: reportData.distributions.filter(d => 
        d.scheduledDate && yearFilter(d.scheduledDate) && monthFilter(d.scheduledDate)
      )
    };
  };

  const getBonusStats = () => {
    const filtered = getFilteredData();
    const fullBonuses = filtered.bonuses.filter(b => b.bonusAmount === 13000);
    const partialBonuses = filtered.bonuses.filter(b => b.bonusAmount < 13000);
    const totalAmount = filtered.bonuses.reduce((sum, b) => sum + b.bonusAmount, 0);
    const processedBonuses = filtered.distributions.filter(d => d.status === 'processed');

    return {
      totalEligible: filtered.bonuses.length,
      fullBonuses: fullBonuses.length,
      partialBonuses: partialBonuses.length,
      totalAmount,
      processed: processedBonuses.length,
      pending: filtered.distributions.filter(d => d.status === 'scheduled').length
    };
  };

  const getGiftStats = () => {
    const filtered = getFilteredData();
    const giftDistributions = filtered.gifts.filter(g => g.type === 'gift_distribution');
    const totalDistributed = giftDistributions.reduce((sum, g) => sum + (g.quantity || 0), 0);
    const totalValue = reportData.inventory.reduce((sum, i) => sum + (i.distributed * i.cost), 0);

    return {
      totalDistributions: giftDistributions.length,
      totalGiftsDistributed: totalDistributed,
      totalValue,
      uniqueRecipients: new Set(giftDistributions.flatMap(g => g.recipients || [])).size
    };
  };

  const getMonthlyBonusData = () => {
    const monthlyData = {};
    const filtered = getFilteredData();

    filtered.distributions.forEach(distribution => {
      if (distribution.status === 'processed') {
        const month = new Date(distribution.processedAt || distribution.scheduledDate).getMonth();
        const monthName = new Date(0, month).toLocaleString('en', { month: 'long' });
        
        if (!monthlyData[monthName]) {
          monthlyData[monthName] = { count: 0, amount: 0 };
        }
        
        monthlyData[monthName].count++;
        monthlyData[monthName].amount += distribution.bonusAmount;
      }
    });

    return monthlyData;
  };

  const getAgentWiseStats = () => {
    const agentStats = {};
    const filtered = getFilteredData();

    filtered.bonuses.forEach(bonus => {
      if (!agentStats[bonus.agentPhone]) {
        agentStats[bonus.agentPhone] = {
          agentName: bonus.agentName,
          agentPhone: bonus.agentPhone,
          totalCustomers: 0,
          fullBonuses: 0,
          partialBonuses: 0,
          totalAmount: 0
        };
      }

      const agent = agentStats[bonus.agentPhone];
      agent.totalCustomers++;
      agent.totalAmount += bonus.bonusAmount;

      if (bonus.bonusAmount === 13000) {
        agent.fullBonuses++;
      } else {
        agent.partialBonuses++;
      }
    });

    return Object.values(agentStats);
  };

  const exportToCSV = (data, filename) => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      data.map(row => Object.values(row).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const bonusStats = getBonusStats();
  const giftStats = getGiftStats();
  const monthlyData = getMonthlyBonusData();
  const agentStats = getAgentWiseStats();

  const months = [
    { value: 'all', label: 'All Months' },
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' }
  ];

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
                  <span style={{ fontSize: '1.5rem' }}>📊</span>
                </div>
              </div>
              <div>
                <h4 className="mb-1 fw-bold">Bonus & Gift Distribution Reports</h4>
                <p className="mb-0 opacity-75">Comprehensive analytics and reporting dashboard</p>
              </div>
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-light"
                onClick={() => exportToCSV(getFilteredData().bonuses, 'bonus_report')}
              >
                📥 Export Bonuses
              </button>
              <button
                className="btn btn-light"
                onClick={() => exportToCSV(agentStats, 'agent_stats')}
              >
                📥 Export Agent Stats
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-end">
            <div className="col-md-3">
              <label className="form-label">Year</label>
              <select
                className="form-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {[2025, 2024, 2023, 2022, 2021].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Month</label>
              <select
                className="form-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Report Type</label>
              <select
                className="form-select"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value="summary">Summary</option>
                <option value="detailed">Detailed</option>
                <option value="agent-wise">Agent-wise</option>
                <option value="monthly">Monthly Trends</option>
              </select>
            </div>
            <div className="col-md-3">
              <button
                className="btn btn-primary w-100"
                onClick={loadReportData}
                disabled={loading}
              >
                {loading ? 'Loading...' : '🔄 Refresh Data'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-5">
          <div className="spinner-border" role="status"></div>
          <p className="mt-3">Loading report data...</p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="row mb-4">
            <div className="col-md-3">
              <div className="stats-card">
                <div className="stats-icon" style={{ background: 'var(--primary-gradient)' }}>
                  👥
                </div>
                <h3 className="stats-number">{bonusStats.totalEligible}</h3>
                <p className="stats-label">Eligible Customers</p>
              </div>
            </div>
            <div className="col-md-3">
              <div className="stats-card">
                <div className="stats-icon" style={{ background: 'var(--success-gradient)' }}>
                  💰
                </div>
                <h3 className="stats-number">₹{bonusStats.totalAmount.toLocaleString()}</h3>
                <p className="stats-label">Total Bonus Amount</p>
              </div>
            </div>
            <div className="col-md-3">
              <div className="stats-card">
                <div className="stats-icon" style={{ background: 'var(--warning-gradient)' }}>
                  🎁
                </div>
                <h3 className="stats-number">{giftStats.totalGiftsDistributed}</h3>
                <p className="stats-label">Gifts Distributed</p>
              </div>
            </div>
            <div className="col-md-3">
              <div className="stats-card">
                <div className="stats-icon" style={{ background: 'var(--info-gradient)' }}>
                  📈
                </div>
                <h3 className="stats-number">{bonusStats.processed}</h3>
                <p className="stats-label">Bonuses Processed</p>
              </div>
            </div>
          </div>

          {/* Report Content */}
          {reportType === 'summary' && (
            <div className="row">
              <div className="col-md-6">
                <div className="card">
                  <div className="card-header">
                    <h6 className="mb-0">💰 Bonus Distribution Summary</h6>
                  </div>
                  <div className="card-body">
                    <div className="row text-center">
                      <div className="col-6">
                        <h4 className="text-success">{bonusStats.fullBonuses}</h4>
                        <p className="text-muted">Full Bonuses (₹13,000)</p>
                      </div>
                      <div className="col-6">
                        <h4 className="text-warning">{bonusStats.partialBonuses}</h4>
                        <p className="text-muted">Accumulated Only</p>
                      </div>
                    </div>
                    <hr />
                    <div className="d-flex justify-content-between">
                      <span>Processed:</span>
                      <span className="fw-bold text-success">{bonusStats.processed}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Pending:</span>
                      <span className="fw-bold text-warning">{bonusStats.pending}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card">
                  <div className="card-header">
                    <h6 className="mb-0">🎁 Gift Distribution Summary</h6>
                  </div>
                  <div className="card-body">
                    <div className="row text-center">
                      <div className="col-6">
                        <h4 className="text-primary">{giftStats.totalDistributions}</h4>
                        <p className="text-muted">Total Distributions</p>
                      </div>
                      <div className="col-6">
                        <h4 className="text-info">{giftStats.uniqueRecipients}</h4>
                        <p className="text-muted">Unique Recipients</p>
                      </div>
                    </div>
                    <hr />
                    <div className="d-flex justify-content-between">
                      <span>Total Value:</span>
                      <span className="fw-bold">₹{giftStats.totalValue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {reportType === 'agent-wise' && (
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">👤 Agent-wise Performance</h6>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table mb-0">
                    <thead>
                      <tr>
                        <th>Agent</th>
                        <th>Total Customers</th>
                        <th>Full Bonuses</th>
                        <th>Partial Bonuses</th>
                        <th>Total Amount</th>
                        <th>Success Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agentStats.map((agent, index) => {
                        const successRate = agent.totalCustomers > 0 
                          ? ((agent.fullBonuses / agent.totalCustomers) * 100).toFixed(1)
                          : 0;
                        
                        return (
                          <tr key={index}>
                            <td>
                              <div>
                                <div className="fw-semibold">{agent.agentName}</div>
                                <small className="text-muted">{agent.agentPhone}</small>
                              </div>
                            </td>
                            <td className="fw-bold">{agent.totalCustomers}</td>
                            <td className="text-success">{agent.fullBonuses}</td>
                            <td className="text-warning">{agent.partialBonuses}</td>
                            <td className="fw-bold">₹{agent.totalAmount.toLocaleString()}</td>
                            <td>
                              <span className={`badge ${successRate >= 80 ? 'bg-success' : successRate >= 60 ? 'bg-warning' : 'bg-danger'}`}>
                                {successRate}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {reportType === 'monthly' && (
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">📅 Monthly Bonus Distribution Trends</h6>
              </div>
              <div className="card-body">
                {Object.keys(monthlyData).length === 0 ? (
                  <p className="text-muted text-center">No monthly data available</p>
                ) : (
                  <div className="row">
                    {Object.entries(monthlyData).map(([month, data]) => (
                      <div key={month} className="col-md-4 mb-3">
                        <div className="card border">
                          <div className="card-body text-center">
                            <h6 className="card-title">{month}</h6>
                            <h4 className="text-primary">{data.count}</h4>
                            <p className="text-muted mb-1">Bonuses Processed</p>
                            <p className="fw-bold">₹{data.amount.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
