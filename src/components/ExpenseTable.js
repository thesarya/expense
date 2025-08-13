import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Filter, Search, Download, Edit2, Trash2, CreditCard, Smartphone, Wallet, RefreshCw, ChevronLeft, ChevronRight, X, ChevronUp, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ExpenseTable = ({ onEditItem, refreshTrigger, viewCentre }) => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Sorting state
  const [sortField, setSortField] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'
  


  // Image preview state
  const [previewImage, setPreviewImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // Expense preview state
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const categories = [
    'Therapy Materials', 'Admin', 'Kitchen', 'Cleaning', 
    'Staff Welfare', 'Furniture/Equipment', 'Transport/Misc', 'Inventory Purchase'
  ];

  const paymentMethodIcons = {
    cash: Wallet,
    upi: Smartphone,
    card: CreditCard
  };

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentExpenses = filteredExpenses.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);

  // Generate page numbers for pagination (show max 5 pages)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is 5 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show current page, 2 before, and 2 after
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, currentPage + 2);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      // Add ellipsis if needed
      if (start > 1) {
        pages.unshift('...');
      }
      if (end < totalPages) {
        pages.push('...');
      }
    }
    
    return pages;
  };

  useEffect(() => {
    if (user?.centre || user?.role === 'admin') {
      console.log('ExpenseTable: User changed, fetching expenses');
      fetchExpenses();
    }
  }, [user?.centre, user?.role, viewCentre]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (refreshTrigger) {
      console.log('ExpenseTable: Refresh triggered');
      toast.success('Refreshing expense data...');
      fetchExpenses();
    }
  }, [refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    filterExpenses();
  }, [expenses, searchTerm, filterPeriod, selectedCategory, sortField, sortDirection]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      console.log('Fetching expenses for user:', user, 'viewCentre:', viewCentre);
      
      let q;
      if (user.role === 'admin') {
        // Admin can see all centres or filter by viewCentre
        if (viewCentre && viewCentre !== 'all') {
          q = query(
            collection(db, 'expenses'),
            where('centre', '==', viewCentre)
          );
          console.log('Admin query - fetching expenses for centre:', viewCentre);
        } else {
          q = query(collection(db, 'expenses'));
          console.log('Admin query - fetching all expenses');
        }
      } else {
        // Staff can only see their centre - no orderBy to avoid index issues
        q = query(
          collection(db, 'expenses'),
          where('centre', '==', user.centre)
        );
        console.log('Staff query - fetching expenses for centre:', user.centre);
      }
      
      const querySnapshot = await getDocs(q);
      console.log('Query snapshot size:', querySnapshot.size);
      
      const expensesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));
      
      // Sort by timestamp in JavaScript instead of Firestore
      expensesData.sort((a, b) => b.timestamp - a.timestamp);
      
      console.log('Fetched expenses:', expensesData);
      setExpenses(expensesData);
      toast.success(`Loaded ${expensesData.length} expenses successfully`);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      toast.error(`Failed to fetch expenses: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filterExpenses = () => {
    console.log('Filtering expenses:', { expenses: expenses.length, searchTerm, selectedCategory, filterPeriod });
    let filtered = [...expenses];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(expense =>
        expense.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.note?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(expense => expense.category === selectedCategory);
    }

    // Filter by period
    const now = new Date();
    const startOfPeriod = new Date();

    switch (filterPeriod) {
      case 'week':
        startOfPeriod.setDate(now.getDate() - 7);
        break;
      case 'month':
        startOfPeriod.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startOfPeriod.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startOfPeriod.setFullYear(now.getFullYear() - 1);
        break;
      default:
        break;
    }

    if (filterPeriod !== 'all') {
      filtered = filtered.filter(expense => {
        // Handle both Firestore Timestamp and Date objects
        const expenseDate = expense.timestamp?.toDate ? expense.timestamp.toDate() : expense.timestamp;
        return expenseDate >= startOfPeriod;
      });
    }

    console.log('Filtered expenses result:', filtered.length);
    
    // Apply sorting to filtered expenses
    const sortedExpenses = sortExpenses(filtered);
    setFilteredExpenses(sortedExpenses);
    // Reset to first page when filters change
    setCurrentPage(1);
  };

  const getTotalAmount = () => {
    return filteredExpenses.reduce((total, expense) => total + expense.amount, 0);
  };

  const getCategoryTotals = () => {
    const totals = {};
    filteredExpenses.forEach(expense => {
      totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
    });
    return totals;
  };

  // Sorting function
  const sortExpenses = (expenses) => {
    return [...expenses].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'date':
          aValue = a.date ? new Date(a.date) : new Date(0);
          bValue = b.date ? new Date(b.date) : new Date(0);
          break;
        case 'timestamp':
          aValue = a.timestamp?.toDate ? a.timestamp.toDate() : a.timestamp;
          bValue = b.timestamp?.toDate ? b.timestamp.toDate() : b.timestamp;
          break;
        case 'item':
          aValue = a.item?.toLowerCase() || '';
          bValue = b.item?.toLowerCase() || '';
          break;
        case 'category':
          aValue = a.category?.toLowerCase() || '';
          bValue = b.category?.toLowerCase() || '';
          break;
        case 'amount':
          aValue = a.amount || 0;
          bValue = b.amount || 0;
          break;
        case 'paymentMethod':
          aValue = a.paymentMethod?.toLowerCase() || '';
          bValue = b.paymentMethod?.toLowerCase() || '';
          break;
        case 'centre':
          aValue = a.centre?.toLowerCase() || '';
          bValue = b.centre?.toLowerCase() || '';
          break;
        case 'createdBy':
          aValue = a.createdBy?.toLowerCase() || '';
          bValue = b.createdBy?.toLowerCase() || '';
          break;
        default:
          return 0;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  };

  // Handle sort change
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Sortable header component
  const SortableHeader = ({ field, children, className = "" }) => {
    const isActive = sortField === field;
    return (
      <th 
        className={`text-left py-4 px-4 font-semibold text-text-primary text-sm uppercase tracking-wide cursor-pointer hover:bg-gray-100 transition-colors ${isActive ? 'bg-primary/5 border-b-2 border-primary' : ''} ${className}`}
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-2">
          <span className={isActive ? 'text-primary font-bold' : ''}>{children}</span>
          <div className="flex flex-col">
            <ChevronUp 
              size={12} 
              className={`${isActive && sortDirection === 'asc' ? 'text-primary' : 'text-gray-300'}`} 
            />
            <ChevronDown 
              size={12} 
              className={`${isActive && sortDirection === 'desc' ? 'text-primary' : 'text-gray-300'}`} 
            />
          </div>
        </div>
      </th>
    );
  };



  const exportToCSV = () => {
    const headers = ['Date', 'Modified Date', 'Item', 'Category', 'Amount', 'Payment Method', 'Centre', 'Added By', 'Note'];
    const csvData = filteredExpenses.map(expense => [
      expense.date ? format(new Date(expense.date), 'dd/MM/yyyy') : 'N/A',
      format(expense.timestamp?.toDate ? expense.timestamp.toDate() : expense.timestamp, 'dd/MM/yyyy'),
      expense.item,
      expense.category,
      expense.amount,
      expense.paymentMethod?.toUpperCase() || 'N/A',
      expense.centre,
      expense.createdBy,
      expense.note || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Create filename with filter information
    let filename = `expenses_${user.centre || 'all'}_${format(new Date(), 'dd-MM-yyyy')}`;
    if (selectedCategory) {
      filename += `_${selectedCategory.replace(/\s+/g, '_')}`;
    }
    if (filterPeriod !== 'all') {
      filename += `_${filterPeriod}`;
    }
    filename += '.csv';
    
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleEditExpense = (expense) => {
    if (onEditItem) {
      onEditItem(expense.id, expense);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteDoc(doc(db, 'expenses', expenseId));
        toast.success('Expense deleted successfully');
        fetchExpenses();
      } catch (error) {
        console.error('Error deleting expense:', error);
        toast.error('Failed to delete expense');
      }
    }
  };

  const handleImagePreview = (file) => {
    console.log('Handling image preview for file:', file);
    
    // Check if file is an image
    if (file.type && file.type.startsWith('image/')) {
      console.log('Setting image preview modal for:', file.name);
      setPreviewImage(file);
      setShowImageModal(true);
    } else {
      // For non-image files, open in new tab
      console.log('Opening non-image file in new tab:', file.name);
      window.open(file.url, '_blank');
    }
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setPreviewImage(null);
  };

  const handleExpensePreview = (expense) => {
    setSelectedExpense(expense);
    setShowExpenseModal(true);
  };

  const closeExpenseModal = () => {
    setShowExpenseModal(false);
    setSelectedExpense(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-text-primary">Expense Records</h2>
          <p className="text-sm sm:text-base text-text-secondary">
            {user.role === 'admin' ? 'All centres expenses' : `${user.centre} centre expenses`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={fetchExpenses}
            className="btn-secondary flex items-center gap-1 sm:gap-2 hover-lift text-sm sm:text-base px-3 py-2"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{loading ? 'Loading...' : 'Refresh'}</span>
          </button>
          <button
            onClick={() => {
              console.log('Current user:', user);
              console.log('Current expenses:', expenses);
              console.log('Filtered expenses:', filteredExpenses);
              console.log('Modal states:', { showImageModal, showExpenseModal, previewImage, selectedExpense });
              toast.success('Debug info logged to console');
            }}
            className="btn-secondary flex items-center gap-1 sm:gap-2 hover-lift text-sm sm:text-base px-3 py-2"
          >
            <span className="hidden sm:inline">Debug</span>
          </button>
          <button
            onClick={exportToCSV}
            className="btn-secondary flex items-center gap-1 sm:gap-2 hover-lift text-sm sm:text-base px-3 py-2"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="text-primary w-5 h-5" />
            <h3 className="text-lg font-semibold text-text-primary">Filters</h3>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 sm:px-4 py-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className="text-sm font-medium text-text-primary">
              {filteredExpenses.length} expenses
            </span>
            {sortField && (
              <div className="flex items-center gap-1 text-xs text-text-secondary">
                <span>•</span>
                <span>Sorted by: {sortField}</span>
                <span className="font-medium">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                <button
                  onClick={() => {
                    setSortField('timestamp');
                    setSortDirection('desc');
                  }}
                  className="ml-2 text-primary hover:text-primary-dark underline"
                  title="Reset to default sort"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search expenses..."
              className="input-field pl-10 bg-gray-50 border-gray-200 focus:bg-white focus:border-primary"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input-field bg-gray-50 border-gray-200 focus:bg-white focus:border-primary"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="input-field bg-gray-50 border-gray-200 focus:bg-white focus:border-primary"
          >
            <option value="all">All Time</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 sm:p-6 border border-blue-200 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-blue-600 font-medium mb-1">Total Amount</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-800">₹{getTotalAmount().toFixed(2)}</p>
              <p className="text-xs text-blue-500 mt-1">All filtered expenses</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <Calendar className="text-white" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 sm:p-6 border border-green-200 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-green-600 font-medium mb-1">Total Expenses</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-800">{filteredExpenses.length}</p>
              <p className="text-xs text-green-500 mt-1">Records found</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
              <Filter className="text-white" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 sm:p-6 border border-purple-200 hover:shadow-lg transition-all duration-300 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-purple-600 font-medium mb-1">Average Amount</p>
              <p className="text-2xl sm:text-3xl font-bold text-purple-800">
                ₹{filteredExpenses.length > 0 ? (getTotalAmount() / filteredExpenses.length).toFixed(2) : '0.00'}
              </p>
              <p className="text-xs text-purple-500 mt-1">Per expense</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
              <Download className="text-white" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      {Object.keys(getCategoryTotals()).length > 0 && (
        <div className="card hover-lift p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Category Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {Object.entries(getCategoryTotals()).map(([category, total]) => (
              <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-text-primary text-sm sm:text-base">{category}</span>
                <span className="font-bold text-primary text-sm sm:text-base">₹{total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expenses Table */}
      <div className="card hover-lift p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-text-secondary">Loading expenses...</span>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-gray-50">
                    <SortableHeader field="date">Date</SortableHeader>
                    <SortableHeader field="timestamp">Modified</SortableHeader>
                    <SortableHeader field="item">Item</SortableHeader>
                    <SortableHeader field="category">Category</SortableHeader>
                    <SortableHeader field="amount">Amount</SortableHeader>
                    <SortableHeader field="paymentMethod">Payment</SortableHeader>
                    {user.role === 'admin' && (
                      <SortableHeader field="centre">Centre</SortableHeader>
                    )}
                    <SortableHeader field="createdBy">Added By</SortableHeader>
                    <th className="text-left py-4 px-4 font-semibold text-text-primary text-sm uppercase tracking-wide">Attachments</th>
                    <th className="text-left py-4 px-4 font-semibold text-text-primary text-sm uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-gray-100">
                {currentExpenses.map((expense) => {
                  const PaymentIcon = paymentMethodIcons[expense.paymentMethod] || Wallet;
                  return (
                    <tr 
                      key={expense.id} 
                      className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                      onClick={() => handleExpensePreview(expense)}
                    >
                      <td className="py-4 px-4">
                        <div className="text-sm font-medium text-text-primary">
                          {expense.date ? format(new Date(expense.date), 'dd/MM/yyyy') : 'N/A'}
                        </div>
                        <div className="text-xs text-text-secondary">
                          {expense.date ? format(new Date(expense.date), 'EEEE') : ''}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm font-medium text-text-primary">
                          {format(expense.timestamp?.toDate ? expense.timestamp.toDate() : expense.timestamp, 'dd/MM/yyyy')}
                        </div>
                        <div className="text-xs text-text-secondary">
                          {format(expense.timestamp?.toDate ? expense.timestamp.toDate() : expense.timestamp, 'HH:mm')}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-semibold text-text-primary text-sm">{expense.item}</p>
                          {expense.note && (
                            <p className="text-xs text-text-secondary mt-1 italic">"{expense.note}"</p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold border border-primary/20">
                          {expense.category}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-lg text-text-primary">₹{expense.amount.toFixed(2)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <PaymentIcon size={14} className="text-text-secondary" />
                          </div>
                          <span className="text-sm font-medium text-text-secondary">
                            {expense.paymentMethod?.toUpperCase() || 'CASH'}
                          </span>
                        </div>
                      </td>
                      {user.role === 'admin' && (
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                            {expense.centre}
                          </span>
                        </td>
                      )}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-xs font-semibold text-primary">
                              {expense.createdBy?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          </div>
                          <span className="text-sm text-text-secondary font-medium">{expense.createdBy}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {expense.attachments && expense.attachments.length > 0 ? (
                          <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                            {expense.attachments.map((file, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  console.log('Attachment clicked:', file);
                                  handleImagePreview(file);
                                }}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 transition-colors duration-150"
                                title={file.type && file.type.startsWith('image/') ? 'Preview image' : 'Open file'}
                              >
                                {file.type && file.type.startsWith('image/') ? (
                                  <div className="w-4 h-4 rounded overflow-hidden border border-gray-300">
                                    <img 
                                      src={file.url} 
                                      alt={file.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <Download size={12} className="text-gray-500" />
                                )}
                                <span className="truncate max-w-16 font-medium">{file.name}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No attachments</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleEditExpense(expense)}
                            className="p-2 text-primary hover:text-primary-dark hover:bg-primary/10 rounded-lg transition-colors duration-150"
                            title="Edit expense"
                          >
                            <Edit2 size={16} />
                          </button>
                          {user.role === 'admin' && (
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="p-2 text-error hover:text-error-dark hover:bg-error/10 rounded-lg transition-colors duration-150"
                              title="Delete expense"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {filteredExpenses.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search size={24} className="text-gray-400" />
                </div>
                <p className="text-text-secondary font-medium">No expenses found</p>
                <p className="text-sm text-text-secondary mt-1">Try adjusting your filters or add a new expense</p>
              </div>
            )}
            
            {/* Desktop Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                <div className="text-sm text-text-secondary">
                  Showing <span className="font-semibold">{indexOfFirstItem + 1}</span> to <span className="font-semibold">{Math.min(indexOfLastItem, filteredExpenses.length)}</span> of <span className="font-semibold">{filteredExpenses.length}</span> expenses
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  {getPageNumbers().map((page, index) => (
                    <button
                      key={index}
                      onClick={() => typeof page === 'number' ? setCurrentPage(page) : null}
                      disabled={page === '...'}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors duration-150 ${
                        page === '...'
                          ? 'border-gray-200 text-gray-400 cursor-default'
                          : currentPage === page
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {currentExpenses.map((expense) => {
              const PaymentIcon = paymentMethodIcons[expense.paymentMethod] || Wallet;
              return (
                <div 
                  key={expense.id} 
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleExpensePreview(expense)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-text-primary text-base mb-1">{expense.item}</h3>
                      {expense.note && (
                        <p className="text-xs text-text-secondary italic mb-2">"{expense.note}"</p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <span>Date: {expense.date ? format(new Date(expense.date), 'dd/MM/yyyy') : 'N/A'}</span>
                        <span>•</span>
                        <span>Modified: {format(expense.timestamp?.toDate ? expense.timestamp.toDate() : expense.timestamp, 'dd/MM/yyyy')}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-text-primary">₹{expense.amount.toFixed(2)}</div>
                      <span className="inline-flex items-center px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold border border-primary/20">
                        {expense.category}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                        <PaymentIcon size={12} className="text-text-secondary" />
                      </div>
                      <span className="text-xs text-text-secondary">
                        {expense.paymentMethod?.toUpperCase() || 'CASH'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleEditExpense(expense)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Edit expense"
                      >
                        <Edit2 size={16} />
                      </button>
                      {user.role === 'admin' && (
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                          title="Delete expense"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Attachments */}
                  {expense.attachments && expense.attachments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                        {expense.attachments.map((file, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              console.log('Attachment clicked:', file);
                              handleImagePreview(file);
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 transition-colors duration-150"
                            title={file.type && file.type.startsWith('image/') ? 'Preview image' : 'Open file'}
                          >
                            {file.type && file.type.startsWith('image/') ? (
                              <div className="w-4 h-4 rounded overflow-hidden border border-gray-300">
                                <img 
                                  src={file.url} 
                                  alt={file.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <Download size={12} className="text-gray-500" />
                            )}
                            <span className="truncate max-w-16 font-medium">{file.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {filteredExpenses.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search size={24} className="text-gray-400" />
                </div>
                <p className="text-text-secondary font-medium">No expenses found</p>
                <p className="text-sm text-text-secondary mt-1">Try adjusting your filters or add a new expense</p>
              </div>
            )}
            
            {/* Mobile Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center gap-4 mt-8 pt-6 border-t border-gray-200">
                <div className="text-sm text-text-secondary text-center">
                  Showing <span className="font-semibold">{indexOfFirstItem + 1}</span> to <span className="font-semibold">{Math.min(indexOfLastItem, filteredExpenses.length)}</span> of <span className="font-semibold">{filteredExpenses.length}</span> expenses
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {getPageNumbers().slice(0, 3).map((page, index) => (
                      <button
                        key={index}
                        onClick={() => typeof page === 'number' ? setCurrentPage(page) : null}
                        disabled={page === '...'}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors duration-150 ${
                          page === '...'
                            ? 'border-gray-200 text-gray-400 cursor-default'
                            : currentPage === page
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>

      {/* Image Preview Modal */}
      {showImageModal && previewImage && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-2 sm:p-4" onClick={closeImageModal}>
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[95vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h3 className="text-lg sm:text-xl font-bold text-text-primary truncate">
                {previewImage.name}
              </h3>
              <button
                onClick={closeImageModal}
                className="text-text-secondary hover:text-text-primary p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-auto max-h-[calc(95vh-120px)] flex items-center justify-center">
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                onError={(e) => {
                  console.error('Image failed to load:', previewImage.url);
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="hidden text-center text-gray-500">
                <p>Image failed to load</p>
                <a 
                  href={previewImage.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Open in new tab
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expense Preview Modal */}
      {showExpenseModal && selectedExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h3 className="text-lg sm:text-xl font-bold text-text-primary">Expense Details</h3>
              <button
                onClick={closeExpenseModal}
                className="text-text-secondary hover:text-text-primary p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4 sm:space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Item</label>
                    <p className="text-lg font-semibold text-text-primary mt-1">{selectedExpense.item}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Amount</label>
                    <p className="text-2xl font-bold text-primary mt-1">₹{selectedExpense.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Category</label>
                    <span className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold border border-primary/20 mt-1">
                      {selectedExpense.category}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Payment Method</label>
                    <div className="flex items-center gap-2 mt-1">
                      {(() => {
                        const PaymentIcon = paymentMethodIcons[selectedExpense.paymentMethod] || Wallet;
                        return (
                          <>
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                              <PaymentIcon size={16} className="text-text-secondary" />
                            </div>
                            <span className="font-medium text-text-primary">
                              {selectedExpense.paymentMethod?.toUpperCase() || 'CASH'}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Expense Date</label>
                    <p className="text-lg font-medium text-text-primary mt-1">
                      {selectedExpense.date ? format(new Date(selectedExpense.date), 'EEEE, MMMM do, yyyy') : 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Modified Date</label>
                    <p className="text-lg font-medium text-text-primary mt-1">
                      {format(selectedExpense.timestamp?.toDate ? selectedExpense.timestamp.toDate() : selectedExpense.timestamp, 'EEEE, MMMM do, yyyy')}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {format(selectedExpense.timestamp?.toDate ? selectedExpense.timestamp.toDate() : selectedExpense.timestamp, 'h:mm a')}
                    </p>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Added By</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {selectedExpense.createdBy?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <span className="font-medium text-text-primary">{selectedExpense.createdBy}</span>
                    </div>
                  </div>
                  {user.role === 'admin' && (
                    <div>
                      <label className="text-sm font-medium text-text-secondary">Centre</label>
                      <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-medium mt-1">
                        {selectedExpense.centre}
                      </span>
                    </div>
                  )}
                </div>

                {/* Note */}
                {selectedExpense.note && (
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Note</label>
                    <p className="text-text-primary mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      "{selectedExpense.note}"
                    </p>
                  </div>
                )}

                {/* Attachments */}
                {selectedExpense.attachments && selectedExpense.attachments.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-text-secondary mb-3 block">Attachments</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedExpense.attachments.map((file, index) => (
                        <button
                          key={index}
                          onClick={() => handleImagePreview(file)}
                          className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors duration-150"
                          title={file.type && file.type.startsWith('image/') ? 'Preview image' : 'Open file'}
                        >
                          {file.type && file.type.startsWith('image/') ? (
                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-300">
                              <img 
                                src={file.url} 
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                              <Download size={20} className="text-gray-500" />
                            </div>
                          )}
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
                            <p className="text-xs text-text-secondary">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      handleEditExpense(selectedExpense);
                      closeExpenseModal();
                    }}
                    className="flex-1 bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-dark transition-colors duration-150"
                  >
                    Edit Expense
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteExpense(selectedExpense.id);
                      closeExpenseModal();
                    }}
                    className="flex-1 bg-error text-white py-3 px-4 rounded-lg font-medium hover:bg-error-dark transition-colors duration-150"
                  >
                    Delete Expense
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseTable;