export default function PrintPage() {
  const handlePrint = () => window.print();
  return (
    <div className="container">
      <h4>Print Receipt</h4>
      <p>This section will show the printable receipt for the customer.</p>
      <button onClick={handlePrint} className="btn btn-outline-primary">🖨️ Print</button>
    </div>
  );
}
