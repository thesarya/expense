import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, DollarSign, Package, LogOut, User, Building, TrendingUp } from 'lucide-react';
import ExpenseEntry from './ExpenseEntry';
import ExpenseTable from './ExpenseTable';
import InventoryEntry from './InventoryEntry';
import Insights from './Insights';
import toast from 'react-hot-toast';

const StaffDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('insights');
  const [editingExpense, setEditingExpense] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
  };

  const tabs = [
    {
      id: 'insights',
      label: 'Insights',
      icon: TrendingUp,
      component: <Insights />
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
                  Aaryavart Centre
                </h1>
                <p className="text-sm text-text-secondary">{user.centre} Centre</p>
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

export default StaffDashboard; 