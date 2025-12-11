import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import BarcodeScanner from "./BarcodeScanner";

// Format number with commas and no decimals
const formatCurrency = (value) => {
  return Math.round(parseFloat(value) || 0).toLocaleString('en-US');
};

function Admin() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    barcode: "",
    name: "",
    price: "",
    base_price: "",
    category: "",
    stock: "",
  });
  const barcodeInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [backups, setBackups] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userFormData, setUserFormData] = useState({
    username: "",
    password: "",
    role: "cashier",
    fullName: "",
  });
  const [statistics, setStatistics] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
  });
  const [newCategoryInput, setNewCategoryInput] = useState("");

  // Statistics pagination and filters
  const [lowStockPage, setLowStockPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [lowStockFilters, setLowStockFilters] = useState({
    search: "",
    category: "",
    stockLevel: "all", // all, low, out
  });

  // Inventory items pagination and filters
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventoryFilters, setInventoryFilters] = useState({
    search: "",
    category: "",
    stockLevel: "all", // all, in_stock, low, out
  });

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "null");
    setUser(userData);
    fetchItems();
    fetchCategories();
    if (userData?.role === "admin") {
      fetchBackups();
      fetchUsers();
      fetchStatistics();
    }
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get("/categories");
      setCategories(response.data);
    } catch (err) {
      setError("Failed to fetch categories");
    }
  };

  const fetchStatistics = async () => {
    setStatsLoading(true);
    try {
      const response = await api.get("/statistics");
      setStatistics(response.data);
    } catch (err) {
      setError("Failed to fetch statistics");
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get("/users");
      setUsers(response.data);
    } catch (err) {
      setError("Failed to fetch users");
    }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await api.post("/users", userFormData);
      setSuccess("User created successfully");
      setUserFormData({
        username: "",
        password: "",
        role: "cashier",
        fullName: "",
      });
      setShowUserModal(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      await api.delete(`/users/${userId}`);
      setSuccess("User deleted successfully");
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete user");
    }
  };

  const fetchBackups = async () => {
    try {
      const response = await api.get("/backup/list");
      setBackups(response.data.backups || []);
    } catch (err) {
      console.error("Failed to fetch backups:", err);
    }
  };

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    try {
      const response = await api.post("/backup/create");
      if (response.data.success) {
        setSuccess(`Backup created: ${response.data.backup.filename}`);
        fetchBackups();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create backup");
    } finally {
      setBackupLoading(false);
    }
  };

  const handleCleanupBackups = async () => {
    if (
      !window.confirm(
        "Delete old backups? This will keep only the 30 most recent backups."
      )
    ) {
      return;
    }
    setBackupLoading(true);
    try {
      const response = await api.post("/backup/cleanup", { keepCount: 30 });
      if (response.data.success) {
        setSuccess(response.data.message);
        fetchBackups();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to cleanup backups");
    } finally {
      setBackupLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await api.get("/items");
      setItems(response.data);
    } catch (err) {
      setError("Failed to fetch items");
    }
  };

  const handleBarcodeScan = (e) => {
    const barcode = e.target.value.trim();
    if (barcode && e.key === "Enter") {
      setFormData({ ...formData, barcode });
      e.target.value = "";
      // Focus on name input
      setTimeout(() => {
        document.querySelector('input[name="name"]')?.focus();
      }, 100);
    }
  };

  const handleCameraScan = (barcode) => {
    if (barcode && barcode.trim()) {
      setFormData({ ...formData, barcode: barcode.trim() });
      // Focus on name input after scanning
      setTimeout(() => {
        document.querySelector('input[name="name"]')?.focus();
      }, 100);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (editingItem) {
        await api.put(`/items/${editingItem.id}`, formData);
        setSuccess("Item updated successfully");
      } else {
        await api.post("/items", formData);
        setSuccess("Item added successfully");
      }
      setFormData({
        barcode: "",
        name: "",
        price: "",
        base_price: "",
        category: "",
        stock: "",
      });
      setEditingItem(null);
      setShowModal(false);
      fetchItems();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save item");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      barcode: item.barcode,
      name: item.name,
      price: item.price,
      base_price: item.base_price || "",
      category: item.category || "",
      stock: item.stock,
    });
    setShowModal(true);
    setError("");
    setSuccess("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) {
      return;
    }

    try {
      await api.delete(`/items/${id}`);
      setSuccess("Item deleted successfully");
      fetchItems();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete item");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/admin-login");
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setFormData({ barcode: "", name: "", price: "", base_price: "", category: "", stock: "" });
    setShowModal(true);
    setError("");
    setSuccess("");
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };

  const handleCreateCategory = async () => {
    if (!categoryFormData.name.trim()) {
      setError("Category name is required");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await api.post("/categories", categoryFormData);
      setSuccess("Category created successfully");
      setCategoryFormData({ name: "", description: "" });
      setShowCategoryModal(false);
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm("Are you sure you want to delete this category?")) {
      return;
    }

    try {
      await api.delete(`/categories/${categoryId}`);
      setSuccess("Category deleted successfully");
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete category");
    }
  };

  const handleQuickAddCategory = async () => {
    if (!newCategoryInput.trim()) {
      return;
    }

    try {
      await api.post("/categories", { name: newCategoryInput.trim() });
      await fetchCategories();
      setFormData({ ...formData, category: newCategoryInput.trim() });
      setNewCategoryInput("");
      setSuccess("Category added and selected");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create category");
    }
  };

  return (
    <div className="container">
      <div className="header">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1>Admin - Manage Items</h1>
            {user && (
              <p style={{ margin: 0, fontSize: "14px" }}>
                Logged in as: {user.fullName || user.username} ({user.role})
              </p>
            )}
          </div>
          <div>
            <button
              className="btn btn-secondary"
              onClick={handleLogout}
              style={{ marginLeft: "10px" }}
            >
              Logout
            </button>
          </div>
        </div>
        <div className="nav">
          <button onClick={() => navigate("/cashier")}>Cashier</button>
          <button className="active">Admin</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Statistics Dashboard */}
      {user?.role === "admin" && (
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h2>📊 Dashboard & Statistics</h2>
            <button
              className="btn btn-secondary"
              onClick={fetchStatistics}
              disabled={statsLoading}
            >
              {statsLoading ? "Refreshing..." : "🔄 Refresh"}
            </button>
          </div>

          {statsLoading ? (
            <div className="empty-state">
              <p>Loading statistics...</p>
            </div>
          ) : statistics ? (
            <>
              {/* Stock Overview */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "15px",
                  marginBottom: "25px",
                }}
              >
                <div
                  style={{
                    padding: "20px",
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    borderRadius: "8px",
                    color: "white",
                  }}
                >
                  <div style={{ fontSize: "12px", opacity: 0.9 }}>
                    Total Items
                  </div>
                  <div
                    style={{
                      fontSize: "32px",
                      fontWeight: "700",
                      marginTop: "5px",
                    }}
                  >
                    {statistics.stock?.total_items || 0}
                  </div>
                </div>
                <div
                  style={{
                    padding: "20px",
                    background:
                      "linear-gradient(135deg, #38a169 0%, #2f855a 100%)",
                    borderRadius: "8px",
                    color: "white",
                  }}
                >
                  <div style={{ fontSize: "12px", opacity: 0.9 }}>In Stock</div>
                  <div
                    style={{
                      fontSize: "32px",
                      fontWeight: "700",
                      marginTop: "5px",
                    }}
                  >
                    {statistics.stock?.in_stock || 0}
                  </div>
                </div>
                <div
                  style={{
                    padding: "20px",
                    background:
                      "linear-gradient(135deg, #e53e3e 0%, #c53030 100%)",
                    borderRadius: "8px",
                    color: "white",
                  }}
                >
                  <div style={{ fontSize: "12px", opacity: 0.9 }}>
                    Out of Stock
                  </div>
                  <div
                    style={{
                      fontSize: "32px",
                      fontWeight: "700",
                      marginTop: "5px",
                    }}
                  >
                    {statistics.stock?.out_of_stock || 0}
                  </div>
                </div>
                <div
                  style={{
                    padding: "20px",
                    background:
                      "linear-gradient(135deg, #dd6b20 0%, #c05621 100%)",
                    borderRadius: "8px",
                    color: "white",
                  }}
                >
                  <div style={{ fontSize: "12px", opacity: 0.9 }}>
                    Low Stock (≤10)
                  </div>
                  <div
                    style={{
                      fontSize: "32px",
                      fontWeight: "700",
                      marginTop: "5px",
                    }}
                  >
                    {statistics.stock?.low_stock || 0}
                  </div>
                </div>
              </div>

              {/* Today's Sales */}
              <div
                style={{
                  padding: "20px",
                  background: "var(--bg-secondary)",
                  borderRadius: "8px",
                  marginBottom: "25px",
                }}
              >
                <h3 style={{ marginTop: 0, marginBottom: "15px" }}>
                  Today's Sales
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "15px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Transactions
                    </div>
                    <div
                      style={{
                        fontSize: "24px",
                        fontWeight: "600",
                        color: "var(--primary-color)",
                      }}
                    >
                      {statistics.today?.transaction_count || 0}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Total Revenue
                    </div>
                    <div
                      style={{
                        fontSize: "24px",
                        fontWeight: "600",
                        color: "var(--success-color)",
                      }}
                    >
                      MMK {formatCurrency(statistics.today?.total_revenue || 0)}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Avg Transaction
                    </div>
                    <div
                      style={{
                        fontSize: "24px",
                        fontWeight: "600",
                        color: "var(--accent-color)",
                      }}
                    >
                      MMK {formatCurrency(statistics.today?.avg_transaction || 0)}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Today's Profit
                    </div>
                    <div
                      style={{
                        fontSize: "24px",
                        fontWeight: "600",
                        color: "#16a34a",
                      }}
                    >
                      MMK {formatCurrency(statistics.today?.total_profit || 0)}
                    </div>
                  </div>
                </div>
                {statistics.profit_30days !== undefined && (
                  <div style={{ marginTop: "15px", paddingTop: "15px", borderTop: "1px solid var(--border-color)" }}>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "5px" }}>
                      Total Profit (Last 30 Days)
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: "600", color: "#16a34a" }}>
                      MMK {formatCurrency(statistics.profit_30days || 0)}
                    </div>
                  </div>
                )}
              </div>

              {/* Low Stock Items */}
              {statistics.lowStockItems &&
                statistics.lowStockItems.length > 0 && (() => {
                  // Filter low stock items
                  const filteredLowStock = statistics.lowStockItems.filter((item) => {
                    const matchesSearch = !lowStockFilters.search || 
                      item.name.toLowerCase().includes(lowStockFilters.search.toLowerCase()) ||
                      item.barcode.toLowerCase().includes(lowStockFilters.search.toLowerCase());
                    const matchesCategory = !lowStockFilters.category || 
                      item.category === lowStockFilters.category;
                    const matchesStockLevel = 
                      lowStockFilters.stockLevel === "all" ||
                      (lowStockFilters.stockLevel === "out" && item.stock === 0) ||
                      (lowStockFilters.stockLevel === "low" && item.stock > 0 && item.stock <= 10);
                    return matchesSearch && matchesCategory && matchesStockLevel;
                  });

                  // Paginate
                  const totalPages = Math.ceil(filteredLowStock.length / itemsPerPage);
                  const startIndex = (lowStockPage - 1) * itemsPerPage;
                  const paginatedLowStock = filteredLowStock.slice(startIndex, startIndex + itemsPerPage);

                  return (
                    <div style={{ marginBottom: "25px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "15px" }}>
                        <h3
                          style={{
                            margin: 0,
                            color: "var(--warning-color)",
                          }}
                        >
                          ⚠️ Low Stock Items (Need Refill)
                        </h3>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                          Showing {paginatedLowStock.length} of {filteredLowStock.length} items
                        </div>
                      </div>

                      {/* Filters */}
                      <div style={{ 
                        display: "flex", 
                        gap: "10px", 
                        marginBottom: "15px", 
                        flexWrap: "wrap",
                        padding: "15px",
                        background: "var(--bg-secondary)",
                        borderRadius: "8px"
                      }}>
                        <input
                          type="text"
                          placeholder="Search by name or barcode..."
                          value={lowStockFilters.search}
                          onChange={(e) => {
                            setLowStockFilters({ ...lowStockFilters, search: e.target.value });
                            setLowStockPage(1);
                          }}
                          style={{
                            padding: "8px 12px",
                            border: "1px solid var(--border-color)",
                            borderRadius: "6px",
                            fontSize: "14px",
                            flex: "1",
                            minWidth: "200px"
                          }}
                        />
                        <select
                          value={lowStockFilters.category}
                          onChange={(e) => {
                            setLowStockFilters({ ...lowStockFilters, category: e.target.value });
                            setLowStockPage(1);
                          }}
                          style={{
                            padding: "8px 12px",
                            border: "1px solid var(--border-color)",
                            borderRadius: "6px",
                            fontSize: "14px",
                            background: "white",
                            minWidth: "150px"
                          }}
                        >
                          <option value="">All Categories</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.name}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={lowStockFilters.stockLevel}
                          onChange={(e) => {
                            setLowStockFilters({ ...lowStockFilters, stockLevel: e.target.value });
                            setLowStockPage(1);
                          }}
                          style={{
                            padding: "8px 12px",
                            border: "1px solid var(--border-color)",
                            borderRadius: "6px",
                            fontSize: "14px",
                            background: "white",
                            minWidth: "150px"
                          }}
                        >
                          <option value="all">All Stock Levels</option>
                          <option value="out">Out of Stock</option>
                          <option value="low">Low Stock (1-10)</option>
                        </select>
                      </div>

                      {paginatedLowStock.length > 0 ? (
                        <>
                          <table>
                            <thead>
                              <tr>
                                <th>Item Name</th>
                                <th>Barcode</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Stock Left</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedLowStock.map((item) => (
                                <tr key={item.id}>
                                  <td>
                                    <strong>{item.name}</strong>
                                  </td>
                                  <td>{item.barcode}</td>
                                  <td>{item.category || "-"}</td>
                                  <td>MMK {formatCurrency(item.price)}</td>
                                  <td>
                                    <span
                                      style={{
                                        padding: "4px 8px",
                                        borderRadius: "4px",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        background:
                                          item.stock === 0 ? "#fed7d7" : "#feebc8",
                                        color:
                                          item.stock === 0 ? "#c53030" : "#c05621",
                                      }}
                                    >
                                      {item.stock === 0
                                        ? "OUT OF STOCK"
                                        : `${item.stock} left`}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {/* Pagination */}
                          {totalPages > 1 && (
                            <div style={{ 
                              display: "flex", 
                              justifyContent: "center", 
                              alignItems: "center", 
                              gap: "10px", 
                              marginTop: "15px" 
                            }}>
                              <button
                                onClick={() => setLowStockPage(Math.max(1, lowStockPage - 1))}
                                disabled={lowStockPage === 1}
                                className="btn btn-secondary"
                                style={{
                                  padding: "6px 12px",
                                  opacity: lowStockPage === 1 ? 0.5 : 1,
                                  cursor: lowStockPage === 1 ? "not-allowed" : "pointer"
                                }}
                              >
                                Previous
                              </button>
                              <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                                Page {lowStockPage} of {totalPages}
                              </span>
                              <button
                                onClick={() => setLowStockPage(Math.min(totalPages, lowStockPage + 1))}
                                disabled={lowStockPage === totalPages}
                                className="btn btn-secondary"
                                style={{
                                  padding: "6px 12px",
                                  opacity: lowStockPage === totalPages ? 0.5 : 1,
                                  cursor: lowStockPage === totalPages ? "not-allowed" : "pointer"
                                }}
                              >
                                Next
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ 
                          padding: "20px", 
                          textAlign: "center", 
                          color: "var(--text-secondary)",
                          background: "var(--bg-secondary)",
                          borderRadius: "8px"
                        }}>
                          No items match the current filters
                        </div>
                      )}
                    </div>
                  );
                })()}

            </>
          ) : (
            <div className="empty-state">
              <p>No statistics available</p>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2>Inventory Items</h2>
          <button className="btn btn-primary" onClick={handleAddNew}>
            Add New Item
          </button>
        </div>

        {/* Filters */}
        {items.length > 0 && (
          <div style={{ 
            display: "flex", 
            gap: "10px", 
            marginBottom: "20px", 
            flexWrap: "wrap",
            padding: "15px",
            background: "var(--bg-secondary)",
            borderRadius: "8px"
          }}>
            <input
              type="text"
              placeholder="Search by name or barcode..."
              value={inventoryFilters.search}
              onChange={(e) => {
                setInventoryFilters({ ...inventoryFilters, search: e.target.value });
                setInventoryPage(1);
              }}
              style={{
                padding: "8px 12px",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                fontSize: "14px",
                flex: "1",
                minWidth: "200px"
              }}
            />
            <select
              value={inventoryFilters.category}
              onChange={(e) => {
                setInventoryFilters({ ...inventoryFilters, category: e.target.value });
                setInventoryPage(1);
              }}
              style={{
                padding: "8px 12px",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                fontSize: "14px",
                background: "white",
                minWidth: "150px"
              }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
            <select
              value={inventoryFilters.stockLevel}
              onChange={(e) => {
                setInventoryFilters({ ...inventoryFilters, stockLevel: e.target.value });
                setInventoryPage(1);
              }}
              style={{
                padding: "8px 12px",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                fontSize: "14px",
                background: "white",
                minWidth: "150px"
              }}
            >
              <option value="all">All Stock Levels</option>
              <option value="in_stock">In Stock</option>
              <option value="low">Low Stock (1-10)</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
        )}

        {items.length === 0 ? (
          <div className="empty-state">
            <p>No items found. Add your first item to get started.</p>
          </div>
        ) : (() => {
          // Filter inventory items
          const filteredItems = items.filter((item) => {
            const matchesSearch = !inventoryFilters.search || 
              item.name.toLowerCase().includes(inventoryFilters.search.toLowerCase()) ||
              item.barcode.toLowerCase().includes(inventoryFilters.search.toLowerCase());
            const matchesCategory = !inventoryFilters.category || 
              item.category === inventoryFilters.category;
            const matchesStockLevel = 
              inventoryFilters.stockLevel === "all" ||
              (inventoryFilters.stockLevel === "in_stock" && item.stock > 10) ||
              (inventoryFilters.stockLevel === "low" && item.stock > 0 && item.stock <= 10) ||
              (inventoryFilters.stockLevel === "out" && item.stock === 0);
            return matchesSearch && matchesCategory && matchesStockLevel;
          });

          // Paginate
          const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
          const startIndex = (inventoryPage - 1) * itemsPerPage;
          const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

          return (
            <>
              {filteredItems.length > 0 ? (
                <>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center", 
                    marginBottom: "15px",
                    fontSize: "14px",
                    color: "var(--text-secondary)"
                  }}>
                    <span>Showing {paginatedItems.length} of {filteredItems.length} items</span>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Barcode</th>
                        <th>Name</th>
                        <th>Sell Price</th>
                        <th>Base Price</th>
                        <th>Profit/Unit</th>
                        <th>Category</th>
                        <th>Stock</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedItems.map((item) => {
                        const basePrice = item.base_price || 0;
                        const profit = parseFloat(item.price) - basePrice;
                        const profitPercent = item.price > 0 ? (profit / parseFloat(item.price) * 100) : 0;
                        return (
                          <tr key={item.id}>
                            <td>{item.barcode}</td>
                            <td>{item.name}</td>
                            <td>MMK {formatCurrency(item.price)}</td>
                            <td>{basePrice > 0 ? `MMK ${formatCurrency(basePrice)}` : "-"}</td>
                            <td>
                              {basePrice > 0 ? (
                                <span style={{ 
                                  color: profit >= 0 ? "#16a34a" : "#dc2626",
                                  fontWeight: "600"
                                }}>
                                  MMK {formatCurrency(profit)} ({profitPercent.toFixed(1)}%)
                                </span>
                              ) : (
                                <span style={{ color: "#666" }}>-</span>
                              )}
                            </td>
                            <td>{item.category || "-"}</td>
                            <td>{item.stock}</td>
                            <td>
                              <button
                                className="btn btn-secondary"
                                onClick={() => handleEdit(item)}
                                style={{ padding: "5px 10px", fontSize: "12px" }}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-danger"
                                onClick={() => handleDelete(item.id)}
                                style={{ padding: "5px 10px", fontSize: "12px" }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "center", 
                      alignItems: "center", 
                      gap: "10px", 
                      marginTop: "15px" 
                    }}>
                      <button
                        onClick={() => setInventoryPage(Math.max(1, inventoryPage - 1))}
                        disabled={inventoryPage === 1}
                        className="btn btn-secondary"
                        style={{
                          padding: "6px 12px",
                          opacity: inventoryPage === 1 ? 0.5 : 1,
                          cursor: inventoryPage === 1 ? "not-allowed" : "pointer"
                        }}
                      >
                        Previous
                      </button>
                      <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                        Page {inventoryPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setInventoryPage(Math.min(totalPages, inventoryPage + 1))}
                        disabled={inventoryPage === totalPages}
                        className="btn btn-secondary"
                        style={{
                          padding: "6px 12px",
                          opacity: inventoryPage === totalPages ? 0.5 : 1,
                          cursor: inventoryPage === totalPages ? "not-allowed" : "pointer"
                        }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ 
                  padding: "20px", 
                  textAlign: "center", 
                  color: "var(--text-secondary)",
                  background: "var(--bg-secondary)",
                  borderRadius: "8px"
                }}>
                  No items match the current filters
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Category Management */}
      {user?.role === "admin" && (
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h2>Category Management</h2>
            <button
              className="btn btn-primary"
              onClick={() => {
                setCategoryFormData({ name: "", description: "" });
                setShowCategoryModal(true);
                setError("");
                setSuccess("");
              }}
            >
              Add New Category
            </button>
          </div>

          {categories.length === 0 ? (
            <div className="empty-state">
              <p>No categories found. Create your first category.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>Description</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td>
                      <strong>{cat.name}</strong>
                    </td>
                    <td>{cat.description || "-"}</td>
                    <td>{new Date(cat.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteCategory(cat.id)}
                        style={{ padding: "5px 10px", fontSize: "12px" }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2>User Management</h2>
          <button
            className="btn btn-primary"
            onClick={() => {
              setUserFormData({
                username: "",
                password: "",
                role: "cashier",
                fullName: "",
              });
              setShowUserModal(true);
              setError("");
              setSuccess("");
            }}
          >
            Register New User
          </button>
        </div>

        {users.length === 0 ? (
          <div className="empty-state">
            <p>No users found.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Role</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.full_name || "-"}</td>
                  <td>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "600",
                        background: u.role === "admin" ? "#dbeafe" : "#f3f4f6",
                        color: u.role === "admin" ? "#1e40af" : "#374151",
                      }}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    {u.id !== user?.id && (
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteUser(u.id)}
                        style={{ padding: "5px 10px", fontSize: "12px" }}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Database Access */}
      {user?.role === "admin" && (
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h2>Database Access</h2>
          </div>
          <div
            style={{
              padding: "15px",
              background: "var(--bg-secondary)",
              borderRadius: "8px",
              marginBottom: "15px",
            }}
          >
            <p style={{ margin: "0 0 10px 0", color: "var(--text-secondary)" }}>
              <strong>Database Location:</strong> The SQLite database file is stored on the server at:
            </p>
            <code
              style={{
                display: "block",
                padding: "10px",
                background: "var(--bg-primary)",
                borderRadius: "4px",
                fontSize: "12px",
                color: "var(--accent-color)",
                marginBottom: "15px",
                wordBreak: "break-all",
              }}
            >
              server/grocery_store.db
            </code>
            <div style={{ marginBottom: "15px" }}>
              <strong>How to Access:</strong>
              <ul style={{ margin: "10px 0", paddingLeft: "20px", color: "var(--text-secondary)" }}>
                <li>
                  <strong>Via Admin Panel:</strong> Download the database file directly using the button below
                </li>
                <li>
                  <strong>Via SSH:</strong> Connect to your server via SSH and navigate to the project directory
                </li>
                <li>
                  <strong>Via FTP/SFTP:</strong> Use FileZilla or similar tools to access the server files
                </li>
                <li>
                  <strong>Via Hosting Panel:</strong> Most hosting providers offer file manager access
                </li>
              </ul>
            </div>
            <button
              className="btn btn-primary"
              onClick={async () => {
                try {
                  const token = localStorage.getItem("token");
                  const response = await fetch("/api/database/download", {
                    method: "GET",
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  });

                  if (!response.ok) {
                    throw new Error("Failed to download database");
                  }

                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `grocery_store_${new Date().toISOString().split("T")[0]}.db`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                  setSuccess("Database file downloaded successfully");
                } catch (err) {
                  setError(err.response?.data?.error || "Failed to download database");
                }
              }}
            >
              📥 Download Database File
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2>Database Backups</h2>
          <div>
            <button
              className="btn btn-primary"
              onClick={handleCreateBackup}
              disabled={backupLoading}
              style={{ marginRight: "8px" }}
            >
              {backupLoading ? "Creating..." : "Create Backup Now"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleCleanupBackups}
              disabled={backupLoading}
            >
              Cleanup Old Backups
            </button>
          </div>
        </div>

        <div
          style={{
            marginBottom: "16px",
            padding: "12px",
            background: "var(--bg-secondary)",
            borderRadius: "6px",
            fontSize: "13px",
          }}
        >
          <strong>Automated Backups:</strong> Daily backups run automatically at
          2:00 AM. Old backups are cleaned up weekly (keeps last 30 backups).
        </div>

        {backups.length === 0 ? (
          <div className="empty-state">
            <p>No backups found. Create your first backup now.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Backup File</th>
                <th>Size</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup, index) => (
                <tr key={index}>
                  <td>
                    <code style={{ fontSize: "12px" }}>{backup.filename}</code>
                  </td>
                  <td>{backup.sizeMB} MB</td>
                  <td>{new Date(backup.created).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button className="close-btn" onClick={() => setShowModal(false)}>
                &times;
              </button>
              <h2>{editingItem ? "Edit Item" : "Add New Item"}</h2>
              <p>Scan barcode with camera, USB scanner, or enter manually</p>
            </div>
            <form onSubmit={handleSubmit}>
              <div
                style={{
                  marginBottom: "20px",
                  padding: "15px",
                  background: "#f8f9fa",
                  borderRadius: "5px",
                }}
              >
                <h3 style={{ marginTop: 0, fontSize: "16px" }}>
                  📷 Camera Scanner
                </h3>
                <BarcodeScanner
                  onScan={handleCameraScan}
                  onError={(err) => {
                    if (
                      err &&
                      !err.includes("NotFoundException") &&
                      !err.includes("No MultiFormat")
                    ) {
                      setError(`Scanner error: ${err}`);
                    }
                  }}
                />
              </div>
              <div className="form-group">
                <label>Barcode *</label>
                <input
                  ref={barcodeInputRef}
                  type="text"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleInputChange}
                  onKeyPress={handleBarcodeScan}
                  placeholder="Or scan with USB scanner / type and press Enter"
                  required
                  autoFocus
                />
                <small style={{ color: "#666", fontSize: "12px" }}>
                  💡 Tip: Use USB scanner, camera scanner above, or type
                  manually
                </small>
              </div>
              <div className="form-group">
                <label>Item Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Sell Price *</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  required
                  placeholder="Price to sell to customers"
                />
              </div>
              <div className="form-group">
                <label>Base Price (Cost/Import Price)</label>
                <input
                  type="number"
                  name="base_price"
                  value={formData.base_price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="Price you paid to buy/import"
                />
                {formData.price && formData.base_price && (
                  <small style={{ color: "#666", fontSize: "12px", display: "block", marginTop: "4px" }}>
                    💰 Profit per unit: MMK {formatCurrency(parseFloat(formData.price) - parseFloat(formData.base_price || 0))} 
                    ({((parseFloat(formData.price) - parseFloat(formData.base_price || 0)) / parseFloat(formData.price) * 100).toFixed(1)}%)
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>Category</label>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "flex-start",
                  }}
                >
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    style={{ flex: 1 }}
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {user?.role === "admin" && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowCategoryModal(true)}
                      style={{ padding: "10px 15px", whiteSpace: "nowrap" }}
                    >
                      + New
                    </button>
                  )}
                </div>
                {user?.role === "admin" && (
                  <div
                    style={{ marginTop: "8px", display: "flex", gap: "8px" }}
                  >
                    <input
                      type="text"
                      placeholder="Or type new category name"
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleQuickAddCategory();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        border: "1px solid var(--border-color)",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleQuickAddCategory}
                      disabled={!newCategoryInput.trim()}
                      style={{ padding: "8px 15px" }}
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Stock Quantity</label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading
                  ? "Saving..."
                  : editingItem
                  ? "Update Item"
                  : "Add Item"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="modal" onClick={() => setShowUserModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button
                className="close-btn"
                onClick={() => setShowUserModal(false)}
              >
                &times;
              </button>
              <h2>Register New User</h2>
            </div>
            <form onSubmit={handleUserSubmit}>
              <div className="form-group">
                <label>Username *</label>
                <input
                  type="text"
                  name="username"
                  value={userFormData.username}
                  onChange={(e) =>
                    setUserFormData({
                      ...userFormData,
                      username: e.target.value,
                    })
                  }
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  name="password"
                  value={userFormData.password}
                  onChange={(e) =>
                    setUserFormData({
                      ...userFormData,
                      password: e.target.value,
                    })
                  }
                  required
                  minLength="6"
                />
              </div>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={userFormData.fullName}
                  onChange={(e) =>
                    setUserFormData({
                      ...userFormData,
                      fullName: e.target.value,
                    })
                  }
                  placeholder="Optional"
                />
              </div>
              <div className="form-group">
                <label>Role *</label>
                <select
                  name="role"
                  value={userFormData.role}
                  onChange={(e) =>
                    setUserFormData({ ...userFormData, role: e.target.value })
                  }
                  required
                >
                  <option value="cashier">Cashier</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create User"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowUserModal(false)}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="modal" onClick={() => setShowCategoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button
                className="close-btn"
                onClick={() => setShowCategoryModal(false)}
              >
                &times;
              </button>
              <h2>Create New Category</h2>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateCategory();
              }}
            >
              <div className="form-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  name="name"
                  value={categoryFormData.name}
                  onChange={(e) =>
                    setCategoryFormData({
                      ...categoryFormData,
                      name: e.target.value,
                    })
                  }
                  required
                  autoFocus
                  placeholder="e.g., Fruits & Vegetables"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  name="description"
                  value={categoryFormData.description}
                  onChange={(e) =>
                    setCategoryFormData({
                      ...categoryFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Optional description"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Category"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCategoryModal(false)}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
