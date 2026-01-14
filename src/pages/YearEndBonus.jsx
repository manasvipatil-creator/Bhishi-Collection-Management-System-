import React, { useEffect, useState } from "react";
import { getAllEligibleCustomers, addTransactionToAgent } from "../utils/databaseHelpers";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./YearEndBonus.css";

export default function YearEndBonus() {
  const [eligibleCustomers, setEligibleCustomers] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    loadEligibleCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  const loadEligibleCustomers = async () => {
    setLoading(true);
    try {
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
          const isFullBonus = bonusAmount === 1000;
          const bonusType = isFullBonus ? 'Full Bonus (₹1,000)' : 'No Bonus';

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

          if (isFullBonus) fullBonusCount++;
          else partialBonusCount++;
        }
      }

      alert(`Year-end bonuses processed successfully!\n\n` +
        `Total Customers: ${customersProcessed}\n` +
        `Full Bonus (₹12,000): ${fullBonusCount}\n` +
        `Accumulated Only: ${partialBonusCount}\n` +
        `Total Amount: ₹${totalBonusProcessed.toLocaleString()}`);

      loadEligibleCustomers();
    } catch (error) {
      alert("Error processing bonuses: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();

    // Add Business Header
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Primary color
    doc.text("Bishi Collection Management", 14, 20);

    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55); // Gray-800
    doc.text(`Year-End Bonus Report - ${selectedYear}`, 14, 30);

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128); // Gray-500
    doc.text(`Report View: ${statusFilter}`, 14, 38);
    doc.text(`Generation Date: ${new Date().toLocaleString()}`, 14, 44);

    // Summary of filtered data
    const filteredCount = filteredCustomers.length;
    const filteredPayout = filteredCustomers.filter(c => c.totalDeposits >= 12000).length * 1000;

    doc.setTextColor(31, 41, 55); // Gray-800
    doc.text(`Records in this Report: ${filteredCount}`, 14, 52);
    doc.text(`Bonus Payout in this Report: Rs. ${filteredPayout.toLocaleString()}`, 14, 58);

    // Prepare table data
    const tableColumn = [
      { header: 'Customer Details', dataKey: 'customer' },
      { header: 'Agent', dataKey: 'agent' },
      { header: 'Timeline', dataKey: 'timeline' },
      { header: 'Deposits', dataKey: 'deposits' },
      { header: '12th Month', dataKey: 'twelfth' },
      { header: 'Bonus', dataKey: 'bonus' },
      { header: 'Payout', dataKey: 'payout' },
      { header: 'Status', dataKey: 'status' }
    ];

    const tableRows = filteredCustomers.map(customer => {
      const isFullBonus = customer.totalDeposits >= 12000;
      return {
        customer: `${customer.customerName}\n${customer.customerPhone}`,
        agent: customer.agentName,
        timeline: `Start: ${customer.startDate}\n${customer.completedMonths}/12 Months`,
        deposits: `Rs. ${customer.totalDeposits.toLocaleString()}`,
        twelfth: customer.twelfthMonthStatus.hasMissedPayment ? `Delayed (${customer.twelfthMonthStatus.missedDays}d)` : "On Time",
        bonus: isFullBonus ? "Rs. 1,000" : "-",
        payout: `Rs. ${(customer.totalDeposits + (isFullBonus ? 1000 : 0)).toLocaleString()}`,
        status: isFullBonus ? "Full Bonus" : "In Progress"
      };
    });

    // Generate table
    autoTable(doc, {
      columns: tableColumn,
      body: tableRows,
      startY: 65,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        valign: 'middle',
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontSize: 9,
        halign: 'center'
      },
      columnStyles: {
        deposits: { halign: 'right' },
        bonus: { halign: 'right' },
        payout: { halign: 'right', fontStyle: 'bold' },
        status: { halign: 'center' },
        twelfth: { halign: 'center' }
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { top: 65 }
    });

    // Add footer to each page
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
      doc.text(
        "© 2025 Bishi Collection Management System",
        14,
        doc.internal.pageSize.height - 10
      );
    }

    doc.save(`YearEnd_Bonus_${selectedYear}_${statusFilter.replace(/\s+/g, '_')}.pdf`);
  };

  const filteredCustomers = eligibleCustomers.filter(customer => {
    if (statusFilter === 'All Status') return true;
    const isFullBonus = customer.totalDeposits >= 12000;
    if (statusFilter === 'Full Bonus') return isFullBonus;
    if (statusFilter === 'In Progress') return !isFullBonus;
    return true;
  });

  const totalEligibleCustomers = eligibleCustomers.length;
  const fullBonusCustomers = eligibleCustomers.filter(c => c.totalDeposits >= 12000).length;
  const partialBonusCustomers = eligibleCustomers.filter(c => c.totalDeposits < 12000).length;
  const totalBonusAmount = fullBonusCustomers * 1000;

  return (
    <div className="yeb-container fade-in-up">
      {/* Header */}
      <div className="yeb-header">
        <div className="yeb-title">
          <span style={{ fontSize: '1.5rem' }}>🎁</span>
          <div>
            <div>Year-End Bonus System</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: '400' }}>
              Process bonuses for {selectedYear}
            </div>
          </div>
        </div>
        <div>
          <select
            className="yeb-year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {[2025, 2024, 2023, 2022, 2021].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="yeb-stats-grid">
        <div className="yeb-stat-card">
          <div className="yeb-stat-content">
            <h3>{totalEligibleCustomers}</h3>
            <p>Eligible Customers</p>
          </div>
          <div className="yeb-stat-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary-color)' }}>
            👥
          </div>
        </div>
        <div className="yeb-stat-card">
          <div className="yeb-stat-content">
            <h3>{fullBonusCustomers}</h3>
            <p>Full Bonus</p>
          </div>
          <div className="yeb-stat-icon" style={{ background: 'var(--success-light)', color: 'var(--success-color)' }}>
            ✅
          </div>
        </div>
        <div className="yeb-stat-card">
          <div className="yeb-stat-content">
            <h3>{partialBonusCustomers}</h3>
            <p>Accumulated Only</p>
          </div>
          <div className="yeb-stat-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning-color)' }}>
            ⚠️
          </div>
        </div>
        <div className="yeb-stat-card">
          <div className="yeb-stat-content">
            <h3 className="text-success">₹{totalBonusAmount.toLocaleString()}</h3>
            <p>Total Bonus Payout</p>
          </div>
          <div className="yeb-stat-icon" style={{ background: 'var(--success-light)', color: 'var(--success-color)' }}>
            💰
          </div>
        </div>
      </div>

      {/* Rules Toggle */}
      <div className="card border-0 shadow-sm mb-4">
        <div
          className="card-header bg-white border-bottom-0 d-flex justify-content-between align-items-center cursor-pointer p-3"
          onClick={() => setShowRules(!showRules)}
          style={{ cursor: 'pointer' }}
        >
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-light text-dark border">ℹ️ Info</span>
            <span className="fw-semibold">Bonus System Rules</span>
          </div>
          <span className="text-muted">{showRules ? '▼' : '▶'}</span>
        </div>
        {showRules && (
          <div className="card-body pt-0 border-top">
            <div className="yeb-rules-content mt-0 border-0 pt-3">
              <div className="yeb-rule-box" style={{ background: 'var(--success-light)', color: 'var(--success-color)' }}>
                <strong>✅ Full Bonus (₹12,000)</strong>
                <ul>
                  <li>12 months of ₹1,000 payments</li>
                  <li>Total deposits ₹12,000</li>
                  <li>Ontime 12th payment</li>
                </ul>
              </div>
              <div className="yeb-rule-box" style={{ background: 'var(--warning-light)', color: '#92400e' }}>
                <strong>⚠️ Accumulated Only</strong>
                <ul>
                  <li>12 months completed</li>
                  <li>Delayed 12th month payment</li>
                  <li>No bonus applied</li>
                </ul>
              </div>
              <div className="yeb-rule-box" style={{ background: 'var(--danger-light)', color: 'var(--danger-color)' }}>
                <strong>❌ Penalty</strong>
                <ul>
                  <li>5% cut if withdrawn early</li>
                  <li>Penalty free after 12 months</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="yeb-toolbar">
        <div className="yeb-filter-group">
          <span className="text-muted small fw-bold text-uppercase">Filter:</span>
          <select
            className="form-select form-select-sm"
            style={{ width: '150px', borderColor: 'var(--gray-200)' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All Status">All Status</option>
            <option value="Full Bonus">✅ Full Bonus</option>
            <option value="In Progress">⏳ In Progress</option>
          </select>
          <button
            className="yeb-download-btn"
            onClick={downloadPDF}
            disabled={filteredCustomers.length === 0}
            title="Download current view as PDF"
          >
            <span>📥</span> Download PDF
          </button>
        </div>
        <button
          className="yeb-process-btn"
          onClick={processYearEndBonuses}
          disabled={processing || totalBonusAmount === 0}
        >
          {processing ? 'Processing...' : 'Process Bonuses'}
        </button>
      </div>

      <div className="yeb-table-container">
        {loading ? (
          <div className="text-center p-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-3 text-muted">Loading data...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center p-5 text-muted">
            No eligible customers found for {selectedYear}.
          </div>
        ) : (
          <div className="table-responsive" style={{ maxHeight: '600px' }}>
            <table className="yeb-table">
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ textAlign: 'left', minWidth: '200px' }}>CUSTOMER / AGENT</th>
                  <th style={{ textAlign: 'left', minWidth: '130px' }}>TIMELINE</th>
                  <th style={{ textAlign: 'right', minWidth: '120px' }}>TOTAL DEPOSITS</th>
                  <th style={{ textAlign: 'center', minWidth: '120px' }}>12TH MONTH</th>
                  <th style={{ textAlign: 'right', minWidth: '100px' }}>BONUS</th>
                  <th style={{ textAlign: 'right', minWidth: '120px' }}>PAYOUT</th>
                  <th style={{ textAlign: 'center', minWidth: '120px' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer, index) => {
                  const isFullBonus = customer.totalDeposits >= 12000;
                  const twelfthMonth = customer.twelfthMonthStatus;
                  const isDelayed = twelfthMonth.hasMissedPayment;

                  return (
                    <tr key={index}>
                      <td style={{ verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                          {customer.customerName}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {customer.customerPhone}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: '4px' }}>
                          Agent: {customer.agentName}
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'middle' }}>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '6px' }}>
                          Started: {customer.startDate}
                        </div>
                        <div>
                          <span className="yeb-badge yeb-badge-gray">
                            {customer.completedMonths} / 12 mos
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                        <span style={{ fontWeight: '600', color: '#1f2937', fontSize: '0.95rem' }}>
                          ₹{customer.totalDeposits.toLocaleString()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        {isDelayed ? (
                          <span className="yeb-badge yeb-badge-warning">
                            Delayed ({twelfthMonth.missedDays}d)
                          </span>
                        ) : (
                          <span className="yeb-badge yeb-badge-success">
                            On Time
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                        {isFullBonus ? (
                          <span style={{ color: 'var(--success-color)', fontWeight: '600', fontSize: '0.95rem' }}>
                            +₹1,000
                          </span>
                        ) : (
                          <span style={{ color: '#9ca3af', fontWeight: '500' }}>-</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                        <span style={{ fontWeight: '600', color: 'var(--primary-color)', fontSize: '0.95rem' }}>
                          ₹{(customer.totalDeposits + (isFullBonus ? 1000 : 0)).toLocaleString()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        {isFullBonus ? (
                          <span className="yeb-badge yeb-badge-success">Full Bonus</span>
                        ) : (
                          <span className="yeb-badge yeb-badge-gray">In Progress</span>
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
  );
}
