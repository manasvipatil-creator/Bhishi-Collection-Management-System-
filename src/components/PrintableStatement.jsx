import React from 'react';

/**
 * Professional Bank-Style Transaction Statement
 * Similar to the SMART BHISHI format
 */
export default function PrintableStatement({ 
  customerName, 
  customerPhone, 
  accountNumber,
  agentName,
  village,
  totalBalance,
  transactions,
  date 
}) {
  return (
    <div className="printable-statement">
      {/* Header */}
      <div className="statement-header">
        <div className="header-left">
          <div className="print-date">{new Date().toLocaleString('en-IN')}</div>
        </div>
        <div className="header-center">
          <h1 className="company-name">SMART BHISHI</h1>
          <div className="statement-line"></div>
        </div>
        <div className="header-right">
          <div className="statement-title">Customer Transactions</div>
          <div className="statement-date">{date || new Date().toLocaleDateString('en-IN')}</div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="customer-info-box">
        <h3 className="section-title">Customer Information</h3>
        <div className="info-grid">
          <div className="info-row">
            <span className="info-label">Name:</span>
            <span className="info-value">{customerName}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Phone:</span>
            <span className="info-value">{customerPhone}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Account Number:</span>
            <span className="info-value">{accountNumber}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Agent Name:</span>
            <span className="info-value">{agentName}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Village:</span>
            <span className="info-value">{village}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Total Balance:</span>
            <span className="info-value balance-amount">₹{totalBalance?.toLocaleString('en-IN') || '0'}</span>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="transaction-history">
        <h3 className="section-title">Transaction History</h3>
        <table className="statement-table">
          <thead>
            <tr>
              <th>DATE & TIME</th>
              <th>RECEIPT NO</th>
              <th>DEPOSIT</th>
              <th>WITHDRAWAL</th>
              <th>PENALTY</th>
              <th>NET AMOUNT</th>
              <th>MODE</th>
            </tr>
          </thead>
          <tbody>
            {transactions && transactions.length > 0 ? (
              transactions.map((txn, index) => {
                const isDeposit = txn.type === 'deposit';
                const isWithdrawal = txn.type === 'withdrawal';
                
                return (
                  <tr key={index}>
                    <td>
                      <div className="date-cell">
                        {txn.date ? new Date(txn.date).toLocaleDateString('en-IN') : '-'}
                      </div>
                      <div className="time-cell">
                        {txn.time || '-'}
                      </div>
                    </td>
                    <td className="receipt-cell">{txn.receiptNumber || '-'}</td>
                    <td className="amount-cell deposit">
                      {isDeposit ? `₹${Number(txn.amount || 0).toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="amount-cell withdrawal">
                      {isWithdrawal ? `₹${Number(txn.requestedAmount || txn.originalAmount || txn.amount || 0).toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="amount-cell penalty">
                      {isWithdrawal && txn.penalty ? `₹${Number(txn.penalty).toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="amount-cell net">
                      {isWithdrawal ? `₹${Number(txn.netAmount || txn.amount || 0).toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="mode-cell">{txn.paymentMethod || txn.mode || 'CASH'}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="no-data">No transactions found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="statement-footer">
        <div className="footer-left">
          <small>about bhishi</small>
        </div>
        <div className="footer-right">
          <small>1/2</small>
        </div>
      </div>

      {/* Styles */}
      <style jsx>{`
        .printable-statement {
          width: 100%;
          max-width: 210mm;
          margin: 0 auto;
          padding: 20mm;
          background: white;
          font-family: Arial, sans-serif;
          color: #000;
        }

        /* Header */
        .statement-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
        }

        .header-left {
          flex: 1;
        }

        .print-date {
          font-size: 10px;
          color: #666;
        }

        .header-center {
          flex: 2;
          text-align: center;
        }

        .company-name {
          font-size: 28px;
          font-weight: bold;
          color: #2c5aa0;
          margin: 0;
          letter-spacing: 2px;
        }

        .statement-line {
          width: 100%;
          height: 2px;
          background: #2c5aa0;
          margin-top: 10px;
        }

        .header-right {
          flex: 1;
          text-align: right;
        }

        .statement-title {
          font-size: 14px;
          font-weight: bold;
          color: #2c5aa0;
        }

        .statement-date {
          font-size: 10px;
          color: #666;
          margin-top: 5px;
        }

        /* Customer Information Box */
        .customer-info-box {
          border: 2px solid #2c5aa0;
          border-left: 4px solid #2c5aa0;
          padding: 20px;
          margin-bottom: 30px;
          background: #f8f9fa;
        }

        .section-title {
          font-size: 14px;
          font-weight: bold;
          color: #2c5aa0;
          margin: 0 0 15px 0;
          text-transform: uppercase;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .info-row {
          display: flex;
          gap: 10px;
        }

        .info-label {
          font-size: 11px;
          color: #666;
          min-width: 120px;
        }

        .info-value {
          font-size: 11px;
          font-weight: 600;
          color: #000;
        }

        .balance-amount {
          color: #28a745;
          font-size: 13px;
          font-weight: bold;
        }

        /* Transaction History */
        .transaction-history {
          margin-bottom: 30px;
        }

        .statement-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }

        .statement-table thead {
          background: #f0f0f0;
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
        }

        .statement-table th {
          padding: 10px 8px;
          text-align: left;
          font-size: 9px;
          font-weight: bold;
          color: #000;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .statement-table tbody tr {
          border-bottom: 1px solid #ddd;
        }

        .statement-table tbody tr:last-child {
          border-bottom: 2px solid #000;
        }

        .statement-table td {
          padding: 10px 8px;
          font-size: 10px;
          color: #000;
          vertical-align: top;
        }

        .date-cell {
          font-weight: 600;
          font-size: 10px;
        }

        .time-cell {
          font-size: 9px;
          color: #666;
          margin-top: 2px;
        }

        .receipt-cell {
          font-size: 9px;
          color: #666;
        }

        .amount-cell {
          text-align: right;
          font-weight: 600;
        }

        .amount-cell.deposit {
          color: #28a745;
        }

        .amount-cell.withdrawal {
          color: #dc3545;
        }

        .amount-cell.penalty {
          color: #ffc107;
        }

        .amount-cell.net {
          color: #000;
          font-weight: bold;
        }

        .mode-cell {
          text-transform: uppercase;
          font-size: 9px;
        }

        .no-data {
          text-align: center;
          padding: 30px !important;
          color: #999;
          font-style: italic;
        }

        /* Footer */
        .statement-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
        }

        .statement-footer small {
          font-size: 9px;
          color: #999;
        }

        /* Print Styles */
        @media print {
          .printable-statement {
            padding: 0;
            max-width: 100%;
          }

          @page {
            size: A4;
            margin: 15mm;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
