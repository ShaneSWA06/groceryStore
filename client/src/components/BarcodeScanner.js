import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

function BarcodeScanner({ onScan, onError }) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraId, setCameraId] = useState(null);
  const [scanStatus, setScanStatus] = useState("");
  const [useNativeAPI, setUseNativeAPI] = useState(false);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const lastScannedBarcodeRef = useRef(null);
  const noBarcodeCountRef = useRef(0);

  useEffect(() => {
    // Check if native BarcodeDetector API is available
    const hasNativeAPI = "BarcodeDetector" in window;

    if (hasNativeAPI) {
      setUseNativeAPI(true);
      console.log(
        "✅ Native BarcodeDetector API available - will use for better barcode detection"
      );

      // Test if it actually works
      try {
        // eslint-disable-next-line no-undef
        new BarcodeDetector({ formats: ["ean_13"] });
        console.log("✅ BarcodeDetector API is functional");
      } catch (err) {
        console.warn(
          "⚠️ BarcodeDetector exists but may not be fully supported:",
          err
        );
      }
    } else {
      console.log(
        "ℹ️ Native BarcodeDetector not available - using html5-qrcode (limited barcode support)"
      );
      console.log(
        "💡 To enable in Chrome: Go to chrome://flags and enable 'Experimental Web Platform features'"
      );
      console.log("💡 Or use USB barcode scanner for best results");
    }

    // Get available cameras
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameraId(devices[0].id);
        }
      })
      .catch((err) => {
        console.error("Error getting cameras:", err);
      });

    return () => {
      stopScanning();
    };
  }, []);

  const scanWithNativeAPI = async () => {
    if (!("BarcodeDetector" in window)) {
      return false;
    }

    try {
      const video = videoRef.current;
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        return false;
      }

      // eslint-disable-next-line no-undef
      const barcodeDetector = new BarcodeDetector({
        formats: [
          "ean_13",
          "ean_8",
          "upc_a",
          "upc_e",
          "code_128",
          "code_39",
          "codabar",
          "itf",
          "qr_code",
        ],
      });

      const imageBitmap = await createImageBitmap(video);
      const barcodes = await barcodeDetector.detect(imageBitmap);
      imageBitmap.close();

      if (barcodes && barcodes.length > 0) {
        const barcode = barcodes[0];
        const barcodeValue = barcode.rawValue;
        
        // Reset no-barcode counter since we detected something
        noBarcodeCountRef.current = 0;
        
        // Only scan if it's a different barcode than the last one scanned
        // This prevents scanning the same barcode multiple times while it's still in view
        if (lastScannedBarcodeRef.current === barcodeValue) {
          return false; // Same barcode still in view, ignore
        }

        // New barcode detected (or barcode was removed and rescanned)
        lastScannedBarcodeRef.current = barcodeValue;

        console.log(
          "✅ Native API detected barcode:",
          barcodeValue,
          "Format:",
          barcode.format
        );
        onScan?.(barcodeValue);
        setScanStatus(`✓ Scanned: ${barcodeValue}`);
        
        // Auto-stop camera after successful scan
        setTimeout(() => {
          stopScanning();
        }, 500); // Small delay to show the success message
        
        return true;
      } else {
        // No barcode detected in this frame
        noBarcodeCountRef.current += 1;
        
        // After 10 consecutive frames with no barcode, reset the last scanned barcode
        // This allows the same barcode to be scanned again after it's removed from view
        if (noBarcodeCountRef.current >= 10) {
          lastScannedBarcodeRef.current = null;
        }
        return false;
      }
    } catch (err) {
      console.error("Native API scan error:", err);
      return false;
    }
  };

  const startScanning = async () => {
    console.log("🔵 Start scanning clicked");
    console.log("Camera ID:", cameraId);
    console.log("Use Native API:", useNativeAPI);

    // Check if getUserMedia is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const isHTTPS = window.location.protocol === "https:";
      const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      let errorMsg = "Camera API not available. ";
      if (!isHTTPS && !isLocalhost) {
        errorMsg += "Your browser requires HTTPS for camera access. ";
        errorMsg += "Solutions:\n";
        errorMsg +=
          "1. Use ngrok: Run 'ngrok http 3000' and use the HTTPS URL\n";
        errorMsg += "2. Use the desktop scanner instead\n";
        errorMsg += "3. Type barcodes manually in the input field";
      } else {
        errorMsg +=
          "Your browser may not support camera access. Try a different browser.";
      }

      console.error(errorMsg);
      onError?.(errorMsg);
      return;
    }

    // Stop any existing scanner first
    await stopScanning();

    // Set scanning state first so the container div is visible
    setIsScanning(true);
    setScanStatus("Requesting camera permission...");

    // Wait a moment for the div to render
    await new Promise((resolve) => setTimeout(resolve, 200));

    // On mobile, we might not have cameraId yet - try to get it now
    let selectedCameraId = cameraId;
    if (!selectedCameraId) {
      try {
        console.log("📷 No camera ID, trying to get cameras...");
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          selectedCameraId = devices[0].id;
          setCameraId(selectedCameraId);
          console.log("✅ Found camera:", selectedCameraId);
        } else {
          console.warn("⚠️ No cameras found in list, will try anyway");
        }
      } catch (err) {
        console.warn("⚠️ Could not get camera list, will try anyway:", err);
        // Continue anyway - getUserMedia might work without cameraId
      }
    }

    try {
      if (useNativeAPI && "BarcodeDetector" in window) {
        // Use native BarcodeDetector API - much better for barcodes!
        console.log("📷 Using native BarcodeDetector API");
        const constraints = {
          video: {
            facingMode: "environment", // Use back camera on mobile
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };

        console.log("🎥 Requesting camera access...");
        setScanStatus("Requesting camera access...");
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("✅ Camera access granted");
        streamRef.current = stream;

        const video = document.createElement("video");
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.style.width = "100%";
        video.style.maxWidth = "500px";
        video.style.height = "auto";
        video.style.display = "block";
        video.style.borderRadius = "5px";
        video.style.objectFit = "contain";

        const scannerDiv = document.getElementById("html5qr-scanner");
        if (!scannerDiv) {
          throw new Error(
            "Scanner container not found. Please refresh the page."
          );
        }

        scannerDiv.innerHTML = "";
        scannerDiv.appendChild(video);
        videoRef.current = video;

        video.onloadedmetadata = () => {
          video.play().catch((err) => {
            console.error("Error playing video:", err);
            onError?.("Failed to play video stream. Check camera permissions.");
          });
          setScanStatus("Camera active - Native barcode detection");

          // Start scanning loop
          scanIntervalRef.current = setInterval(async () => {
            const detected = await scanWithNativeAPI();
            if (!detected) {
              // Update status periodically to show it's still scanning
              const statusEl = document.querySelector("#scan-status-text");
              if (statusEl && Math.random() < 0.1) {
                // Occasionally update status
              }
            }
          }, 500); // Scan every 500ms
        };

        video.onerror = (err) => {
          console.error("Video error:", err);
          onError?.(
            "Video stream error. Please check camera permissions and try again."
          );
          setIsScanning(false);
        };
      } else {
        // Fallback to html5-qrcode library
        console.log("📷 Using html5-qrcode library");
        const scannerElementId = "html5qr-scanner";
        const html5QrCode = new Html5Qrcode(scannerElementId);
        html5QrCodeRef.current = html5QrCode;

        let lastScannedCode = "";
        let noBarcodeCount = 0;

        // Mobile-friendly config
        const isMobile =
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          );
        const qrboxSize = isMobile ? 250 : 350;

        const config = {
          fps: 10,
          qrbox: { width: qrboxSize, height: qrboxSize },
          aspectRatio: 1.0,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.CODABAR,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
          videoConstraints: {
            facingMode: "environment", // Use back camera on mobile
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };

        console.log("🎥 Starting html5-qrcode scanner...");
        setScanStatus("Starting camera...");

        const scannerDiv = document.getElementById("html5qr-scanner");
        if (!scannerDiv) {
          throw new Error(
            "Scanner container not found. Please refresh the page."
          );
        }

        // Use selectedCameraId or try with facingMode constraint
        const cameraToUse = selectedCameraId || { facingMode: "environment" };
        console.log("📷 Using camera:", cameraToUse);

        await html5QrCode.start(
          cameraToUse,
          config,
          (decodedText, decodedResult) => {
            console.log("✅ Library detected:", decodedText);
            
            // Reset no-barcode counter since we detected something
            noBarcodeCount = 0;
            
            // Only scan if it's a different barcode than the last one scanned
            // This prevents scanning the same barcode multiple times while it's still in view
            if (lastScannedCode === decodedText) {
              return; // Same barcode still in view, ignore
            }

            // New barcode detected (or barcode was removed and rescanned)
            lastScannedCode = decodedText;
            console.log("📦 Processing:", decodedText);
            setScanStatus(`✓ Scanned: ${decodedText}`);
            onScan?.(decodedText);
            
            // Auto-stop camera after successful scan
            setTimeout(async () => {
              await stopScanning();
            }, 500); // Small delay to show the success message
          },
          (errorMessage) => {
            // When no barcode is detected, increment counter
            noBarcodeCount += 1;
            
            // After 10 consecutive "no barcode" detections, reset the last scanned barcode
            // This allows the same barcode to be scanned again after it's removed from view
            if (noBarcodeCount >= 10) {
              lastScannedCode = "";
            }
            
            // Log errors for debugging but don't spam
            if (!errorMessage.includes("NotFoundException")) {
              // Only log non-expected errors occasionally
              if (Math.random() < 0.05) {
                console.log("Scanner error:", errorMessage);
              }
            }
          },
          (errorMessage) => {
            // Log errors for debugging but don't spam
            if (!errorMessage.includes("NotFoundException")) {
              // Only log non-expected errors occasionally
              if (Math.random() < 0.05) {
                console.log("Scanner error:", errorMessage);
              }
            }
          }
        );

        setScanStatus(
          "Camera active - Library detection (limited barcode support)"
        );
      }
    } catch (err) {
      console.error("❌ Scanner error:", err);
      console.error("Error details:", {
        name: err.name,
        message: err.message,
        stack: err.stack,
      });

      let errorMsg = "Failed to start camera.";

      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        errorMsg =
          "Camera permission denied. Please allow camera access in your browser settings and try again.";
      } else if (
        err.name === "NotFoundError" ||
        err.name === "DevicesNotFoundError"
      ) {
        errorMsg = "No camera found. Please check if your device has a camera.";
      } else if (
        err.name === "NotReadableError" ||
        err.name === "TrackStartError"
      ) {
        errorMsg =
          "Camera is already in use by another app. Please close other apps using the camera.";
      } else if (
        err.name === "OverconstrainedError" ||
        err.name === "ConstraintNotSatisfiedError"
      ) {
        errorMsg =
          "Camera doesn't support required settings. Trying with basic settings...";
        // Try again with simpler constraints
        try {
          const simpleConstraints = { video: { facingMode: "environment" } };
          const stream = await navigator.mediaDevices.getUserMedia(
            simpleConstraints
          );
          streamRef.current = stream;
          // Continue with video setup...
          console.log("✅ Camera started with simple constraints");
        } catch (retryErr) {
          errorMsg = err.message || "Failed to start camera. Please try again.";
        }
      } else {
        errorMsg =
          err.message ||
          "Failed to start camera. Make sure camera permissions are granted.";
      }

      onError?.(errorMsg);
      setIsScanning(false);
      setScanStatus(`Error: ${errorMsg}`);
    }
  };

  const stopScanning = async () => {
    // Stop native API scanning
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }

    // Stop html5-qrcode
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.statusInterval) {
          clearInterval(html5QrCodeRef.current.statusInterval);
        }
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }

    setIsScanning(false);
    setScanStatus("");

    // Clear scanner div
    const scannerDiv = document.getElementById("html5qr-scanner");
    if (scannerDiv) {
      scannerDiv.innerHTML = "";
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setScanStatus("Processing image...");

      if ("BarcodeDetector" in window) {
        // Use native API - much better for barcodes!
        // eslint-disable-next-line no-undef
        const barcodeDetector = new BarcodeDetector({
          formats: [
            "ean_13",
            "ean_8",
            "upc_a",
            "upc_e",
            "code_128",
            "code_39",
            "codabar",
            "itf",
            "qr_code",
          ],
        });

        const imageBitmap = await createImageBitmap(file);
        const barcodes = await barcodeDetector.detect(imageBitmap);
        imageBitmap.close();

        if (barcodes && barcodes.length > 0) {
          const barcode = barcodes[0];
          const barcodeValue = barcode.rawValue;
          
          // Only scan if it's a different barcode than the last one scanned
          if (lastScannedBarcodeRef.current === barcodeValue) {
            setScanStatus("Already scanned");
            return;
          }

          // Update tracking
          lastScannedBarcodeRef.current = barcodeValue;

          console.log(
            "✅ File scan detected:",
            barcodeValue,
            "Format:",
            barcode.format
          );
          onScan?.(barcodeValue);
          setScanStatus(`✓ Scanned: ${barcodeValue}`);
        } else {
          setScanStatus("No barcode found");
          onError?.(
            "No barcode detected. Tips: Ensure good lighting, barcode is clear and flat, try a closer photo."
          );
        }
      } else {
        // Fallback to html5-qrcode file scanning (limited barcode support)
        console.log(
          "⚠️ Using html5-qrcode for file scan (limited barcode support)"
        );
        console.log(
          "💡 Tip: Use Chrome or Edge browser for better barcode detection"
        );

        const html5QrCode = new Html5Qrcode("html5qr-scanner");
        try {
          const decodedText = await html5QrCode.scanFile(file, false);
          
          // Only scan if it's a different barcode than the last one scanned
          if (lastScannedBarcodeRef.current === decodedText) {
            setScanStatus("Already scanned");
            return;
          }

          // Update tracking
          lastScannedBarcodeRef.current = decodedText;

          console.log("✅ File scan detected:", decodedText);
          onScan?.(decodedText);
          setScanStatus(`✓ Scanned: ${decodedText}`);
        } catch (scanErr) {
          // html5-qrcode has poor barcode detection
          if (
            scanErr.message &&
            scanErr.message.includes("NotFoundException")
          ) {
            throw new Error(
              "Barcode not detected. The html5-qrcode library has limited barcode support. Try: 1) Use Chrome/Edge browser, 2) Ensure barcode is very clear, 3) Use USB scanner instead, or 4) Type barcode manually."
            );
          }
          throw scanErr;
        } finally {
          await html5QrCode.clear();
        }
      }
    } catch (err) {
      console.error("File scan error:", err);
      setScanStatus("Scan failed");

      // Provide helpful error message
      let errorMsg = "Failed to scan image.";
      if (err.message) {
        errorMsg = err.message;
      } else if (err.toString().includes("NotFoundException")) {
        errorMsg =
          "Barcode not found in image. html5-qrcode has limited barcode support. Try Chrome/Edge browser or use USB scanner.";
      }

      onError?.(errorMsg);
    }

    // Reset file input
    event.target.value = "";
  };

  return (
    <div style={{ marginBottom: "20px" }}>
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "10px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          className={isScanning ? "btn btn-danger" : "btn btn-success"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isScanning) {
              stopScanning();
            } else {
              startScanning();
            }
          }}
        >
          {isScanning ? "⏹️ Stop Camera" : "▶️ Start Camera Scanner"}
        </button>
        <label className="btn btn-secondary">
          📷 Scan from Photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
        </label>
        {isScanning && (
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <span style={{ color: "#27ae60", fontWeight: "bold" }}>
              ● Scanning...
            </span>
            {scanStatus && (
              <span style={{ fontSize: "12px", color: "#666" }}>
                {scanStatus}
              </span>
            )}
          </div>
        )}
      </div>
      <div
        ref={scannerRef}
        style={{
          width: "100%",
          maxWidth: "500px",
          margin: "0 auto",
          display: isScanning ? "block" : "none",
        }}
      >
        <div
          id="html5qr-scanner"
          style={{
            width: "100%",
            minHeight: "300px",
            maxHeight: "70vh", // Better for mobile
            position: "relative",
            background: "#000",
            borderRadius: "5px",
            overflow: "hidden",
          }}
        ></div>
      </div>
      {!isScanning && (
        <div className="scanner-inactive">
          <div className="scanner-inactive-icon">📷</div>
          <h3 className="scanner-inactive-title">Camera Scanner Inactive</h3>
          <p className="scanner-inactive-subtitle">
            Click "Start Camera Scanner" to begin scanning items
          </p>
          <div className="scanner-status-info">
            {useNativeAPI ? (
              <div className="scanner-status-badge success">
                <span className="badge-icon">✅</span>
                <span className="badge-text">Native barcode detection available</span>
              </div>
            ) : (
              <>
                <div className="scanner-status-badge warning">
                  <span className="badge-icon">⚠️</span>
                  <span className="badge-text">Limited barcode support detected</span>
                </div>
                <div className="scanner-instructions">
                  <strong>Enable Better Scanning:</strong>
                  <ol>
                    <li>
                      Go to <code>chrome://flags</code>
                    </li>
                    <li>Enable "Experimental Web Platform features"</li>
                    <li>Restart Chrome and refresh this page</li>
                  </ol>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {isScanning && (
        <div className="scanner-status-active">
          <strong>Tips for better scanning:</strong>
          <ul>
            <li>
              <strong>Good lighting is critical</strong> - Use bright, even
              lighting
            </li>
            <li>
              <strong>Hold barcode flat</strong> - No wrinkles or curves
            </li>
            <li>
              <strong>Fill the frame</strong> - Get close so barcode fills most
              of the view
            </li>
            <li>
              <strong>Steady hands</strong> - Hold still for 2-3 seconds
            </li>
            <li>
              <strong>Try "Scan from Photo"</strong> - Sometimes taking a photo
              works better than live scanning
            </li>
            <li>
              <strong>Supported formats:</strong> EAN-13, UPC-A, Code 128, Code
              39, QR Code
            </li>
          </ul>
          {!useNativeAPI && (
            <div className="scanner-limited-detection">
              <strong>⚠️ Limited Detection:</strong>
              <p>
                Enable native detection in Chrome for much better results. See
                instructions above.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BarcodeScanner;
