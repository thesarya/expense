# Aaryavart Tracker - Expense & Inventory Management App

A beautiful, user-friendly expense and inventory management application built specifically for the Aaryavart Centre for Autism and Special Needs Foundation. Designed for non-technical staff with a focus on simplicity and ease of use.

## 🎨 Design Philosophy

- **Simple & Intuitive**: No confusing dashboards, straight to data entry
- **Mobile-First**: Touch-friendly interface optimized for mobile devices
- **Role-Based Access**: Different interfaces for staff and admin users
- **Beautiful UI**: Modern design with brand colors and excellent UX

## 🚀 Features

### For Staff Users
- **Easy Login**: Centre selection with auto-filled email
- **Centre Insights**: Performance scoring, spending comparisons, and motivational analytics
- **Quick Expense Entry**: Card-based interface for adding expenses
- **Inventory Management**: Add, use, and mark items as damaged
- **Duplicate Last Entry**: Quick way to repeat common expenses
- **Expense History**: Filterable table with search and export
- **Low Stock Alerts**: Automatic notifications for inventory items
- **WhatsApp Integration**: Automatic alerts for expenses and low stock

### For Admin Users
- **Comprehensive Dashboard**: Analytics and overview of all centres
- **Multi-Centre Expense Entry**: Add expenses for any centre (Lucknow or Gorakhpur)
- **Visual Charts**: Bar charts and pie charts for expense analysis
- **Centre Comparison**: Compare expenses across Lucknow and Gorakhpur
- **Reports & Balance Sheets**: Generate detailed financial reports with filtering options
- **Export Functionality**: Download reports as PDF or Excel files
- **Advanced Filtering**: Filter by date range, centre, category, and specific items
- **Real-time Alerts**: Monitor low stock and expense trends
- **Firebase Testing**: Built-in tools to test database connectivity

## 🎯 User Flow

1. **Login**: Select centre → Email auto-fills → Enter password
2. **Staff Dashboard**: Four tabs - Insights, Add Expense, Inventory, History
3. **Admin Dashboard**: Six tabs - Overview, Add Expense, Reports, Inventory, Firebase Test
4. **Quick Entry**: Tap cards to add data, no complex forms

## 🛠 Tech Stack

- **Frontend**: React 18 with modern hooks
- **Styling**: Tailwind CSS with custom brand colors
- **Icons**: Lucide React for beautiful, consistent icons
- **Charts**: Recharts for data visualization
- **PDF Generation**: jsPDF with autoTable plugin
- **Excel Export**: SheetJS (xlsx) library
- **Backend**: Firebase (Auth + Firestore + Storage)
- **Deployment**: Ready for Vercel or Firebase Hosting

## 🎨 Brand Colors

