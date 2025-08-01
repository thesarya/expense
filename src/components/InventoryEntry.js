
import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase/config";
import { db } from "../firebase/config"; // <-- adjust path if needed
import { Pencil, Trash2, UserPlus, Check, X } from "lucide-react";

const ITEM_TYPES = ["Stock", "Asset"];
const STATUS_OPTIONS = [
  "Available",
  "Assigned",
  "Needs Repair",
  "Discarded",
];

// ...existing code...

const InventoryEntry = () => {
  const [items, setItems] = useState([]);
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

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "inventory"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setItems(data);
      },
      (err) => {
        alert("Error loading inventory: " + err.message);
      }
    );
    return () => unsub();
  }, []);

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
      attachments: form.attachments || []
    };
    try {
      if (editingId) {
        await updateDoc(doc(db, "inventory", editingId), data);
      } else {
        await addDoc(collection(db, "inventory"), data);
      }
      resetForm();
    } catch (err) {
      alert("Error saving item: " + err.message);
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
        alert(`${uploadedFiles.length} file(s) uploaded successfully`);
      } catch (error) {
        alert('Failed to upload files');
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

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await deleteDoc(doc(db, "inventory", id));
    } catch (err) {
      alert("Error deleting item: " + err.message);
    }
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
    } catch (err) {
      alert("Error assigning item: " + err.message);
    }
  };

  const filteredItems = items.filter((item) =>
    typeof item.itemName === 'string' && typeof search === 'string' &&
    item.itemName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">Inventory Management</h1>
      <p className="mb-6 text-gray-600">
        Track your stock and assets. Add, edit, assign, and manage inventory in real time.
      </p>

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

      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by item name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field w-full md:w-64"
        />
        <button
          className="btn-primary"
          onClick={() => {
            setShowModal(true);
            setEditingId(null);
            setForm({
              itemName: "",
              quantity: "",
              itemType: "Stock",
              status: "Available",
              assignedTo: "",
            });
          }}
        >
          + Add Item
        </button>
      </div>

      {/* Inventory Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-3 text-left">Name</th>
              <th className="py-2 px-3 text-left">Quantity</th>
              <th className="py-2 px-3 text-left">Type</th>
              <th className="py-2 px-3 text-left">Status</th>
              <th className="py-2 px-3 text-left">Assigned To</th>
              <th className="py-2 px-3 text-left">Last Updated</th>
              <th className="py-2 px-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-6 text-gray-400">
                  No items found.
                </td>
              </tr>
            )}
            {filteredItems.map((item) => (
              <tr
                key={item.id}
                className={
                  item.quantity <= 2
                    ? "bg-red-50"
                    : ""
                }
              >
                <td className="py-2 px-3 font-medium">{item.itemName}</td>
                <td className="py-2 px-3">
                  <span
                    className={
                      item.quantity <= 2
                        ? "text-red-600 font-bold"
                        : "text-gray-800"
                    }
                  >
                    {item.quantity}
                  </span>
                </td>
                <td className="py-2 px-3">{item.itemType}</td>
                <td className="py-2 px-3">{item.status}</td>
                <td className="py-2 px-3">{item.itemType === "Asset" ? item.assignedTo : "-"}</td>
                <td className="py-2 px-3">
                  {item.lastUpdated?.toDate
                    ? item.lastUpdated.toDate().toLocaleString()
                    : "-"}
                </td>
                <td className="py-2 px-3">
                  <div className="flex gap-2">
                    <button
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit"
                      onClick={() => handleEdit(item)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                    {item.itemType === "Asset" && (
                      <button
                        className="text-green-600 hover:text-green-800"
                        title="Assign"
                        onClick={() => handleAssign(item)}
                      >
                        <UserPlus size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryEntry;