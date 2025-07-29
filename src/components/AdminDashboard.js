import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  Calendar, DollarSign, Package, BarChart3, Settings, LogOut, User, Building, 
  AlertTriangle, Download, FileText
} from 'lucide-react';
import ExpenseEntry from './ExpenseEntry';
import ExpenseTable from './ExpenseTable';
import InventoryEntry from './InventoryEntry';
import Reports from './Reports';
import FirebaseTest from './FirebaseTest';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
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

  useEffect(() => {
    fetchAnalytics();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAnalytics = async () => {
    try {
      // Fetch all expenses
      const expensesQuery = query(collection(db, 'expenses'));
      const expensesSnapshot = await getDocs(expensesQuery);
      const expenses = expensesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch all inventory
      const inventoryQuery = query(collection(db, 'inventory'));
      const inventorySnapshot = await getDocs(inventoryQuery);
      const inventory = inventorySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate analytics
      const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const lowStockItems = inventory.filter(item => item.quantity < 3).length;
      
      // Get unique centres
      const centres = [...new Set(expenses.map(exp => exp.centre))];
      
      // Category breakdown
      const categoryBreakdown = {};
      expenses.forEach(exp => {
        categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] || 0) + exp.amount;
      });

      // Recent expenses (last 5)
      const recentExpenses = expenses
        .sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate())
        .slice(0, 5);

      setAnalytics({
        totalExpenses,
        totalInventory: inventory.length,
        lowStockItems,
        centres,
        recentExpenses,
        categoryBreakdown
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

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

  const exportAnalytics = () => {
    const data = {
      totalExpenses: analytics.totalExpenses,
      totalInventory: analytics.totalInventory,
      lowStockItems: analytics.lowStockItems,
      centres: analytics.centres,
      categoryBreakdown: analytics.categoryBreakdown,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: BarChart3,
      component: (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card hover-lift">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">Total Expenses</p>
                  <p className="text-2xl font-bold text-text-primary">₹{analytics.totalExpenses.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <DollarSign className="text-primary" size={24} />
                </div>
              </div>
            </div>

            <div className="card hover-lift">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">Total Inventory Items</p>
                  <p className="text-2xl font-bold text-text-primary">{analytics.totalInventory}</p>
                </div>
                <div className="w-12 h-12 bg-accent-blue/10 rounded-xl flex items-center justify-center">
                  <Package className="text-accent-blue" size={24} />
                </div>
              </div>
            </div>

            <div className="card hover-lift">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">Low Stock Items</p>
                  <p className="text-2xl font-bold text-error">{analytics.lowStockItems}</p>
                </div>
                <div className="w-12 h-12 bg-error/10 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="text-error" size={24} />
                </div>
              </div>
            </div>

            <div className="card hover-lift">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">Active Centres</p>
                  <p className="text-2xl font-bold text-text-primary">{analytics.centres.length}</p>
                </div>
                <div className="w-12 h-12 bg-accent-gold/10 rounded-xl flex items-center justify-center">
                  <Building className="text-accent-gold" size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Centre Overview */}
          <div className="card hover-lift">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-text-primary">Centre Overview</h3>
              <button
                onClick={exportAnalytics}
                className="btn-secondary flex items-center gap-2 hover-lift"
              >
                <Download size={16} />
                Export Data
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.centres.map((centre) => (
                <div key={centre} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Building size={16} className="text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-text-primary">{centre}</h4>
                      <p className="text-sm text-text-secondary">Active Centre</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category Breakdown */}
          {Object.keys(analytics.categoryBreakdown).length > 0 && (
            <div className="card hover-lift">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Expense Category Breakdown</h3>
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

          {/* Recent Expenses */}
          {analytics.recentExpenses.length > 0 && (
            <div className="card hover-lift">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Expenses</h3>
              <div className="space-y-3">
                {analytics.recentExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-text-primary">{expense.item}</p>
                      <p className="text-sm text-text-secondary">
                        {expense.centre} • {expense.category}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-text-primary">₹{expense.amount.toFixed(2)}</p>
                      <p className="text-sm text-text-secondary">
                        {expense.timestamp.toDate().toLocaleDateString()}
                      </p>
                    </div>
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
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Building className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold text-text-primary">
                  Aaryavart Centre - Admin
                </h1>
                <p className="text-sm text-text-secondary">Administrative Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-text-secondary">
                <User size={16} />
                <span className="text-sm">{user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="btn-secondary flex items-center gap-2 hover-lift"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-lg'
                    : 'bg-white text-text-secondary hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <Icon size={18} />
                {tab.label}
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