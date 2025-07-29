import React, { useState } from 'react';
import { addDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const FirebaseTest = () => {
  const { user } = useAuth();
  const [testResult, setTestResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testFirebaseConnection = async () => {
    setLoading(true);
    setTestResult('Testing Firebase connection...\n');
    
    try {
      // Test 1: Check if we can read from expenses collection
      console.log('Testing read access to expenses...');
      setTestResult(prev => prev + 'Testing read access to expenses...\n');
      const expensesQuery = await getDocs(collection(db, 'expenses'));
      console.log('Read expenses successful, found', expensesQuery.size, 'documents');
      setTestResult(prev => prev + `✅ Read expenses: ${expensesQuery.size} documents found\n`);
      
      // Test 2: Check if we can read from inventory collection
      console.log('Testing read access to inventory...');
      setTestResult(prev => prev + 'Testing read access to inventory...\n');
      const inventoryQuery = await getDocs(collection(db, 'inventory'));
      console.log('Read inventory successful, found', inventoryQuery.size, 'documents');
      setTestResult(prev => prev + `✅ Read inventory: ${inventoryQuery.size} documents found\n`);
      
      // Test 3: Check if we can write to test collection
      console.log('Testing write access...');
      setTestResult(prev => prev + 'Testing write access...\n');
      const testData = {
        test: true,
        timestamp: new Date(),
        user: user?.email || 'unknown',
        centre: user?.centre || 'unknown',
        message: 'Firebase connection test'
      };
      
      const docRef = await addDoc(collection(db, 'test'), testData);
      console.log('Write test successful, document ID:', docRef.id);
      setTestResult(prev => prev + `✅ Write test: Document created with ID ${docRef.id}\n`);
      
      // Test 4: Try to write to inventory collection
      console.log('Testing write to inventory collection...');
      setTestResult(prev => prev + 'Testing write to inventory collection...\n');
      const inventoryTestData = {
        item: 'Test Item',
        category: 'Test Category',
        quantity: 1,
        price: 0,
        centre: user?.centre || 'unknown',
        note: 'Test item for Firebase connection',
        lastUpdated: new Date(),
        damaged: 0,
        repaired: 0
      };
      
      const inventoryDocRef = await addDoc(collection(db, 'inventory'), inventoryTestData);
      console.log('Inventory write test successful, document ID:', inventoryDocRef.id);
      setTestResult(prev => prev + `✅ Inventory write: Document created with ID ${inventoryDocRef.id}\n`);
      
      // Test 5: Try to write to expenses collection
      console.log('Testing write to expenses collection...');
      setTestResult(prev => prev + 'Testing write to expenses collection...\n');
      const expenseTestData = {
        date: new Date().toISOString().split('T')[0],
        item: 'Test Expense',
        amount: 0,
        category: 'Test Category',
        centre: user?.centre || 'unknown',
        note: 'Test expense for Firebase connection',
        paymentMethod: 'cash',
        timestamp: new Date(),
        type: 'test'
      };
      
      const expenseDocRef = await addDoc(collection(db, 'expenses'), expenseTestData);
      console.log('Expense write test successful, document ID:', expenseDocRef.id);
      setTestResult(prev => prev + `✅ Expense write: Document created with ID ${expenseDocRef.id}\n`);
      
      setTestResult(prev => prev + '\n🎉 All Firebase tests passed successfully!');
      
    } catch (error) {
      console.error('Firebase test failed:', error);
      setTestResult(prev => prev + `❌ Test failed:\nError: ${error.message}\nCode: ${error.code}\n\nThis usually indicates a Firebase security rules issue.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card hover-lift">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Firebase Connection Test</h3>
      
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-text-secondary mb-2"><strong>Current user:</strong> {user?.email}</p>
        <p className="text-sm text-text-secondary mb-2"><strong>Centre:</strong> {user?.centre}</p>
        <p className="text-sm text-text-secondary mb-2"><strong>Role:</strong> {user?.role}</p>
        <p className="text-sm text-text-secondary"><strong>User ID:</strong> {user?.uid}</p>
      </div>
      
      <button
        onClick={testFirebaseConnection}
        disabled={loading}
        className="btn-primary hover-lift mb-4"
      >
        {loading ? 'Testing...' : 'Test Firebase Connection'}
      </button>
      
      {testResult && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <pre className="text-sm whitespace-pre-wrap font-mono">{testResult}</pre>
        </div>
      )}
      
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">Troubleshooting Tips:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• If tests fail, check Firebase Console for security rules</li>
          <li>• Ensure Firestore Database is enabled in your project</li>
          <li>• Check if your Firebase project is on the correct plan</li>
          <li>• Verify that authentication is working properly</li>
        </ul>
      </div>
    </div>
  );
};

export default FirebaseTest; 