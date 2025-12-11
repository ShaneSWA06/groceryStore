const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../grocery_store.db');
const BACKUP_DIR = path.join(__dirname, '../backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Create a backup of the database
 * @returns {Object} { success: boolean, filename: string, path: string, error: string }
 */
function createBackup() {
  try {
    // Check if database file exists
    if (!fs.existsSync(DB_PATH)) {
      return {
        success: false,
        error: 'Database file not found'
      };
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString()
      .replace(/:/g, '-')
      .replace(/\./g, '-')
      .slice(0, -5); // Remove milliseconds
    const filename = `grocery_store_backup_${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, filename);

    // Copy database file
    fs.copyFileSync(DB_PATH, backupPath);

    // Get file size
    const stats = fs.statSync(backupPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`✅ Backup created: ${filename} (${fileSizeMB} MB)`);

    return {
      success: true,
      filename,
      path: backupPath,
      size: stats.size,
      sizeMB: fileSizeMB,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get list of all backups
 * @returns {Array} Array of backup file info
 */
function listBackups() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return [];
    }

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.db'))
      .map(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          path: filePath,
          size: stats.size,
          sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => b.created - a.created); // Sort by newest first

    return files;
  } catch (error) {
    console.error('Error listing backups:', error.message);
    return [];
  }
}

/**
 * Delete old backups, keeping only the most recent N backups
 * @param {number} keepCount - Number of backups to keep (default: 30)
 */
function cleanupOldBackups(keepCount = 30) {
  try {
    const backups = listBackups();
    
    if (backups.length <= keepCount) {
      return { deleted: 0, message: 'No old backups to delete' };
    }

    const toDelete = backups.slice(keepCount);
    let deletedCount = 0;

    toDelete.forEach(backup => {
      try {
        fs.unlinkSync(backup.path);
        deletedCount++;
        console.log(`🗑️  Deleted old backup: ${backup.filename}`);
      } catch (error) {
        console.error(`Error deleting backup ${backup.filename}:`, error.message);
      }
    });

    return {
      deleted: deletedCount,
      kept: keepCount,
      message: `Cleaned up ${deletedCount} old backup(s), kept ${keepCount} most recent`
    };
  } catch (error) {
    console.error('Error cleaning up backups:', error.message);
    return {
      deleted: 0,
      error: error.message
    };
  }
}

/**
 * Restore database from a backup file
 * @param {string} backupFilename - Name of the backup file to restore
 * @returns {Object} { success: boolean, error: string }
 */
function restoreBackup(backupFilename) {
  try {
    const backupPath = path.join(BACKUP_DIR, backupFilename);
    
    if (!fs.existsSync(backupPath)) {
      return {
        success: false,
        error: 'Backup file not found'
      };
    }

    // Create a backup of current database before restoring
    const currentBackup = createBackup();
    if (!currentBackup.success) {
      console.warn('Warning: Could not backup current database before restore');
    }

    // Copy backup file to database location
    fs.copyFileSync(backupPath, DB_PATH);

    console.log(`✅ Database restored from: ${backupFilename}`);

    return {
      success: true,
      message: `Database restored from ${backupFilename}`,
      previousBackup: currentBackup.filename || null
    };
  } catch (error) {
    console.error('❌ Restore failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  createBackup,
  listBackups,
  cleanupOldBackups,
  restoreBackup
};

