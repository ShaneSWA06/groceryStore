const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');

// Get all transactions
router.get('/', (req, res) => {
  const db = getDatabase();
  db.all(`
    SELECT 
      t.*,
      COUNT(ti.id) as item_count
    FROM transactions t
    LEFT JOIN transaction_items ti ON t.transaction_id = ti.transaction_id
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get transaction by ID with items
router.get('/:transactionId', (req, res) => {
  const db = getDatabase();
  const { transactionId } = req.params;

  db.get('SELECT * FROM transactions WHERE transaction_id = ?', [transactionId], (err, transaction) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    db.all(
      'SELECT * FROM transaction_items WHERE transaction_id = ?',
      [transactionId],
      (err, items) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ ...transaction, items });
      }
    );
  });
});

module.exports = router;

