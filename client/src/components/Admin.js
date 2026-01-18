import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import BarcodeScanner from "./BarcodeScanner";
import Sidebar from "./Sidebar";

// Format number with commas and no decimals
const formatCurrency = (value) => {
  return Math.round(parseFloat(value) || 0).toLocaleString("en-US");
};

const TrashIcon = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M9 3h6m-8 4h10m-9 0 1 14h6l1-14M10 11v7m4-7v7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function Admin() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showItemDetailsModal, setShowItemDetailsModal] = useState(false);
  const [openItemMenuId, setOpenItemMenuId] = useState(null);
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
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
  });
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [openCategoryMenuId, setOpenCategoryMenuId] = useState(null);

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

  // Transactions for Reports view
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionFilters, setTransactionFilters] = useState({
    search: "",
    dateFrom: "",
    dateTo: "",
  });
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  // View state - must be declared before useEffect hooks that use it
  const [currentView, setCurrentView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "null");
    setUser(userData);
    fetchItems();
    fetchCategories();
    if (userData?.role === "admin") {
      fetchBackups();
      fetchUsers();
      fetchStatistics();
      fetchTransactions();
    }
  }, []);

  // Fetch transactions when reports view is active
  useEffect(() => {
    if (currentView === "reports" && user?.role === "admin") {
      fetchTransactions();
    }
  }, [currentView]);

  useEffect(() => {
    if (openItemMenuId === null) return;

    const handleOutsideClick = (event) => {
      const menuRoot = event.target.closest("[data-inventory-item-menu]");
      if (!menuRoot) {
        setOpenItemMenuId(null);
        return;
      }

      const menuId = menuRoot.getAttribute("data-inventory-item-menu");
      if (menuId !== String(openItemMenuId)) setOpenItemMenuId(null);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [openItemMenuId]);

  useEffect(() => {
    if (openCategoryMenuId === null) return;

    const handleOutsideClick = (event) => {
      const menuRoot = event.target.closest("[data-category-menu]");
      if (!menuRoot) {
        setOpenCategoryMenuId(null);
        return;
      }

      const menuId = menuRoot.getAttribute("data-category-menu");
      if (menuId !== String(openCategoryMenuId)) setOpenCategoryMenuId(null);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [openCategoryMenuId]);

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
        "Delete old backups? This will keep only the 30 most recent backups.",
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

  const fetchTransactions = async () => {
    setTransactionsLoading(true);
    try {
      const response = await api.get("/transactions");
      setTransactions(response.data || []);
    } catch (err) {
      setError("Failed to fetch transactions");
    } finally {
      setTransactionsLoading(false);
    }
  };

  const fetchTransactionDetails = async (transactionId) => {
    try {
      const response = await api.get(`/transactions/${transactionId}`);
      setSelectedTransaction(response.data);
      setShowTransactionModal(true);
    } catch (err) {
      setError("Failed to fetch transaction details");
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

  const handleViewItemDetails = (item) => {
    setSelectedItem(item);
    setShowItemDetailsModal(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/admin-login");
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setFormData({
      barcode: "",
      name: "",
      price: "",
      base_price: "",
      category: "",
      stock: "",
    });
    setShowModal(true);
    setError("");
    setSuccess("");
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };

  const handleSaveCategory = async () => {
    if (!categoryFormData.name.trim()) {
      setError("Category name is required");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, categoryFormData);
        setSuccess("Category updated successfully");
      } else {
        await api.post("/categories", categoryFormData);
        setSuccess("Category created successfully");
      }
      setCategoryFormData({ name: "", description: "" });
      setEditingCategory(null);
      setShowCategoryModal(false);
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save category");
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name || "",
      description: category.description || "",
    });
    setShowCategoryModal(true);
    setError("");
    setSuccess("");
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm("Are you sure you want to delete this category?")) {
      return;
    }

    try {
      await api.delete(`/categories/${categoryId}`);
      setSuccess("Category deleted successfully");
      if (editingCategory?.id === categoryId) {
        setEditingCategory(null);
        setCategoryFormData({ name: "", description: "" });
        setShowCategoryModal(false);
      }
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
    <div className="app-layout">
      <Sidebar
        user={user}
        onLogout={handleLogout}
        currentView={currentView}
        onViewChange={setCurrentView}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main-content">
        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <span></span>
        </button>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Dashboard View */}
        {currentView === "dashboard" && user?.role === "admin" && (
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
                  className="stats-grid"
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
                    <div style={{ fontSize: "12px", opacity: 0.9 }}>
                      In Stock
                    </div>
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
                    className="sales-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(150px, 1fr))",
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
                        MMK{" "}
                        {formatCurrency(statistics.today?.total_revenue || 0)}
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
                        MMK{" "}
                        {formatCurrency(statistics.today?.avg_transaction || 0)}
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
                        MMK{" "}
                        {formatCurrency(statistics.today?.total_profit || 0)}
                      </div>
                    </div>
                  </div>
                  {statistics.profit_30days !== undefined && (
                    <div
                      style={{
                        marginTop: "15px",
                        paddingTop: "15px",
                        borderTop: "1px solid var(--border-color)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text-secondary)",
                          marginBottom: "5px",
                        }}
                      >
                        Total Profit (Last 30 Days)
                      </div>
                      <div
                        style={{
                          fontSize: "20px",
                          fontWeight: "600",
                          color: "#16a34a",
                        }}
                      >
                        MMK {formatCurrency(statistics.profit_30days || 0)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Low Stock Items */}
                {statistics.lowStockItems &&
                  statistics.lowStockItems.length > 0 &&
                  (() => {
                    // Filter low stock items
                    const filteredLowStock = statistics.lowStockItems.filter(
                      (item) => {
                        const matchesSearch =
                          !lowStockFilters.search ||
                          item.name
                            .toLowerCase()
                            .includes(lowStockFilters.search.toLowerCase()) ||
                          item.barcode
                            .toLowerCase()
                            .includes(lowStockFilters.search.toLowerCase());
                        const matchesCategory =
                          !lowStockFilters.category ||
                          item.category === lowStockFilters.category;
                        const matchesStockLevel =
                          lowStockFilters.stockLevel === "all" ||
                          (lowStockFilters.stockLevel === "out" &&
                            item.stock === 0) ||
                          (lowStockFilters.stockLevel === "low" &&
                            item.stock > 0 &&
                            item.stock <= 10);
                        return (
                          matchesSearch && matchesCategory && matchesStockLevel
                        );
                      },
                    );

                    // Paginate
                    const totalPages = Math.ceil(
                      filteredLowStock.length / itemsPerPage,
                    );
                    const startIndex = (lowStockPage - 1) * itemsPerPage;
                    const paginatedLowStock = filteredLowStock.slice(
                      startIndex,
                      startIndex + itemsPerPage,
                    );

                    return (
                      <div style={{ marginBottom: "25px" }}>
                        <div
                          className="section-header"
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "15px",
                            flexWrap: "wrap",
                            gap: "15px",
                          }}
                        >
                          <h3
                            style={{
                              margin: 0,
                              color: "var(--warning-color)",
                            }}
                          >
                            ⚠️ Low Stock Items (Need Refill)
                          </h3>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            Showing {paginatedLowStock.length} of{" "}
                            {filteredLowStock.length} items
                          </div>
                        </div>

                        {/* Filters */}
                        <div
                          className="filter-container"
                          style={{
                            display: "flex",
                            gap: "10px",
                            marginBottom: "15px",
                            flexWrap: "wrap",
                            padding: "15px",
                            background: "var(--bg-secondary)",
                            borderRadius: "8px",
                          }}
                        >
                          <input
                            type="text"
                            placeholder="Search by name or barcode..."
                            value={lowStockFilters.search}
                            onChange={(e) => {
                              setLowStockFilters({
                                ...lowStockFilters,
                                search: e.target.value,
                              });
                              setLowStockPage(1);
                            }}
                            style={{
                              padding: "8px 12px",
                              border: "1px solid var(--border-color)",
                              borderRadius: "6px",
                              fontSize: "14px",
                              flex: "1",
                              minWidth: "200px",
                            }}
                          />
                          <select
                            value={lowStockFilters.category}
                            onChange={(e) => {
                              setLowStockFilters({
                                ...lowStockFilters,
                                category: e.target.value,
                              });
                              setLowStockPage(1);
                            }}
                            style={{
                              padding: "8px 12px",
                              border: "1px solid var(--border-color)",
                              borderRadius: "6px",
                              fontSize: "14px",
                              background: "var(--bg-primary)",
                              color: "var(--text-primary)",
                              minWidth: "150px",
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
                              setLowStockFilters({
                                ...lowStockFilters,
                                stockLevel: e.target.value,
                              });
                              setLowStockPage(1);
                            }}
                            style={{
                              padding: "8px 12px",
                              border: "1px solid var(--border-color)",
                              borderRadius: "6px",
                              fontSize: "14px",
                              background: "var(--bg-primary)",
                              color: "var(--text-primary)",
                              minWidth: "150px",
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
                                  <th className="col-name">Item Name</th>
                                  <th className="col-barcode">Barcode</th>
                                  <th className="col-category">Category</th>
                                  <th className="col-price">Price</th>
                                  <th className="col-stock">Stock Left</th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedLowStock.map((item) => (
                                  <tr key={item.id}>
                                    <td className="col-name">
                                      <strong>{item.name}</strong>
                                    </td>
                                    <td className="col-barcode">
                                      {item.barcode}
                                    </td>
                                    <td className="col-category">
                                      {item.category || "-"}
                                    </td>
                                    <td className="col-price">
                                      MMK {formatCurrency(item.price)}
                                    </td>
                                    <td className="col-stock">
                                      <span
                                        style={{
                                          padding: "4px 8px",
                                          borderRadius: "4px",
                                          fontSize: "12px",
                                          fontWeight: "600",
                                          background:
                                            item.stock === 0
                                              ? "#fed7d7"
                                              : "#feebc8",
                                          color:
                                            item.stock === 0
                                              ? "#c53030"
                                              : "#c05621",
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
                              <div
                                className="pagination-controls"
                                style={{
                                  display: "flex",
                                  justifyContent: "center",
                                  alignItems: "center",
                                  gap: "10px",
                                  marginTop: "8px",
                                }}
                              >
                                <button
                                  onClick={() =>
                                    setLowStockPage(
                                      Math.max(1, lowStockPage - 1),
                                    )
                                  }
                                  disabled={lowStockPage === 1}
                                  className="btn btn-secondary"
                                  style={{
                                    padding: "6px 10px",
                                    opacity: lowStockPage === 1 ? 0.5 : 1,
                                    cursor:
                                      lowStockPage === 1
                                        ? "not-allowed"
                                        : "pointer",
                                  }}
                                >
                                  Previous
                                </button>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    fontSize: "14px",
                                    color: "var(--text-secondary)",
                                  }}
                                >
                                  <span>Page</span>
                                  <input
                                    key={`lowstock-input-${lowStockPage}`}
                                    type="number"
                                    min="1"
                                    max={totalPages}
                                    defaultValue={lowStockPage}
                                    onBlur={(e) => {
                                      const value = e.target.value.trim();
                                      if (value === "") {
                                        e.target.value = lowStockPage;
                                        return;
                                      }
                                      const page = parseInt(value);
                                      if (isNaN(page) || page < 1) {
                                        e.target.value = 1;
                                        setLowStockPage(1);
                                      } else if (page > totalPages) {
                                        e.target.value = totalPages;
                                        setLowStockPage(totalPages);
                                      } else {
                                        e.target.value = page;
                                        setLowStockPage(page);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        const value = e.target.value.trim();
                                        if (value === "") {
                                          e.target.value = lowStockPage;
                                          return;
                                        }
                                        const page = parseInt(value);
                                        if (isNaN(page) || page < 1) {
                                          e.target.value = 1;
                                          setLowStockPage(1);
                                        } else if (page > totalPages) {
                                          e.target.value = totalPages;
                                          setLowStockPage(totalPages);
                                        } else {
                                          e.target.value = page;
                                          setLowStockPage(page);
                                        }
                                        e.target.blur();
                                      }
                                    }}
                                    style={{
                                      width: "60px",
                                      padding: "4px 8px",
                                      border: "1px solid var(--border-color)",
                                      borderRadius: "4px",
                                      fontSize: "14px",
                                      textAlign: "center",
                                      background: "var(--bg-primary)",
                                      color: "var(--text-primary)",
                                    }}
                                  />
                                  <span>of {totalPages}</span>
                                </div>
                                <button
                                  onClick={() =>
                                    setLowStockPage(
                                      Math.min(totalPages, lowStockPage + 1),
                                    )
                                  }
                                  disabled={lowStockPage === totalPages}
                                  className="btn btn-secondary"
                                  style={{
                                    padding: "6px 12px",
                                    opacity:
                                      lowStockPage === totalPages ? 0.5 : 1,
                                    cursor:
                                      lowStockPage === totalPages
                                        ? "not-allowed"
                                        : "pointer",
                                  }}
                                >
                                  Next
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <div
                            style={{
                              padding: "20px",
                              textAlign: "center",
                              color: "var(--text-secondary)",
                              background: "var(--bg-secondary)",
                              borderRadius: "8px",
                            }}
                          >
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

        {/* Inventory View */}
        {currentView === "inventory" && (
          <div className="card">
            <div
              className="section-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <div>
                <h2 style={{ marginBottom: "4px" }}>Inventory Management</h2>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-secondary)",
                    fontSize: "14px",
                  }}
                >
                  {items.length} products
                </p>
              </div>
              <button className="btn btn-purple" onClick={handleAddNew}>
                + Add Product
              </button>
            </div>

            {/* Filters */}
            {items.length > 0 && (
              <div
                className="filter-container"
                style={{
                  display: "flex",
                  gap: "10px",
                  marginBottom: "20px",
                  flexWrap: "wrap",
                  padding: "15px",
                  background: "var(--bg-secondary)",
                  borderRadius: "8px",
                }}
              >
                <input
                  type="text"
                  placeholder="Search by name or barcode..."
                  value={inventoryFilters.search}
                  onChange={(e) => {
                    setInventoryFilters({
                      ...inventoryFilters,
                      search: e.target.value,
                    });
                    setInventoryPage(1);
                  }}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    fontSize: "14px",
                    flex: "1",
                    minWidth: "200px",
                  }}
                />
                <select
                  value={inventoryFilters.category}
                  onChange={(e) => {
                    setInventoryFilters({
                      ...inventoryFilters,
                      category: e.target.value,
                    });
                    setInventoryPage(1);
                  }}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    fontSize: "14px",
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    minWidth: "150px",
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
                    setInventoryFilters({
                      ...inventoryFilters,
                      stockLevel: e.target.value,
                    });
                    setInventoryPage(1);
                  }}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    fontSize: "14px",
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    minWidth: "150px",
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
            ) : (
              (() => {
                // Filter inventory items
                const filteredItems = items.filter((item) => {
                  const matchesSearch =
                    !inventoryFilters.search ||
                    item.name
                      .toLowerCase()
                      .includes(inventoryFilters.search.toLowerCase()) ||
                    item.barcode
                      .toLowerCase()
                      .includes(inventoryFilters.search.toLowerCase());
                  const matchesCategory =
                    !inventoryFilters.category ||
                    item.category === inventoryFilters.category;
                  const matchesStockLevel =
                    inventoryFilters.stockLevel === "all" ||
                    (inventoryFilters.stockLevel === "in_stock" &&
                      item.stock > 10) ||
                    (inventoryFilters.stockLevel === "low" &&
                      item.stock > 0 &&
                      item.stock <= 10) ||
                    (inventoryFilters.stockLevel === "out" && item.stock === 0);
                  return matchesSearch && matchesCategory && matchesStockLevel;
                });

                // Paginate
                const totalPages = Math.ceil(
                  filteredItems.length / itemsPerPage,
                );
                const startIndex = (inventoryPage - 1) * itemsPerPage;
                const paginatedItems = filteredItems.slice(
                  startIndex,
                  startIndex + itemsPerPage,
                );

                return (
                  <>
                    {filteredItems.length > 0 ? (
                      <>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "15px",
                            fontSize: "14px",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <span>
                            Showing {paginatedItems.length} of{" "}
                            {filteredItems.length} items
                          </span>
                        </div>
                        <table>
                          <thead>
                            <tr>
                              <th className="col-barcode">Barcode</th>
                              <th className="col-name">Name</th>
                              <th className="col-price">Sell Price</th>
                              <th className="col-base-price">Base Price</th>
                              <th className="col-profit">Profit/Unit</th>
                              <th className="col-category">Category</th>
                              <th className="col-stock">Stock</th>
                              <th className="col-actions">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedItems.map((item) => {
                              const basePrice = item.base_price || 0;
                              const profit = parseFloat(item.price) - basePrice;
                              const profitPercent =
                                item.price > 0
                                  ? (profit / parseFloat(item.price)) * 100
                                  : 0;
                              return (
                                <tr key={item.id}>
                                  <td className="col-barcode">
                                    {item.barcode}
                                  </td>
                                  <td className="col-name">{item.name}</td>
                                  <td className="col-price">
                                    MMK {formatCurrency(item.price)}
                                  </td>
                                  <td className="col-base-price">
                                    {basePrice > 0
                                      ? `MMK ${formatCurrency(basePrice)}`
                                      : "-"}
                                  </td>
                                  <td className="col-profit">
                                    {basePrice > 0 ? (
                                      <span
                                        style={{
                                          color:
                                            profit >= 0 ? "#16a34a" : "#dc2626",
                                          fontWeight: "600",
                                        }}
                                      >
                                        MMK {formatCurrency(profit)} (
                                        {profitPercent.toFixed(1)}%)
                                      </span>
                                    ) : (
                                      <span style={{ color: "#666" }}>-</span>
                                    )}
                                  </td>
                                  <td className="col-category">
                                    {item.category || "-"}
                                  </td>
                                  <td className="col-stock">{item.stock}</td>
                                  <td className="col-actions">
                                    <div className="inventory-actions-desktop">
                                      <button
                                        className="btn btn-secondary action-btn-edit"
                                        onClick={() => handleEdit(item)}
                                        style={{
                                          padding: "5px 10px",
                                          fontSize: "12px",
                                        }}
                                        title="Edit"
                                      >
                                        <span className="action-btn-text">
                                          Edit
                                        </span>
                                        <span className="action-btn-icon">
                                          ✏️
                                        </span>
                                      </button>
                                      <button
                                        className="btn btn-danger action-btn-delete"
                                        onClick={() => handleDelete(item.id)}
                                        style={{
                                          padding: "5px 10px",
                                          fontSize: "12px",
                                        }}
                                        title="Delete"
                                      >
                                        <span className="action-btn-text">
                                          Delete
                                        </span>
                                        <span className="action-btn-icon">
                                          <TrashIcon />
                                        </span>
                                      </button>
                                    </div>

                                    <div
                                      className="inventory-actions-mobile"
                                      data-inventory-item-menu={item.id}
                                    >
                                      <button
                                        type="button"
                                        className="inventory-actions-menu-btn"
                                        aria-haspopup="menu"
                                        aria-expanded={
                                          openItemMenuId === item.id
                                        }
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenItemMenuId((prev) =>
                                            prev === item.id ? null : item.id,
                                          );
                                        }}
                                        title="Menu"
                                      >
                                        ⋮
                                      </button>

                                      {openItemMenuId === item.id && (
                                        <div
                                          className="inventory-actions-dropdown"
                                          role="menu"
                                        >
                                          <button
                                            type="button"
                                            className="inventory-actions-dropdown-item"
                                            onClick={() => {
                                              setOpenItemMenuId(null);
                                              handleViewItemDetails(item);
                                            }}
                                          >
                                            View item details
                                          </button>
                                          <button
                                            type="button"
                                            className="inventory-actions-dropdown-item"
                                            onClick={() => {
                                              setOpenItemMenuId(null);
                                              handleEdit(item);
                                            }}
                                          >
                                            Edit
                                          </button>
                                          <button
                                            type="button"
                                            className="inventory-actions-dropdown-item danger"
                                            onClick={() => {
                                              setOpenItemMenuId(null);
                                              handleDelete(item.id);
                                            }}
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        {/* Pagination */}
                        {totalPages > 1 && (
                          <div
                            className="pagination-controls"
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              gap: "10px",
                              marginTop: "15px",
                            }}
                          >
                            <button
                              onClick={() =>
                                setInventoryPage(Math.max(1, inventoryPage - 1))
                              }
                              disabled={inventoryPage === 1}
                              className="btn btn-secondary"
                              style={{
                                padding: "6px 10px",
                                opacity: inventoryPage === 1 ? 0.5 : 1,
                                cursor:
                                  inventoryPage === 1
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                            >
                              Previous
                            </button>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                fontSize: "14px",
                                color: "var(--text-secondary)",
                              }}
                            >
                              <span>Page</span>
                              <input
                                key={`inventory-page-${inventoryPage}`}
                                type="number"
                                min="1"
                                max={totalPages}
                                defaultValue={inventoryPage}
                                onBlur={(e) => {
                                  const page = parseInt(e.target.value);
                                  if (
                                    !isNaN(page) &&
                                    page >= 1 &&
                                    page <= totalPages
                                  ) {
                                    setInventoryPage(page);
                                  } else {
                                    e.target.value = inventoryPage;
                                  }
                                }}
                                onKeyPress={(e) => {
                                  if (e.key === "Enter") {
                                    const page = parseInt(e.target.value);
                                    if (
                                      !isNaN(page) &&
                                      page >= 1 &&
                                      page <= totalPages
                                    ) {
                                      setInventoryPage(page);
                                    } else {
                                      e.target.value = inventoryPage;
                                    }
                                    e.target.blur();
                                  }
                                }}
                                style={{
                                  width: "60px",
                                  padding: "4px 8px",
                                  border: "1px solid var(--border-color)",
                                  borderRadius: "4px",
                                  fontSize: "14px",
                                  textAlign: "center",
                                  background: "var(--bg-primary)",
                                  color: "var(--text-primary)",
                                }}
                              />
                              <span>of {totalPages}</span>
                            </div>
                            <button
                              onClick={() =>
                                setInventoryPage(
                                  Math.min(totalPages, inventoryPage + 1),
                                )
                              }
                              disabled={inventoryPage === totalPages}
                              className="btn btn-secondary"
                              style={{
                                padding: "6px 12px",
                                opacity: inventoryPage === totalPages ? 0.5 : 1,
                                cursor:
                                  inventoryPage === totalPages
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div
                        style={{
                          padding: "20px",
                          textAlign: "center",
                          color: "var(--text-secondary)",
                          background: "var(--bg-secondary)",
                          borderRadius: "8px",
                        }}
                      >
                        No items match the current filters
                      </div>
                    )}
                  </>
                );
              })()
            )}
          </div>
        )}

        {/* Category Management - Show in inventory view */}
        {currentView === "inventory" && user?.role === "admin" && (
          <div className="card">
            <div
              className="section-header"
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
                  setEditingCategory(null);
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
                    <th className="col-created">Created</th>
                    <th className="col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.id}>
                      <td>
                        <strong>{cat.name}</strong>
                      </td>
                      <td>{cat.description || "-"}</td>
                      <td className="col-created">
                        {new Date(cat.created_at).toLocaleDateString()}
                      </td>
                      <td className="col-actions">
                        <div
                          className="category-actions-menu"
                          data-category-menu={cat.id}
                        >
                          <button
                            type="button"
                            className="inventory-actions-menu-btn"
                            aria-haspopup="menu"
                            aria-expanded={openCategoryMenuId === cat.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenCategoryMenuId((prev) =>
                                prev === cat.id ? null : cat.id,
                              );
                            }}
                            title="Menu"
                          >
                            ⋮
                          </button>
                          {openCategoryMenuId === cat.id && (
                            <div
                              className="inventory-actions-dropdown"
                              role="menu"
                            >
                              <button
                                type="button"
                                className="inventory-actions-dropdown-item"
                                onClick={() => {
                                  setOpenCategoryMenuId(null);
                                  handleEditCategory(cat);
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="inventory-actions-dropdown-item danger"
                                onClick={() => {
                                  setOpenCategoryMenuId(null);
                                  handleDeleteCategory(cat.id);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* User Management - Show in inventory view */}
        {currentView === "inventory" && user?.role === "admin" && (
          <div className="card">
            <div
              className="section-header"
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
                    <th className="col-created">Created</th>
                    <th className="col-actions">Actions</th>
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
                            background:
                              u.role === "admin" ? "#dbeafe" : "#f3f4f6",
                            color: u.role === "admin" ? "#1e40af" : "#374151",
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="col-created">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="col-actions">
                        {u.id !== user?.id && (
                          <button
                            className="btn btn-danger action-btn-delete"
                            onClick={() => handleDeleteUser(u.id)}
                            style={{ padding: "5px 10px", fontSize: "12px" }}
                            title="Delete"
                          >
                            <span className="action-btn-text">Delete</span>
                            <span className="action-btn-icon">
                              <TrashIcon />
                            </span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Reports View */}
        {currentView === "reports" && user?.role === "admin" && (
          <div className="card">
            <div className="section-header" style={{ marginBottom: "20px" }}>
              <div>
                <h2>Sales Reports</h2>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "14px",
                    marginTop: "4px",
                  }}
                >
                  View all sales transactions and details
                </p>
              </div>
              <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                Total: {transactions.length} transactions
              </div>
            </div>

            {/* Filters */}
            <div
              className="filter-container"
              style={{
                display: "flex",
                gap: "10px",
                marginBottom: "20px",
                flexWrap: "wrap",
                padding: "15px",
                background: "var(--bg-secondary)",
                borderRadius: "8px",
              }}
            >
              <input
                type="text"
                placeholder="Search by transaction ID..."
                value={transactionFilters.search}
                onChange={(e) => {
                  setTransactionFilters({
                    ...transactionFilters,
                    search: e.target.value,
                  });
                  setTransactionPage(1);
                }}
                style={{
                  padding: "8px 12px",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  fontSize: "14px",
                  flex: "1",
                  minWidth: "200px",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                }}
              />
              <input
                type="date"
                placeholder="From Date"
                value={transactionFilters.dateFrom}
                onChange={(e) => {
                  setTransactionFilters({
                    ...transactionFilters,
                    dateFrom: e.target.value,
                  });
                  setTransactionPage(1);
                }}
                style={{
                  padding: "8px 12px",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  fontSize: "14px",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  minWidth: "150px",
                }}
              />
              <input
                type="date"
                placeholder="To Date"
                value={transactionFilters.dateTo}
                onChange={(e) => {
                  setTransactionFilters({
                    ...transactionFilters,
                    dateTo: e.target.value,
                  });
                  setTransactionPage(1);
                }}
                style={{
                  padding: "8px 12px",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  fontSize: "14px",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  minWidth: "150px",
                }}
              />
              {(transactionFilters.search ||
                transactionFilters.dateFrom ||
                transactionFilters.dateTo) && (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setTransactionFilters({
                      search: "",
                      dateFrom: "",
                      dateTo: "",
                    });
                    setTransactionPage(1);
                  }}
                  style={{ padding: "8px 16px" }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Transactions Table */}
            {transactionsLoading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px",
                  color: "var(--text-secondary)",
                }}
              >
                Loading transactions...
              </div>
            ) : (
              (() => {
                // Filter transactions
                const filteredTransactions = transactions.filter(
                  (transaction) => {
                    const matchesSearch =
                      !transactionFilters.search ||
                      transaction.transaction_id
                        .toLowerCase()
                        .includes(transactionFilters.search.toLowerCase());

                    const transactionDate = new Date(transaction.created_at);
                    const matchesDateFrom =
                      !transactionFilters.dateFrom ||
                      transactionDate >= new Date(transactionFilters.dateFrom);
                    const matchesDateTo =
                      !transactionFilters.dateTo ||
                      transactionDate <=
                        new Date(transactionFilters.dateTo + "T23:59:59");

                    return matchesSearch && matchesDateFrom && matchesDateTo;
                  },
                );

                // Paginate
                const totalPages = Math.ceil(
                  filteredTransactions.length / itemsPerPage,
                );
                const startIndex = (transactionPage - 1) * itemsPerPage;
                const paginatedTransactions = filteredTransactions.slice(
                  startIndex,
                  startIndex + itemsPerPage,
                );

                return (
                  <>
                    {filteredTransactions.length > 0 ? (
                      <>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "15px",
                            fontSize: "14px",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <span>
                            Showing {paginatedTransactions.length} of{" "}
                            {filteredTransactions.length} transactions
                          </span>
                        </div>
                        <table>
                          <thead>
                            <tr>
                              <th className="col-transaction-id">
                                Transaction ID
                              </th>
                              <th className="col-date">Date & Time</th>
                              <th className="col-items">Items</th>
                              <th className="col-amount">Total Amount</th>
                              <th className="col-actions">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedTransactions.map((transaction) => (
                              <tr key={transaction.id}>
                                <td className="col-transaction-id">
                                  <code
                                    style={{
                                      fontSize: "12px",
                                      background: "var(--bg-secondary)",
                                      padding: "4px 8px",
                                      borderRadius: "4px",
                                      color: "var(--accent-color)",
                                    }}
                                  >
                                    {transaction.transaction_id}
                                  </code>
                                </td>
                                <td className="col-date">
                                  {new Date(
                                    transaction.created_at,
                                  ).toLocaleString()}
                                </td>
                                <td className="col-items">
                                  {transaction.item_count || 0} item(s)
                                </td>
                                <td
                                  className="col-amount"
                                  style={{
                                    fontWeight: "600",
                                    color: "var(--success-color)",
                                  }}
                                >
                                  MMK {formatCurrency(transaction.total_amount)}
                                </td>
                                <td className="col-actions">
                                  <button
                                    className="btn btn-secondary"
                                    onClick={() =>
                                      fetchTransactionDetails(
                                        transaction.transaction_id,
                                      )
                                    }
                                    style={{
                                      padding: "5px 10px",
                                      fontSize: "12px",
                                    }}
                                  >
                                    <span className="action-btn-text">
                                      View Details
                                    </span>
                                    <span className="action-btn-icon">👁️</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Pagination */}
                        {totalPages > 1 && (
                          <div
                            className="pagination-controls"
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              gap: "10px",
                              marginTop: "15px",
                            }}
                          >
                            <button
                              onClick={() =>
                                setTransactionPage(
                                  Math.max(1, transactionPage - 1),
                                )
                              }
                              disabled={transactionPage === 1}
                              className="btn btn-secondary"
                              style={{
                                padding: "6px 10px",
                                opacity: transactionPage === 1 ? 0.5 : 1,
                                cursor:
                                  transactionPage === 1
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                            >
                              Previous
                            </button>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                fontSize: "14px",
                                color: "var(--text-secondary)",
                              }}
                            >
                              <span>Page</span>
                              <input
                                key={`transaction-page-${transactionPage}`}
                                type="number"
                                min="1"
                                max={totalPages}
                                defaultValue={transactionPage}
                                onBlur={(e) => {
                                  const page = parseInt(e.target.value);
                                  if (
                                    !isNaN(page) &&
                                    page >= 1 &&
                                    page <= totalPages
                                  ) {
                                    setTransactionPage(page);
                                  } else {
                                    e.target.value = transactionPage;
                                  }
                                }}
                                onKeyPress={(e) => {
                                  if (e.key === "Enter") {
                                    const page = parseInt(e.target.value);
                                    if (
                                      !isNaN(page) &&
                                      page >= 1 &&
                                      page <= totalPages
                                    ) {
                                      setTransactionPage(page);
                                    } else {
                                      e.target.value = transactionPage;
                                    }
                                    e.target.blur();
                                  }
                                }}
                                style={{
                                  width: "60px",
                                  padding: "4px 8px",
                                  border: "1px solid var(--border-color)",
                                  borderRadius: "4px",
                                  fontSize: "14px",
                                  textAlign: "center",
                                  background: "var(--bg-primary)",
                                  color: "var(--text-primary)",
                                }}
                              />
                              <span>of {totalPages}</span>
                            </div>
                            <button
                              onClick={() =>
                                setTransactionPage(
                                  Math.min(totalPages, transactionPage + 1),
                                )
                              }
                              disabled={transactionPage === totalPages}
                              className="btn btn-secondary"
                              style={{
                                padding: "6px 12px",
                                opacity:
                                  transactionPage === totalPages ? 0.5 : 1,
                                cursor:
                                  transactionPage === totalPages
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div
                        style={{
                          padding: "40px",
                          textAlign: "center",
                          color: "var(--text-secondary)",
                          background: "var(--bg-secondary)",
                          borderRadius: "8px",
                        }}
                      >
                        {transactions.length === 0
                          ? "No transactions found. Transactions will appear here after cashiers complete sales."
                          : "No transactions match the current filters."}
                      </div>
                    )}
                  </>
                );
              })()
            )}
          </div>
        )}

        {/* Database Access - Show in inventory view */}
        {currentView === "inventory" && user?.role === "admin" && (
          <div className="card desktop-only">
            <div
              className="section-header"
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
              <p
                style={{ margin: "0 0 10px 0", color: "var(--text-secondary)" }}
              >
                <strong>Database Location:</strong> The SQLite database file is
                stored on the server at:
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
                <ul
                  style={{
                    margin: "10px 0",
                    paddingLeft: "20px",
                    color: "var(--text-secondary)",
                  }}
                >
                  <li>
                    <strong>Via Admin Panel:</strong> Download the database file
                    directly using the button below
                  </li>
                  <li>
                    <strong>Via SSH:</strong> Connect to your server via SSH and
                    navigate to the project directory
                  </li>
                  <li>
                    <strong>Via FTP/SFTP:</strong> Use FileZilla or similar
                    tools to access the server files
                  </li>
                  <li>
                    <strong>Via Hosting Panel:</strong> Most hosting providers
                    offer file manager access
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
                    a.download = `grocery_store_${
                      new Date().toISOString().split("T")[0]
                    }.db`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    setSuccess("Database file downloaded successfully");
                  } catch (err) {
                    setError(
                      err.response?.data?.error ||
                        "Failed to download database",
                    );
                  }
                }}
              >
                📥 Download Database File
              </button>
            </div>
          </div>
        )}

        {/* Database Backups - Show in inventory view */}
        {currentView === "inventory" && user?.role === "admin" && (
          <div className="card desktop-only">
            <div
              className="section-header"
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
              <strong>Automated Backups:</strong> Daily backups run
              automatically at 2:00 AM. Old backups are cleaned up weekly (keeps
              last 30 backups).
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
                        <code style={{ fontSize: "12px" }}>
                          {backup.filename}
                        </code>
                      </td>
                      <td>{backup.sizeMB} MB</td>
                      <td>{new Date(backup.created).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modals - Outside main-content but inside app-layout */}
      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div
            className="modal-content item-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="item-modal-header">
              <div>
                <h2 className="item-modal-title">
                  {editingItem ? "Edit Item" : "Add New Item"}
                </h2>
                <p className="item-modal-subtitle">
                  Scan first, then fill the details and save.
                </p>
              </div>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="item-modal-form">
              <div className="item-modal-grid">
                <div className="item-modal-panel">
                  <div className="item-modal-panel-header">
                    <div className="item-modal-step">Step 1</div>
                    <div className="item-modal-panel-title">Scan Barcode</div>
                    <div className="item-modal-panel-subtitle">
                      Camera, photo, or USB scanner.
                    </div>
                  </div>

                  <div className="item-modal-barcode">
                    <label>Barcode *</label>
                    <div className="item-modal-barcode-row">
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        name="barcode"
                        value={formData.barcode}
                        onChange={handleInputChange}
                        onKeyPress={handleBarcodeScan}
                        placeholder="Scan with USB scanner, or type and press Enter"
                        required
                        autoFocus
                      />
                      <div
                        className={
                          formData.barcode
                            ? "item-modal-chip success"
                            : "item-modal-chip"
                        }
                      >
                        {formData.barcode ? "Captured" : "Waiting"}
                      </div>
                    </div>
                    <small className="form-tip">
                      Tip: after scanning, focus moves to Item Name.
                    </small>
                  </div>

                  <div className="item-modal-scanner">
                    <BarcodeScanner
                      title="Camera Scanner"
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
                </div>

                <div className="item-modal-panel">
                  <div className="item-modal-panel-header">
                    <div className="item-modal-step">Step 2</div>
                    <div className="item-modal-panel-title">Item Details</div>
                    <div className="item-modal-panel-subtitle">
                      Name, price, category, stock.
                    </div>
                  </div>

                  <div className="item-modal-fields">
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

                    <div className="item-modal-two-col">
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
                          placeholder="Price to sell"
                        />
                      </div>

                      <div className="form-group">
                        <label>Base Price</label>
                        <input
                          type="number"
                          name="base_price"
                          value={formData.base_price}
                          onChange={handleInputChange}
                          step="0.01"
                          min="0"
                          placeholder="Cost/import price"
                        />
                      </div>
                    </div>

                    {formData.price && formData.base_price && (
                      <div className="item-modal-metrics">
                        <div className="item-modal-metric">
                          <div className="item-modal-metric-label">
                            Profit / unit
                          </div>
                          <div className="item-modal-metric-value">
                            MMK{" "}
                            {formatCurrency(
                              parseFloat(formData.price) -
                                parseFloat(formData.base_price || 0),
                            )}
                          </div>
                        </div>
                        <div className="item-modal-metric">
                          <div className="item-modal-metric-label">Margin</div>
                          <div className="item-modal-metric-value">
                            {(
                              ((parseFloat(formData.price) -
                                parseFloat(formData.base_price || 0)) /
                                parseFloat(formData.price)) *
                              100
                            ).toFixed(1)}
                            %
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="form-group">
                      <label>Category</label>
                      <div className="item-modal-category-row">
                        <select
                          name="category"
                          value={formData.category}
                          onChange={handleInputChange}
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
                          >
                            + New
                          </button>
                        )}
                      </div>

                      {user?.role === "admin" && (
                        <div className="item-modal-category-quickadd">
                          <input
                            type="text"
                            placeholder="Quick add category"
                            value={newCategoryInput}
                            onChange={(e) =>
                              setNewCategoryInput(e.target.value)
                            }
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleQuickAddCategory();
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleQuickAddCategory}
                            disabled={!newCategoryInput.trim()}
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
                  </div>
                </div>
              </div>

              <div className="item-modal-footer">
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
              </div>
            </form>
          </div>
        </div>
      )}

      {showItemDetailsModal && selectedItem && (
        <div className="modal" onClick={() => setShowItemDetailsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button
                className="close-btn"
                onClick={() => setShowItemDetailsModal(false)}
              >
                &times;
              </button>
              <h2>Item Details</h2>
              <p>{selectedItem.name}</p>
            </div>
            <div style={{ padding: "20px" }}>
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label>Barcode</label>
                <div style={{ fontWeight: 600 }}>{selectedItem.barcode}</div>
              </div>
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label>Sell Price</label>
                <div style={{ fontWeight: 600 }}>
                  MMK {formatCurrency(selectedItem.price)}
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label>Base Price</label>
                <div style={{ fontWeight: 600 }}>
                  {selectedItem.base_price
                    ? `MMK ${formatCurrency(selectedItem.base_price)}`
                    : "-"}
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label>Category</label>
                <div style={{ fontWeight: 600 }}>
                  {selectedItem.category || "-"}
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: "0" }}>
                <label>Stock</label>
                <div style={{ fontWeight: 600 }}>{selectedItem.stock}</div>
              </div>
            </div>
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
              <h2>
                {editingCategory ? "Edit Category" : "Create New Category"}
              </h2>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveCategory();
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
                {loading
                  ? "Saving..."
                  : editingCategory
                    ? "Update Category"
                    : "Create Category"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategory(null);
                  setCategoryFormData({ name: "", description: "" });
                }}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {showTransactionModal && selectedTransaction && (
        <div
          className="modal"
          onClick={() => {
            setShowTransactionModal(false);
            setSelectedTransaction(null);
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "700px" }}
          >
            <div className="modal-header">
              <button
                className="close-btn"
                onClick={() => {
                  setShowTransactionModal(false);
                  setSelectedTransaction(null);
                }}
              >
                &times;
              </button>
              <h2>Transaction Details</h2>
              <p>
                Transaction ID:{" "}
                <code
                  style={{
                    fontSize: "12px",
                    background: "var(--bg-secondary)",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    color: "var(--accent-color)",
                  }}
                >
                  {selectedTransaction.transaction_id}
                </code>
              </p>
            </div>
            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "15px",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      marginBottom: "5px",
                    }}
                  >
                    Date & Time
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "500" }}>
                    {new Date(selectedTransaction.created_at).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      marginBottom: "5px",
                    }}
                  >
                    Total Amount
                  </div>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: "600",
                      color: "var(--success-color)",
                    }}
                  >
                    MMK {formatCurrency(selectedTransaction.total_amount)}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      marginBottom: "5px",
                    }}
                  >
                    Items Count
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "500" }}>
                    {selectedTransaction.items?.length || 0} item(s)
                  </div>
                </div>
              </div>

              <h3 style={{ marginBottom: "15px", fontSize: "16px" }}>
                Items Sold
              </h3>
              {selectedTransaction.items &&
              selectedTransaction.items.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Barcode</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTransaction.items.map((item, index) => (
                      <tr key={index}>
                        <td>{item.item_name}</td>
                        <td>
                          <code style={{ fontSize: "11px" }}>
                            {item.barcode}
                          </code>
                        </td>
                        <td>{item.quantity}</td>
                        <td>MMK {formatCurrency(item.unit_price)}</td>
                        <td style={{ fontWeight: "600" }}>
                          MMK {formatCurrency(item.total_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p
                  style={{
                    color: "var(--text-secondary)",
                    textAlign: "center",
                    padding: "20px",
                  }}
                >
                  No items found in this transaction
                </p>
              )}
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowTransactionModal(false);
                setSelectedTransaction(null);
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
