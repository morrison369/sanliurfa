#!/usr/bin/env node
/**
 * Database Backup Script
 * Creates compressed backups with rotation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
const DATABASE_URL = process.env.DATABASE_URL || '';
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '7');

class BackupManager {
  constructor() {
    this.ensureBackupDir();
  }

  ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      console.log(`Created backup directory: ${BACKUP_DIR}`);
    }
  }

  getBackupFilename() {
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    return `sanliurfa-backup-${date}_${time}.sql.gz`;
  }

  createBackup() {
    const filename = this.getBackupFilename();
    const filepath = path.join(BACKUP_DIR, filename);

    console.log(`Creating backup: ${filename}`);

    try {
      // Parse DATABASE_URL
      const dbUrl = new URL(DATABASE_URL);
      const host = dbUrl.hostname;
      const port = dbUrl.port || '5432';
      const database = dbUrl.pathname.slice(1);
      const username = dbUrl.username;
      const password = dbUrl.password;

      // Create backup with pg_dump
      const cmd = `SET "PGPASSWORD=${password}" && pg_dump -h ${host} -p ${port} -U ${username} -d ${database} --no-owner --no-privileges | gzip > "${filepath}"`;
      
      execSync(cmd, { stdio: 'inherit', shell: true });

      const stats = fs.statSync(filepath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

      console.log(`✅ Backup created: ${filename} (${sizeMB} MB)`);
      
      return { filename, filepath, size: stats.size };
    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      throw error;
    }
  }

  cleanupOldBackups() {
    console.log(`Cleaning up backups older than ${RETENTION_DAYS} days...`);

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('sanliurfa-backup-') && f.endsWith('.sql.gz'))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    let deleted = 0;
    for (const file of files) {
      if (file.mtime < cutoffDate) {
        fs.unlinkSync(file.path);
        console.log(`🗑️  Deleted: ${file.name}`);
        deleted++;
      }
    }

    console.log(`✅ Cleanup complete. Deleted ${deleted} old backups.`);
    return deleted;
  }

  listBackups() {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('sanliurfa-backup-') && f.endsWith('.sql.gz'))
      .map(f => {
        const stats = fs.statSync(path.join(BACKUP_DIR, f));
        return {
          name: f,
          size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
          created: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));

    console.log('\n📦 Available Backups:');
    console.log('─'.repeat(80));
    files.forEach((b, i) => {
      console.log(`${i + 1}. ${b.name}`);
      console.log(`   Size: ${b.size} | Created: ${b.created}`);
    });
    console.log('─'.repeat(80));
    console.log(`Total: ${files.length} backups\n`);

    return files;
  }

  async run(command = 'backup') {
    switch (command) {
      case 'backup':
        await this.createBackup();
        await this.cleanupOldBackups();
        break;
      case 'list':
        this.listBackups();
        break;
      case 'cleanup':
        this.cleanupOldBackups();
        break;
      default:
        console.log('Usage: node backup.js [backup|list|cleanup]');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const command = process.argv[2] || 'backup';
  const manager = new BackupManager();
  manager.run(command).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { BackupManager };
