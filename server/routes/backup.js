const express = require('express');
const router = express.Router();
const { createBackup, listBackups, cleanupOldBackups, restoreBackup } = require('../utils/backup');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Create manual backup (Admin only)
router.post('/create', authenticateToken, requireAdmin, (req, res) => {
  const result = createBackup();
  if (result.success) {
    res.json({
      success: true,
      message: 'Backup created successfully',
      backup: {
        filename: result.filename,
        sizeMB: result.sizeMB,
        timestamp: result.timestamp
      }
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error
    });
  }
});

// List all backups (Admin only)
router.get('/list', authenticateToken, requireAdmin, (req, res) => {
  const backups = listBackups();
  res.json({
    success: true,
    backups,
    count: backups.length
  });
});

// Restore from backup (Admin only)
router.post('/restore', authenticateToken, requireAdmin, (req, res) => {
  const { filename } = req.body;
  
  if (!filename) {
    return res.status(400).json({
      success: false,
      error: 'Backup filename is required'
    });
  }

  const result = restoreBackup(filename);
  if (result.success) {
    res.json({
      success: true,
      message: result.message,
      previousBackup: result.previousBackup
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error
    });
  }
});

// Cleanup old backups (Admin only)
router.post('/cleanup', authenticateToken, requireAdmin, (req, res) => {
  const keepCount = parseInt(req.body.keepCount) || 30;
  const result = cleanupOldBackups(keepCount);
  res.json({
    success: true,
    ...result
  });
});

module.exports = router;

