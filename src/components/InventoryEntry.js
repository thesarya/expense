import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase/config";
import { db } from "../firebase/config";
import { 
  Pencil, 
  UserPlus, 
  Check, 
  X, 
  Search, 
  Filter, 
  Package, 
  Box, 
  AlertTriangle, 
  Plus,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ITEM_TYPES = ["Stock", "Asset"];
const STATUS_OPTIONS = [
  "Available",
  "Assigned",
  "Needs Repair",
  "Discarded",
];

const InventoryEntry = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [lowStockAlert, setLowStockAlert] = useState(null);
  const [updateQtyId, setUpdateQtyId] = useState(null);
  const [updateQtyValue, setUpdateQtyValue] = useState("");
  const [form, setForm] = useState({
    itemName: "",
    quantity: "",
    itemType: "Stock",
    status: "Available",
    assignedTo: "",
    attachments: []
  });
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [assignId, setAssignId] = useState(null);
  const [assignName, setAssignName] = useState("");
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Image preview state
  const [previewImage, setPreviewImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // Item preview state
  const [selectedItem, setSelectedItem] = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);

  useEffect(() => {
    if (!user?.centre) return;
    
    setLoading(true);
    
    // For admin users, show all items (including those without center info)
    // For staff users, only show items from their center
    const inventoryQuery = user.role === 'admin' 
      ? collection(db, "inventory")
      : query(collection(db, "inventory"), where("centre", "==", user.centre));
    
    const unsub = onSnapshot(
      inventoryQuery,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        // For staff users, filter out items without center info or from other centers
        const filteredData = user.role === 'admin' 
          ? data 
          : data.filter(item => item.centre === user.centre);
        
        setItems(filteredData);
        // Check for low stock items (stock type only)
        const lowStock = filteredData.filter(item => item.itemType === "Stock" && item.originalQuantity && item.quantity < 0.2 * item.originalQuantity);
        if (lowStock.length > 0) {
          setLowStockAlert(lowStock);
        } else {
          setLowStockAlert(null);
        }
        setLoading(false);
        toast.success(`Loaded ${filteredData.length} inventory items successfully`);
      },
      (err) => {
        console.error("Error loading inventory:", err);
        toast.error("Error loading inventory: " + err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user?.centre, user?.role]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm({
      itemName: "",
      quantity: "",
      itemType: "Stock",
      status: "Available",
      assignedTo: "",
      attachments: []
    });
    setEditingId(null);
    setShowModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.itemName.trim() || !form.quantity || isNaN(form.quantity)) {
      alert("Please enter a valid item name and quantity.");
      return;
    }
    const data = {
      itemName: form.itemName.trim(),
      quantity: Number(form.quantity),
      itemType: form.itemType,
      status: form.status,
      assignedTo: form.itemType === "Asset" ? form.assignedTo : "",
      lastUpdated: serverTimestamp(),
      attachments: form.attachments || [],
      centre: user.centre
    };
    try {
      if (editingId) {
        await updateDoc(doc(db, "inventory", editingId), data);
      } else {
        await addDoc(collection(db, "inventory"), data);
      }
      // WhatsApp logic
      const message = `📦 New Inventory Item Added\n\n📝 Item: ${data.itemName}\n🔢 Quantity: ${data.quantity}\n📂 Type: ${data.itemType}\n📊 Status: ${data.status}${data.assignedTo ? `\n👤 Assigned to: ${data.assignedTo}` : ''}${user.role !== 'admin' ? `\n🏢 Centre: ${user.centre}` : ''}\n#AaryavartInventory`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      resetForm();
      toast.success(editingId ? 'Item updated successfully!' : 'Item added successfully!');
    } catch (err) {
      console.error("Error saving item:", err);
      toast.error("Error saving item: " + err.message);
    }
  };

  const handleEdit = (item) => {
    setForm({
      itemName: item.itemName,
      quantity: item.quantity,
      itemType: item.itemType,
      status: item.status,
      assignedTo: item.assignedTo || "",
      attachments: item.attachments || []
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  // File upload handler
  const handleFileUpload = (files) => {
    setUploadingFiles(true);
    (async () => {
      try {
        const uploadedFiles = [];
        for (const file of files) {
          if (file.size > 10 * 1024 * 1024) {
            alert(`${file.name} is too large. Maximum size is 10MB`);
            continue;
          }
          const storageRef = ref(storage, `inventory/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(snapshot.ref);
          uploadedFiles.push({
            name: file.name,
            url: downloadURL,
            size: file.size,
            type: file.type
          });
        }
        setForm(prev => ({
          ...prev,
          attachments: [...(prev.attachments || []), ...uploadedFiles]
        }));
        toast.success(`${uploadedFiles.length} file(s) uploaded successfully`);
      } catch (error) {
        console.error('Failed to upload files:', error);
        toast.error('Failed to upload files');
      } finally {
        setUploadingFiles(false);
      }
    })();
  };

  // Remove attachment handler
  const removeAttachment = (index) => {
    setForm(prev => ({
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

  const handleItemPreview = (item) => {
    setSelectedItem(item);
    setShowItemModal(true);
  };

  const closeItemModal = () => {
    setShowItemModal(false);
    setSelectedItem(null);
  };

  const handleAssign = async (item) => {
    setAssignId(item.id);
    setAssignName(item.assignedTo || "");
  };
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignName.trim()) {
      alert("Enter a name to assign.");
      return;
    }
    try {
      await updateDoc(doc(db, "inventory", assignId), {
        assignedTo: assignName.trim(),
        status: "Assigned",
        lastUpdated: serverTimestamp(),
      });
      setAssignId(null);
      setAssignName("");
      toast.success('Item assigned successfully!');
    } catch (err) {
      console.error("Error assigning item:", err);
      toast.error("Error assigning item: " + err.message);
    }
  };



  const assetCount = items.filter(i => i.itemType === 'Asset').length;
  const stockCount = items.filter(i => i.itemType === 'Stock').length;
  const lowStockCount = items.filter(i => i.itemType === 'Stock' && i.originalQuantity && i.quantity < 0.2 * i.originalQuantity).length;

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  // Generate page numbers for pagination (show max 5 pages)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is 5 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show current page, 2 before, and 2 after
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, currentPage + 2);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      // Add ellipsis if needed
      if (start > 1) {
        pages.unshift('...');
      }
      if (end < totalPages) {
        pages.push('...');
      }
    }
    
    return pages;
  };

  // Filter items based on search and filter type
  useEffect(() => {
    let filtered = items.filter((item) =>
      typeof item.itemName === 'string' && typeof search === 'string' &&
      item.itemName.toLowerCase().includes(search.toLowerCase())
    );
    
    if (filterType === 'stock') filtered = filtered.filter(i => i.itemType === 'Stock');
    if (filterType === 'asset') filtered = filtered.filter(i => i.itemType === 'Asset');
    if (filterType === 'lowstock') filtered = filtered.filter(i => i.itemType === 'Stock' && i.originalQuantity && i.quantity < 0.2 * i.originalQuantity);
    
    setFilteredItems(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [items, search, filterType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render if user doesn't have a center
  if (!user?.centre) {
    return (
      <div className="max-w-5xl mx-auto p-4">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold mb-2">Inventory Management</h1>
          <p className="text-gray-600">Please log in with a valid center account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-text-primary">Inventory Management</h2>
          <p className="text-sm sm:text-base text-text-secondary">
            {user.role === 'admin' ? 'All centres inventory' : `${user.centre} centre inventory`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary flex items-center gap-1 sm:gap-2 hover-lift text-sm sm:text-base px-3 py-2"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{loading ? 'Loading...' : 'Refresh'}</span>
          </button>
          <button
            className="btn-primary flex items-center gap-1 sm:gap-2 hover-lift text-sm sm:text-base px-3 py-2"
            onClick={() => {
              setShowModal(true);
              setEditingId(null);
              setForm({
                itemName: "",
                quantity: "",
                itemType: "Stock",
                status: "Available",
                assignedTo: "",
                attachments: []
              });
            }}
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Add Item</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 sm:p-6 border border-blue-200 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-blue-600 font-medium mb-1">Assets</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-800">{assetCount}</p>
              <p className="text-xs text-blue-500 mt-1">Equipment & tools</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="text-white" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 sm:p-6 border border-green-200 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-green-600 font-medium mb-1">Stock Items</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-800">{stockCount}</p>
              <p className="text-xs text-green-500 mt-1">Consumable items</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
              <Box className="text-white" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 sm:p-6 border border-red-200 hover:shadow-lg transition-all duration-300 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-red-600 font-medium mb-1">Low Stock</p>
              <p className="text-2xl sm:text-3xl font-bold text-red-800">{lowStockCount}</p>
              <p className="text-xs text-red-500 mt-1">Need replenishment</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-red-500 rounded-xl flex items-center justify-center shadow-lg">
              <AlertTriangle className="text-white" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="text-primary w-5 h-5" />
            <h3 className="text-lg font-semibold text-text-primary">Filters</h3>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 sm:px-4 py-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className="text-sm font-medium text-text-primary">
              {filteredItems.length} items
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-secondary w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by item name..."
              className="input-field pl-10 bg-gray-50 border-gray-200 focus:bg-white focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button 
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors duration-150 ${
                filterType === 'all' 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'bg-gray-100 text-primary hover:bg-gray-200'
              }`} 
              onClick={() => setFilterType('all')}
            >
              All
            </button>
            <button 
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors duration-150 ${
                filterType === 'stock' 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'bg-gray-100 text-primary hover:bg-gray-200'
              }`} 
              onClick={() => setFilterType('stock')}
            >
              Stock
            </button>
            <button 
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors duration-150 ${
                filterType === 'asset' 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'bg-gray-100 text-primary hover:bg-gray-200'
              }`} 
              onClick={() => setFilterType('asset')}
            >
              Asset
            </button>
            <button 
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors duration-150 ${
                filterType === 'lowstock' 
                  ? 'bg-error text-white shadow-sm' 
                  : 'bg-gray-100 text-error hover:bg-gray-200'
              }`} 
              onClick={() => setFilterType('lowstock')}
            >
              Low Stock
            </button>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockAlert && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="text-yellow-600" size={20} />
            <h3 className="font-semibold text-yellow-800">Low Stock Alert</h3>
          </div>
          <div className="space-y-1 mb-3">
            {lowStockAlert.map(item => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-yellow-700">
                  {item.itemName} ({item.quantity} left, original: {item.originalQuantity})
                </span>
                <button
                  className="text-blue-600 hover:text-blue-800 underline text-xs font-medium"
                  onClick={() => {
                    const message = `Low stock alert${user.role !== 'admin' ? ` for ${user.centre} centre` : ''} - ${item.itemName} (only ${item.quantity} left of original ${item.originalQuantity}). Please buy more.`;
                    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, '_blank');
                  }}
                >
                  Send WhatsApp
                </button>
              </div>
            ))}
          </div>
          {filterType === 'lowstock' && filteredItems.length > 0 && (
            <button
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors"
              onClick={() => {
                const msg = filteredItems.map(item => `${item.itemName}: ${item.quantity} left (original: ${item.originalQuantity})`).join('\n');
                const message = `Low stock alert${user.role !== 'admin' ? ` for ${user.centre} centre` : ''}:\n${msg}\nPlease buy more.`;
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
              }}
            >
              Send WhatsApp for All Low Stock
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Item Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? "Edit Item" : "Add New Item"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">Attachments (Photo, PDF, etc.)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                    className="hidden"
                    id="inventory-file-upload"
                    disabled={uploadingFiles}
                  />
                  <label htmlFor="inventory-file-upload" className="cursor-pointer">
                    <span className="inline-block text-gray-400">📎</span>
                    <p className="mt-2 text-sm text-gray-500">
                      {uploadingFiles ? 'Uploading...' : 'Click to upload files or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-400">PNG, JPG, PDF, DOC up to 10MB each</p>
                  </label>
                </div>
                {/* Uploaded Files */}
                {form.attachments && form.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {form.attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                        <span className="text-sm">{file.name}</span>
                        <button type="button" onClick={() => removeAttachment(index)} className="text-red-500">Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium">Item Name</label>
                <input
                  name="itemName"
                  value={form.itemName}
                  onChange={handleChange}
                  className="input-field w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Quantity</label>
                <input
                  name="quantity"
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={handleChange}
                  className="input-field w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Item Type</label>
                <select
                  name="itemType"
                  value={form.itemType}
                  onChange={handleChange}
                  className="input-field w-full"
                >
                  {ITEM_TYPES.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="input-field w-full"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </div>
              {form.itemType === "Asset" && (
                <div>
                  <label className="block text-sm font-medium">Assigned To</label>
                  <input
                    name="assignedTo"
                    value={form.assignedTo}
                    onChange={handleChange}
                    className="input-field w-full"
                    placeholder="(Optional)"
                  />
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  {editingId ? "Update" : "Add Item"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Assign Asset</h2>
            <form onSubmit={handleAssignSubmit} className="space-y-3">
              <input
                value={assignName}
                onChange={(e) => setAssignName(e.target.value)}
                className="input-field w-full"
                placeholder="Enter name"
                required
              />
              <div className="flex gap-2 mt-4">
                <button type="submit" className="btn-primary flex-1 flex items-center gap-1">
                  <Check size={16} /> Assign
                </button>
                <button
                  type="button"
                  className="btn-secondary flex-1 flex items-center gap-1"
                  onClick={() => setAssignId(null)}
                >
                  <X size={16} /> Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inventory Table */}
      <div className="card hover-lift p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-text-secondary">Loading inventory...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="text-left py-4 px-4 font-semibold text-text-primary text-sm uppercase tracking-wide">Item Name</th>
                  <th className="text-left py-4 px-4 font-semibold text-text-primary text-sm uppercase tracking-wide">Quantity</th>
                  <th className="text-left py-4 px-4 font-semibold text-text-primary text-sm uppercase tracking-wide">Type</th>
                  <th className="text-left py-4 px-4 font-semibold text-text-primary text-sm uppercase tracking-wide">Status</th>
                  <th className="text-left py-4 px-4 font-semibold text-text-primary text-sm uppercase tracking-wide">Assigned To</th>
                  {user.role === 'admin' && (
                    <th className="text-left py-4 px-4 font-semibold text-text-primary text-sm uppercase tracking-wide">Centre</th>
                  )}
                  <th className="text-left py-4 px-4 font-semibold text-text-primary text-sm uppercase tracking-wide">Last Updated</th>
                  <th className="text-left py-4 px-4 font-semibold text-text-primary text-sm uppercase tracking-wide">Attachments</th>
                  <th className="text-left py-4 px-4 font-semibold text-text-primary text-sm uppercase tracking-wide">Actions</th>
                  {items.some(i => i.itemType === "Stock") && (
                    <th className="text-left py-4 px-4 font-semibold text-text-primary text-sm uppercase tracking-wide">Update Qty</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentItems.length === 0 && (
                  <tr>
                    <td colSpan={user.role === 'admin' ? 10 : 9} className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search size={24} className="text-gray-400" />
                      </div>
                      <p className="text-text-secondary font-medium">No items found</p>
                      <p className="text-sm text-text-secondary mt-1">Try adjusting your filters or add a new item</p>
                    </td>
                  </tr>
                )}
                {currentItems.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-50 transition-colors duration-150 cursor-pointer ${
                      item.quantity <= 2 ? "bg-red-50" : ""
                    }`}
                    onClick={() => handleItemPreview(item)}
                  >
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-semibold text-text-primary text-sm">{item.itemName}</p>
                        {item.attachments && item.attachments.length > 0 && (
                          <p className="text-xs text-text-secondary mt-1">
                            📎 {item.attachments.length} attachment{item.attachments.length > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`font-bold text-lg ${
                          item.quantity <= 2
                            ? "text-red-600"
                            : "text-text-primary"
                        }`}
                      >
                        {item.quantity}
                      </span>
                      {item.originalQuantity && (
                        <p className="text-xs text-text-secondary">
                          Original: {item.originalQuantity}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                        item.itemType === 'Stock' 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : 'bg-blue-100 text-blue-800 border-blue-200'
                      }`}>
                        {item.itemType}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                        item.status === 'Available' ? 'bg-green-100 text-green-800' :
                        item.status === 'Assigned' ? 'bg-blue-100 text-blue-800' :
                        item.status === 'Needs Repair' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {item.itemType === "Asset" ? (
                        item.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-xs font-semibold text-primary">
                                {item.assignedTo.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-sm text-text-secondary font-medium">{item.assignedTo}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Not assigned</span>
                        )
                      ) : (
                        <span className="text-xs text-gray-400 italic">N/A</span>
                      )}
                    </td>
                    {user.role === 'admin' && (
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                          {item.centre || 'Unknown'}
                        </span>
                      </td>
                    )}
                    <td className="py-4 px-4">
                      <div className="text-sm font-medium text-text-primary">
                        {item.lastUpdated?.toDate
                          ? format(item.lastUpdated.toDate(), 'dd/MM/yyyy')
                          : "-"}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {item.lastUpdated?.toDate
                          ? format(item.lastUpdated.toDate(), 'HH:mm')
                          : ""}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {item.attachments && item.attachments.length > 0 ? (
                        <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                          {item.attachments.map((file, index) => (
                            <button
                              key={index}
                              onClick={() => handleImagePreview(file)}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 transition-colors duration-150"
                              title={file.type && file.type.startsWith('image/') ? 'Preview image' : 'Open file'}
                            >
                              {file.type && file.type.startsWith('image/') ? (
                                <div className="w-4 h-4 rounded overflow-hidden border border-gray-300">
                                  <img 
                                    src={file.url} 
                                    alt={file.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <Download size={12} className="text-gray-500" />
                              )}
                              <span className="truncate max-w-16 font-medium">{file.name}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No attachments</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 text-primary hover:text-primary-dark hover:bg-primary/10 rounded-lg transition-colors duration-150"
                          title="Edit item"
                        >
                          <Pencil size={16} />
                        </button>
                        {item.itemType === "Asset" && (
                          <button
                            onClick={() => handleAssign(item)}
                            className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors duration-150"
                            title="Assign asset"
                          >
                            <UserPlus size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                    {item.itemType === "Stock" && (
                      <td className="py-4 px-4">
                        {updateQtyId === item.id ? (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              const newQty = Number(updateQtyValue);
                              if (isNaN(newQty) || newQty < 0) {
                                toast.error('Please enter a valid quantity');
                                return;
                              }
                              try {
                                await updateDoc(doc(db, "inventory", item.id), { quantity: newQty });
                                setUpdateQtyId(null);
                                setUpdateQtyValue("");
                                toast.success('Quantity updated successfully!');
                              } catch (error) {
                                console.error('Error updating quantity:', error);
                                toast.error('Failed to update quantity');
                              }
                            }}
                            className="flex gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="number"
                              value={updateQtyValue}
                              onChange={e => setUpdateQtyValue(e.target.value)}
                              className="input-field w-16 text-sm"
                              min="0"
                            />
                            <button type="submit" className="btn-primary btn-xs">Save</button>
                            <button type="button" className="btn-secondary btn-xs" onClick={() => setUpdateQtyId(null)}>Cancel</button>
                          </form>
                        ) : (
                          <button
                            className="btn-secondary btn-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUpdateQtyId(item.id);
                              setUpdateQtyValue(item.quantity.toString());
                            }}
                          >
                            Update
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                <div className="text-sm text-text-secondary">
                  Showing <span className="font-semibold">{indexOfFirstItem + 1}</span> to <span className="font-semibold">{Math.min(indexOfLastItem, filteredItems.length)}</span> of <span className="font-semibold">{filteredItems.length}</span> items
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  {getPageNumbers().map((page, index) => (
                    <button
                      key={index}
                      onClick={() => typeof page === 'number' ? setCurrentPage(page) : null}
                      disabled={page === '...'}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors duration-150 ${
                        page === '...'
                          ? 'border-gray-200 text-gray-400 cursor-default'
                          : currentPage === page
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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

      {/* Item Preview Modal */}
      {showItemModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-text-primary">Item Details</h3>
              <button
                onClick={closeItemModal}
                className="text-text-secondary hover:text-text-primary p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Item Name</label>
                    <p className="text-lg font-semibold text-text-primary mt-1">{selectedItem.itemName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Quantity</label>
                    <p className="text-2xl font-bold text-primary mt-1">{selectedItem.quantity}</p>
                    {selectedItem.originalQuantity && (
                      <p className="text-sm text-text-secondary">Original: {selectedItem.originalQuantity}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Type</label>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border mt-1 ${
                      selectedItem.itemType === 'Stock' 
                        ? 'bg-green-100 text-green-800 border-green-200' 
                        : 'bg-blue-100 text-blue-800 border-blue-200'
                    }`}>
                      {selectedItem.itemType}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Status</label>
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-sm font-medium mt-1 ${
                      selectedItem.status === 'Available' ? 'bg-green-100 text-green-800' :
                      selectedItem.status === 'Assigned' ? 'bg-blue-100 text-blue-800' :
                      selectedItem.status === 'Needs Repair' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedItem.status}
                    </span>
                  </div>
                </div>

                {/* Assigned To */}
                {selectedItem.itemType === "Asset" && (
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Assigned To</label>
                    {selectedItem.assignedTo ? (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {selectedItem.assignedTo.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-text-primary">{selectedItem.assignedTo}</span>
                      </div>
                    ) : (
                      <p className="text-text-secondary mt-1 italic">Not assigned</p>
                    )}
                  </div>
                )}

                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Last Updated</label>
                    <p className="text-lg font-medium text-text-primary mt-1">
                      {selectedItem.lastUpdated?.toDate
                        ? format(selectedItem.lastUpdated.toDate(), 'EEEE, MMMM do, yyyy')
                        : 'Not available'}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {selectedItem.lastUpdated?.toDate
                        ? format(selectedItem.lastUpdated.toDate(), 'h:mm a')
                        : ''}
                    </p>
                  </div>
                  {user.role === 'admin' && (
                    <div>
                      <label className="text-sm font-medium text-text-secondary">Centre</label>
                      <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-medium mt-1">
                        {selectedItem.centre || 'Unknown'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Attachments */}
                {selectedItem.attachments && selectedItem.attachments.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-text-secondary mb-3 block">Attachments</label>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedItem.attachments.map((file, index) => (
                        <button
                          key={index}
                          onClick={() => handleImagePreview(file)}
                          className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors duration-150"
                          title={file.type && file.type.startsWith('image/') ? 'Preview image' : 'Open file'}
                        >
                          {file.type && file.type.startsWith('image/') ? (
                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-300">
                              <img 
                                src={file.url} 
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                              <Download size={20} className="text-gray-500" />
                            </div>
                          )}
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
                            <p className="text-xs text-text-secondary">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      handleEdit(selectedItem);
                      closeItemModal();
                    }}
                    className="flex-1 bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-dark transition-colors duration-150"
                  >
                    Edit Item
                  </button>
                  {selectedItem.itemType === "Asset" && (
                    <button
                      onClick={() => {
                        handleAssign(selectedItem);
                        closeItemModal();
                      }}
                      className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors duration-150"
                    >
                      Assign Asset
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryEntry;