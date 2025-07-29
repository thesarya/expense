import React, { useState, useEffect } from 'react';
import { addDoc, collection, query, where, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { 
  Minus, AlertTriangle, Plus, X, Search, Upload, Trash2, 
  Download, Edit2, CreditCard, Smartphone, Wallet, Wrench, CheckCircle,
  Package, RefreshCw, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

const InventoryEntry = () => {
  const { user } = useAuth();
  const [action, setAction] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    item: '',
    quantity: '',
    price: '',
    note: '',
    paymentMethod: 'cash',
    attachments: []
  });
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'low', 'ok', 'out'

  const inventoryCategories = {
    'Therapy Materials': ['Flashcards', 'Sensory Toys', 'Puzzles', 'Art Supplies', 'Books', 'Therapy Tools', 'Educational Games'],
    'Office Supplies': ['Paper', 'Pens', 'Pencils', 'Notebooks', 'Files', 'Staplers', 'Scissors', 'Glue'],
    'Kitchen Items': ['Plates', 'Cups', 'Spoons', 'Bowls', 'Water Bottles', 'Thermos', 'Lunch Boxes'],
    'Cleaning Supplies': ['Detergent', 'Mops', 'Brooms', 'Sanitizer', 'Soap', 'Floor Cleaner', 'Toilet Cleaner', 'Dish Soap'],
    'Medical Supplies': ['First Aid Kit', 'Bandages', 'Medicines', 'Thermometer', 'Antiseptic', 'Cotton Wool'],
    'Equipment': ['Computers', 'Printers', 'Fans', 'Lights', 'Chairs', 'Tables', 'Projector', 'Whiteboard']
  };

  const paymentMethods = [
    { value: 'cash', label: 'Cash', icon: Wallet },
    { value: 'upi', label: 'UPI', icon: Smartphone },
    { value: 'card', label: 'Card', icon: CreditCard }
  ];



  useEffect(() => {
    if (user?.centre) {
      fetchInventory();
    }
  }, [user?.centre]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchInventory = async () => {
    try {
      console.log('Fetching inventory for centre:', user.centre);
      const q = query(
        collection(db, 'inventory'),
        where('centre', '==', user.centre)
      );
      const querySnapshot = await getDocs(q);
      console.log('Query snapshot size:', querySnapshot.size);
      const inventoryData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastUpdated: doc.data().lastUpdated?.toDate(),
        lastUsed: doc.data().lastUsed?.toDate()
      }));
      // Sort by lastUpdated in JavaScript instead of Firestore
      inventoryData.sort((a, b) => {
        if (!a.lastUpdated && !b.lastUpdated) return 0;
        if (!a.lastUpdated) return 1;
        if (!b.lastUpdated) return -1;
        return b.lastUpdated - a.lastUpdated;
      });
      console.log('Fetched inventory data:', inventoryData);
      setInventory(inventoryData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      toast.error(`Failed to fetch inventory: ${error.message}`);
    }
  };

  const getStatusInfo = (quantity) => {
    if (quantity === 0) return { status: 'out', label: 'Out of Stock', color: 'text-error bg-error/10', bgColor: 'bg-error/5' };
    if (quantity <= 2) return { status: 'low', label: 'Low Stock', color: 'text-warning bg-warning/10', bgColor: 'bg-warning/5' };
    return { status: 'ok', label: 'In Stock', color: 'text-success bg-success/10', bgColor: 'bg-success/5' };
  };

  const handleActionSelect = (selectedAction) => {
    setAction(selectedAction);
    setShowForm(true);
    setSelectedCategory('');
    setSelectedItems([]);
    setFormData({
      item: '',
      quantity: '',
      price: '',
      note: '',
      paymentMethod: 'cash',
      attachments: []
    });
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setSelectedItems([]);
  };

  const handleItemToggle = (item) => {
    setSelectedItems(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };



  const handleFileUpload = async (files) => {
    setUploadingFiles(true);
    const uploadedFiles = [];

    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Max size is 10MB.`);
          continue;
        }

        const storageRef = ref(storage, `inventory/${user.centre}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        uploadedFiles.push({
          name: file.name,
          url: downloadURL,
          type: file.type
        });
      }

      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...uploadedFiles]
      }));

      toast.success(`${uploadedFiles.length} file(s) uploaded successfully`);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const createExpenseForInventory = async (inventoryData) => {
    try {
      console.log('Creating expense for inventory:', inventoryData);
      const expenseData = {
        date: new Date().toISOString().split('T')[0],
        item: inventoryData.item,
        amount: parseFloat(inventoryData.price) || 0,
        category: inventoryData.category,
        centre: user.centre,
        note: `Inventory purchase: ${inventoryData.note || ''}`,
        paymentMethod: inventoryData.paymentMethod,
        attachments: inventoryData.attachments,
        timestamp: new Date(),
        type: 'inventory_purchase'
      };

      console.log('Expense data to be created:', expenseData);
      const docRef = await addDoc(collection(db, 'expenses'), expenseData);
      console.log('Expense created with ID:', docRef.id);
      toast.success('Expense record created for inventory purchase');
    } catch (error) {
      console.error('Error creating expense:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      toast.error(`Failed to create expense record: ${error.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Form submission started');
    console.log('User:', user);
    console.log('Action:', action);
    console.log('Selected category:', selectedCategory);
    console.log('Selected items:', selectedItems);
    console.log('Form data:', formData);
    
    if (action === 'add' && (!selectedCategory || selectedItems.length === 0)) {
      toast.error('Please select a category and at least one item');
      return;
    }

    if (action === 'use' || action === 'damage') {
      if (selectedItems.length === 0) {
        toast.error('Please select items to process');
        return;
      }
    }

    try {
      if (action === 'add') {
        console.log('Adding new items to inventory...');
        // Add new items to inventory
        for (const itemName of selectedItems) {
          const inventoryData = {
            item: itemName,
            category: selectedCategory,
            quantity: parseInt(formData.quantity) || 0,
            price: parseFloat(formData.price) || 0,
            centre: user.centre,
            note: formData.note,
            paymentMethod: formData.paymentMethod,
            attachments: formData.attachments,
            lastUpdated: new Date(),
            damaged: 0,
            repaired: 0
          };

          console.log('Adding inventory item:', inventoryData);
          const docRef = await addDoc(collection(db, 'inventory'), inventoryData);
          console.log('Inventory item added with ID:', docRef.id);

          // Create expense record if price is provided
          if (parseFloat(formData.price) > 0) {
            console.log('Creating expense record for inventory purchase...');
            await createExpenseForInventory(inventoryData);
          }
        }

        toast.success(`${selectedItems.length} item(s) added to inventory`);
      } else if (action === 'use') {
        console.log('Using items...');
        // Update existing items
        for (const itemName of selectedItems) {
          const existingItem = inventory.find(item => item.item === itemName);
          if (existingItem) {
            const newQuantity = Math.max(0, existingItem.quantity - (parseInt(formData.quantity) || 1));
            console.log('Updating item:', existingItem.id, 'New quantity:', newQuantity);
            await updateDoc(doc(db, 'inventory', existingItem.id), {
              quantity: newQuantity,
              lastUsed: new Date(),
              lastUpdated: new Date()
            });
          }
        }
        toast.success(`Used ${selectedItems.length} item(s)`);
      } else if (action === 'damage') {
        console.log('Marking items as damaged...');
        // Mark items as damaged
        for (const itemName of selectedItems) {
          const existingItem = inventory.find(item => item.item === itemName);
          if (existingItem) {
            const newDamaged = existingItem.damaged + (parseInt(formData.quantity) || 1);
            console.log('Marking item as damaged:', existingItem.id, 'New damaged count:', newDamaged);
            await updateDoc(doc(db, 'inventory', existingItem.id), {
              damaged: newDamaged,
              lastUpdated: new Date()
            });
          }
        }
        toast.success(`Marked ${selectedItems.length} item(s) as damaged`);
      } else if (action === 'repair') {
        console.log('Marking items as repaired...');
        // Mark items as repaired
        for (const itemName of selectedItems) {
          const existingItem = inventory.find(item => item.item === itemName);
          if (existingItem) {
            const newRepaired = existingItem.repaired + (parseInt(formData.quantity) || 1);
            const newDamaged = Math.max(0, existingItem.damaged - (parseInt(formData.quantity) || 1));
            console.log('Marking item as repaired:', existingItem.id, 'New repaired count:', newRepaired);
            await updateDoc(doc(db, 'inventory', existingItem.id), {
              repaired: newRepaired,
              damaged: newDamaged,
              lastUpdated: new Date()
            });
          }
        }
        toast.success(`Marked ${selectedItems.length} item(s) as repaired`);
      }

      // Reset form
      setShowForm(false);
      setAction('');
      setSelectedCategory('');
      setSelectedItems([]);
      setFormData({
        item: '',
        quantity: '',
        price: '',
        note: '',
        paymentMethod: 'cash',
        attachments: []
      });

      // Refresh inventory
      console.log('Refreshing inventory...');
      await fetchInventory();
      console.log('Form submission completed successfully');
    } catch (error) {
      console.error('Error processing inventory action:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      toast.error(`Failed to process inventory action: ${error.message}`);
    }
  };

  const handleEditItem = (itemId, itemData) => {
    setIsEditing(true);
    setAction('edit');
    setFormData({
      item: itemData.item,
      quantity: itemData.quantity.toString(),
      price: itemData.price?.toString() || '',
      note: itemData.note || '',
      paymentMethod: itemData.paymentMethod || 'cash',
      attachments: itemData.attachments || []
    });
    setSelectedCategory(itemData.category);
    setShowForm(true);
  };

  const handleRepairItem = async (itemId, itemData) => {
    try {
      const newRepaired = itemData.repaired + 1;
      const newDamaged = Math.max(0, itemData.damaged - 1);
      
      await updateDoc(doc(db, 'inventory', itemId), {
        repaired: newRepaired,
        damaged: newDamaged,
        lastUpdated: new Date()
      });

      toast.success('Item marked as repaired');
      fetchInventory();
    } catch (error) {
      console.error('Error repairing item:', error);
      toast.error('Failed to repair item');
    }
  };

  // Filter inventory based on search and status
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || getStatusInfo(item.quantity).status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const lowStockItems = inventory.filter(item => item.quantity <= 2);
  const outOfStockItems = inventory.filter(item => item.quantity === 0);

  // Send WhatsApp alert for low stock items
  const sendLowStockAlert = (items, type) => {
    const itemList = items.map(item => `• ${item.item} (${item.quantity} left)`).join('\n');
    const message = `⚠️ ${type.toUpperCase()} ALERT - ${user.centre} Centre

${type === 'low' ? '🟡 Low Stock Items:' : '🔴 Out of Stock Items:'}
${itemList}

📅 Alert Date: ${new Date().toLocaleDateString()}
👤 Centre: ${user.centre}

Please restock these items soon!

#AaryavartInventory #${user.centre}`;

    const whatsappUrl = `https://chat.whatsapp.com/Cl1FoaG2L460m6IVW6FkEU?mode=ac_t&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-text-primary">Inventory Management</h2>
          <p className="text-text-secondary">Manage your centre's inventory items</p>
        </div>
        <div className="flex items-center gap-3">
          {lowStockItems.length > 0 && (
            <div className="flex items-center gap-2 text-error bg-error/10 px-3 py-2 rounded-lg">
              <AlertTriangle size={16} />
              <span className="text-sm font-medium">
                {lowStockItems.length} items low on stock
              </span>
              <button
                onClick={() => sendLowStockAlert(lowStockItems, 'low')}
                className="ml-2 px-2 py-1 bg-error text-white rounded text-xs hover:bg-error/80 transition-colors"
              >
                Alert WhatsApp
              </button>
            </div>
          )}
          
          {outOfStockItems.length > 0 && (
            <div className="flex items-center gap-2 text-red-600 bg-red-100 px-3 py-2 rounded-lg">
              <AlertTriangle size={16} />
              <span className="text-sm font-medium">
                {outOfStockItems.length} items out of stock
              </span>
              <button
                onClick={() => sendLowStockAlert(outOfStockItems, 'out')}
                className="ml-2 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
              >
                Alert WhatsApp
              </button>
            </div>
          )}
          
          <button
            onClick={fetchInventory}
            className="btn-secondary flex items-center gap-2 hover-lift"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Action Cards */}
      {!showForm && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => handleActionSelect('add')}
            className="card hover-lift transition-all duration-300 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-success rounded-xl flex items-center justify-center">
                <Plus size={24} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">Add New Items</h3>
                <p className="text-sm text-text-secondary">Add items to inventory</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleActionSelect('use')}
            className="card hover-lift transition-all duration-300 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-accent-blue rounded-xl flex items-center justify-center">
                <Minus size={24} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">Use Items</h3>
                <p className="text-sm text-text-secondary">Mark items as used</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleActionSelect('damage')}
            className="card hover-lift transition-all duration-300 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-error rounded-xl flex items-center justify-center">
                <AlertTriangle size={24} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">Mark Damaged</h3>
                <p className="text-sm text-text-secondary">Report damaged items</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleActionSelect('repair')}
            className="card hover-lift transition-all duration-300 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-accent-gold rounded-xl flex items-center justify-center">
                <Wrench size={24} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">Repair Items</h3>
                <p className="text-sm text-text-secondary">Mark items as repaired</p>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Inventory Form */}
      {showForm && (
        <div className="card hover-lift">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-display font-semibold text-text-primary">
              {isEditing ? 'Edit Item' : 
               action === 'add' ? 'Add New Items' : 
               action === 'use' ? 'Use Items' : 
               action === 'damage' ? 'Mark as Damaged' : 'Repair Items'}
            </h3>
            <button
              onClick={() => {
                setShowForm(false);
                setIsEditing(false);
                setAction('');
                setSelectedCategory('');
                setSelectedItems([]);
              }}
              className="text-text-secondary hover:text-text-primary transition-colors duration-200"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Selection */}
            {!isEditing && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-3">
                  Select Category
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.keys(inventoryCategories).map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleCategorySelect(category)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                        selectedCategory === category
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <h4 className="font-medium">{category}</h4>
                      <p className="text-xs text-text-secondary mt-1">
                        {inventoryCategories[category].length} items
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Item Selection */}
            {selectedCategory && !isEditing && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-3">
                  Select Items
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {inventoryCategories[selectedCategory].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleItemToggle(item)}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 text-sm ${
                        selectedItems.includes(item)
                          ? 'border-primary bg-primary text-white'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                {selectedItems.length > 0 && (
                  <p className="text-sm text-text-secondary mt-2">
                    Selected: {selectedItems.join(', ')}
                  </p>
                )}
              </div>
            )}

            {/* Quantity and Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  {action === 'add' ? 'Quantity to Add' : 
                   action === 'use' ? 'Quantity to Use' : 
                   action === 'damage' ? 'Quantity Damaged' : 'Quantity Repaired'}
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="input-field"
                  min="1"
                  required
                />
              </div>
              
              {action === 'add' && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Price per Item (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="input-field"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              )}
            </div>

            {/* Payment Method */}
            {action === 'add' && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, paymentMethod: method.value })}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 flex items-center gap-2 ${
                          formData.paymentMethod === method.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon size={16} />
                        <span className="text-sm">{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* File Upload */}
            {action === 'add' && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Attachments (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors duration-200">
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                    className="hidden"
                    id="file-upload"
                    disabled={uploadingFiles}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-text-secondary">
                      {uploadingFiles ? 'Uploading...' : 'Click to upload files or drag and drop'}
                    </p>
                    <p className="text-xs text-text-secondary">
                      PNG, JPG, PDF, DOC up to 10MB each
                    </p>
                  </label>
                </div>
                
                {/* Uploaded Files */}
                {formData.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {formData.attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <Download size={16} className="text-text-secondary" />
                          <span className="text-sm text-text-primary">{file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-error hover:text-error-dark"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Note (Optional)
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                className="input-field resize-none"
                rows="3"
                placeholder="Add any additional notes..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="btn-primary flex-1 hover-lift"
              >
                {isEditing ? 'Update Item' : 
                 action === 'add' ? 'Add Items' : 
                 action === 'use' ? 'Use Items' : 
                 action === 'damage' ? 'Mark as Damaged' : 'Repair Items'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary hover-lift"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inventory Table */}
      {!showForm && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search inventory..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="ok">In Stock</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Eye size={16} />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'cards' 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Package size={16} />
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card hover-lift">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">Total Items</p>
                  <p className="text-2xl font-bold text-text-primary">{inventory.length}</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Package className="text-primary" size={24} />
                </div>
              </div>
            </div>

            <div className="card hover-lift">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">In Stock</p>
                  <p className="text-2xl font-bold text-success">{inventory.filter(item => item.quantity > 2).length}</p>
                </div>
                <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
                  <CheckCircle className="text-success" size={24} />
                </div>
              </div>
            </div>

            <div className="card hover-lift">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">Low Stock</p>
                  <p className="text-2xl font-bold text-warning">{lowStockItems.length}</p>
                </div>
                <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="text-warning" size={24} />
                </div>
              </div>
            </div>

            <div className="card hover-lift">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">Out of Stock</p>
                  <p className="text-2xl font-bold text-error">{outOfStockItems.length}</p>
                </div>
                <div className="w-12 h-12 bg-error/10 rounded-xl flex items-center justify-center">
                  <X className="text-error" size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="card hover-lift overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-text-secondary">Item</th>
                      <th className="text-left py-3 px-4 font-medium text-text-secondary">Category</th>
                      <th className="text-left py-3 px-4 font-medium text-text-secondary">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-text-secondary">Quantity</th>
                      <th className="text-left py-3 px-4 font-medium text-text-secondary">Price</th>
                      <th className="text-left py-3 px-4 font-medium text-text-secondary">Damaged</th>
                      <th className="text-left py-3 px-4 font-medium text-text-secondary">Last Updated</th>
                      <th className="text-left py-3 px-4 font-medium text-text-secondary">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((item) => {
                      const statusInfo = getStatusInfo(item.quantity);
                      return (
                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-text-primary">{item.item}</p>
                              {item.note && (
                                <p className="text-xs text-text-secondary">{item.note}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-text-secondary">{item.category}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`font-medium ${
                              item.quantity === 0 ? 'text-error' : 
                              item.quantity <= 2 ? 'text-warning' : 'text-success'
                            }`}>
                              {item.quantity}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-text-secondary">
                            {item.price > 0 ? `₹${item.price}` : '-'}
                          </td>
                          <td className="py-3 px-4">
                            {item.damaged > 0 ? (
                              <span className="text-error font-medium">{item.damaged}</span>
                            ) : (
                              <span className="text-text-secondary">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-text-secondary">
                            {item.lastUpdated ? item.lastUpdated.toLocaleDateString() : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditItem(item.id, item)}
                                className="text-primary hover:text-primary-dark p-1"
                                title="Edit item"
                              >
                                <Edit2 size={16} />
                              </button>
                              {item.damaged > 0 && (
                                <button
                                  onClick={() => handleRepairItem(item.id, item)}
                                  className="text-success hover:text-success-dark p-1"
                                  title="Mark as repaired"
                                >
                                  <CheckCircle size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {filteredInventory.length === 0 && (
                <div className="text-center py-8">
                  <Package size={48} className="text-gray-400 mx-auto mb-4" />
                  <p className="text-text-secondary">No inventory items found</p>
                </div>
              )}
            </div>
          )}

          {/* Card View */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInventory.map((item) => {
                const statusInfo = getStatusInfo(item.quantity);
                return (
                  <div key={item.id} className="card hover-lift">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-text-primary">{item.item}</h3>
                        <p className="text-sm text-text-secondary">{item.category}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-text-secondary">Quantity:</span>
                        <span className={`font-medium ${
                          item.quantity === 0 ? 'text-error' : 
                          item.quantity <= 2 ? 'text-warning' : 'text-success'
                        }`}>
                          {item.quantity}
                        </span>
                      </div>
                      
                      {item.price > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-text-secondary">Price:</span>
                          <span className="font-medium text-text-primary">₹{item.price}</span>
                        </div>
                      )}
                      
                      {item.damaged > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-text-secondary">Damaged:</span>
                          <span className="font-medium text-error">{item.damaged}</span>
                        </div>
                      )}
                      
                      {item.lastUpdated && (
                        <div className="flex justify-between">
                          <span className="text-sm text-text-secondary">Updated:</span>
                          <span className="text-sm text-text-secondary">
                            {item.lastUpdated.toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleEditItem(item.id, item)}
                        className="flex-1 btn-secondary text-xs hover-lift"
                      >
                        <Edit2 size={14} className="mr-1" />
                        Edit
                      </button>
                      {item.damaged > 0 && (
                        <button
                          onClick={() => handleRepairItem(item.id, item)}
                          className="flex-1 btn-secondary text-xs hover-lift"
                        >
                          <CheckCircle size={14} className="mr-1" />
                          Repair
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryEntry; 