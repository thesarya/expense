import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Filter, Search, Download, Edit2, Trash2, CreditCard, Smartphone, Wallet, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ExpenseTable = ({ onEditItem, refreshTrigger }) => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState('');

  const categories = [
    'Therapy Materials', 'Admin', 'Kitchen', 'Cleaning', 
    'Staff Welfare', 'Furniture/Equipment', 'Transport/Misc', 'Inventory Purchase'
  ];

  const paymentMethodIcons = {
    cash: Wallet,
    upi: Smartphone,
    card: CreditCard
  };

  useEffect(() => {
    if (user?.centre || user?.role === 'admin') {
      console.log('ExpenseTable: User changed, fetching expenses');
      fetchExpenses();
    }
  }, [user?.centre, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (refreshTrigger) {
      console.log('ExpenseTable: Refresh triggered');
      toast.success('Refreshing expense data...');
      fetchExpenses();
    }
  }, [refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    filterExpenses();
  }, [expenses, searchTerm, filterPeriod, selectedCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      console.log('Fetching expenses for user:', user);
      
      let q;
      if (user.role === 'admin') {
        // Admin can see all centres - no orderBy to avoid index issues
        q = query(collection(db, 'expenses'));
        console.log('Admin query - fetching all expenses');
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
    setFilteredExpenses(filtered);
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

  const exportToCSV = () => {
    const headers = ['Date', 'Item', 'Category', 'Amount', 'Payment Method', 'Centre', 'Added By', 'Note'];
    const csvData = filteredExpenses.map(expense => [
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
    a.download = `expenses_${user.centre}_${format(new Date(), 'dd-MM-yyyy')}.csv`;
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-text-primary">Expense Records</h2>
          <p className="text-text-secondary">
            {user.role === 'admin' ? 'All centres expenses' : `${user.centre} centre expenses`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchExpenses}
            className="btn-secondary flex items-center gap-2 hover-lift"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={() => {
              console.log('Current user:', user);
              console.log('Current expenses:', expenses);
              console.log('Filtered expenses:', filteredExpenses);
              toast.success('Debug info logged to console');
            }}
            className="btn-secondary flex items-center gap-2 hover-lift"
          >
            Debug
          </button>
          <button
            onClick={exportToCSV}
            className="btn-secondary flex items-center gap-2 hover-lift"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary w-5 h-5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search..."
          className="input-field pl-10"
        />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="input-field"
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>

        <select
          value={filterPeriod}
          onChange={(e) => setFilterPeriod(e.target.value)}
          className="input-field"
        >
          <option value="all">All Time</option>
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
          <option value="quarter">Last Quarter</option>
          <option value="year">Last Year</option>
        </select>

        <div className="flex items-center gap-2">
          <Filter className="text-text-secondary w-5 h-5" />
          <span className="text-sm text-text-secondary">
            {filteredExpenses.length} expenses
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="card hover-lift p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Total Amount</p>
              <p className="text-2xl font-bold text-text-primary">₹{getTotalAmount().toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Calendar className="text-primary" size={24} />
            </div>
          </div>
        </div>

        <div className="card hover-lift p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Total Expenses</p>
              <p className="text-2xl font-bold text-text-primary">{filteredExpenses.length}</p>
            </div>
            <div className="w-12 h-12 bg-accent-blue/10 rounded-xl flex items-center justify-center">
              <Filter className="text-accent-blue" size={24} />
            </div>
          </div>
        </div>

        <div className="card hover-lift p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Average Amount</p>
              <p className="text-2xl font-bold text-text-primary">
                ₹{filteredExpenses.length > 0 ? (getTotalAmount() / filteredExpenses.length).toFixed(2) : '0.00'}
              </p>
            </div>
            <div className="w-12 h-12 bg-accent-gold/10 rounded-xl flex items-center justify-center">
              <Download className="text-accent-gold" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      {Object.keys(getCategoryTotals()).length > 0 && (
        <div className="card hover-lift p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Category Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(getCategoryTotals()).map(([category, total]) => (
              <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-text-primary">{category}</span>
                <span className="font-bold text-primary">₹{total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expenses Table */}
      <div className="card hover-lift p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-text-secondary">Loading expenses...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-text-primary">Date</th>
                <th className="text-left py-3 px-4 font-medium text-text-primary">Item</th>
                <th className="text-left py-3 px-4 font-medium text-text-primary">Category</th>
                <th className="text-left py-3 px-4 font-medium text-text-primary">Amount</th>
                <th className="text-left py-3 px-4 font-medium text-text-primary">Payment</th>
                {user.role === 'admin' && (
                  <th className="text-left py-3 px-4 font-medium text-text-primary">Centre</th>
                )}
                <th className="text-left py-3 px-4 font-medium text-text-primary">Added By</th>
                <th className="text-left py-3 px-4 font-medium text-text-primary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense) => {
                const PaymentIcon = paymentMethodIcons[expense.paymentMethod] || Wallet;
                return (
                  <tr key={expense.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-text-secondary">
                      {format(expense.timestamp?.toDate ? expense.timestamp.toDate() : expense.timestamp, 'dd/MM/yyyy')}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-text-primary">{expense.item}</p>
                        {expense.note && (
                          <p className="text-sm text-text-secondary">{expense.note}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                        {expense.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-text-primary">₹{expense.amount.toFixed(2)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <PaymentIcon size={16} className="text-text-secondary" />
                        <span className="text-sm text-text-secondary">
                          {expense.paymentMethod?.toUpperCase() || 'CASH'}
                        </span>
                      </div>
                    </td>
                    {user.role === 'admin' && (
                      <td className="py-3 px-4">
                        <span className="text-sm text-text-secondary">{expense.centre}</span>
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <span className="text-sm text-text-secondary">{expense.createdBy}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditExpense(expense)}
                          className="text-primary hover:text-primary-dark transition-colors"
                          title="Edit expense"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="text-error hover:text-error-dark transition-colors"
                          title="Delete expense"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredExpenses.length === 0 && (
            <div className="text-center py-8">
              <p className="text-text-secondary">No expenses found</p>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseTable;