import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  DollarSign, 
  Package, 
  BarChart3, 
  Settings, 
  LogOut, 
  User, 
  Building, 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  Download, 
  Plus,
  TrendingDown
} from 'lucide-react';
import ExpenseEntry from './ExpenseEntry';
import ExpenseTable from './ExpenseTable';
import InventoryEntry from './InventoryEntry';
import Reports from './Reports';
import FirebaseTest from './FirebaseTest';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('insights');
  const [selectedCentre, setSelectedCentre] = useState('all');
  // eslint-disable-next-line no-unused-vars
  const [viewCentre, setViewCentre] = useState('all');
  // eslint-disable-next-line no-unused-vars
  const [filter, setFilter] = useState({
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
    centres: ['Lucknow', 'Gorakhpur'],
    recentExpenses: [],
    categoryBreakdown: {},
    centreData: {
      Lucknow: { 
        expenses: 0, 
        inventory: 0, 
        lowStock: 0,
        monthlyExpenses: [],
        topCategories: [],
        recentActivity: []
      },
      Gorakhpur: { 
        expenses: 0, 
        inventory: 0, 
        lowStock: 0,
        monthlyExpenses: [],
        topCategories: [],
        recentActivity: []
      }
    },
    overallMetrics: {
      totalMonthlyExpense: 0,
      expenseGrowth: 0,
      inventoryUtilization: 0,
      criticalItems: 0
    }
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

      // Apply view centre filter
      if (viewCentre !== 'all') {
        expenses = expenses.filter(e => e.centre === viewCentre);
        inventory = inventory.filter(i => i.centre === viewCentre);
      }

      // Apply other filters
      if (filter.category !== 'all') expenses = expenses.filter(e => e.category === filter.category);
      if (filter.user !== 'all') expenses = expenses.filter(e => e.createdBy === filter.user);
      if (filter.month !== 'all') {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), parseInt(filter.month), 1);
        expenses = expenses.filter(e => e.timestamp && e.timestamp.toDate() >= monthStart);
      }

      // Calculate analytics
      const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      const lowStockItems = inventory.filter(item => item.quantity < 3).length;
      const users = [...new Set(expenses.map(exp => exp.createdBy))];
      const categories = [...new Set(expenses.map(exp => exp.category))];

      // Category breakdown
      const categoryBreakdown = {};
      expenses.forEach(exp => {
        categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] || 0) + exp.amount;
      });

      // Recent expenses (last 10)
      const recentExpenses = expenses
        .sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate())
        .slice(0, 10);

      // Centre-specific data
      const centreData = {
        Lucknow: { 
          expenses: 0, 
          inventory: 0, 
          lowStock: 0,
          monthlyExpenses: [],
          topCategories: [],
          recentActivity: []
        },
        Gorakhpur: { 
          expenses: 0, 
          inventory: 0, 
          lowStock: 0,
          monthlyExpenses: [],
          topCategories: [],
          recentActivity: []
        }
      };

      // Calculate centre-specific metrics
      const allExpenses = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const allInventory = inventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Process expenses by centre
      allExpenses.forEach(exp => {
        if (exp.centre && centreData[exp.centre]) {
          centreData[exp.centre].expenses += exp.amount;
          centreData[exp.centre].recentActivity.push({
            type: 'expense',
            item: exp.item,
            amount: exp.amount,
            date: exp.timestamp?.toDate() || new Date(),
            user: exp.createdBy
          });
        }
      });

      // Process inventory by centre
      allInventory.forEach(item => {
        if (item.centre && centreData[item.centre]) {
          centreData[item.centre].inventory += 1;
          if (item.quantity < 3) {
            centreData[item.centre].lowStock += 1;
          }
          centreData[item.centre].recentActivity.push({
            type: 'inventory',
            item: item.itemName,
            quantity: item.quantity,
            date: item.lastUpdated?.toDate() || new Date(),
            user: item.assignedTo || 'System'
          });
        }
      });

      // Calculate monthly expenses for each centre
      const now = new Date();
      const last6Months = Array.from({length: 6}, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        return {
          month: date.toLocaleString('default', { month: 'short' }),
          year: date.getFullYear(),
          monthIndex: date.getMonth()
        };
      }).reverse();

      ['Lucknow', 'Gorakhpur'].forEach(centre => {
        centreData[centre].monthlyExpenses = last6Months.map(({ month, year, monthIndex }) => {
          const monthExpenses = allExpenses.filter(exp => {
            if (exp.centre !== centre) return false;
            const expDate = exp.timestamp?.toDate() || new Date();
            return expDate.getMonth() === monthIndex && expDate.getFullYear() === year;
          });
          return {
            month,
            amount: monthExpenses.reduce((sum, exp) => sum + exp.amount, 0)
          };
        });

        // Top categories for each centre
        const centreExpenses = allExpenses.filter(exp => exp.centre === centre);
        const categoryTotals = {};
        centreExpenses.forEach(exp => {
          categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
        });
        centreData[centre].topCategories = Object.entries(categoryTotals)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([category, amount]) => ({ category, amount }));

        // Sort recent activity by date
        centreData[centre].recentActivity.sort((a, b) => b.date - a.date);
        centreData[centre].recentActivity = centreData[centre].recentActivity.slice(0, 10);
      });

      // Overall metrics
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const lastMonth = new Date(currentYear, currentMonth - 1, 1);
      
      const currentMonthExpenses = allExpenses.filter(exp => {
        const expDate = exp.timestamp?.toDate() || new Date();
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
      }).reduce((sum, exp) => sum + exp.amount, 0);

      const lastMonthExpenses = allExpenses.filter(exp => {
        const expDate = exp.timestamp?.toDate() || new Date();
        return expDate.getMonth() === lastMonth.getMonth() && expDate.getFullYear() === lastMonth.getFullYear();
      }).reduce((sum, exp) => sum + exp.amount, 0);

      const expenseGrowth = lastMonthExpenses > 0 
        ? ((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 
        : 0;

      const criticalItems = allInventory.filter(item => item.quantity < 2).length;

      setAnalytics({
        totalExpenses,
        totalInventory: inventory.length,
        lowStockItems,
        centres: ['Lucknow', 'Gorakhpur'],
        users,
        categories,
        recentExpenses,
        categoryBreakdown,
        centreData,
        overallMetrics: {
          totalMonthlyExpense: currentMonthExpenses,
          expenseGrowth,
          inventoryUtilization: (allInventory.length / 100) * 100, // Assuming 100 is max capacity
          criticalItems
        }
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  }, [viewCentre, filter]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

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
    setRefreshTrigger(prev => prev + 1);
    fetchAnalytics();
  };

  const exportCentreReport = (centre) => {
    toast.success(`${centre} report exported successfully`);
  };

  const tabs = [
    {
      id: 'insights',
      label: 'Insights',
      icon: BarChart3,
      component: (
        <div className="space-y-6">
          {/* Executive Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Monthly Expense</p>
                  <p className="text-2xl font-bold">₹{analytics.overallMetrics.totalMonthlyExpense.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-8 h-8" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                {analytics.overallMetrics.expenseGrowth >= 0 ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1" />
                )}
                <span>{Math.abs(analytics.overallMetrics.expenseGrowth).toFixed(1)}% from last month</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Total Inventory</p>
                  <p className="text-2xl font-bold">{analytics.totalInventory}</p>
                </div>
                <Package className="w-8 h-8" />
              </div>
              <div className="mt-2 text-sm">
                <span>{analytics.overallMetrics.inventoryUtilization.toFixed(1)}% utilization</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Low Stock Items</p>
                  <p className="text-2xl font-bold">{analytics.lowStockItems}</p>
                </div>
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="mt-2 text-sm">
                <span>{analytics.overallMetrics.criticalItems} critical items</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Active Centres</p>
                  <p className="text-2xl font-bold">{analytics.centres.length}</p>
                </div>
                <Building className="w-8 h-8" />
              </div>
              <div className="mt-2 text-sm">
                <span>Lucknow & Gorakhpur</span>
              </div>
            </div>
          </div>

          {/* Centre Performance Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Lucknow Centre Performance</h3>
                <button 
                  onClick={() => exportCentreReport('Lucknow')}
                  className="btn-secondary flex items-center gap-1 text-xs px-3 py-1"
                >
                  <Download size={12} />
                  Report
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-600">₹{analytics.centreData.Lucknow.expenses.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">Total Expenses</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">{analytics.centreData.Lucknow.inventory}</div>
                  <div className="text-xs text-gray-500">Inventory Items</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-red-600">{analytics.centreData.Lucknow.lowStock}</div>
                  <div className="text-xs text-gray-500">Low Stock</div>
                </div>
              </div>
              
              {/* Monthly Trend */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Monthly Expense Trend</h4>
                <div className="flex items-end justify-between h-20">
                  {analytics.centreData.Lucknow.monthlyExpenses.map((month, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div 
                        className="bg-blue-500 rounded-t w-8"
                        style={{ height: `${(month.amount / Math.max(...analytics.centreData.Lucknow.monthlyExpenses.map(m => m.amount))) * 60}px` }}
                      ></div>
                      <span className="text-xs text-gray-500 mt-1">{month.month}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Categories */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Top Expense Categories</h4>
                <div className="space-y-2">
                  {analytics.centreData.Lucknow.topCategories.slice(0, 3).map((cat, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{cat.category}</span>
                      <span className="text-sm font-medium">₹{cat.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Gorakhpur Centre Performance</h3>
                <button 
                  onClick={() => exportCentreReport('Gorakhpur')}
                  className="btn-secondary flex items-center gap-1 text-xs px-3 py-1"
                >
                  <Download size={12} />
                  Report
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-600">₹{analytics.centreData.Gorakhpur.expenses.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">Total Expenses</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">{analytics.centreData.Gorakhpur.inventory}</div>
                  <div className="text-xs text-gray-500">Inventory Items</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-red-600">{analytics.centreData.Gorakhpur.lowStock}</div>
                  <div className="text-xs text-gray-500">Low Stock</div>
                </div>
              </div>
              
              {/* Monthly Trend */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Monthly Expense Trend</h4>
                <div className="flex items-end justify-between h-20">
                  {analytics.centreData.Gorakhpur.monthlyExpenses.map((month, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div 
                        className="bg-green-500 rounded-t w-8"
                        style={{ height: `${(month.amount / Math.max(...analytics.centreData.Gorakhpur.monthlyExpenses.map(m => m.amount))) * 60}px` }}
                      ></div>
                      <span className="text-xs text-gray-500 mt-1">{month.month}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Categories */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Top Expense Categories</h4>
                <div className="space-y-2">
                  {analytics.centreData.Gorakhpur.topCategories.slice(0, 3).map((cat, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{cat.category}</span>
                      <span className="text-sm font-medium">₹{cat.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Lucknow Recent Activity</h3>
              <div className="space-y-3">
                {analytics.centreData.Lucknow.recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${activity.type === 'expense' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">
                        {activity.type === 'expense' ? 'Expense Added' : 'Inventory Updated'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.item} {activity.type === 'expense' ? `- ₹${activity.amount}` : `- Qty: ${activity.quantity}`}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400">
                      {activity.date.toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Gorakhpur Recent Activity</h3>
              <div className="space-y-3">
                {analytics.centreData.Gorakhpur.recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${activity.type === 'expense' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">
                        {activity.type === 'expense' ? 'Expense Added' : 'Inventory Updated'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.item} {activity.type === 'expense' ? `- ₹${activity.amount}` : `- Qty: ${activity.quantity}`}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400">
                      {activity.date.toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'lucknow-expenses',
      label: 'Lucknow Expenses',
      icon: DollarSign,
      component: <ExpenseTable onEditItem={handleEditExpense} refreshTrigger={refreshTrigger} viewCentre="Lucknow" />
    },
    {
      id: 'gorakhpur-expenses',
      label: 'Gorakhpur Expenses',
      icon: DollarSign,
      component: <ExpenseTable onEditItem={handleEditExpense} refreshTrigger={refreshTrigger} viewCentre="Gorakhpur" />
    },
    {
      id: 'lucknow-inventory',
      label: 'Lucknow Inventory',
      icon: Package,
      component: <InventoryEntry viewCentre="Lucknow" />
    },
    {
      id: 'gorakhpur-inventory',
      label: 'Gorakhpur Inventory',
      icon: Package,
      component: <InventoryEntry viewCentre="Gorakhpur" />
    },
    {
      id: 'expense-entry',
      label: 'Add Expense',
      icon: Plus,
      component: (
        <div className="space-y-6">
          {/* Centre Selection for Adding */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Centre for Expense Entry</h2>
            <div className="flex flex-wrap gap-3">
              <button 
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  selectedCentre === 'Lucknow' 
                    ? 'bg-blue-500 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedCentre('Lucknow')}
              >
                Lucknow Centre
              </button>
              <button 
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  selectedCentre === 'Gorakhpur' 
                    ? 'bg-blue-500 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedCentre('Gorakhpur')}
              >
                Gorakhpur Centre
              </button>
              <button 
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  selectedCentre === 'both' 
                    ? 'bg-blue-500 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedCentre('both')}
              >
                Both Centres
              </button>
            </div>
            {selectedCentre !== 'all' && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  {selectedCentre === 'both' 
                    ? 'Expense will be added to both Lucknow and Gorakhpur centres'
                    : `Expense will be added to ${selectedCentre} centre`
                  }
                </p>
              </div>
            )}
          </div>

          {selectedCentre !== 'all' && (
            <ExpenseEntry 
              editingExpense={editingExpense}
              onExpenseSubmitted={handleExpenseSubmitted}
              selectedCentre={selectedCentre}
            />
          )}
        </div>
      )
    },
    {
      id: 'inventory-entry',
      label: 'Add Inventory',
      icon: Plus,
      component: (
        <div className="space-y-6">
          {/* Centre Selection for Adding */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Centre for Inventory Entry</h2>
            <div className="flex flex-wrap gap-3">
              <button 
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  selectedCentre === 'Lucknow' 
                    ? 'bg-blue-500 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedCentre('Lucknow')}
              >
                Lucknow Centre
              </button>
              <button 
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  selectedCentre === 'Gorakhpur' 
                    ? 'bg-blue-500 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedCentre('Gorakhpur')}
              >
                Gorakhpur Centre
              </button>
              <button 
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  selectedCentre === 'both' 
                    ? 'bg-blue-500 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedCentre('both')}
              >
                Both Centres
              </button>
            </div>
            {selectedCentre !== 'all' && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  {selectedCentre === 'both' 
                    ? 'Inventory will be added to both Lucknow and Gorakhpur centres'
                    : `Inventory will be added to ${selectedCentre} centre`
                  }
                </p>
              </div>
            )}
          </div>

          {selectedCentre !== 'all' && (
            <InventoryEntry selectedCentre={selectedCentre} />
          )}
        </div>
      )
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Building className="text-white w-6 h-6" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Aaryavart Operations Dashboard
                </h1>
                <p className="text-sm text-gray-500">Operations Management & Analytics</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-gray-500">
                <User size={16} />
                <span className="text-sm">{user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="btn-secondary flex items-center gap-2 hover-lift text-sm px-4 py-2"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {tabs.find(tab => tab.id === activeTab)?.component}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard; 