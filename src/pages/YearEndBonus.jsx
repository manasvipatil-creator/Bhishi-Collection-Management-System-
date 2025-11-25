import React, { useEffect, useState } from "react";
import { getAllEligibleCustomers, addTransactionToAgent } from "../utils/databaseHelpers";

export default function YearEndBonus() {
  const [eligibleCustomers, setEligibleCustomers] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadEligibleCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  const loadEligibleCustomers = async () => {
    setLoading(true);
    try {
      // Pass selected year to filter customers
      const customers = await getAllEligibleCustomers(selectedYear);
      setEligibleCustomers(customers);
    } catch (error) {
      console.error("Error loading eligible customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const processYearEndBonuses = async () => {
    if (!window.confirm(`Are you sure you want to process year-end bonuses for ${selectedYear}?\n\nThis will distribute bonuses to all eligible customers.`)) {
      return;
    }

    setProcessing(true);
    
    try {
      let totalBonusProcessed = 0;
      let customersProcessed = 0;
      let fullBonusCount = 0;
      let partialBonusCount = 0;

      for (const customer of eligibleCustomers) {
        const bonusAmount = customer.bonusAmount;
        
        if (bonusAmount > 0) {
          // Determine bonus type
          const isFullBonus = bonusAmount === 1000;
          const bonusType = isFullBonus ? 'Full Bonus (₹1,000)' : 'No Bonus';
          
          // Record bonus transaction in agent's transactions
          await addTransactionToAgent(customer.agentPhone, {
            customerPhone: customer.customerPhone,
            customerId: customer.customerId,
            customerName: customer.customerName,
            type: "bonus",
            amount: bonusAmount,
            remarks: `Year-end bonus ${selectedYear} - ${bonusType}. Total deposits: ₹${customer.totalDeposits.toLocaleString()}`,
            date: new Date().toISOString().split('T')[0]
          });

          totalBonusProcessed += bonusAmount;
          customersProcessed++;
          
          if (isFullBonus) {
            fullBonusCount++;
          } else {
            partialBonusCount++;
          }
        }
      }

      alert(`Year-end bonuses processed successfully!\n\n` +
            `Total Customers: ${customersProcessed}\n` +
            `Full Bonus (₹12,000): ${fullBonusCount}\n` +
            `Accumulated Only: ${partialBonusCount}\n` +
            `Total Amount: ₹${totalBonusProcessed.toLocaleString()}`);
      
      // Reload data
      loadEligibleCustomers();
    } catch (error) {
      alert("Error processing bonuses: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  // Show all customers (no filtering)
  const filteredCustomers = eligibleCustomers;

  const totalEligibleCustomers = eligibleCustomers.length;
  const fullBonusCustomers = eligibleCustomers.filter(c => c.bonusAmount === 12000).length;
  const partialBonusCustomers = eligibleCustomers.filter(c => c.bonusAmount < 12000).length;
  const totalBonusAmount = eligibleCustomers.reduce((sum, customer) => sum + customer.bonusAmount, 0);

  return (
    <div className="container-fluid fade-in-up">
      {/* Header */}
      <div className="card border-0 mb-4" style={{ background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)', color: 'white' }}>
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
                <h4 className="mb-1 fw-bold">Year-End Bonus System (12-Month Plan)</h4>
                <p className="mb-0 opacity-75">₹12,000 bonus for customers completing 12 months with timely payments</p>
              </div>
            </div>
            <div className="text-end">
              <div className="mb-2">
                <label className="form-label text-white">Select Year</label>
                <select
                  className="form-control"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  style={{ width: '120px' }}
                >
                  {[2025, 2024, 2023, 2022, 2021].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bonus Rules Info */}
      <div className="card mb-4 border-info">
        <div className="card-header bg-info text-white">
          <h6 className="mb-0">📋 Bonus System Rules</h6>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-4">
              <div className="p-3 bg-success bg-opacity-10 rounded mb-3">
                <h6 className="text-success mb-2">✅ Full Bonus (₹12,000)</h6>
                <ul className="mb-0 small">
                  <li>Complete 12 months of ₹1,000/month payments</li>
                  <li>Total deposits of ₹12,000</li>
                  <li>AND 12th month payment made on time</li>
                </ul>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 bg-warning bg-opacity-10 rounded mb-3">
                <h6 className="text-warning mb-2">⚠️ Accumulated Amount Only</h6>
                <ul className="mb-0 small">
                  <li>Completed 12 months but 12th month payment was delayed</li>
                  <li>Receive only accumulated deposits (no bonus)</li>
                </ul>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 bg-danger bg-opacity-10 rounded mb-3">
                <h6 className="text-danger mb-2">❌ Early Withdrawal Penalty</h6>
                <ul className="mb-0 small">
                  <li>5% deduction on withdrawals before 12 months</li>
                  <li>No penalty after completing 12 months</li>
                </ul>
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
            <h3 className="stats-number">{totalEligibleCustomers}</h3>
            <p className="stats-label">Total Eligible Customers</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--success-gradient)' }}>
              ✅
            </div>
            <h3 className="stats-number">{fullBonusCustomers}</h3>
            <p className="stats-label">Full Bonus (₹13,000)</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--warning-gradient)' }}>
              ⚠️
            </div>
            <h3 className="stats-number">{partialBonusCustomers}</h3>
            <p className="stats-label">Accumulated Only</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stats-card">
            <div className="stats-icon" style={{ background: 'var(--secondary-gradient)' }}>
              💰
            </div>
            <h3 className="stats-number">₹{totalBonusAmount.toLocaleString()}</h3>
            <p className="stats-label">Total Bonus Amount</p>
          </div>
        </div>
      </div>

      {/* Process Button */}
      <div className="card mb-4">
        <div className="card-body text-center p-4">
          <h5 className="mb-3">Process Year-End Bonuses for {selectedYear}</h5>
          <p className="text-muted mb-4">
            This will distribute bonuses to all eligible customers based on the 13-month plan rules.
            <br />
            <strong>Full Bonus (₹13,000): {fullBonusCustomers} customers</strong> | 
            <strong className="ms-2">Accumulated Only: {partialBonusCustomers} customers</strong>
            <br />
            <strong className="text-success">Total bonus to be distributed: ₹{totalBonusAmount.toLocaleString()}</strong>
          </p>
          <button
            className="btn btn-success btn-lg"
            onClick={processYearEndBonuses}
            disabled={processing || totalBonusAmount === 0}
          >
            {processing ? (
              <>
                <div className="spinner-border spinner-border-sm me-2" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                Processing Bonuses...
              </>
            ) : (
              <>
                <span className="me-2">🎁</span>
                Process Year-End Bonuses
              </>
            )}
          </button>
        </div>
      </div>

      {/* Customer Bonus Details */}
      <div className="card">
        <div className="card-header">
          <h6 className="mb-0">Customer Bonus Details - {selectedYear}</h6>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-5">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3">Loading customer data...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center p-5">
              <p className="text-muted">No eligible customers found for year-end bonus.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table mb-0">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Agent</th>
                    <th>Start Date</th>
                    <th>Months Completed</th>
                    <th>Total Deposits</th>
                    <th>12th Month Status</th>
                    <th>Bonus Amount</th>
                    <th>Total Amount Pay</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer, index) => {
                    const isFullBonus = customer.bonusAmount === 1000;
                    const twelfthMonth = customer.twelfthMonthStatus;

                    return (
                      <tr key={index} className={!isFullBonus ? 'table-warning' : ''}>
                        <td>
                          <div>
                            <div className="fw-semibold">{customer.customerName}</div>
                            <small className="text-muted">{customer.customerPhone}</small>
                          </div>
                        </td>
                        <td>
                          <div>
                            <div>{customer.agentName}</div>
                            <small className="text-muted">{customer.agentPhone}</small>
                          </div>
                        </td>
                        <td>{customer.startDate}</td>
                        <td>
                          <span className="badge bg-info">
                            {customer.completedMonths} / 12 months
                          </span>
                        </td>
                        <td className="fw-bold">₹{customer.totalDeposits.toLocaleString()}</td>
                        <td>
                          {twelfthMonth.hasMissedPayment ? (
                            <span className="badge bg-warning text-dark">
                              ⚠️ Delayed ({twelfthMonth.missedDays} days)
                            </span>
                          ) : (
                            <span className="badge bg-success">
                              ✅ On Time (₹{twelfthMonth.amount})
                            </span>
                          )}
                        </td>
                        <td className="fw-bold">
                          {isFullBonus ? (
                            <span className="text-success">₹1,000</span>
                          ) : (
                            <span className="text-warning">₹{customer.bonusAmount.toLocaleString()}</span>
                          )}
                        </td>
                        <td className="fw-bold text-primary">
                          ₹{(customer.totalDeposits + customer.bonusAmount).toLocaleString()}
                        </td>
                        <td>
                          {isFullBonus ? (
                            <span className="badge bg-success">✅ Full Bonus</span>
                          ) : (
                            <span className="badge bg-warning">⚠️ Accumulated Only</span>
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
  );
}
