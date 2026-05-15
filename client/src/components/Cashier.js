import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { playScanSuccess, playScanError } from "../utils/sounds";
import BarcodeScanner from "./BarcodeScanner";
import Sidebar from "./Sidebar";

// Format number with commas and no decimals
const formatCurrency = (value) => {
  return Math.round(parseFloat(value) || 0).toLocaleString("en-US");
};

function Cashier() {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [user, setUser] = useState(null);
  const barcodeInputRef = useRef(null);
  const lastScannedBarcode = useRef(null);
  const lastScanTime = useRef(0);
  const isProcessing = useRef(false);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "null");
    setUser(userData);

    // Focus input after a short delay to ensure it's rendered
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 200);
  }, []);

  const processBarcode = async (barcode) => {
    if (!barcode || !barcode.trim()) {
      return;
    }

    const barcodeValue = barcode.trim();
    const currentTime = Date.now();
    const timeSinceLastScan = currentTime - lastScanTime.current;

    // Only prevent very rapid duplicate scans (within 300ms) to prevent hardware double-scans
    // Allow intentional re-scans of the same item to increase quantity
    if (
      lastScannedBarcode.current === barcodeValue &&
      timeSinceLastScan < 300 &&
      isProcessing.current
    ) {
      return; // Ignore rapid duplicate scan (likely hardware issue)
    }

    // Prevent processing if already processing (but allow after a short delay)
    if (isProcessing.current && timeSinceLastScan < 500) {
      return;
    }

    // Update tracking
    lastScannedBarcode.current = barcodeValue;
    lastScanTime.current = currentTime;
    isProcessing.current = true;

    setBarcodeInput("");
    setError("");
    setLoading(true);

    try {
      const response = await api.get(`/sales/scan/${barcodeValue}`);
      const item = response.data;

      // Check if barcode already exists in cart using functional update
      setCart((prevCart) => {
        // Normalize barcode values for comparison (convert to string and trim)
        const normalizedBarcode = String(barcodeValue).trim();
        const normalizedItemBarcode = String(item.barcode || "").trim();

        // Find if barcode already exists in the current cart
        const existingItemIndex = prevCart.findIndex((cartItem) => {
          const normalizedCartBarcode = String(cartItem.barcode || "").trim();
          return (
            normalizedCartBarcode === normalizedBarcode ||
            normalizedCartBarcode === normalizedItemBarcode
          );
        });

        if (existingItemIndex >= 0) {
          // Barcode already in cart - increment quantity
          console.log("Item already in cart, incrementing quantity");
          const updatedCart = [...prevCart];
          updatedCart[existingItemIndex] = {
            ...updatedCart[existingItemIndex],
            quantity: updatedCart[existingItemIndex].quantity + 1,
            totalPrice:
              (updatedCart[existingItemIndex].quantity + 1) *
              updatedCart[existingItemIndex].unitPrice,
          };
          return updatedCart;
        } else {
          // Barcode not in cart - add new item
          console.log("Adding new item to cart");
          return [
            ...prevCart,
            {
              itemId: item.id,
              barcode: item.barcode,
              name: item.name,
              quantity: 1,
              unitPrice: item.price,
              totalPrice: item.price,
            },
          ];
        }
      });
      playScanSuccess();
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        "Item not found. Please add it in Admin section first.";
      setError(errorMsg);
      playScanError();
    } finally {
      setLoading(false);
      isProcessing.current = false;

      // Reset tracking after processing completes
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    }
  };

  const handleBarcodeScan = async (e) => {
    // Handle Enter key or if input is auto-filled by USB scanner
    if (e.key === "Enter") {
      e.preventDefault();
      if (barcodeInput.trim()) {
        await processBarcode(barcodeInput);
      }
    }
  };

  // Also handle input changes for USB scanners that might not trigger key events properly
  const handleInputChange = (e) => {
    const value = e.target.value;
    setBarcodeInput(value);

    // Some USB scanners append a newline or tab after scanning
    // Check if the value ends with common scanner suffixes
    if (
      value.length > 0 &&
      (value.endsWith("\n") || value.endsWith("\r") || value.endsWith("\t"))
    ) {
      const cleanValue = value.trim();
      if (cleanValue) {
        setTimeout(() => {
          processBarcode(cleanValue);
        }, 100);
      }
    }
  };

  const handleCameraScan = async (barcode) => {
    if (barcode && barcode.trim()) {
      await processBarcode(barcode);
    }
  };

  const updateQuantity = (itemId, change) => {
    const updatedCart = cart
      .map((item) => {
        if (item.itemId === itemId) {
          const newQuantity = Math.max(0, item.quantity + change);
          if (newQuantity === 0) {
            return null;
          }
          return {
            ...item,
            quantity: newQuantity,
            totalPrice: newQuantity * item.unitPrice,
          };
        }
        return item;
      })
      .filter((item) => item !== null);
    setCart(updatedCart);
  };

  const removeItem = (itemId) => {
    setCart(cart.filter((item) => item.itemId !== itemId));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError("Cart is empty");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/sales/checkout", { items: cart });
      setLastTransaction({
        transactionId: response.data.transactionId,
        totalAmount: response.data.totalAmount,
        items: cart,
      });
      setCart([]);
      setShowReceipt(true);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to process checkout");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleNewSale = () => {
    setShowReceipt(false);
    setLastTransaction(null);
    setCart([]);
    setBarcodeInput("");
    setError("");
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebarCollapsed", String(next));
      return next;
    });
  };

  const handleOpenMenu = () => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(true);
      return;
    }

    if (sidebarCollapsed) {
      handleToggleSidebar();
    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        user={user}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />
      <div className={`main-content ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-btn"
          onClick={handleOpenMenu}
          aria-label="Open menu"
        >
          <span></span>
        </button>
        {error && <div className="alert alert-error">{error}</div>}

        {!showReceipt ? (
          <div className="cashier-shell">
            <section className="cashier-topbar card">
              <div>
                <div className="cashier-topbar-kicker">Sales counter</div>
                <h1 className="cashier-topbar-title">Live checkout terminal</h1>
                <p className="cashier-topbar-copy">
                  Scan items, watch the cart, and close the sale without dashboard clutter.
                </p>
              </div>
              <div className="cashier-topbar-metrics">
                <div className="cashier-metric">
                  <span className="cashier-metric-label">Cashier</span>
                  <strong>{user?.fullName || user?.username || "Active user"}</strong>
                </div>
                <div className="cashier-metric">
                  <span className="cashier-metric-label">Items</span>
                  <strong>{totalItems}</strong>
                </div>
                <div className="cashier-metric">
                  <span className="cashier-metric-label">Total</span>
                  <strong>MMK {formatCurrency(calculateTotal())}</strong>
                </div>
              </div>
            </section>

            <div className="cashier-layout">
              <div className="cashier-left-column">
                <div className="card cashier-scan-card cashier-panel">
                  <div className="cashier-panel-header">
                    <div>
                      <div className="cashier-panel-kicker">Input</div>
                      <h2>Item scanning</h2>
                      <p>Use the camera, a USB scanner, or direct barcode entry.</p>
                    </div>
                    <div className="cashier-panel-chip">
                      {loading ? "Processing" : "Ready"}
                    </div>
                  </div>

                  <div className="cashier-scanner-wrap">
                    <BarcodeScanner
                      onScan={handleCameraScan}
                      onError={(err) => {
                        if (
                          err &&
                          !err.includes("NotFoundException") &&
                          !err.includes("No MultiFormat") &&
                          !err.includes("not found")
                        ) {
                          setError(`Camera error: ${err}`);
                        }
                      }}
                    />
                  </div>

                  <div className="cashier-entry-section">
                    <div className="form-group cashier-entry-group">
                      <label>Barcode entry</label>
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        className="scan-input"
                        placeholder="Type barcode or scan into this field"
                        value={barcodeInput}
                        onChange={handleInputChange}
                        onKeyDown={handleBarcodeScan}
                        disabled={loading}
                        autoComplete="off"
                        autoFocus
                      />
                    </div>

                    <div className="cashier-help-strip">
                      <span>Press Enter after typing a code.</span>
                      <span>Repeated scans increase quantity.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="cashier-right-column">
                <div className="card cashier-cart-card cashier-panel">
                  <div className="cashier-panel-header">
                    <div>
                      <div className="cashier-panel-kicker">Current order</div>
                      <h2>Cart summary</h2>
                      <p>Review line items before payment.</p>
                    </div>
                    <div className="cashier-cart-total">
                      MMK {formatCurrency(calculateTotal())}
                    </div>
                  </div>

                  {cart.length === 0 ? (
                    <div className="cashier-empty-state">
                      <div className="cashier-empty-mark">ORDER</div>
                      <h3>No items in the cart</h3>
                      <p>Start scanning from the left panel to build the current sale.</p>
                    </div>
                  ) : (
                    <div className="cashier-cart-body">
                      <div className="cashier-cart-table-wrap">
                        <table className="cashier-cart-table">
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th>Price</th>
                              <th>Qty</th>
                              <th>Total</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cart.map((item) => (
                              <tr key={item.itemId}>
                                <td>
                                  <div className="cashier-item-cell">
                                    <strong>{item.name}</strong>
                                    <small>{item.barcode}</small>
                                  </div>
                                </td>
                                <td>MMK {formatCurrency(item.unitPrice)}</td>
                                <td>
                                  <div className="cashier-qty-control">
                                    <button
                                      className="cashier-qty-btn"
                                      onClick={() => updateQuantity(item.itemId, -1)}
                                    >
                                      -
                                    </button>
                                    <span>{item.quantity}</span>
                                    <button
                                      className="cashier-qty-btn"
                                      onClick={() => updateQuantity(item.itemId, 1)}
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                                <td>MMK {formatCurrency(item.totalPrice)}</td>
                                <td>
                                  <button
                                    className="btn btn-secondary cashier-remove-btn"
                                    onClick={() => removeItem(item.itemId)}
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="cashier-checkout-panel">
                        <div className="cashier-checkout-row">
                          <span>Lines</span>
                          <strong>{cart.length}</strong>
                        </div>
                        <div className="cashier-checkout-row">
                          <span>Units</span>
                          <strong>{totalItems}</strong>
                        </div>
                        <div className="cashier-checkout-row">
                          <span>Subtotal</span>
                          <strong>MMK {formatCurrency(calculateTotal())}</strong>
                        </div>
                        <div className="cashier-checkout-row total">
                          <span>Amount due</span>
                          <strong>MMK {formatCurrency(calculateTotal())}</strong>
                        </div>
                        <button
                          className="btn btn-success cashier-checkout-btn"
                          onClick={handleCheckout}
                          disabled={cart.length === 0 || loading}
                        >
                          {loading ? "Processing sale..." : "Complete checkout"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card cashier-receipt-card">
            <div className="receipt" id="receipt">
              <div className="receipt-header">
                <h2>ZAW KHIN MARKET</h2>
                <p>Sales receipt</p>
                <p style={{ fontSize: "10px" }}>
                  Transaction: {lastTransaction.transactionId}
                </p>
                <p style={{ fontSize: "10px" }}>
                  {new Date().toLocaleDateString()}{" "}
                  {new Date().toLocaleTimeString()}
                </p>
              </div>
              <div>
                {lastTransaction.items.map((item, index) => (
                  <div key={index} className="receipt-item">
                    <div>
                      <div>{item.name}</div>
                      <div style={{ fontSize: "10px" }}>
                        {item.quantity} x MMK {formatCurrency(item.unitPrice)}
                      </div>
                    </div>
                    <div>MMK {formatCurrency(item.totalPrice)}</div>
                  </div>
                ))}
              </div>
              <div className="receipt-total">
                <div>TOTAL:</div>
                <div>MMK {formatCurrency(lastTransaction.totalAmount)}</div>
              </div>
              <div
                style={{
                  textAlign: "center",
                  marginTop: "20px",
                  fontSize: "10px",
                }}
              >
                Thank you for shopping with us.
              </div>
            </div>
            <div className="cashier-receipt-actions">
              <button className="btn btn-primary" onClick={handlePrintReceipt}>
                Print Receipt
              </button>
              <button className="btn btn-success" onClick={handleNewSale}>
                New Sale
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Cashier;
