import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import BarcodeScanner from "./BarcodeScanner";

// Format number with commas and no decimals
const formatCurrency = (value) => {
  return Math.round(parseFloat(value) || 0).toLocaleString('en-US');
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

  const handleExportExcel = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/export/transactions", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export transactions");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setError(""); // Clear any errors
    } catch (err) {
      setError("Failed to export transactions. Please try again.");
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
            <h1>Cashier - Sales</h1>
            {user && (
              <p style={{ margin: 0, fontSize: "14px" }}>
                Logged in as: {user.fullName || user.username} ({user.role})
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              className="btn btn-success"
              onClick={handleExportExcel}
              style={{ marginLeft: "10px" }}
              title="Download transactions as Excel file"
            >
              📥 Export Excel
            </button>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
        <div className="nav">
          <button className="active">Cashier</button>
          {user?.role === "admin" && (
            <button onClick={() => navigate("/admin")}>Admin</button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!showReceipt ? (
        <>
          <div className="card">
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ marginBottom: "8px" }}>Scan Items</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                Use camera scanner or USB barcode scanner to add items to cart
              </p>
            </div>

            <div style={{ marginBottom: "24px" }}>
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
                placeholder="Scan with USB scanner or type barcode and press Enter"
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

          <div className="card">
            <h2>Cart</h2>
            {cart.length === 0 ? (
              <div className="empty-state">
                <p>No items in cart. Start scanning items to add them.</p>
              </div>
            ) : (
              <>
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Price</th>
                      <th>Quantity</th>
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
                              onClick={() => updateQuantity(item.itemId, -1)}
                              style={{
                                padding: "6px 12px",
                                minWidth: "36px",
                                fontSize: "16px",
                                fontWeight: "600",
                              }}
                            >
                              −
                            </button>
                            <span
                              style={{
                                minWidth: "30px",
                                textAlign: "center",
                                fontWeight: "600",
                                fontSize: "16px",
                              }}
                            >
                              {item.quantity}
                            </span>
                            <button
                              className="btn btn-secondary"
                              onClick={() => updateQuantity(item.itemId, 1)}
                              style={{
                                padding: "6px 12px",
                                minWidth: "36px",
                                fontSize: "16px",
                                fontWeight: "600",
                              }}
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td>
                          <strong>MMK {formatCurrency(item.totalPrice)}</strong>
                        </td>
                        <td>
                          <button
                            className="btn btn-danger"
                            onClick={() => removeItem(item.itemId)}
                            style={{ padding: "6px 16px", fontSize: "13px" }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="total-section">
                  <div className="total-amount">
                    Total: MMK {formatCurrency(calculateTotal())}
                  </div>
                  <button
                    className="btn btn-success"
                    onClick={handleCheckout}
                    disabled={loading || cart.length === 0}
                    style={{
                      marginTop: "24px",
                      width: "100%",
                      padding: "16px",
                      fontSize: "16px",
                      fontWeight: "600",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {loading ? "Processing..." : "Complete Checkout"}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
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
  );
}

export default Cashier;
