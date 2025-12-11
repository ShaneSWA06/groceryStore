const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const { requireAdmin } = require('../middleware/auth');

// Get all items
router.get('/', (req, res) => {
  const db = getDatabase();
  db.all('SELECT * FROM items ORDER BY name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get item by barcode
router.get('/barcode/:barcode', (req, res) => {
  const db = getDatabase();
  const { barcode } = req.params;
  
  db.get('SELECT * FROM items WHERE barcode = ?', [barcode], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json(row);
  });
});

// Get item by ID
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  db.get('SELECT * FROM items WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json(row);
  });
});

// Create new item (admin only)
router.post('/', requireAdmin, (req, res) => {
  const db = getDatabase();
  const { barcode, name, price, base_price, category, stock } = req.body;

  if (!barcode || !name || price === undefined) {
    res.status(400).json({ error: 'Barcode, name, and price (sell price) are required' });
    return;
  }

  db.run(
    'INSERT INTO items (barcode, name, price, base_price, category, stock) VALUES (?, ?, ?, ?, ?, ?)',
    [
      barcode,
      name,
      parseFloat(price),
      base_price !== undefined ? parseFloat(base_price) : 0,
      category || null,
      parseInt(stock) || 0
    ],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
          res.status(400).json({ error: 'Item with this barcode already exists' });
        } else {
          res.status(500).json({ error: err.message });
        }
        return;
      }
      res.json({
        id: this.lastID,
        barcode,
        name,
        price: parseFloat(price),
        base_price: base_price !== undefined ? parseFloat(base_price) : 0,
        category: category || null,
        stock: parseInt(stock) || 0
      });
    }
  );
});

// Update item (admin only)
router.put('/:id', requireAdmin, (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { barcode, name, price, base_price, category, stock } = req.body;

  db.run(
    'UPDATE items SET barcode = ?, name = ?, price = ?, base_price = ?, category = ?, stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [
      barcode,
      name,
      parseFloat(price),
      base_price !== undefined ? parseFloat(base_price) : 0,
      category || null,
      parseInt(stock) || 0,
      id
    ],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
          res.status(400).json({ error: 'Item with this barcode already exists' });
        } else {
          res.status(500).json({ error: err.message });
        }
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      res.json({ message: 'Item updated successfully', changes: this.changes });
    }
  );
});

// Delete item (admin only)
router.delete('/:id', requireAdmin, (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  db.run('DELETE FROM items WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json({ message: 'Item deleted successfully' });
  });
});

module.exports = router;

