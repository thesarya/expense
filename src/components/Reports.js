import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { 
   FileText, FileSpreadsheet, Filter, 
  DollarSign, Package, Building, TrendingUp, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

const Reports = () => {
  const [expenses, setExpenses] = useState([]);
  const [inventory, setInventory] = useState([]);
  // ...existing code...
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    centre: 'all',
    category: 'all',
    selectedItems: []
  });
  const [centres, setCentres] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch expenses
      const expensesQuery = query(
        collection(db, 'expenses'),
        orderBy('timestamp', 'desc')
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      const expensesData = expensesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate()
      }));

      // Fetch inventory
      const inventoryQuery = query(collection(db, 'inventory'));
      const inventorySnapshot = await getDocs(inventoryQuery);
      const inventoryData = inventorySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setExpenses(expensesData);
      setInventory(inventoryData);

      // Extract unique centres and categories
      const uniqueCentres = [...new Set(expensesData.map(exp => exp.centre))];
      const uniqueCategories = [...new Set(expensesData.map(exp => exp.category))];
      setCentres(uniqueCentres);
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredExpenses = () => {
    let filtered = [...expenses];

    // Date filter
    if (filters.startDate) {
      filtered = filtered.filter(exp => 
        exp.timestamp >= new Date(filters.startDate)
      );
    }
    if (filters.endDate) {
      filtered = filtered.filter(exp => 
        exp.timestamp <= new Date(filters.endDate + 'T23:59:59')
      );
    }

    // Centre filter
    if (filters.centre !== 'all') {
      filtered = filtered.filter(exp => exp.centre === filters.centre);
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(exp => exp.category === filters.category);
    }

    // Selected items filter
    if (filters.selectedItems.length > 0) {
      filtered = filtered.filter(exp => 
        filters.selectedItems.includes(exp.item)
      );
    }

    return filtered;
  };

  const generateBalanceSheet = () => {
    const filteredExpenses = getFilteredExpenses();
    
    // Calculate totals
    const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalItems = filteredExpenses.length;
    
    // Group by centre
    const centreBreakdown = {};
    filteredExpenses.forEach(exp => {
      if (!centreBreakdown[exp.centre]) {
        centreBreakdown[exp.centre] = { total: 0, items: [] };
      }
      centreBreakdown[exp.centre].total += exp.amount;
      centreBreakdown[exp.centre].items.push(exp);
    });

    // Group by category
    const categoryBreakdown = {};
    filteredExpenses.forEach(exp => {
      categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] || 0) + exp.amount;
    });

    return {
      expenses: filteredExpenses,
      summary: {
        totalAmount,
        totalItems,
        dateRange: {
          start: filters.startDate || 'All Time',
          end: filters.endDate || 'All Time'
        }
      },
      centreBreakdown,
      categoryBreakdown
    };
  };

  const exportToPDF = () => {
    const balanceSheet = generateBalanceSheet();
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.setTextColor(140, 91, 170); // Sarya Purple
    doc.text('Aaryavart Centre - Balance Sheet', 20, 20);

    // Summary
    doc.setFontSize(12);
    doc.setTextColor(74, 60, 45); // Deep Brown
    doc.text(`Report Period: ${balanceSheet.summary.dateRange.start} to ${balanceSheet.summary.dateRange.end}`, 20, 35);
    doc.text(`Total Expenses: ₹${balanceSheet.summary.totalAmount.toFixed(2)}`, 20, 45);
    doc.text(`Total Items: ${balanceSheet.summary.totalItems}`, 20, 55);

    // Category Breakdown
    if (Object.keys(balanceSheet.categoryBreakdown).length > 0) {
      doc.text('Category Breakdown:', 20, 75);
      const categoryData = Object.entries(balanceSheet.categoryBreakdown).map(([category, amount]) => [
        category,
        `₹${amount.toFixed(2)}`
      ]);
      
      doc.autoTable({
        startY: 80,
        head: [['Category', 'Amount']],
        body: categoryData,
        theme: 'grid',
        headStyles: { fillColor: [140, 91, 170] },
        styles: { fontSize: 10 }
      });
    }

    // Centre Breakdown
    if (Object.keys(balanceSheet.centreBreakdown).length > 0) {
      const centreData = Object.entries(balanceSheet.centreBreakdown).map(([centre, data]) => [
        centre,
        `₹${data.total.toFixed(2)}`,
        data.items.length
      ]);
      
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Centre', 'Total Amount', 'Items']],
        body: centreData,
        theme: 'grid',
        headStyles: { fillColor: [140, 91, 170] },
        styles: { fontSize: 10 }
      });
    }

    // Detailed Expenses
    if (balanceSheet.expenses.length > 0) {
      const expenseData = balanceSheet.expenses.map(exp => [
        exp.item,
        exp.centre,
        exp.category,
        `₹${exp.amount.toFixed(2)}`,
        exp.timestamp.toLocaleDateString()
      ]);
      
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Item', 'Centre', 'Category', 'Amount', 'Date']],
        body: expenseData,
        theme: 'grid',
        headStyles: { fillColor: [140, 91, 170] },
        styles: { fontSize: 8 }
      });
    }

    // Save PDF
    const fileName = `balance_sheet_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    toast.success('PDF report downloaded successfully!');
  };

  const exportToExcel = () => {
    const balanceSheet = generateBalanceSheet();
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['Aaryavart Centre - Balance Sheet'],
      [''],
      ['Report Period:', `${balanceSheet.summary.dateRange.start} to ${balanceSheet.summary.dateRange.end}`],
      ['Total Expenses:', `₹${balanceSheet.summary.totalAmount.toFixed(2)}`],
      ['Total Items:', balanceSheet.summary.totalItems],
      [''],
      ['Category Breakdown'],
      ['Category', 'Amount']
    ];
    
    Object.entries(balanceSheet.categoryBreakdown).forEach(([category, amount]) => {
      summaryData.push([category, `₹${amount.toFixed(2)}`]);
    });
    
    summaryData.push(['']);
    summaryData.push(['Centre Breakdown']);
    summaryData.push(['Centre', 'Total Amount', 'Items']);
    
    Object.entries(balanceSheet.centreBreakdown).forEach(([centre, data]) => {
      summaryData.push([centre, `₹${data.total.toFixed(2)}`, data.items.length]);
    });
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
    
    // Detailed expenses sheet
    const expenseData = [
      ['Item', 'Centre', 'Category', 'Amount', 'Date', 'Description']
    ];
    
    balanceSheet.expenses.forEach(exp => {
      expenseData.push([
        exp.item,
        exp.centre,
        exp.category,
        exp.amount,
        exp.timestamp.toLocaleDateString(),
        exp.description || ''
      ]);
    });
    
    const expenseSheet = XLSX.utils.aoa_to_sheet(expenseData);
    XLSX.utils.book_append_sheet(wb, expenseSheet, 'Detailed Expenses');
    
    // Save Excel file
    const fileName = `balance_sheet_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('Excel report downloaded successfully!');
  };

  const handleItemSelection = (item) => {
    setFilters(prev => ({
      ...prev,
      selectedItems: prev.selectedItems.includes(item)
        ? prev.selectedItems.filter(i => i !== item)
        : [...prev.selectedItems, item]
    }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      centre: 'all',
      category: 'all',
      selectedItems: []
    });
  };

  const filteredExpenses = getFilteredExpenses();
  const balanceSheet = generateBalanceSheet();

  // Empty state UI for no data
  // ...existing code...

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-text-primary">Reports & Balance Sheet</h2>
          <p className="text-text-secondary">Generate and download financial reports</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="btn-secondary flex items-center gap-2 hover-lift"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh Data
        </button>
      </div>

      {/* Filters */}
      <div className="card hover-lift">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-text-primary">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Centre
            </label>
            <select
              value={filters.centre}
              onChange={(e) => setFilters(prev => ({ ...prev, centre: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Centres</option>
              {centres.map(centre => (
                <option key={centre} value={centre}>{centre}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Select Specific Items (Optional)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
            {[...new Set(expenses.map(exp => exp.item))].map(item => (
              <label key={item} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.selectedItems.includes(item)}
                  onChange={() => handleItemSelection(item)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="truncate">{item}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={clearFilters}
            className="btn-secondary hover-lift"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card hover-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Filtered Expenses</p>
              <p className="text-2xl font-bold text-text-primary">₹{balanceSheet.summary.totalAmount.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <DollarSign className="text-primary" size={24} />
            </div>
          </div>
        </div>

        <div className="card hover-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Items Count</p>
              <p className="text-2xl font-bold text-text-primary">{balanceSheet.summary.totalItems}</p>
            </div>
            <div className="w-12 h-12 bg-accent-blue/10 rounded-xl flex items-center justify-center">
              <Package className="text-accent-blue" size={24} />
            </div>
          </div>
        </div>

        <div className="card hover-lift">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Centres</p>
              <p className="text-2xl font-bold text-text-primary">{Object.keys(balanceSheet.centreBreakdown).length}</p>
            </div>
            <div className="w-12 h-12 bg-accent-gold/10 rounded-xl flex items-center justify-center">
              <Building className="text-accent-gold" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="card hover-lift">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Export Reports</h3>
          <div className="text-sm text-text-secondary">
            {balanceSheet.summary.dateRange.start} to {balanceSheet.summary.dateRange.end}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={exportToPDF}
            className="btn-primary flex items-center justify-center gap-2 hover-lift"
          >
            <FileText size={20} />
            Download PDF Report
          </button>
          
          <button
            onClick={exportToExcel}
            className="btn-secondary flex items-center justify-center gap-2 hover-lift"
          >
            <FileSpreadsheet size={20} />
            Download Excel Report
          </button>
        </div>
      </div>

      {/* Preview */}
      {filteredExpenses.length > 0 && (
        <div className="card hover-lift">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Preview (First 10 Items)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-medium text-text-secondary">Item</th>
                  <th className="text-left py-2 font-medium text-text-secondary">Centre</th>
                  <th className="text-left py-2 font-medium text-text-secondary">Category</th>
                  <th className="text-left py-2 font-medium text-text-secondary">Amount</th>
                  <th className="text-left py-2 font-medium text-text-secondary">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.slice(0, 10).map((expense) => (
                  <tr key={expense.id} className="border-b border-gray-100">
                    <td className="py-2 text-text-primary">{expense.item}</td>
                    <td className="py-2 text-text-secondary">{expense.centre}</td>
                    <td className="py-2 text-text-secondary">{expense.category}</td>
                    <td className="py-2 font-medium text-primary">₹{expense.amount.toFixed(2)}</td>
                    <td className="py-2 text-text-secondary">
                      {expense.timestamp.toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredExpenses.length > 10 && (
            <p className="text-sm text-text-secondary mt-2">
              Showing 10 of {filteredExpenses.length} items. Download the full report to see all items.
            </p>
          )}
        </div>
      )}

      {filteredExpenses.length === 0 && !loading && (
        <div className="card hover-lift text-center py-8">
          <TrendingUp size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-secondary mb-2">No expenses found</h3>
          <p className="text-text-secondary">Try adjusting your filters or add some expenses first.</p>
        </div>
      )}
    </div>
  );
};

export default Reports; 