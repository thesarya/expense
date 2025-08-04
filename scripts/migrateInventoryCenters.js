// Migration script to assign centers to existing inventory items
// Run this script to update existing inventory items with center information

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAXEdVLEnPvY0qr8vvkl9F5zX0UjsuwWV8",
  authDomain: "expenses-de82b.firebaseapp.com",
  projectId: "expenses-de82b",
  storageBucket: "expenses-de82b.firebasestorage.app",
  messagingSenderId: "1018174345074",
  appId: "1:1018174345074:web:f1a76366fd4a667c86d7eb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateInventoryCenters() {
  try {
    console.log('Starting inventory center migration...');
    
    // Get all inventory items
    const inventorySnapshot = await getDocs(collection(db, 'inventory'));
    const items = inventorySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Found ${items.length} inventory items`);
    
    // Find items without center information
    const itemsWithoutCenter = items.filter(item => !item.centre);
    console.log(`Found ${itemsWithoutCenter.length} items without center information`);
    
    if (itemsWithoutCenter.length === 0) {
      console.log('All items already have center information. Migration complete.');
      return;
    }
    
    // For demonstration, we'll assign items to Lucknow center
    // In practice, you might want to manually review each item
    console.log('Assigning items to Lucknow center...');
    
    for (const item of itemsWithoutCenter) {
      await updateDoc(doc(db, 'inventory', item.id), {
        centre: 'Lucknow'
      });
      console.log(`Updated item: ${item.itemName || item.id}`);
    }
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Uncomment the line below to run the migration
// migrateInventoryCenters();

export default migrateInventoryCenters; 