/**
 * Excel Export Utility
 * Exports data to Excel format without external dependencies
 */

export const exportToExcel = (data, filename = 'export') => {
  if (!data || data.length === 0) {
    alert('No data to export!');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  let csvContent = '';
  
  // Add headers
  csvContent += headers.join(',') + '\n';
  
  // Add data rows
  data.forEach(row => {
    const values = headers.map(header => {
      let value = row[header];
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        value = '';
      }
      
      // Convert to string and escape quotes
      value = String(value).replace(/"/g, '""');
      
      // Wrap in quotes if contains comma, newline, or quote
      if (value.includes(',') || value.includes('\n') || value.includes('"')) {
        value = `"${value}"`;
      }
      
      return value;
    });
    
    csvContent += values.join(',') + '\n';
  });
  
  // Create blob and download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export table data to Excel
export const exportTableToExcel = (tableId, filename = 'table_export') => {
  const table = document.getElementById(tableId);
  
  if (!table) {
    alert('Table not found!');
    return;
  }
  
  const data = [];
  const headers = [];
  
  // Get headers
  const headerRow = table.querySelector('thead tr');
  if (headerRow) {
    headerRow.querySelectorAll('th').forEach(th => {
      headers.push(th.textContent.trim());
    });
  }
  
  // Get data rows
  const rows = table.querySelectorAll('tbody tr');
  rows.forEach(row => {
    const rowData = {};
    row.querySelectorAll('td').forEach((td, index) => {
      const header = headers[index] || `Column${index + 1}`;
      rowData[header] = td.textContent.trim();
    });
    data.push(rowData);
  });
  
  exportToExcel(data, filename);
};

// Export with custom formatting
export const exportToExcelWithFormat = (data, filename, columnWidths = {}) => {
  if (!data || data.length === 0) {
    alert('No data to export!');
    return;
  }

  // Create HTML table for better Excel formatting
  const headers = Object.keys(data[0]);
  
  let htmlContent = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
  htmlContent += '<head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>';
  htmlContent += '<x:Name>Sheet1</x:Name>';
  htmlContent += '<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>';
  htmlContent += '</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->';
  htmlContent += '<meta charset="UTF-8"></head><body>';
  htmlContent += '<table border="1">';
  
  // Add headers
  htmlContent += '<thead><tr>';
  headers.forEach(header => {
    htmlContent += `<th style="background-color: #4472C4; color: white; font-weight: bold; padding: 8px;">${header}</th>`;
  });
  htmlContent += '</tr></thead>';
  
  // Add data rows
  htmlContent += '<tbody>';
  data.forEach((row, index) => {
    const bgColor = index % 2 === 0 ? '#F2F2F2' : 'white';
    htmlContent += `<tr style="background-color: ${bgColor};">`;
    headers.forEach(header => {
      let value = row[header];
      if (value === null || value === undefined) value = '';
      htmlContent += `<td style="padding: 5px;">${value}</td>`;
    });
    htmlContent += '</tr>';
  });
  htmlContent += '</tbody></table></body></html>';
  
  // Create blob and download
  const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.xls`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default {
  exportToExcel,
  exportTableToExcel,
  exportToExcelWithFormat
};
