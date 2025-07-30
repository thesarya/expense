import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  TrendingUp, TrendingDown, Target, 
  DollarSign, Package, BarChart3, 
  Star, Trophy, Eye, EyeOff
} from 'lucide-react';
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
  const [showComparison, setShowComparison] = useState(true);

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

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score) => {
    if (score >= 80) return <Trophy className="text-green-600" size={24} />;
    if (score >= 60) return <Target className="text-yellow-600" size={24} />;
    return <TrendingDown className="text-red-600" size={24} />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Centre Insights</h2>
          <p className="text-text-secondary">Analytics and performance metrics for {user.centre} Centre</p>
        </div>
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="btn-secondary flex items-center gap-2"
        >
          {showComparison ? <EyeOff size={16} /> : <Eye size={16} />}
          {showComparison ? 'Hide' : 'Show'} Comparison
        </button>
      </div>

      {/* Score Card */}
      <div className="bg-gradient-to-r from-primary/10 to-accent-yellow/10 rounded-xl p-6 border border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Centre Performance Score</h3>
            <p className="text-text-secondary">Based on spending, savings, and inventory management</p>
          </div>
          <div className="flex items-center gap-3">
            {getScoreIcon(insights.score)}
            <div className="text-right">
              <div className={`text-3xl font-bold ${getScoreColor(insights.score)}`}>
                {insights.score}/100
              </div>
              <div className="text-sm text-text-secondary">Performance Score</div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">This Month</p>
              <p className="text-2xl font-bold text-text-primary">₹{(insights.currentMonth.total || 0).toFixed(0)}</p>
            </div>
            <div className={`p-2 rounded-lg ${
              (insights.currentMonth.percentageChange || 0) > 0 
                ? 'bg-red-100 text-red-600' 
                : 'bg-green-100 text-green-600'
            }`}>
              {(insights.currentMonth.percentageChange || 0) > 0 ? (
                <TrendingUp size={20} />
              ) : (
                <TrendingDown size={20} />
              )}
            </div>
          </div>
          <p className={`text-sm mt-2 ${
            (insights.currentMonth.percentageChange || 0) > 0 ? 'text-red-600' : 'text-green-600'
          }`}>
            {(insights.currentMonth.percentageChange || 0) > 0 ? '+' : ''}
            {(insights.currentMonth.percentageChange || 0).toFixed(1)}% vs last month
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Expenses Count</p>
              <p className="text-2xl font-bold text-text-primary">{insights.currentMonth.count || 0}</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <DollarSign size={20} />
            </div>
          </div>
          <p className="text-sm text-text-secondary mt-2">
            This month's transactions
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Inventory Items</p>
              <p className="text-2xl font-bold text-text-primary">
                {insights.categoryBreakdown.reduce((sum, cat) => sum + cat.total, 0) > 0 ? 
                  insights.categoryBreakdown.length : 0}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <Package size={20} />
            </div>
          </div>
          <p className="text-sm text-text-secondary mt-2">
            Active categories
          </p>
        </div>


      </div>


      {/* Top Items */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Most Used Items</h3>
        <div className="space-y-3">
          {insights.topItems.map((item, index) => (
            <div key={item.item} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                  index === 0 ? 'bg-yellow-500' :
                  index === 1 ? 'bg-gray-400' :
                  index === 2 ? 'bg-orange-500' : 'bg-gray-300'
                }`}>
                  {index + 1}
                </div>
                <span className="font-medium">{item.item}</span>
              </div>
              <span className="text-sm text-text-secondary">{item.count} times</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Recommendations</h3>
        <div className="space-y-3">
          {insights.recommendations.map((rec, index) => (
            <div key={index} className={`p-3 rounded-lg border-l-4 ${
              rec.type === 'success' ? 'bg-green-50 border-green-500 text-green-700' :
              rec.type === 'warning' ? 'bg-yellow-50 border-yellow-500 text-yellow-700' :
              rec.type === 'error' ? 'bg-red-50 border-red-500 text-red-700' :
              'bg-blue-50 border-blue-500 text-blue-700'
            }`}>
              <div className="flex items-center gap-2">
                {rec.type === 'success' && <TrendingUp size={16} />}
                {rec.type === 'warning' && <Target size={16} />}
                {rec.type === 'error' && <TrendingDown size={16} />}
                {rec.type === 'info' && <BarChart3 size={16} />}
                <span className="font-medium">{rec.text}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Motivational Message */}
      <div className="bg-gradient-to-r from-accent-yellow/20 to-primary/20 rounded-xl p-6 border border-accent-yellow/30">
        <div className="flex items-center gap-3 mb-3">
          <Star className="text-accent-yellow" size={24} />
          <h3 className="text-lg font-semibold text-text-primary">Team Motivation</h3>
        </div>
        <p className="text-text-secondary">
          {insights.score >= 80 
            ? "🎉 Outstanding performance! Your centre is leading by example with excellent financial management and inventory control. Keep up the fantastic work!"
            : insights.score >= 60
            ? "💪 Good progress! You're on the right track. Focus on the recommendations above to improve your score and become a top-performing centre."
            : "🚀 Room for improvement! Every challenge is an opportunity to grow. Work together as a team to implement the recommendations and watch your score improve!"
          }
        </p>
      </div>
    </div>
  );
};

export default Insights; 