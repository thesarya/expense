// ...existing code...
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Calendar, DollarSign, Package, BarChart3, Settings, LogOut, User, Building, FileText } from 'lucide-react';
import ExpenseEntry from './ExpenseEntry';
import ExpenseTable from './ExpenseTable';
import InventoryEntry from './InventoryEntry';
import Reports from './Reports';
import FirebaseTest from './FirebaseTest';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [filter, setFilter] = useState({
    centre: 'all',
    month: 'all',
    category: 'all',
    user: 'all'
  });
  const [editingExpense, setEditingExpense] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [analytics, setAnalytics] = useState({
    totalExpenses: 0,
    totalInventory: 0,
    lowStockItems: 0,
    centres: [],
    recentExpenses: [],
    categoryBreakdown: {}
  });

  const fetchAnalytics = React.useCallback(async () => {
    try {
      // Fetch all expenses
      const expensesQuery = query(collection(db, 'expenses'));
      const expensesSnapshot = await getDocs(expensesQuery);
      let expenses = expensesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch all inventory
      const inventoryQuery = query(collection(db, 'inventory'));
      const inventorySnapshot = await getDocs(inventoryQuery);
      let inventory = inventorySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Apply filters
      if (filter.centre !== 'all') expenses = expenses.filter(e => e.centre === filter.centre);
      if (filter.category !== 'all') expenses = expenses.filter(e => e.category === filter.category);
      if (filter.user !== 'all') expenses = expenses.filter(e => e.createdBy === filter.user);
      if (filter.month !== 'all') {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), parseInt(filter.month), 1);
        expenses = expenses.filter(e => e.timestamp && e.timestamp.toDate() >= monthStart);
      }
      if (filter.centre !== 'all') inventory = inventory.filter(i => i.centre === filter.centre);

      // Calculate analytics
      const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const lowStockItems = inventory.filter(item => item.quantity < 3).length;
      const centres = [...new Set(expenses.map(exp => exp.centre))];
      const users = [...new Set(expenses.map(exp => exp.createdBy))];
      const categories = [...new Set(expenses.map(exp => exp.category))];

      // Category breakdown
      const categoryBreakdown = {};
      expenses.forEach(exp => {
        categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] || 0) + exp.amount;
      });

      // Recent expenses (last 5)
      const recentExpenses = expenses
        .sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate())
        .slice(0, 5);

      // Most used items
      const itemFrequency = {};
      expenses.forEach(exp => {
        itemFrequency[exp.item] = (itemFrequency[exp.item] || 0) + 1;
      });
      const topItems = Object.entries(itemFrequency)
        .sort(([,a],[,b]) => b - a)
        .slice(0,5)
        .map(([item, count]) => ({ item, count }));

      // Top spenders
      const spenderFrequency = {};
      expenses.forEach(exp => {
        spenderFrequency[exp.createdBy] = (spenderFrequency[exp.createdBy] || 0) + exp.amount;
      });
      const topSpenders = Object.entries(spenderFrequency)
        .sort(([,a],[,b]) => b - a)
        .slice(0,5)
        .map(([user, amount]) => ({ user, amount }));

      setAnalytics({
        totalExpenses,
        totalInventory: inventory.length,
        lowStockItems,
        centres,
        users,
        categories,
        recentExpenses,
        categoryBreakdown,
        topItems,
        topSpenders
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  }, [filter]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // ...existing code...

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    }
  };

  const handleEditExpense = (expenseId, expenseData) => {
    setEditingExpense({ id: expenseId, data: expenseData });
    setActiveTab('expense-entry');
  };

  const handleExpenseSubmitted = () => {
    setEditingExpense(null);
    setRefreshTrigger(prev => prev + 1); // Trigger refresh of expense table
    fetchAnalytics(); // Refresh analytics
  };

  // ...existing code...

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: BarChart3,
      component: (
        <div className="space-y-6">
          {/* Capsule Pills for Filtering */}
          <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-2 mb-4 sm:mb-6">
            <div className="flex flex-wrap gap-1 sm:gap-2">
              <span className="font-semibold text-sm sm:text-base">Centre:</span>
              <button className={`px-2 sm:px-4 py-1 rounded-full shadow-sm transition-all duration-150 font-medium text-xs sm:text-sm ${filter.centre==='all'?'bg-primary text-white':'bg-gray-100 text-primary'}`} onClick={()=>setFilter(f=>({...f,centre:'all'}))}>All</button>
              {analytics.centres.map(c => (
                <button key={c} className={`px-2 sm:px-4 py-1 rounded-full shadow-sm transition-all duration-150 font-medium text-xs sm:text-sm ${filter.centre===c?'bg-primary text-white':'bg-gray-100 text-primary'}`} onClick={()=>setFilter(f=>({...f,centre:c}))}>{c}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              <span className="font-semibold text-sm sm:text-base">Month:</span>
              <button className={`px-2 sm:px-4 py-1 rounded-full shadow-sm transition-all duration-150 font-medium text-xs sm:text-sm ${filter.month==='all'?'bg-primary text-white':'bg-gray-100 text-primary'}`} onClick={()=>setFilter(f=>({...f,month:'all'}))}>All</button>
              {[...Array(12).keys()].map(m => (
                <button key={m} className={`px-2 sm:px-4 py-1 rounded-full shadow-sm transition-all duration-150 font-medium text-xs sm:text-sm ${filter.month===m?'bg-primary text-white':'bg-gray-100 text-primary'}`} onClick={()=>setFilter(f=>({...f,month:m}))}>{new Date(0,m).toLocaleString('default',{month:'short'})}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              <span className="font-semibold text-sm sm:text-base">Category:</span>
              <button className={`px-2 sm:px-4 py-1 rounded-full shadow-sm transition-all duration-150 font-medium text-xs sm:text-sm ${filter.category==='all'?'bg-primary text-white':'bg-gray-100 text-primary'}`} onClick={()=>setFilter(f=>({...f,category:'all'}))}>All</button>
              {analytics.categories && analytics.categories.map(cat => (
                <button key={cat} className={`px-2 sm:px-4 py-1 rounded-full shadow-sm transition-all duration-150 font-medium text-xs sm:text-sm ${filter.category===cat?'bg-primary text-white':'bg-gray-100 text-primary'}`} onClick={()=>setFilter(f=>({...f,category:cat}))}>{cat}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              <span className="font-semibold text-sm sm:text-base">User:</span>
              <button className={`px-2 sm:px-4 py-1 rounded-full shadow-sm transition-all duration-150 font-medium text-xs sm:text-sm ${filter.user==='all'?'bg-primary text-white':'bg-gray-100 text-primary'}`} onClick={()=>setFilter(f=>({...f,user:'all'}))}>All</button>
              {analytics.users && analytics.users.map(u => (
                <button key={u || 'unknown'} className={`px-2 sm:px-4 py-1 rounded-full shadow-sm transition-all duration-150 font-medium text-xs sm:text-sm ${filter.user===u?'bg-primary text-white':'bg-gray-100 text-primary'}`} onClick={()=>setFilter(f=>({...f,user:u}))}>{u ? (u.split('@')[0]) : 'Unknown'}</button>
              ))}
            </div>
          </div>

          {/* Capsule Summary Cards */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex-1 min-w-[150px] sm:min-w-[200px] bg-white rounded-2xl shadow-md p-3 sm:p-4 flex flex-col items-center justify-center">
              <span className="text-xs sm:text-sm text-text-secondary mb-1">Total Expenses</span>
              <span className="text-lg sm:text-2xl font-bold text-primary">₹{analytics.totalExpenses.toFixed(2)}</span>
            </div>
            <div className="flex-1 min-w-[150px] sm:min-w-[200px] bg-white rounded-2xl shadow-md p-3 sm:p-4 flex flex-col items-center justify-center">
              <span className="text-xs sm:text-sm text-text-secondary mb-1">Inventory Items</span>
              <span className="text-lg sm:text-2xl font-bold text-accent-blue">{analytics.totalInventory}</span>
            </div>
            <div className="flex-1 min-w-[150px] sm:min-w-[200px] bg-white rounded-2xl shadow-md p-3 sm:p-4 flex flex-col items-center justify-center">
              <span className="text-xs sm:text-sm text-text-secondary mb-1">Low Stock</span>
              <span className="text-lg sm:text-2xl font-bold text-error">{analytics.lowStockItems}</span>
            </div>
            <div className="flex-1 min-w-[150px] sm:min-w-[200px] bg-white rounded-2xl shadow-md p-3 sm:p-4 flex flex-col items-center justify-center">
              <span className="text-xs sm:text-sm text-text-secondary mb-1">Centres</span>
              <span className="text-lg sm:text-2xl font-bold text-accent-gold">{analytics.centres.length}</span>
            </div>
          </div>

          {/* Top Items & Top Spenders Capsule View */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[250px] bg-white rounded-2xl shadow-md p-4">
              <h3 className="text-lg font-semibold text-text-primary mb-2">Most Used Items</h3>
              <div className="space-y-2">
                {analytics.topItems && analytics.topItems.map((item, idx) => (
                  <div key={item.item} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="font-medium">{item.item}</span>
                    <span className="text-sm text-text-secondary">{item.count} times</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 min-w-[250px] bg-white rounded-2xl shadow-md p-4">
              <h3 className="text-lg font-semibold text-text-primary mb-2">Top Spenders</h3>
              <div className="space-y-2">
                {analytics.topSpenders && analytics.topSpenders.map((sp, idx) => (
                  <div key={sp.user || 'unknown'} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="font-medium">{sp.user ? sp.user.split('@')[0] : 'Unknown'}</span>
                    <span className="text-sm text-text-secondary">₹{sp.amount ? sp.amount.toFixed(2) : '0.00'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Expenses Capsule View */}
          <div className="bg-white rounded-2xl shadow-md p-4 mb-6">
            <h3 className="text-lg font-semibold text-text-primary mb-2">Recent Expenses</h3>
            <div className="space-y-2">
              {analytics.recentExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">{expense.item}</span>
                    <span className="text-xs text-text-secondary ml-2">{expense.centre} • {expense.category}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-primary">₹{expense.amount.toFixed(2)}</span>
                    <span className="text-xs text-text-secondary ml-2">{expense.timestamp.toDate().toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category Breakdown Capsule View */}
          {Object.keys(analytics.categoryBreakdown).length > 0 && (
            <div className="bg-white rounded-2xl shadow-md p-4 mb-6">
              <h3 className="text-lg font-semibold text-text-primary mb-2">Expense Category Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(analytics.categoryBreakdown).map(([category, amount]) => (
                  <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-text-primary">{category}</span>
                    <span className="font-bold text-primary">₹{amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'expense-entry',
      label: 'Add Expense',
      icon: DollarSign,
      component: (
        <ExpenseEntry 
          editingExpense={editingExpense}
          onExpenseSubmitted={handleExpenseSubmitted}
        />
      )
    },
    {
      id: 'expense-history',
      label: 'Expense Records',
      icon: Calendar,
      component: <ExpenseTable onEditItem={handleEditExpense} refreshTrigger={refreshTrigger} />
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: Package,
      component: <InventoryEntry />
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileText,
      component: <Reports />
    },
    {
      id: 'firebase-test',
      label: 'Firebase Test',
      icon: Settings,
      component: <FirebaseTest />
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-xl flex items-center justify-center">
                <Building className="text-white sm:w-6 sm:h-6" size={20} />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-display font-bold text-text-primary">
                  Aaryavart Centre - Admin
                </h1>
                <p className="text-xs sm:text-sm text-text-secondary">Administrative Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2 text-text-secondary">
                <User size={16} />
                <span className="text-sm">{user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="btn-secondary flex items-center gap-1 sm:gap-2 hover-lift text-sm px-2 sm:px-3 py-2"
              >
                <LogOut size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-1 sm:gap-2 mb-4 sm:mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-lg'
                    : 'bg-white text-text-secondary hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <Icon size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {tabs.find(tab => tab.id === activeTab)?.component}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard; 