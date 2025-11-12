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

  const calculatePenalty = (amount) => {
    if (!eligibilityInfo || !amount) {
      setPenaltyInfo(null);
      return;
    }

    const monthsCompleted = eligibilityInfo.monthsSinceStart;
    const totalBalance = eligibilityInfo.totalDeposits;
    let penalty = 0;
    let penaltyApplied = false;

    if (monthsCompleted < 13) {
      // Penalty is 5% of withdrawal amount
      penalty = Math.floor(amount * 0.05);
      penaltyApplied = true;
    }

    const netAmount = amount - penalty;

    setPenaltyInfo({
      originalAmount: amount,
      totalBalance: totalBalance,
      penalty,
      netAmount,
      penaltyApplied,
      monthsCompleted,
      reason: penaltyApplied ? `Early withdrawal before 13 months - 5% penalty on withdrawal amount` : 'No penalty - 13 months completed'
    });
  };

  const handleAmountChange = (e) => {
    const amount = parseFloat(e.target.value) || 0;
    setWithdrawalAmount(e.target.value);
    calculatePenalty(amount);
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

    if (!window.confirm(
      `Process withdrawal for ${selectedCustomer.name}?\n\n` +
      `Total Balance: ₹${penaltyInfo.totalBalance.toLocaleString()}\n` +
      `Withdrawal Amount: ₹${penaltyInfo.originalAmount.toLocaleString()}\n` +
      `Penalty (5% of withdrawal): ₹${penaltyInfo.penalty.toLocaleString()}\n` +
      `Net Amount to Pay: ₹${penaltyInfo.netAmount.toLocaleString()}\n\n` +
      `Months Completed: ${penaltyInfo.monthsCompleted} / 13`
    )) {
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
      alert(
        `Withdrawal processed successfully!\n\n` +
        `Original Amount: ₹${result.originalAmount.toLocaleString()}\n` +
        `Penalty: ₹${result.penalty.toLocaleString()}\n` +
        `Net Amount Paid: ₹${result.netAmount.toLocaleString()}\n` +
        `Transaction ID: ${result.transactionId}\n\n` +
        `Receipt is displayed below. Click Print button to print.`
      );

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

            {/* Penalty Warning */}
            {receiptData.penaltyApplied ? (
              <div className="alert alert-warning mb-4">
                <strong>⚠️ Early Withdrawal Penalty Applied</strong><br />
                A 5% penalty has been deducted as the withdrawal is made before completing 13 months.
              </div>
            ) : (
              <div className="alert alert-success mb-4">
                <strong>✅ No Penalty</strong><br />
                13 months completed. No penalty deducted.
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
              {receiptData.penaltyApplied && (
                <div className="row mb-2 text-danger">
                  <div className="col-6"><strong>Less: Penalty (5% of withdrawal):</strong></div>
                  <div className="col-6 text-end">- ₹{receiptData.penalty.toLocaleString('en-IN')}</div>
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
              <p className="mb-0 opacity-75">5% penalty (on withdrawal amount) applies for withdrawals before 13 months</p>
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
                    <div className="alert alert-info mb-3">
                      <h6 className="alert-heading">Customer Information</h6>
                      <div className="row">
                        <div className="col-md-6">
                          <small>
                            <strong>Start Date:</strong> {eligibilityInfo.startDate}<br />
                            <strong>Months Since Start:</strong> {eligibilityInfo.monthsSinceStart} months<br />
                            <strong>Completed Months:</strong> {eligibilityInfo.completedMonths} / 12
                          </small>
                        </div>
                        <div className="col-md-6">
                          <small>
                            <strong>Total Deposits:</strong> ₹{eligibilityInfo.totalDeposits.toLocaleString()}<br />
                            <strong>Bonus Eligible:</strong> {eligibilityInfo.eligible ? '✅ Yes' : '❌ No'}<br />
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

                  {/* Penalty Calculation */}
                  {penaltyInfo && (
                    <div className={`alert ${penaltyInfo.penaltyApplied ? 'alert-warning' : 'alert-success'} mb-3`}>
                      <h6 className="alert-heading">
                        {penaltyInfo.penaltyApplied ? '⚠️ Penalty Applied' : '✅ No Penalty'}
                      </h6>
                      <div className="row mb-3">
                        <div className="col-md-3">
                          <strong>Total Balance:</strong><br />
                          <h5 className="mb-0 text-primary">₹{penaltyInfo.totalBalance.toLocaleString()}</h5>
                        </div>
                        <div className="col-md-3">
                          <strong>Withdrawal Amount:</strong><br />
                          <h5 className="mb-0">₹{penaltyInfo.originalAmount.toLocaleString()}</h5>
                        </div>
                        <div className="col-md-3">
                          <strong>Penalty (5% of withdrawal):</strong><br />
                          <h5 className="mb-0 text-danger">- ₹{penaltyInfo.penalty.toLocaleString()}</h5>
                        </div>
                        <div className="col-md-3">
                          <strong>Net Amount:</strong><br />
                          <h5 className="mb-0 text-success">₹{penaltyInfo.netAmount.toLocaleString()}</h5>
                        </div>
                      </div>
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
          <div className="card border-warning">
            <div className="card-header bg-warning text-dark">
              <h6 className="mb-0">⚠️ Withdrawal Policy</h6>
            </div>
            <div className="card-body">
              <h6 className="text-danger">Early Withdrawal Penalty</h6>
              <p className="small mb-3">
                A 5% penalty is calculated on the <strong>withdrawal amount</strong> and deducted from withdrawals made before completing 13 months.
              </p>

              <h6 className="text-success">No Penalty</h6>
              <p className="small mb-3">
                Withdrawals after 13 months have no penalty deduction.
              </p>

              <hr />

              <h6>Calculation Example:</h6>
              <div className="bg-light p-3 rounded">
                <small>
                  <strong>Scenario 1: Before 13 months</strong><br />
                  Total Balance: ₹15,550<br />
                  Withdrawal: ₹600<br />
                  Penalty (5% of ₹600): ₹30<br />
                  <strong>Net Amount: ₹570</strong>
                </small>
              </div>
              <div className="bg-light p-3 rounded mt-2">
                <small>
                  <strong>Scenario 2: After 13 months</strong><br />
                  Total Balance: ₹15,550<br />
                  Withdrawal: ₹10,000<br />
                  Penalty: ₹0<br />
                  <strong>Net Amount: ₹10,000</strong>
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
                <li><strong>Penalty is 5% of withdrawal amount</strong></li>
                <li>Penalty is calculated based on months since first deposit</li>
                <li>13 months = 12 months + 1 bonus month</li>
                <li>Early withdrawal affects bonus eligibility</li>
                <li>Transaction is recorded in customer's history</li>
                <li>Net amount = Withdrawal amount - Penalty</li>
                <li>Total balance is shown for reference</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
