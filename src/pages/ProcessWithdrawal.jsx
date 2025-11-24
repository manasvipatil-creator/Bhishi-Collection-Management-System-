import React, { useEffect, useState } from "react";
import { getAllAgents, getAgentCustomers, calculateBonusEligibility, processEarlyWithdrawal } from "../utils/databaseHelpers";

export default function ProcessWithdrawal() {
  const [agents, setAgents] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [eligibilityInfo, setEligibilityInfo] = useState(null);
  const [penaltyInfo, setPenaltyInfo] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const allAgents = await getAllAgents();
      setAgents(allAgents);
    } catch (error) {
      console.error("Error loading agents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAgentChange = async (agentPhone) => {
    setSelectedAgent(agentPhone);
    setSelectedCustomer(null);
    setCustomers([]);
    setEligibilityInfo(null);
    setPenaltyInfo(null);
    setWithdrawalAmount("");

    if (agentPhone) {
      try {
        const agentCustomers = await getAgentCustomers(agentPhone);
        setCustomers(agentCustomers);
      } catch (error) {
        console.error("Error loading customers:", error);
      }
    }
  };

  const handleCustomerChange = async (customerPhone) => {
    const customer = customers.find(c => c.phone === customerPhone);
    setSelectedCustomer(customer);
    setEligibilityInfo(null);
    setPenaltyInfo(null);
    setWithdrawalAmount("");

    if (customer && selectedAgent) {
      try {
        const eligibility = await calculateBonusEligibility(selectedAgent, customerPhone);
        setEligibilityInfo(eligibility);
      } catch (error) {
        console.error("Error calculating eligibility:", error);
      }
    }
  };

  const calculatePenalty = async (amount) => {
    if (!eligibilityInfo || !amount) {
      setPenaltyInfo(null);
      return;
    }

    const monthsCompleted = eligibilityInfo.monthsSinceStart;
    const totalBalance = eligibilityInfo.totalDeposits;
    let actualWithdrawalAmount = amount;
    let penalty = 0;
    let penaltyApplied = false;
    let bonusIncluded = false;
    let reason = '';

    // NEW BONUS LOGIC: Check if customer is withdrawing full amount and bonus eligible
    if (amount >= totalBalance && eligibilityInfo.bonusEligible) {
      // Customer gets bonus (₹1,000 extra)
      actualWithdrawalAmount = totalBalance + 1000;
      bonusIncluded = true;
      reason = `✅ Bonus included! 13th month eligible - Total: ₹${totalBalance.toLocaleString()} + ₹1,000 bonus`;
    } else if (amount >= totalBalance && eligibilityInfo.eligible && !eligibilityInfo.bonusEligible) {
      // Customer completed 12 months but 13th month hasn't started yet
      actualWithdrawalAmount = totalBalance; // Only accumulated amount
      reason = `12 months completed but 13th month not started. Bonus available from ${eligibilityInfo.thirteenthMonthStartDate}`;
    } else if (monthsCompleted < 13) {
      // Use new penalty calculation that checks last deposit date
      try {
        const { calculateWithdrawalPenalty } = await import('../utils/databaseHelpers');
        const currentDate = new Date().toISOString().split('T')[0];
        const penaltyResult = await calculateWithdrawalPenalty(amount, monthsCompleted, selectedAgent, selectedCustomer.phone, currentDate);
        penalty = penaltyResult.penalty;
        penaltyApplied = penaltyResult.penaltyApplied;
        reason = penaltyResult.reason;
      } catch (error) {
        console.error("Error calculating penalty:", error);
        // Fallback to old logic
        penalty = Math.floor(amount * 0.05);
        penaltyApplied = true;
        reason = `Early withdrawal before 13 months - 5% penalty on withdrawal amount`;
      }
    } else {
      reason = 'Partial withdrawal - No penalty';
    }

    const netAmount = actualWithdrawalAmount - penalty;

    setPenaltyInfo({
      originalAmount: amount,
      actualWithdrawalAmount: actualWithdrawalAmount,
      totalBalance: totalBalance,
      penalty,
      netAmount,
      penaltyApplied,
      bonusIncluded,
      bonusAmount: bonusIncluded ? 1000 : 0,
      monthsCompleted: eligibilityInfo.completedMonths, // Use completedMonths instead of monthsSinceStart
      reason
    });
  };

  const handleAmountChange = async (e) => {
    const amount = parseFloat(e.target.value) || 0;
    setWithdrawalAmount(e.target.value);
    await calculatePenalty(amount);
  };

  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    if (num === 0) return 'Zero';
    
    const convertLessThanThousand = (n) => {
      if (n === 0) return '';
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
    };
    
    if (num < 1000) return convertLessThanThousand(num);
    if (num < 100000) {
      return convertLessThanThousand(Math.floor(num / 1000)) + ' Thousand' + 
             (num % 1000 !== 0 ? ' ' + convertLessThanThousand(num % 1000) : '');
    }
    return convertLessThanThousand(Math.floor(num / 100000)) + ' Lakh' + 
           (num % 100000 !== 0 ? ' ' + numberToWords(num % 100000) : '');
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleProcessWithdrawal = async () => {
    if (!selectedAgent || !selectedCustomer || !withdrawalAmount || !penaltyInfo) {
      alert("Please fill in all required fields");
      return;
    }

    let confirmMessage = `Process withdrawal for ${selectedCustomer.name}?\n\n` +
      `Total Balance: ₹${penaltyInfo.totalBalance.toLocaleString()}\n` +
      `Requested Amount: ₹${penaltyInfo.originalAmount.toLocaleString()}\n`;
    
    if (penaltyInfo.bonusIncluded) {
      confirmMessage += `✅ BONUS INCLUDED!\n` +
        `Accumulated Amount: ₹${penaltyInfo.totalBalance.toLocaleString()}\n` +
        `Bonus Amount: ₹${penaltyInfo.bonusAmount.toLocaleString()}\n` +
        `Total Withdrawal: ₹${penaltyInfo.actualWithdrawalAmount.toLocaleString()}\n`;
    } else if (penaltyInfo.penaltyApplied) {
      confirmMessage += `Penalty (5% of withdrawal): ₹${penaltyInfo.penalty.toLocaleString()}\n`;
    }
    
    confirmMessage += `Net Amount to Pay: ₹${penaltyInfo.netAmount.toLocaleString()}\n\n` +
      `Months Completed: ${penaltyInfo.monthsCompleted} / 13`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setProcessing(true);
    try {
      const result = await processEarlyWithdrawal(
        selectedAgent,
        selectedCustomer.phone,
        parseFloat(withdrawalAmount)
      );

      // Add months completed and agent info to result for receipt
      result.monthsCompleted = penaltyInfo.monthsCompleted;
      result.agentName = agents.find(a => a.phone === selectedAgent)?.name || 'N/A';
      result.agentPhone = selectedAgent;
      result.customerName = selectedCustomer.name;
      result.customerPhone = selectedCustomer.phone;

      // Show receipt on same page
      setReceiptData(result);
      setShowReceipt(true);

      // Show success message
      let successMessage = `Withdrawal processed successfully!\n\n`;
      
      if (result.bonusIncluded) {
        successMessage += `✅ BONUS INCLUDED!\n` +
          `Accumulated Amount: ₹${result.totalBalance.toLocaleString()}\n` +
          `Bonus Amount: ₹${result.bonusAmount.toLocaleString()}\n` +
          `Total Amount: ₹${result.actualWithdrawalAmount.toLocaleString()}\n`;
      } else {
        successMessage += `Requested Amount: ₹${result.originalAmount.toLocaleString()}\n`;
        if (result.penaltyApplied) {
          successMessage += `Penalty: ₹${result.penalty.toLocaleString()}\n`;
        }
      }
      
      successMessage += `Net Amount Paid: ₹${result.netAmount.toLocaleString()}\n` +
        `Transaction ID: ${result.transactionId}\n\n` +
        `Receipt is displayed below. Click Print button to print.`;
      
      alert(successMessage);

    } catch (error) {
      console.error("Error processing withdrawal:", error);
      alert("Error processing withdrawal: " + (error.message || "Unknown error occurred"));
    } finally {
      setProcessing(false);
    }
  };

  const handleNewWithdrawal = () => {
    setShowReceipt(false);
    setReceiptData(null);
    setSelectedCustomer(null);
    setSelectedAgent("");
    setWithdrawalAmount("");
    setEligibilityInfo(null);
    setPenaltyInfo(null);
  };

  // If receipt is shown, display only receipt
  if (showReceipt && receiptData) {
    return (
      <div className="container-fluid fade-in-up">
        {/* Receipt Display */}
        <div className="card border-0 mb-4" style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div className="card-body p-5">
            {/* Receipt Header */}
            <div className="text-center border-bottom pb-4 mb-4">
              <h1 className="mb-2" style={{ color: '#667eea' }}>💎 SMART BHISHI</h1>
              <p className="text-muted mb-0">Collection Management System</p>
              <h3 className="mt-3">WITHDRAWAL RECEIPT</h3>
            </div>

            {/* Receipt Details */}
            <div className="mb-4">
              <div className="row mb-2">
                <div className="col-6"><strong>Receipt No:</strong></div>
                <div className="col-6 text-end">{receiptData.transactionId}</div>
              </div>
              <div className="row mb-2">
                <div className="col-6"><strong>Date:</strong></div>
                <div className="col-6 text-end">{new Date().toLocaleDateString('en-IN')} {new Date().toLocaleTimeString('en-IN')}</div>
              </div>
              <div className="row mb-2">
                <div className="col-6"><strong>Customer Name:</strong></div>
                <div className="col-6 text-end">{receiptData.customerName}</div>
              </div>
              <div className="row mb-2">
                <div className="col-6"><strong>Customer Phone:</strong></div>
                <div className="col-6 text-end">{receiptData.customerPhone}</div>
              </div>
              <div className="row mb-2">
                <div className="col-6"><strong>Agent Name:</strong></div>
                <div className="col-6 text-end">{receiptData.agentName}</div>
              </div>
              <div className="row mb-2">
                <div className="col-6"><strong>Agent Phone:</strong></div>
                <div className="col-6 text-end">{receiptData.agentPhone}</div>
              </div>
              <div className="row mb-2">
                <div className="col-6"><strong>Months Completed:</strong></div>
                <div className="col-6 text-end">{receiptData.monthsCompleted} / 13 months</div>
              </div>
            </div>

            {/* Bonus/Penalty Information */}
            {receiptData.bonusIncluded ? (
              <div className="alert alert-success mb-4">
                <strong>🎉 BONUS INCLUDED!</strong><br />
                Customer completed 12 months and 13th month has started. ₹1,000 bonus added to withdrawal.
              </div>
            ) : receiptData.penaltyApplied ? (
              <div className="alert alert-warning mb-4">
                <strong>⚠️ Early Withdrawal Penalty Applied</strong><br />
                A 5% penalty has been deducted as the withdrawal is made before completing 13 months.
              </div>
            ) : (
              <div className="alert alert-info mb-4">
                <strong>ℹ️ Standard Withdrawal</strong><br />
                No penalty or bonus applied.
              </div>
            )}

            {/* Amount Breakdown */}
            <div className="bg-light p-4 rounded mb-4">
              <div className="row mb-2">
                <div className="col-6"><strong>Total Account Balance:</strong></div>
                <div className="col-6 text-end text-primary"><strong>₹{receiptData.totalBalance.toLocaleString('en-IN')}</strong></div>
              </div>
              <div className="row mb-2">
                <div className="col-6"><strong>Withdrawal Amount Requested:</strong></div>
                <div className="col-6 text-end">₹{receiptData.originalAmount.toLocaleString('en-IN')}</div>
              </div>
              {receiptData.bonusIncluded && (
                <div className="row mb-2 text-success">
                  <div className="col-6"><strong>Add: Bonus Amount:</strong></div>
                  <div className="col-6 text-end">+ ₹{receiptData.bonusAmount.toLocaleString('en-IN')}</div>
                </div>
              )}
              {receiptData.penaltyApplied && (
                <div className="row mb-2 text-danger">
                  <div className="col-6"><strong>Less: Penalty (5% of withdrawal):</strong></div>
                  <div className="col-6 text-end">- ₹{receiptData.penalty.toLocaleString('en-IN')}</div>
                </div>
              )}
              {receiptData.bonusIncluded && (
                <div className="row mb-2">
                  <div className="col-6"><strong>Total Withdrawal Amount:</strong></div>
                  <div className="col-6 text-end">₹{receiptData.actualWithdrawalAmount.toLocaleString('en-IN')}</div>
                </div>
              )}
              <div className="row border-top pt-2 mt-2">
                <div className="col-6"><h5><strong>Net Amount Paid:</strong></h5></div>
                <div className="col-6 text-end"><h5 className="text-success"><strong>₹{receiptData.netAmount.toLocaleString('en-IN')}</strong></h5></div>
              </div>
            </div>

            {/* Amount in Words */}
            <div className="alert alert-info mb-4">
              <strong>Amount in Words:</strong><br />
              <span style={{ fontSize: '1.1rem' }}>{numberToWords(receiptData.netAmount)} Rupees Only</span>
            </div>

            {/* Signatures */}
            <div className="row mt-5 pt-4">
              <div className="col-4 text-center">
                <div className="border-top pt-2">Customer Signature</div>
              </div>
              <div className="col-4 text-center">
                <div className="border-top pt-2">Agent Signature</div>
              </div>
              <div className="col-4 text-center">
                <div className="border-top pt-2">Authorized Signature</div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-5 pt-4 border-top">
              <p className="text-muted mb-2">This is a computer-generated receipt.</p>
              <p className="text-muted mb-0">For any queries, please contact: 7666138618</p>
              <p className="text-muted">Thank you for banking with SMART BHISHI</p>
            </div>

            {/* Action Buttons */}
            <div className="d-flex gap-3 mt-4 no-print">
              <button 
                className="btn btn-primary btn-lg flex-grow-1"
                onClick={handlePrintReceipt}
              >
                🖨️ Print Receipt
              </button>
              <button 
                className="btn btn-secondary btn-lg"
                onClick={handleNewWithdrawal}
              >
                ➕ New Withdrawal
              </button>
            </div>
          </div>
        </div>

        {/* Print Styles */}
        <style>{`
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              margin: 0;
              padding: 20px;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="container-fluid fade-in-up">
      {/* Header */}
      <div className="card border-0 mb-4" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
        <div className="card-body p-4">
          <div className="d-flex align-items-center">
            <div className="me-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center"
                   style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.2)' }}>
                <span style={{ fontSize: '1.5rem' }}>💸</span>
              </div>
            </div>
            <div>
              <h4 className="mb-1 fw-bold">Process Withdrawal</h4>
              <p className="mb-0 opacity-75">₹1,000 bonus available from 13th month start • 5% penalty for early withdrawals</p>
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawal Form */}
      <div className="row">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Withdrawal Details</h6>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center p-5">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-3">Loading data...</p>
                </div>
              ) : (
                <>
                  {/* Agent Selection */}
                  <div className="mb-3">
                    <label className="form-label">Select Agent *</label>
                    <select
                      className="form-select"
                      value={selectedAgent}
                      onChange={(e) => handleAgentChange(e.target.value)}
                    >
                      <option value="">-- Select Agent --</option>
                      {agents.map(agent => (
                        <option key={agent.phone} value={agent.phone}>
                          {agent.name} ({agent.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Customer Selection */}
                  {selectedAgent && (
                    <div className="mb-3">
                      <label className="form-label">Select Customer *</label>
                      <select
                        className="form-select"
                        value={selectedCustomer?.phone || ""}
                        onChange={(e) => handleCustomerChange(e.target.value)}
                      >
                        <option value="">-- Select Customer --</option>
                        {customers.map(customer => (
                          <option key={customer.phone} value={customer.phone}>
                            {customer.name} ({customer.phone})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Customer Eligibility Info */}
                  {eligibilityInfo && (
                    <div className={`alert mb-3 ${eligibilityInfo.bonusEligible ? 'alert-success' : eligibilityInfo.eligible ? 'alert-warning' : 'alert-info'}`}>
                      <h6 className="alert-heading">
                        {eligibilityInfo.bonusEligible ? '✅ Bonus Eligible!' : 
                         eligibilityInfo.eligible ? '⏳ Bonus Pending' : 
                         'ℹ️ Customer Information'}
                      </h6>
                      <div className="row">
                        <div className="col-md-6">
                          <small>
                            <strong>Start Date:</strong> {eligibilityInfo.startDate}<br />
                            <strong>Months Since Start:</strong> {eligibilityInfo.monthsSinceStart} months<br />
                            <strong>Completed Months:</strong> {eligibilityInfo.completedMonths} / 12<br />
                            {eligibilityInfo.thirteenthMonthStartDate && (
                              <><strong>13th Month Starts:</strong> {eligibilityInfo.thirteenthMonthStartDate}</>
                            )}
                          </small>
                        </div>
                        <div className="col-md-6">
                          <small>
                            <strong>Total Deposits:</strong> ₹{eligibilityInfo.totalDeposits.toLocaleString()}<br />
                            <strong>12 Months Completed:</strong> {eligibilityInfo.eligible ? '✅ Yes' : '❌ No'}<br />
                            <strong>Bonus Available:</strong> {eligibilityInfo.bonusEligible ? '✅ Yes (₹1,000)' : '❌ No'}<br />
                            <strong>Status:</strong> {eligibilityInfo.reason}
                          </small>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Withdrawal Amount */}
                  {selectedCustomer && (
                    <div className="mb-3">
                      <label className="form-label">Withdrawal Amount *</label>
                      <input
                        type="number"
                        className="form-control"
                        value={withdrawalAmount}
                        onChange={handleAmountChange}
                        placeholder="Enter withdrawal amount"
                        min="0"
                        step="100"
                      />
                    </div>
                  )}

                  {/* Penalty/Bonus Calculation */}
                  {penaltyInfo && (
                    <div className={`alert mb-3 ${penaltyInfo.bonusIncluded ? 'alert-success' : penaltyInfo.penaltyApplied ? 'alert-warning' : 'alert-info'}`}>
                      <h6 className="alert-heading">
                        {penaltyInfo.bonusIncluded ? '🎉 Bonus Included!' : 
                         penaltyInfo.penaltyApplied ? '⚠️ Penalty Applied' : 
                         '✅ No Penalty'}
                      </h6>
                      <div className="row mb-3">
                        <div className="col-md-3">
                          <strong>Total Balance:</strong><br />
                          <h5 className="mb-0 text-primary">₹{penaltyInfo.totalBalance.toLocaleString()}</h5>
                        </div>
                        <div className="col-md-3">
                          <strong>Requested Amount:</strong><br />
                          <h5 className="mb-0">₹{penaltyInfo.originalAmount.toLocaleString()}</h5>
                        </div>
                        {penaltyInfo.bonusIncluded ? (
                          <div className="col-md-3">
                            <strong>Bonus Amount:</strong><br />
                            <h5 className="mb-0 text-success">+ ₹{penaltyInfo.bonusAmount.toLocaleString()}</h5>
                          </div>
                        ) : penaltyInfo.penaltyApplied ? (
                          <div className="col-md-3">
                            <strong>Penalty (5% of withdrawal):</strong><br />
                            <h5 className="mb-0 text-danger">- ₹{penaltyInfo.penalty.toLocaleString()}</h5>
                          </div>
                        ) : (
                          <div className="col-md-3">
                            <strong>Penalty:</strong><br />
                            <h5 className="mb-0 text-muted">₹0</h5>
                          </div>
                        )}
                        <div className="col-md-3">
                          <strong>Net Amount:</strong><br />
                          <h5 className="mb-0 text-success">₹{penaltyInfo.netAmount.toLocaleString()}</h5>
                        </div>
                      </div>
                      {penaltyInfo.bonusIncluded && (
                        <div className="bg-success bg-opacity-10 p-3 rounded mb-3">
                          <div className="row">
                            <div className="col-md-4">
                              <strong>Accumulated:</strong> ₹{penaltyInfo.totalBalance.toLocaleString()}
                            </div>
                            <div className="col-md-4">
                              <strong>Bonus:</strong> ₹{penaltyInfo.bonusAmount.toLocaleString()}
                            </div>
                            <div className="col-md-4">
                              <strong>Total:</strong> ₹{penaltyInfo.actualWithdrawalAmount.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      )}
                      <hr />
                      <small>
                        <strong>Reason:</strong> {penaltyInfo.reason}<br />
                        <strong>Months Completed:</strong> {penaltyInfo.monthsCompleted} / 13 months
                      </small>
                    </div>
                  )}

                  {/* Process Button */}
                  {penaltyInfo && (
                    <div className="d-grid">
                      <button
                        className="btn btn-danger btn-lg"
                        onClick={handleProcessWithdrawal}
                        disabled={processing}
                      >
                        {processing ? (
                          <>
                            <div className="spinner-border spinner-border-sm me-2" role="status">
                              <span className="visually-hidden">Processing...</span>
                            </div>
                            Processing Withdrawal...
                          </>
                        ) : (
                          <>
                            <span className="me-2">💸</span>
                            Process Withdrawal (₹{penaltyInfo.netAmount.toLocaleString()})
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="col-lg-4">
          <div className="card border-success">
            <div className="card-header bg-success text-white">
              <h6 className="mb-0">🎉 Bonus & Withdrawal Policy</h6>
            </div>
            <div className="card-body">
              <h6 className="text-success">✅ Bonus Eligibility (NEW)</h6>
              <p className="small mb-3">
                <strong>12 months completed + 13th month started = ₹1,000 bonus!</strong><br />
                Bonus is automatically added to full withdrawals when eligible.
              </p>

              <h6 className="text-warning">⏳ Bonus Pending</h6>
              <p className="small mb-3">
                Customer completed 12 months but 13th month hasn't started yet. Only accumulated amount (₹12,000) available.
              </p>

              <h6 className="text-danger">⚠️ Early Withdrawal Penalty</h6>
              <p className="small mb-3">
                5% penalty on withdrawal amount for withdrawals before completing 12 months.
              </p>

              <hr />

              <h6>Examples:</h6>
              <div className="bg-success bg-opacity-10 p-3 rounded mb-2">
                <small>
                  <strong>✅ With Bonus (13th month started)</strong><br />
                  Balance: ₹12,000<br />
                  Bonus: ₹1,000<br />
                  <strong>Total Paid: ₹13,000</strong>
                </small>
              </div>
              <div className="bg-warning bg-opacity-10 p-3 rounded mb-2">
                <small>
                  <strong>⏳ Before 13th Month</strong><br />
                  Balance: ₹12,000<br />
                  Bonus: ₹0 (not yet available)<br />
                  <strong>Total Paid: ₹12,000</strong>
                </small>
              </div>
              <div className="bg-danger bg-opacity-10 p-3 rounded">
                <small>
                  <strong>⚠️ Early Withdrawal</strong><br />
                  Withdrawal: ₹5,000<br />
                  Penalty (5%): ₹250<br />
                  <strong>Net Paid: ₹4,750</strong>
                </small>
              </div>
            </div>
          </div>

          <div className="card mt-3 border-info">
            <div className="card-header bg-info text-white">
              <h6 className="mb-0">ℹ️ Important Notes</h6>
            </div>
            <div className="card-body">
              <ul className="small mb-0">
                <li><strong>Bonus: ₹1,000 added when 13th month starts</strong></li>
                <li><strong>Timing matters:</strong> Even 1-2 days after 13th month = Bonus eligible</li>
                <li><strong>Before 13th month:</strong> Only accumulated amount (₹12,000)</li>
                <li><strong>Penalty:</strong> 5% of withdrawal amount for early withdrawals</li>
                <li>13th month starts exactly 12 months after first deposit</li>
                <li>Full withdrawal gets bonus, partial withdrawals don't</li>
                <li>Transaction is recorded in customer's history</li>
                <li>Receipt shows complete breakdown of amounts</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
