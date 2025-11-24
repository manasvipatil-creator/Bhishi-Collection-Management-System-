# Bank-Style PDF Print Layout

## ✅ Professional Print Layout Implemented

I've updated the Daily Collections page to have a professional bank transaction statement style print layout.

## Features

### 1. **Professional Header**
- Company/Branch name prominently displayed
- Date and day clearly shown
- Generation timestamp
- Report type indicator

### 2. **Clean Table Design**
- Bold header row with borders
- Clear column separation
- Proper spacing and padding
- Professional typography
- Alternating row colors (subtle)

### 3. **Summary Statistics**
- Total Deposits highlighted in green
- Total Withdrawals highlighted in red
- Net Collection prominently displayed
- Transaction count shown

### 4. **Professional Footer**
- Transaction summary
- Authorized signature line
- Date stamp
- Computer-generated statement disclaimer

### 5. **Print Optimizations**
- A4 page size
- Proper margins (1cm)
- Page break control (no broken rows)
- Color preservation for amounts
- Clean black and white borders
- Professional font sizing

## Print Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  📅 Daily Collections                               │
│  Monday 24 November, 2025                           │
│  Generated: 24/11/2025, 9:16 AM                     │
│  Report Type: Daily Collection Statement            │
└─────────────────────────────────────────────────────┘

┌──────────┬──────────┬──────────┬──────────┐
│ ₹1,000   │   ₹0     │ ₹1,000   │    1     │
│ Deposits │Withdrawals│   Net    │  Trans   │
└──────────┴──────────┴──────────┴──────────┘

┌─────────────────────────────────────────────────────┐
│ Transaction List (1 transactions)                   │
├─────────────────────────────────────────────────────┤
│ DATE    │ CUSTOMER │ AGENT   │ TYPE    │ AMOUNT    │
├─────────┼──────────┼─────────┼─────────┼───────────┤
│24-11-25 │ Vijay    │ Shreyas │ DEPOSIT │ ₹1,000    │
│11:03 am │7709742504│8978988789│         │           │
└─────────┴──────────┴─────────┴─────────┴───────────┘

┌─────────────────────────────────────────────────────┐
│ Summary:                    Authorized Signature    │
│ Total Transactions: 1                               │
│ Total Deposits: ₹1,000      ___________________     │
│ Total Withdrawals: ₹0                               │
│ Net Collection: ₹1,000      Date: 24/11/2025        │
│                                                     │
│ This is a computer-generated statement and does     │
│ not require a signature.                            │
└─────────────────────────────────────────────────────┘
```

## Styling Details

### Colors (Print-Safe)
- **Headers:** Black text on light gray background
- **Borders:** Black (2px for main, 1px for rows)
- **Deposits:** Green (#28a745)
- **Withdrawals:** Red (#dc3545)
- **Text:** Black (#000) for main, Gray (#666) for secondary

### Typography
- **Header:** 24px bold
- **Table Headers:** 11px bold uppercase
- **Table Data:** 10-11px regular
- **Small Text:** 9px for secondary info

### Spacing
- **Page Margins:** 1cm all around
- **Table Padding:** 10-12px vertical, 8px horizontal
- **Section Spacing:** 20-30px between sections

## How to Use

1. **Open Daily Collections page**
2. **Select date and filters** (optional)
3. **Click "Print / Save as PDF" button**
4. **In print dialog:**
   - Select "Save as PDF" as printer
   - Choose "Portrait" orientation
   - Ensure "Background graphics" is enabled
   - Click "Save"

## Browser Compatibility

✅ **Chrome/Edge:** Full support with colors
✅ **Firefox:** Full support with colors
✅ **Safari:** Full support with colors

## Tips for Best Results

1. **Enable Background Graphics**
   - Chrome: Check "Background graphics" in print dialog
   - Firefox: Check "Print backgrounds" in print dialog

2. **Use Portrait Orientation**
   - Better fit for transaction tables
   - More professional look

3. **A4 Paper Size**
   - Standard business document size
   - Fits well in files and folders

4. **Save as PDF**
   - Preserves formatting perfectly
   - Easy to email or share
   - Professional appearance

## File Modified

- `src/pages/DailyCollections.jsx`

## Summary

The Daily Collections page now prints like a professional bank transaction statement with:
- ✅ Clean, professional layout
- ✅ Proper headers and footers
- ✅ Summary statistics
- ✅ Signature line
- ✅ Page break control
- ✅ Color preservation
- ✅ Professional typography
- ✅ Bank-style formatting

Perfect for official records, audits, and professional documentation! 🎉
