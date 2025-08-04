import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, DollarSign, Package, LogOut, User, Building, TrendingUp, Search } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  // Global search handler
  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([]);
      return;
    }
    const fetchResults = async () => {
      setSearchLoading(true);
      try {
        // Search expenses
        const expensesQuery = query(
          collection(db, 'expenses'),
          where('centre', '==', user.centre)
        );
        const expensesSnapshot = await getDocs(expensesQuery);
        const expenses = expensesSnapshot.docs.map(doc => ({
          id: doc.id,
          type: 'expense',
          ...doc.data()
        }));
        // Search inventory
        const inventoryQuery = query(
          collection(db, 'inventory'),
          where('centre', '==', user.centre)
        );
        const inventorySnapshot = await getDocs(inventoryQuery);
        const inventory = inventorySnapshot.docs.map(doc => ({
          id: doc.id,
          type: 'inventory',
          ...doc.data()
        }));
        // Search items collection for category lookup
        const itemDoc = await getDoc(doc(collection(db, 'items'), searchTerm.toLowerCase()));
        let foundCategory = null;
        if (itemDoc.exists()) {
          foundCategory = itemDoc.data().category;
        }
        // Filter by search term (case-insensitive, simple match)
        const term = searchTerm.toLowerCase();
        const filtered = [
          ...expenses.filter(e =>
            (e.description && e.description.toLowerCase().includes(term)) ||
            (e.category && e.category.toLowerCase().includes(term))
          ),
          ...inventory.filter(i =>
            (i.name && i.name.toLowerCase().includes(term)) ||
            (i.category && i.category.toLowerCase().includes(term))
          )
        ];
        setSearchResults(filtered);
        setFoundCategory(foundCategory); // for smart add
      } catch (err) {
        setSearchResults([]);
        setFoundCategory(null);
      }
      setSearchLoading(false);
    };
    fetchResults();
  }, [searchTerm, user.centre]);
  // Smart add from search, use foundCategory if available
  const [foundCategory, setFoundCategory] = useState(null);
  const handleSmartAdd = (desc) => {
    setActiveTab('expense-entry');
    setEditingExpense({
      id: null,
      data: {
        description: desc,
        category: foundCategory || 'Furniture/Equipment'
      }
    });
    setSearchTerm('');
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
    setActiveTab('expense-history');
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
      id: 'inventory',
      label: 'Add Inventory',
      icon: Package,
      component: <InventoryEntry />
    },
    {
      id: 'expense-history',
      label: 'Expense Records',
      icon: Calendar,
      component: <ExpenseTable onEditItem={handleEditExpense} refreshTrigger={refreshTrigger} />
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
                  Aaryavart Centre
                </h1>
                <p className="text-xs sm:text-sm text-text-secondary">{user.centre} Centre</p>
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

      {/* Global Search Bar with Smart Add */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-3 sm:mt-4">
        <div className="relative flex items-center gap-2">
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
            placeholder="Search expenses or inventory..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <Search className="absolute right-3 text-gray-400 sm:w-5 sm:h-5" size={18} />
        </div>
        {/* Search Results Dropdown */}
        {searchTerm && (
          <div className="absolute z-10 bg-white border border-gray-200 rounded-lg mt-2 w-full max-w-2xl shadow-lg">
            {searchLoading ? (
              <div className="p-4 text-center text-gray-500">Searching...</div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-center text-gray-500 flex flex-col items-center gap-2">
                <span>No results found.</span>
                <button
                  className="btn-primary flex items-center gap-2 mt-2 px-4 py-2 rounded-lg"
                  onClick={() => handleSmartAdd(searchTerm)}
                >
                  <DollarSign size={16} /> Add "{searchTerm}" as {foundCategory || 'Furniture/Equipment'} Expense
                </button>
              </div>
            ) : (
              <ul>
                {searchResults.map((item, idx) => (
                  <li
                    key={item.type + '-' + item.id}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2 border-b last:border-b-0"
                    onClick={() => {
                      if (item.type === 'expense') {
                        handleEditExpense(item.id, item);
                        setSearchTerm('');
                      } else if (item.type === 'inventory') {
                        setActiveTab('inventory');
                        setSearchTerm('');
                      }
                    }}
                  >
                    <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: item.type === 'expense' ? '#f59e42' : '#3b82f6' }}></span>
                    <span className="font-medium">{item.type === 'expense' ? item.description : item.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{item.type}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

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

export default StaffDashboard;