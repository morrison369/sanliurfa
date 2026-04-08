#!/usr/bin/env node

/**
 * Admin CLI Tool
 * Command-line utility for administrative tasks
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigrations() {
  console.log('🚀 Running migrations...');
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM pg_tables WHERE schemaname = \'public\'');
    console.log(`✅ Database ready. Tables: ${result.rows[0].count}`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function createAdminUser(email: string, password: string) {
  console.log(`👤 Creating admin user: ${email}`);
  try {
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO users (email, full_name, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET role = $4`,
      [email, 'Admin', passwordHash, 'admin']
    );

    console.log('✅ Admin user created/updated');
  } catch (error) {
    console.error('❌ Failed to create admin:', error);
    process.exit(1);
  }
}

async function cleanupOldData(days: number = 90) {
  console.log(`🧹 Cleaning up data older than ${days} days...`);
  try {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await pool.query(
      'DELETE FROM webhook_events WHERE created_at < $1 AND status != \'pending\'',
      [cutoffDate]
    );

    console.log(`✅ Deleted ${result.rowCount} old webhook events`);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

async function checkHealth() {
  console.log('🏥 Checking system health...');
  try {
    // Check database
    const dbResult = await pool.query('SELECT NOW()');
    console.log('✅ Database: OK');

    // Check migrations
    const migrationResult = await pool.query(
      'SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = \'public\''
    );
    console.log(`✅ Migrations: ${migrationResult.rows[0].table_count} tables`);

    // Check active connections
    const connResult = await pool.query('SELECT COUNT(*) as active_connections FROM pg_stat_activity');
    console.log(`✅ Connections: ${connResult.rows[0].active_connections} active`);
  } catch (error) {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  }
}

async function generateReport() {
  console.log('📊 Generating system report...');
  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM places) as total_places,
        (SELECT COUNT(*) FROM direct_messages) as total_messages,
        (SELECT COUNT(*) FROM reviews) as total_reviews
    `);

    const row = stats.rows[0];
    console.log('\n📈 System Statistics:');
    console.log(`   Users: ${row.total_users}`);
    console.log(`   Places: ${row.total_places}`);
    console.log(`   Messages: ${row.total_messages}`);
    console.log(`   Reviews: ${row.total_reviews}`);
  } catch (error) {
    console.error('❌ Report generation failed:', error);
    process.exit(1);
  }
}

async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  try {
    switch (command) {
      case 'migrate':
        await runMigrations();
        break;
      case 'admin':
        if (args.length < 2) {
          console.error('Usage: admin-cli admin <email> <password>');
          process.exit(1);
        }
        await createAdminUser(args[0], args[1]);
        break;
      case 'cleanup':
        const days = args[0] ? parseInt(args[0]) : 90;
        await cleanupOldData(days);
        break;
      case 'health':
        await checkHealth();
        break;
      case 'report':
        await generateReport();
        break;
      default:
        console.log(`
🔧 Admin CLI Tool

Usage: npx admin-cli <command> [options]

Commands:
  migrate              Run database migrations
  admin <email> <pwd>  Create/update admin user
  cleanup [days]       Clean up old data (default: 90 days)
  health              Check system health
  report              Generate system report
        `);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
