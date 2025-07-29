// Run this script with: node scripts/populateCategoriesAndItems.js
const { initializeApp } = require('firebase/app');
const { getFirestore, setDoc, doc } = require('firebase/firestore');
const firebaseConfig = require('../src/firebase/config').default || require('../src/firebase/config');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const expenseCategories = {
  'Therapy Materials': ['Flashcards', 'Sensory Toys', 'Puzzles', 'Art Supplies', 'Books', 'Therapy Tools'],
  'Admin': ['Rent', 'Electricity', 'Internet', 'Stationary', 'Printing', 'Phone Bill', 'Maintenance'],
  'Kitchen': ['Milk', 'Tea', 'Biscuits', 'Gas', 'Water', 'Groceries', 'Vegetables', 'Fruits', 'Rice', 'Dal'],
  'Cleaning': ['Detergent', 'Mops', 'Sanitizer', 'Brooms', 'Soap', 'Floor Cleaner', 'Toilet Cleaner'],
  'Staff_Welfare': ['Snacks', 'Gifts', 'First Aid', 'Refreshments', 'Lunch', 'Transport Allowance'],
  'Furniture_Equipment': ['Chair', 'Table', 'AC', 'Fan', 'Computer', 'Printer', 'Projector', 'Whiteboard'],
  'Transport_Misc': ['Auto Fare', 'Cake', 'Balloons', 'Decoration', 'Birthday Party', 'Event Supplies']
};

async function main() {
  // Create categories
  for (const category of Object.keys(expenseCategories)) {
    await setDoc(doc(db, 'categories', category), { name: category });
  }
  // Create items with category reference
  for (const [category, items] of Object.entries(expenseCategories)) {
    for (const item of items) {
      await setDoc(doc(db, 'items', item.toLowerCase()), { name: item, category });
    }
  }
  console.log('Categories and items populated!');
}

main().catch(console.error);