- **Primary**: Sarya Purple (#8C5BAA)
- **Accents**: 
  - Sunshine Yellow (#F4C542)
  - Friendly Red (#D9534F)
  - Grass Green (#7CAF3F)
  - Sky Blue (#58AEDA)
- **Backgrounds**: Soft Lavender (#D9CCEC), Muted Beige (#FAF5ED)
- **Text**: Deep Brown (#4A3C2D), Cloud White (#F7F9FB)

## 📦 Installation & Setup

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Firebase project (expenses-de82b)

### 1. Clone and Install
```bash
git clone <repository-url>
cd aaryavart-expense-tracker
npm install
```

### 2. Firebase Configuration
Update `src/firebase/config.js` with your Firebase credentials:
```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "expenses-de82b.firebaseapp.com",
  projectId: "expenses-de82b",
  // ... other config
};
```

### 3. Firebase Setup

#### Create Collections in Firestore:
- `expenses` - for expense records
- `inventory` - for inventory items
- `test` - for testing connectivity

#### Set Security Rules (For Testing):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all read and write operations for testing
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

#### Production Security Rules (After Testing):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /expenses/{document} {
      allow read, write: if request.auth != null;
    }
    match /inventory/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. Authentication Setup
Create these users in Firebase Auth:
- `lucknow@aaryavart.org` - Lucknow centre staff
- `gorakhpur@aaryavart.org` - Gorakhpur centre staff  
- `admin@aaryavart.org` - Admin access

### 5. Run Development Server
```bash
npm start
```

### 6. Build for Production
```bash
npm run build
```

## 📱 Usage Guide

### Staff Login
1. Select your centre (Lucknow/Gorakhpur)
2. Email auto-fills
3. Enter password
4. Access insights and simple entry interface

### Centre Insights
1. View performance score (0-100) based on spending and inventory management
2. Compare spending with Lucknow centre and other centres
3. See most used items and spending trends
4. Get personalized recommendations for improvement
5. View motivational messages and team encouragement

### Adding Expenses
1. Click expense category card
2. Fill in date, item, amount
3. Optional note
4. Submit - appears in history table
5. WhatsApp alert sent automatically

### Managing Inventory
1. Choose action: Add/Use/Damage/Repair
2. Select item and quantity
3. Submit - updates inventory table
4. Low stock alerts appear automatically
5. Manual WhatsApp alerts available

### Admin Dashboard
1. Login with admin credentials
2. Add expenses for any centre (Lucknow or Gorakhpur)
3. View analytics and charts
4. Monitor all centres
5. Generate reports with advanced filtering
6. Download balance sheets as PDF or Excel
7. Test Firebase connectivity

### Reports & Balance Sheets
1. Navigate to Reports tab in admin dashboard
2. Set date range, centre, and category filters
3. Optionally select specific items to include
4. Preview filtered data
5. Download as PDF or Excel file
6. Reports include summary, category breakdown, centre breakdown, and detailed expenses

### WhatsApp Integration
- **Expense Alerts**: Automatic notifications when expenses are added
- **Low Stock Alerts**: Manual buttons to alert the group about low/out-of-stock items
- **Group Link**: `https://chat.whatsapp.com/Cl1FoaG2L460m6IVW6FkEU?mode=ac_t`

## 🔧 Customization

### Adding New Categories
Edit the `expenseCategories` object in `ExpenseEntry.js`:
```javascript
const expenseCategories = {
  'New Category': ['Item 1', 'Item 2', 'Item 3'],
  // ... existing categories
};
```

### Modifying Brand Colors
Update `tailwind.config.js` with your color palette:
```javascript
colors: {
  primary: {
    DEFAULT: '#your-primary-color',
    // ... other shades
  }
}
```

### Adding New Centres
1. Update centres array in `Login.js`
2. Add Firebase Auth user
3. Update AuthContext logic

## 📊 Data Structure

### Expense Document
```javascript
{
  date: "2024-01-15",
  item: "Milk",
  amount: 50.00,
  category: "Kitchen",
  centre: "Lucknow",
  note: "Daily milk supply",
  timestamp: Timestamp,
  createdBy: "lucknow@aaryavart.org",
  paymentMethod: "cash",
  attachments: []
}
```

### Inventory Document
```javascript
{
  item: "Flashcards",
  quantity: 25,
  centre: "Lucknow",
  lastUsed: Timestamp,
  lastUpdated: Timestamp,
  damaged: 0,
  repaired: 0,
  note: "Educational materials"
}
```

## 🚀 Deployment

### Vercel (Recommended)
1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically

### Firebase Hosting
```bash
npm run build
firebase deploy
```

## 🔒 Security Features

- Role-based access control
- Centre-specific data isolation
- Protected routes
- Firebase security rules
- Input validation

## 📈 Performance

- Lazy loading for components
- Optimized bundle size
- Efficient Firebase queries
- Mobile-optimized interface
- Fast loading times

## 🐛 Troubleshooting

### Firebase Connection Issues
1. Check Firebase Console for project status
2. Verify security rules are set correctly
3. Use the Firebase Test tab in admin dashboard
4. Check browser console for detailed error messages

### Common Issues
- **Permission Denied**: Update Firebase security rules to allow read/write
- **Index Required**: Remove `orderBy` from queries or create composite indexes
- **Authentication Errors**: Verify user credentials in Firebase Auth

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📞 Support

For technical support or questions:
- Email: support@aaryavart.org
- Documentation: [Link to docs]
- Issues: GitHub Issues

## 📄 License

This project is proprietary software developed for Aaryavart Centre for Autism and Special Needs Foundation.

---

**Built with ❤️ for Aaryavart Foundation** 