const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');

// Scan item (get item by barcode)
router.get('/scan/:barcode', (req, res) => {
  const db = getDatabase();
  const { barcode } = req.params;

  db.get('SELECT * FROM items WHERE barcode = ?', [barcode], (err, item) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!item) {
      res.status(404).json({ error: 'Item not found. Please add it in Admin section first.' });
      return;
    }
    res.json(item);
  });
});

// Checkout - Create transaction
router.post('/checkout', (req, res) => {
  const db = getDatabase();
  const { items } = req.body; // Array of { itemId, barcode, name, quantity, unitPrice, totalPrice }

  if (!items || items.length === 0) {
    res.status(400).json({ error: 'No items in cart' });
    return;
  }

  const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Insert transaction
    db.run(
      'INSERT INTO transactions (transaction_id, total_amount) VALUES (?, ?)',
      [transactionId, totalAmount],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          res.status(500).json({ error: err.message });
          return;
        }

        // Insert transaction items and update stock
        let completed = 0;
        let hasError = false;

        items.forEach((item) => {
          // Insert transaction item
          db.run(
            'INSERT INTO transaction_items (transaction_id, item_id, barcode, item_name, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              transactionId,
              item.itemId,
              item.barcode,
              item.name,
              item.quantity,
              item.unitPrice,
              item.totalPrice
            ],
            function(err) {
              if (err && !hasError) {
                hasError = true;
                db.run('ROLLBACK');
                res.status(500).json({ error: err.message });
                return;
              }

              // Update stock
              db.run(
                'UPDATE items SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [item.quantity, item.itemId],
                (err) => {
                  if (err && !hasError) {
                    hasError = true;
                    db.run('ROLLBACK');
                    res.status(500).json({ error: err.message });
                    return;
                  }

                  completed++;
                  if (completed === items.length && !hasError) {
                    db.run('COMMIT', (err) => {
                      if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                      }
                      res.json({
                        transactionId,
                        totalAmount,
                        message: 'Transaction completed successfully'
                      });
                    });
                  }
                }
              );
            }
          );
        });
      }
    );
  });
});

// Store mobile scans temporarily (in production, use Redis or database)
const mobileScans = new Map();

// Mobile scan endpoint - stores barcode for desktop to pick up (PUBLIC - no auth)
const mobileScan = (req, res) => {
  const { sessionId, barcode, timestamp } = req.body;

  if (!sessionId || !barcode) {
    return res.status(400).json({ error: 'Session ID and barcode are required' });
  }

  // Store scan with timestamp
  const key = `${sessionId}_${Date.now()}`;
  mobileScans.set(key, {
    sessionId,
    barcode,
    timestamp: timestamp || Date.now()
  });

  // Clean up old scans (older than 30 seconds)
  setTimeout(() => {
    mobileScans.delete(key);
  }, 30000);

  res.json({ success: true, message: 'Barcode received' });
};

// Get mobile scan for a session (requires auth)
const getMobileScan = (req, res) => {
  const { sessionId } = req.params;
  const now = Date.now();

  // Find most recent scan for this session (within last 30 seconds)
  let latestScan = null;
  let latestKey = null;

  for (const [key, scan] of mobileScans.entries()) {
    if (scan.sessionId === sessionId && (now - scan.timestamp) < 30000) {
      if (!latestScan || scan.timestamp > latestScan.timestamp) {
        latestScan = scan;
        latestKey = key;
      }
    }
  }

  if (latestScan) {
    // Delete after retrieving
    mobileScans.delete(latestKey);
    res.json({ barcode: latestScan.barcode, timestamp: latestScan.timestamp });
  } else {
    res.json({ barcode: null });
  }
};

module.exports = router;
module.exports.mobileScan = mobileScan;
module.exports.getMobileScan = getMobileScan;

