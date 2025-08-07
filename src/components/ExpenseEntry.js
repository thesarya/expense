import React, { useState, useEffect } from 'react';
import { addDoc, collection, query, where, orderBy, limit, getDocs, updateDoc, doc, setDoc, getDocs as getDocsAll } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, DollarSign, Copy, Plus, X, Upload, Trash2, Download, CreditCard, Smartphone, Wallet, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

const ExpenseEntry = ({ editingExpense, onExpenseSubmitted, selectedCentre }) => {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    item: '',
    amount: '',
    note: '',
    paymentMethod: 'cash',
    centre: user?.role === 'admin' ? 'Lucknow' : user?.centre,
    attachments: []
  });
  const [lastEntry, setLastEntry] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [showCustomItemInput, setShowCustomItemInput] = useState(false);
  const [newCustomItem, setNewCustomItem] = useState('');
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  
  // Image preview state
  const [previewImage, setPreviewImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);


  // Fetch categories and items from Firestore
  useEffect(() => {
    const fetchCategoriesAndItems = async () => {
      const catSnap = await getDocsAll(collection(db, 'categories'));
      setCategories(catSnap.docs.map(doc => doc.data().name));
      const itemSnap = await getDocsAll(collection(db, 'items'));
      setItems(itemSnap.docs.map(doc => ({ name: doc.data().name, category: doc.data().category })));
    };
    fetchCategoriesAndItems();
  }, []);

  const paymentMethods = [
    { value: 'cash', label: 'Cash', icon: Wallet },
    { value: 'upi', label: 'UPI', icon: Smartphone },
    { value: 'card', label: 'Card', icon: CreditCard }
  ];



  useEffect(() => {
    if (user?.centre) {
      fetchLastEntry();
    }
  }, [user?.centre]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle editing expense from parent
  useEffect(() => {
    if (editingExpense) {
      const { id, data } = editingExpense;
      setFormData({
        date: data.date || new Date().toISOString().split('T')[0],
        item: data.item,
        amount: data.amount !== undefined && data.amount !== null ? data.amount.toString() : '',
        note: data.note || '',
        paymentMethod: data.paymentMethod || 'cash',
        attachments: data.attachments || []
      });
      setSelectedCategory(data.category);
      setShowForm(true);
      setIsEditing(true);
      setEditingItemId(id);
    }
  }, [editingExpense]);

  const fetchLastEntry = async () => {
    try {
      // For admin, fetch last entry from any centre
      const q = user?.role === 'admin' 
        ? query(collection(db, 'expenses'), orderBy('timestamp', 'desc'), limit(1))
        : query(collection(db, 'expenses'), where('centre', '==', user.centre), orderBy('timestamp', 'desc'), limit(1));
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setLastEntry(querySnapshot.docs[0].data());
      }
    } catch (error) {
      console.error('Error fetching last entry:', error);
    }
  };



  const handleFileUpload = async (files) => {
    setUploadingFiles(true);
    const uploadedFiles = [];

    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          toast.error(`${file.name} is too large. Maximum size is 10MB`);
          continue;
        }

        const storageRef = ref(storage, `expenses/${user.centre}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        uploadedFiles.push({
          name: file.name,
          url: downloadURL,
          size: file.size,
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

  const handleImagePreview = (file) => {
    // Check if file is an image
    if (file.type && file.type.startsWith('image/')) {
      setPreviewImage(file);
      setShowImageModal(true);
    } else {
      // For non-image files, open in new tab
      window.open(file.url, '_blank');
    }
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setPreviewImage(null);
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setShowForm(true);
  };

  const handleDuplicateLast = () => {
    if (lastEntry) {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        item: lastEntry.item,
        amount: lastEntry.amount !== undefined && lastEntry.amount !== null ? lastEntry.amount.toString() : '',
        note: lastEntry.note || '',
        paymentMethod: lastEntry.paymentMethod || 'cash',
        attachments: []
      });
      setSelectedCategory(lastEntry.category);
      setShowForm(true);
      toast.success('Last entry duplicated');
    }
  };

  const handleItemSelect = (item) => {
    setFormData({ ...formData, item });
  };

  const handleAddCustomItem = async () => {
    if (newCustomItem.trim() && selectedCategory) {
      setFormData({ ...formData, item: newCustomItem });
      setNewCustomItem('');
      setShowCustomItemInput(false);
      // Save custom item to 'items' collection in Firebase
      try {
        await setDoc(doc(collection(db, 'items'), newCustomItem.toLowerCase()), {
          name: newCustomItem,
          category: selectedCategory
        });
        setItems(prev => [...prev, { name: newCustomItem, category: selectedCategory }]);
      } catch (e) {
        // ignore error for now
      }
      toast.success('Custom item added');
    }
  };

  // Add new category
  const handleAddCategory = async () => {
    if (newCategory.trim()) {
      try {
        await setDoc(doc(collection(db, 'categories'), newCategory.replace(/[/.]/g, '_')), { name: newCategory });
        setCategories(prev => [...prev, newCategory]);
        setShowAddCategoryInput(false);
        setNewCategory('');
        toast.success('Category added!');
      } catch (e) {
        toast.error('Failed to add category');
      }
    }
  };

  const getAllItems = (category) => {
    return items.filter(i => i.category === category).map(i => i.name);
  };

  const sendWhatsAppAlert = (expenseData) => {
    const message = `💰 New Expense Added - ${user.centre} Centre\n\n📋 Item: ${expenseData.item}\n💰 Amount: ₹${expenseData.amount}\n📂 Category: ${expenseData.category}\n💳 Payment: ${expenseData.paymentMethod.toUpperCase()}\n📅 Date: ${expenseData.date}\n👤 Added by: ${user.email}${expenseData.note ? `\n📝 Note: ${expenseData.note}` : ''}\n#AaryavartExpense #${user.centre}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.item || !formData.amount || !selectedCategory) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Determine which centres to add the expense to
      let centresToAdd = [];
      if (selectedCentre === 'both') {
        centresToAdd = ['Lucknow', 'Gorakhpur'];
      } else if (selectedCentre) {
        centresToAdd = [selectedCentre];
      } else {
        centresToAdd = [formData.centre || user.centre];
      }

      if (isEditing && editingItemId) {
        // Update existing entry
        const expenseData = {
          ...formData,
          amount: parseFloat(formData.amount),
          category: selectedCategory,
          centre: formData.centre || user.centre,
          timestamp: new Date(),
          createdBy: user.email,
          isSubmitted: true
        };
        
        await updateDoc(doc(db, 'expenses', editingItemId), expenseData);
        toast.success('Expense updated successfully!');
        setIsEditing(false);
        setEditingItemId(null);
        if (onExpenseSubmitted) {
          onExpenseSubmitted();
        }
      } else {
        // Add new entries for each selected centre
        for (const centre of centresToAdd) {
          const expenseData = {
            ...formData,
            amount: parseFloat(formData.amount),
            category: selectedCategory,
            centre: centre,
            timestamp: new Date(),
            createdBy: user.email,
            isSubmitted: true
          };
          
          await addDoc(collection(db, 'expenses'), expenseData);
        }
        
        const successMessage = selectedCentre === 'both' 
          ? 'Expense added to both centres successfully!'
          : 'Expense added successfully! Check the Expense Records tab to see your entry.';
        toast.success(successMessage);
        
        // Send WhatsApp alert for new expenses
        if (centresToAdd.length > 0) {
          sendWhatsAppAlert({ ...formData, centre: centresToAdd[0] });
        }
      }
      
      setFormData({
        date: new Date().toISOString().split('T')[0],
        item: '',
        amount: '',
        note: '',
        paymentMethod: 'cash',
        centre: user?.role === 'admin' ? 'Lucknow' : user?.centre,
        attachments: []
      });
      setShowForm(false);
      setSelectedCategory('');
      fetchLastEntry();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense. Please try again.');
    }
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-text-primary">Add Expense</h2>
          <p className="text-text-secondary">Record a new expense for your centre</p>
        </div>
        <div className="flex items-center gap-3">
          {lastEntry && (
            <button
              onClick={handleDuplicateLast}
              className="btn-secondary flex items-center gap-2 hover-lift"
            >
              <Copy size={16} />
              Duplicate Last Entry
            </button>
          )}
          

        </div>
      </div>



      {/* Category Cards */}
      {!showForm && (
        <div>
          <div className="flex justify-end mb-2">
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => setShowAddCategoryInput(!showAddCategoryInput)}
            >
              + Add Category
            </button>
          </div>
          {showAddCategoryInput && (
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                placeholder="Enter new category name"
                className="input-field flex-1"
              />
              <button
                type="button"
                className="btn-primary px-4"
                onClick={handleAddCategory}
              >
                Add
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategorySelect(category)}
                className="card hover-lift transition-all duration-300 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Plus size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">{category}</h3>
                    <p className="text-xs text-text-secondary">
                      {getAllItems(category).length} items
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Expense Form */}
      {showForm && (
        <div className="card hover-lift">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-display font-semibold text-text-primary">
              {isEditing ? 'Edit' : 'Add'} {selectedCategory} Expense
            </h3>
            <button
              onClick={() => {
                setShowForm(false);
                setIsEditing(false);
                setEditingItemId(null);
              }}
              className="text-text-secondary hover:text-text-primary transition-colors duration-200"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary w-5 h-5" />
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="input-field pl-12"
                  required
                />
              </div>
            </div>

            {/* Item Selection */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-3">
                Select Item
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {getAllItems(selectedCategory).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleItemSelect(item)}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 text-sm ${
                      formData.item === item
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowCustomItemInput(!showCustomItemInput)}
                  className="text-sm text-primary hover:text-primary-dark"
                >
                  + Add custom item
                </button>
                
                {showCustomItemInput && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={newCustomItem}
                      onChange={(e) => setNewCustomItem(e.target.value)}
                      placeholder="Enter custom item name"
                      className="input-field flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomItem}
                      className="btn-primary px-4"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Amount and Payment Method */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Amount (₹)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary w-5 h-5" />
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="input-field pl-12"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, paymentMethod: method.value })}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all duration-200 ${
                          formData.paymentMethod === method.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon size={16} />
                        <span className="text-sm font-medium">{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Centre Selection (Admin Only) */}
            {user?.role === 'admin' && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Select Centre
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Lucknow', 'Gorakhpur'].map((centre) => (
                    <button
                      key={centre}
                      type="button"
                      onClick={() => setFormData({ ...formData, centre })}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all duration-200 ${
                        formData.centre === centre
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <span className="font-medium">{centre}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Attachments (Receipts, Bills, etc.)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary transition-colors">
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
                        {file.type && file.type.startsWith('image/') ? (
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-200">
                            <img 
                              src={file.url} 
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <Download size={16} className="text-text-secondary" />
                        )}
                        <span className="text-sm text-text-primary">{file.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleImagePreview(file)}
                          className="text-primary hover:text-primary-dark"
                          title={file.type && file.type.startsWith('image/') ? 'Preview image' : 'Open file'}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-error hover:text-error-dark"
                          title="Remove file"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                {isEditing ? 'Update Expense' : 'Add Expense'}
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

      {/* Image Preview Modal */}
      {showImageModal && previewImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-text-primary">
                {previewImage.name}
              </h3>
              <button
                onClick={closeImageModal}
                className="text-text-secondary hover:text-text-primary"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="w-full h-auto max-w-full object-contain"
                style={{ maxHeight: 'calc(90vh - 120px)' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseEntry; 