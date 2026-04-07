/**
 * Migrasyon: Roles ve Permissions Sistemi
 * Daha granüler erişim kontrolü
 */

import type { Migration } from '../lib/migrations';

export const migration_006_roles_permissions: Migration = {
  version: '006_roles_permissions',
  description: 'Roles ve permissions sistemi: granüler erişim kontrolü',

  up: async (pool: any) => {
    // Permissions tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        resource VARCHAR(100) NOT NULL,
        action VARCHAR(50) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
    `);

    // Roles tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        is_system BOOLEAN DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Role-Permission mapping
    await pool.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role_id, permission_id)
      );

      CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
      CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
    `);

    // User-Role mapping
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE(user_id, role_id)
      );

      CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
    `);

    // Default roles ve permissions'ları ekle
    await pool.query(`
      -- Permissions
      INSERT INTO permissions (name, description, resource, action)
      VALUES
        ('users.view', 'Kullanıcıları görebilir', 'users', 'read'),
        ('users.edit', 'Kullanıcıları düzenleyebilir', 'users', 'write'),
        ('users.delete', 'Kullanıcıları silebilir', 'users', 'delete'),
        ('places.create', 'Yer oluşturabilir', 'places', 'create'),
        ('places.edit', 'Yer düzenleyebilir', 'places', 'write'),
        ('places.delete', 'Yer silebilir', 'places', 'delete'),
        ('reviews.moderate', 'Yorumları moderatör', 'reviews', 'moderate'),
        ('analytics.view', 'İstatistikleri görebilir', 'analytics', 'read'),
        ('audit_logs.view', 'Audit loglarını görebilir', 'audit_logs', 'read'),
        ('alerts.manage', 'Alert'leri yönetebilir', 'alerts', 'manage'),
        ('webhooks.manage', 'Webhook'ları yönetebilir', 'webhooks', 'manage'),
        ('admin.access', 'Admin paneline erişebilir', 'admin', 'access')
      ON CONFLICT (name) DO NOTHING;

      -- Roles
      INSERT INTO roles (name, description, is_system)
      VALUES
        ('user', 'Normal kullanıcı', true),
        ('moderator', 'İçerik moderatörü', true),
        ('admin', 'Sistem yöneticisi', true)
      ON CONFLICT (name) DO NOTHING;

      -- Role-Permission mappings
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p
      WHERE r.name = 'user' AND p.name IN ('places.view', 'reviews.create')
      ON CONFLICT (role_id, permission_id) DO NOTHING;

      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p
      WHERE r.name = 'moderator' AND p.name IN ('reviews.moderate', 'places.edit', 'users.view', 'audit_logs.view')
      ON CONFLICT (role_id, permission_id) DO NOTHING;

      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r, permissions p
      WHERE r.name = 'admin'
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    `);
  },

  down: async (pool: any) => {
    await pool.query('DROP TABLE IF EXISTS user_roles CASCADE');
    await pool.query('DROP TABLE IF EXISTS role_permissions CASCADE');
    await pool.query('DROP TABLE IF EXISTS roles CASCADE');
    await pool.query('DROP TABLE IF EXISTS permissions CASCADE');
  }
};
