import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../utils/api";
import BarcodeScanner from "./BarcodeScanner";

function MobileScanner() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session") || "default";
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [status, setStatus] = useState("Ready to scan");
  const [error, setError] = useState("");

  const handleScan = async (barcode) => {
    if (!barcode || !barcode.trim()) return;

    const barcodeValue = barcode.trim();
    setScannedBarcode(barcodeValue);
    setStatus(`Scanned: ${barcodeValue}`);

    try {
      // Send barcode to server to be picked up by desktop (no auth needed)
      // Note: This endpoint should not require auth, but if it does, we may need to handle it
      await api.post("/sales/mobile-scan", {
        sessionId,
        barcode: barcodeValue,
        timestamp: Date.now(),
      });

      setStatus(`✓ Sent: ${barcodeValue}`);

      // Clear after 2 seconds
      setTimeout(() => {
        setScannedBarcode("");
        setStatus("Ready to scan next item");
      }, 2000);
    } catch (err) {
      console.error("Error sending barcode:", err);
      setStatus("Error sending barcode");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        padding: "20px",
      }}
    >
      <div
        style={{
          maxWidth: "500px",
          margin: "0 auto",
          background: "white",
          borderRadius: "10px",
          padding: "20px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            marginBottom: "20px",
            color: "#2c3e50",
          }}
        >
          📱 Mobile Barcode Scanner
        </h1>

        <div
          style={{
            padding: "15px",
            background: "#e3f2fd",
            borderRadius: "5px",
            marginBottom: "20px",
            fontSize: "14px",
            color: "#1565c0",
          }}
        >
          <strong>Session ID:</strong> {sessionId}
          <br />
          <small>
            Scanned barcodes will appear on your desktop automatically
          </small>
        </div>

        {error && (
          <div
            style={{
              padding: "15px",
              background: "#f8d7da",
              borderRadius: "5px",
              border: "1px solid #f5c6cb",
              marginBottom: "20px",
              color: "#721c24",
            }}
          >
            <strong>⚠️ Error:</strong> {error}
            <button
              onClick={() => setError("")}
              style={{
                marginLeft: "10px",
                padding: "5px 10px",
                background: "#721c24",
                color: "white",
                border: "none",
                borderRadius: "3px",
                cursor: "pointer",
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        <BarcodeScanner
          onScan={handleScan}
          onError={(err) => {
            console.error("BarcodeScanner error:", err);
            if (
              err &&
              !err.includes("NotFoundException") &&
              !err.includes("No MultiFormat")
            ) {
              setError(err);
              setStatus(`Error: ${err}`);
            }
          }}
        />

        {scannedBarcode && (
          <div
            style={{
              marginTop: "20px",
              padding: "15px",
              background: "#d4edda",
              borderRadius: "5px",
              border: "1px solid #c3e6cb",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                color: "#155724",
                marginBottom: "5px",
              }}
            >
              ✓ Scanned Successfully!
            </div>
            <div
              style={{
                fontSize: "24px",
                color: "#155724",
                fontFamily: "monospace",
              }}
            >
              {scannedBarcode}
            </div>
            <div
              style={{ fontSize: "12px", color: "#155724", marginTop: "10px" }}
            >
              {status}
            </div>
          </div>
        )}

        {error && error.includes("HTTPS") && (
          <div
            style={{
              marginTop: "20px",
              padding: "15px",
              background: "#e3f2fd",
              borderRadius: "5px",
              fontSize: "13px",
              color: "#1565c0",
              border: "1px solid #2196f3",
            }}
          >
            <strong>🔒 HTTPS Required for Camera Access</strong>
            <p style={{ margin: "10px 0" }}>
              Modern browsers require HTTPS for camera access (except
              localhost). Since you're accessing via IP address, you need HTTPS.
            </p>
            <div style={{ marginTop: "10px" }}>
              <strong>Quick Solution - Use ngrok:</strong>
              <ol
                style={{
                  margin: "5px 0",
                  paddingLeft: "20px",
                  fontSize: "12px",
                }}
              >
                <li>
                  <strong>Make sure your app is running:</strong>{" "}
                  <code>npm run dev</code> (should show React on port 3000)
                </li>
                <li>
                  <strong>Install ngrok:</strong>{" "}
                  <code>npm install -g ngrok</code> or download from ngrok.com
                </li>
                <li>
                  <strong>Sign up:</strong> Create free account at
                  dashboard.ngrok.com
                </li>
                <li>
                  <strong>Add authtoken:</strong>{" "}
                  <code>ngrok config add-authtoken YOUR_TOKEN</code>
                </li>
                <li>
                  <strong>Start tunnel:</strong> In a new terminal, run{" "}
                  <code>ngrok http 3000</code>
                </li>
                <li>
                  <strong>Copy HTTPS URL:</strong> Look for the "Forwarding"
                  line in ngrok output
                </li>
                <li>
                  <strong>Use on phone:</strong> Open the HTTPS URL + this page
                  path
                </li>
              </ol>
              <div
                style={{
                  marginTop: "10px",
                  padding: "8px",
                  background: "#fff",
                  borderRadius: "3px",
                  fontSize: "11px",
                }}
              >
                <strong>⚠️ Common Issues:</strong>
                <ul style={{ margin: "5px 0", paddingLeft: "20px" }}>
                  <li>Make sure React app is running on port 3000</li>
                  <li>ngrok must point to port 3000 (not 5000)</li>
                  <li>Don't close the ngrok terminal window</li>
                  <li>URL changes each time you restart ngrok</li>
                </ul>
              </div>
            </div>
            <div
              style={{
                marginTop: "10px",
                padding: "10px",
                background: "#fff",
                borderRadius: "3px",
              }}
            >
              <strong>Alternative:</strong> Use the desktop scanner on your
              computer, or type barcodes manually in the input field on the
              desktop.
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            background: "#fff3cd",
            borderRadius: "5px",
            fontSize: "12px",
            color: "#856404",
          }}
        >
          <strong>Tips:</strong>
          <ul style={{ margin: "5px 0", paddingLeft: "20px" }}>
            <li>Point camera at barcode</li>
            <li>Ensure good lighting</li>
            <li>Hold steady for 2-3 seconds</li>
            <li>Scanned barcodes will appear on desktop automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default MobileScanner;
