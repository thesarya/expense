import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase/config';
// ...existing code...
import toast from 'react-hot-toast';

const Insights = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState({
    currentMonth: {},
    lastMonth: {},
    topItems: [],
    categoryBreakdown: [],
    centreComparison: {},
    score: 0,
    recommendations: []
  });
  // Remove comparison toggle for staff

  useEffect(() => {
    fetchInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      
      // Get current and last month data
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      
      // Fetch expenses for current centre
      const expensesQuery = query(
        collection(db, 'expenses'),
        where('centre', '==', user.centre)
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      const expenses = expensesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));
      
      // Sort by timestamp in JavaScript instead of Firestore
      expenses.sort((a, b) => b.timestamp - a.timestamp);

      // Fetch inventory data
      const inventoryQuery = query(
        collection(db, 'inventory'),
        where('centre', '==', user.centre)
      );
      const inventorySnapshot = await getDocs(inventoryQuery);
      const inventory = inventorySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch all centres data for comparison
      const allExpensesQuery = query(collection(db, 'expenses'));
      const allExpensesSnapshot = await getDocs(allExpensesQuery);
      const allExpenses = allExpensesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));

      // Process data
      const processedInsights = processInsightsData(
        expenses, 
        inventory, 
        allExpenses, 
        currentMonth, 
        lastMonth
      );
      
      setInsights(processedInsights);
    } catch (error) {
      console.error('Error fetching insights:', error);
      toast.error('Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  const processInsightsData = (expenses, inventory, allExpenses, currentMonth, lastMonth) => {
    // Filter expenses by month
    const currentMonthExpenses = expenses.filter(exp => 
      exp.timestamp >= currentMonth
    );
    const lastMonthExpenses = expenses.filter(exp => 
      exp.timestamp >= lastMonth && exp.timestamp < currentMonth
    );

    // Calculate totals
    const currentTotal = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const lastTotal = lastMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const percentageChange = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0;

    // Top items by frequency
    const itemFrequency = {};
    currentMonthExpenses.forEach(exp => {
      itemFrequency[exp.item] = (itemFrequency[exp.item] || 0) + 1;
    });
    const topItems = Object.entries(itemFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([item, count]) => ({ item, count }));

    // Category breakdown
    const categoryTotals = {};
    currentMonthExpenses.forEach(exp => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });
    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

    // Calculate score (0-100)
    let score = 100;
    // Deduct points for high spending
    if (currentTotal > lastTotal) {
      score -= Math.min(20, (currentTotal - lastTotal) / 1000 * 10);
    } else {
      score += Math.min(15, (lastTotal - currentTotal) / 1000 * 10);
    }
    // Bonus for good inventory management
    const lowStockItems = inventory.filter(item => item.quantity <= 2).length;
    const outOfStockItems = inventory.filter(item => item.quantity === 0).length;
    score -= (lowStockItems * 2) + (outOfStockItems * 5);
    score = Math.max(0, Math.min(100, score));

    // Generate recommendations
    const recommendations = [];
    // Month-over-month comparison
    if (currentTotal > lastTotal) {
      const increase = currentTotal - lastTotal;
      recommendations.push({
        type: 'warning',
        text: `Your spending increased by ₹${increase.toFixed(0)} this month. Consider reviewing your expenses.`
      });
    } else if (currentTotal < lastTotal) {
      const savings = lastTotal - currentTotal;
      recommendations.push({
        type: 'success',
        text: `Great job! You saved ₹${savings.toFixed(0)} compared to last month.`
      });
    }
    // Next month suggestions
    if (currentTotal > lastTotal) {
      recommendations.push({
        type: 'info',
        text: `For next month: Focus on reducing expenses in your highest spending categories.`
      });
    } else {
      recommendations.push({
        type: 'success',
        text: `For next month: Continue your cost-saving practices and maintain this efficiency.`
      });
    }
    // Inventory recommendations
    if (lowStockItems > 0) {
      recommendations.push({
        type: 'warning',
        text: `${lowStockItems} items are running low on stock. Plan your purchases wisely to avoid stockouts.`
      });
    }
    if (outOfStockItems > 0) {
      recommendations.push({
        type: 'error',
        text: `${outOfStockItems} items are out of stock. Restock these items soon to maintain operations.`
      });
    }
    // General efficiency tips
    if (currentTotal > 0) {
      recommendations.push({
        type: 'info',
        text: `Consider bulk purchasing for frequently used items to reduce costs.`
      });
    }

    return {
      currentMonth: {
        total: currentTotal || 0,
        count: currentMonthExpenses.length || 0,
        percentageChange: percentageChange || 0
      },
      lastMonth: {
        total: lastTotal || 0,
        count: lastMonthExpenses.length || 0
      },
      topItems: topItems || [],
      categoryBreakdown: categoryBreakdown || [],
      score: Math.round(score) || 0,
      recommendations: recommendations || []
    };
  };

  // ...existing code...

  // ...existing code...

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Minimal Staff Insights */}
      <div className="card">
        <h2 className="text-xl font-bold text-text-primary mb-2">This Month's Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-text-secondary">Total Expenses</p>
            <p className="text-2xl font-bold text-text-primary">₹{(insights.currentMonth.total || 0).toFixed(0)}</p>
            <p className={`text-sm mt-2 ${
              (insights.currentMonth.percentageChange || 0) > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {(insights.currentMonth.percentageChange || 0) > 0 ? '+' : ''}
              {(insights.currentMonth.percentageChange || 0).toFixed(1)}% vs last month
            </p>
          </div>
          <div>
            <p className="text-sm text-text-secondary">Expenses Count</p>
            <p className="text-2xl font-bold text-text-primary">{insights.currentMonth.count || 0}</p>
          </div>
        </div>
      </div>

      {/* Most Used Items */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Most Used Items</h3>
        <div className="space-y-2">
          {insights.topItems.map((item, index) => (
            <div key={item.item} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <span className="font-medium">{item.item}</span>
              <span className="text-sm text-text-secondary">{item.count} times</span>
            </div>
          ))}
        </div>
      </div>

      {/* Low Inventory Items */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Low Inventory Alerts</h3>
        <div className="space-y-2">
          {insights.recommendations.filter(rec => rec.type === 'warning' || rec.type === 'error').map((rec, idx) => (
            <div key={idx} className={`p-2 rounded-lg border-l-4 ${rec.type === 'warning' ? 'bg-yellow-50 border-yellow-500 text-yellow-700' : 'bg-red-50 border-red-500 text-red-700'}`}>
              <span className="font-medium">{rec.text}</span>
            </div>
          ))}
          {insights.recommendations.filter(rec => rec.type === 'warning' || rec.type === 'error').length === 0 && (
            <span className="text-text-secondary">All inventory items are sufficiently stocked.</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Insights; 