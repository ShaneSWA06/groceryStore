import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
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
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        "Item not found. Please add it in Admin section first.";
      setError(errorMsg);
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

  return (
    <div className="app-layout">
      <Sidebar
        user={user}
        onLogout={handleLogout}
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

        {!showReceipt ? (
          <div className="cashier-layout">
            {/* Left Column - Product Scanning */}
            <div className="cashier-left-column">
              <div className="card cashier-scan-card">
                <div style={{ marginBottom: "24px" }}>
                  <h2 style={{ marginBottom: "8px" }}>Scan Items</h2>
                  <p
                    style={{ color: "var(--text-secondary)", fontSize: "14px" }}
                  >
                    Use camera scanner or USB barcode scanner to add items to
                    cart
                  </p>
                </div>

                <div style={{ marginBottom: "24px", flex: "1", minHeight: 0 }}>
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

                <div className="form-group" style={{ marginTop: "24px" }}>
                  <label>Barcode Input</label>
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    className="scan-input"
                    placeholder="Search products or scan barcode..."
                    value={barcodeInput}
                    onChange={handleInputChange}
                    onKeyDown={handleBarcodeScan}
                    disabled={loading}
                    autoComplete="off"
                    autoFocus
                  />
                  {loading && (
                    <p
                      style={{
                        textAlign: "center",
                        color: "var(--text-secondary)",
                        marginTop: "12px",
                        fontSize: "14px",
                      }}
                    >
                      Processing...
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Shopping Cart */}
            <div className="cashier-right-column">
              <div className="card cashier-cart-card">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "20px",
                  }}
                >
                  <img
                    src="/images/zawkhinLogo.PNG"
                    alt="Logo"
                    style={{
                      width: "32px",
                      height: "32px",
                      objectFit: "contain",
                    }}
                  />
                  <h2 style={{ margin: 0 }}>Shopping Cart</h2>
                </div>
                {cart.length === 0 ? (
                  <div
                    className="empty-state"
                    style={{
                      flex: "1",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <img
                      src="/images/zawkhinLogoTrans.png"
                      alt="Empty Cart"
                      className="empty-cart-logo"
                      style={{
                        width: "120px",
                        height: "120px",
                        marginBottom: "16px",
                        objectFit: "contain",
                      }}
                    />
                    <p
                      style={{
                        fontSize: "16px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Cart is empty
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      flex: "1",
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        flex: "1",
                        overflowY: "auto",
                        marginBottom: "20px",
                      }}
                    >
                      <table>
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Price</th>
                            <th>Qty</th>
                            <th>Total</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cart.map((item) => (
                            <tr key={item.itemId}>
                              <td>
                                <div>
                                  <strong>{item.name}</strong>
                                  <br />
                                  <small
                                    style={{
                                      color: "var(--text-secondary)",
                                      fontSize: "12px",
                                    }}
                                  >
                                    {item.barcode}
                                  </small>
                                </div>
                              </td>
                              <td>MMK {formatCurrency(item.unitPrice)}</td>
                              <td>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                  }}
                                >
                                  <button
                                    className="btn btn-secondary"
                                    onClick={() =>
                                      updateQuantity(item.itemId, -1)
                                    }
                                    style={{
                                      padding: "4px 8px",
                                      fontSize: "12px",
                                      minWidth: "28px",
                                    }}
                                  >
                                    -
                                  </button>
                                  <span
                                    style={{
                                      minWidth: "30px",
                                      textAlign: "center",
                                    }}
                                  >
                                    {item.quantity}
                                  </span>
                                  <button
                                    className="btn btn-secondary"
                                    onClick={() =>
                                      updateQuantity(item.itemId, 1)
                                    }
                                    style={{
                                      padding: "4px 8px",
                                      fontSize: "12px",
                                      minWidth: "28px",
                                    }}
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td>MMK {formatCurrency(item.totalPrice)}</td>
                              <td>
                                <button
                                  className="btn btn-danger"
                                  onClick={() => removeItem(item.itemId)}
                                  style={{
                                    padding: "4px 8px",
                                    fontSize: "12px",
                                  }}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="total-section">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "12px",
                          fontSize: "16px",
                        }}
                      >
                        <span>Subtotal:</span>
                        <span>
                          MMK{" "}
                          {formatCurrency(
                            cart.reduce((sum, item) => sum + item.totalPrice, 0)
                          )}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "24px",
                          fontWeight: "700",
                          paddingTop: "12px",
                          borderTop: "2px solid var(--border-color)",
                        }}
                      >
                        <span>Total:</span>
                        <span style={{ color: "var(--success-color)" }}>
                          MMK {formatCurrency(calculateTotal())}
                        </span>
                      </div>
                      <button
                        className="btn btn-success"
                        onClick={handleCheckout}
                        disabled={cart.length === 0 || loading}
                        style={{
                          width: "100%",
                          marginTop: "20px",
                          padding: "14px",
                          fontSize: "16px",
                          fontWeight: "600",
                        }}
                      >
                        {loading ? "Processing..." : "Complete Checkout"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="receipt" id="receipt">
              <div className="receipt-header">
                <h2>GROCERY STORE</h2>
                <p>Receipt</p>
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
                Thank you for your purchase!
              </div>
            </div>
            <div style={{ marginTop: "20px", textAlign: "center" }}>
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
