/**
 * RBAC (Role-Based Access Control) Sistemi
 * Granüler permission kontrolü
 */

import { pool } from './postgres';
import { logger } from './logging';
import { getCache, setCache, deleteCache } from './cache';

/**
 * Kullanıcının izinlerini al
 */
export async function getUserPermissions(userId: string): Promise<Set<string>> {
  try {
    const cacheKey = `sanliurfa:permissions:${userId}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return new Set(JSON.parse(cached));
    }

    const result = await pool.query(
      `SELECT DISTINCT p.name
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = $1
      UNION
      -- Doğrudan kullanıcı izinleri (ileride eklenebilir)
      SELECT DISTINCT p.name FROM permissions p WHERE p.resource = 'direct'`,
      [userId]
    );

    const permissions = new Set(result.rows.map(r => r.name).filter(Boolean));

    // Cache'e kaydet (1 saat)
    await setCache(cacheKey, JSON.stringify(Array.from(permissions)), 3600);

    return permissions;
  } catch (error) {
    logger.error('Kullanici izinleri alınırken hata', error instanceof Error ? error : new Error(String(error)));
    return new Set();
  }
}

/**
 * Kullanıcının belirli permission'ı olup olmadığını kontrol et
 */
export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.has(permission);
}

/**
 * Kullanıcının herhangi bir permission'ı olup olmadığını kontrol et
 */
export async function hasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId);
  return permissions.some(p => userPermissions.has(p));
}

/**
 * Kullanıcının tüm permission'ları olup olmadığını kontrol et
 */
export async function hasAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId);
  return permissions.every(p => userPermissions.has(p));
}

/**
 * Kullanıcı role'ü ekle
 */
export async function assignRole(userId: string, roleId: string, assignedBy: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `INSERT INTO user_roles (user_id, role_id, assigned_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userId, roleId, assignedBy]
    );

    if ((result.rowCount || 0) > 0) {
      // Cache'i sil
      await deleteCache(`sanliurfa:permissions:${userId}`);
      logger.info('Role atandi', { userId, roleId, assignedBy });
    }

    return (result.rowCount || 0) > 0;
  } catch (error) {
    logger.error('Role atanırken hata', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Kullanıcıdan role'ü sil
 */
export async function revokeRole(userId: string, roleId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2`,
      [userId, roleId]
    );

    if ((result.rowCount || 0) > 0) {
      // Cache'i sil
      await deleteCache(`sanliurfa:permissions:${userId}`);
      logger.info('Role geri alindi', { userId, roleId });
    }

    return (result.rowCount || 0) > 0;
  } catch (error) {
    logger.error('Role geri alınırken hata', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Kullanıcının role'lerini al
 */
export async function getUserRoles(userId: string): Promise<Array<{ id: string; name: string }>> {
  try {
    const result = await pool.query(
      `SELECT DISTINCT r.id, r.name
      FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Kullanici rolleri alınırken hata', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Role'ün permission'larını al
 */
export async function getRolePermissions(roleId: string): Promise<Array<{ id: string; name: string; resource: string; action: string }>> {
  try {
    const result = await pool.query(
      `SELECT p.id, p.name, p.resource, p.action
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1`,
      [roleId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Role permission\'leri alınırken hata', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Role'e permission ekle
 */
export async function addPermissionToRole(roleId: string, permissionId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `INSERT INTO role_permissions (role_id, permission_id)
      VALUES ($1, $2)
      ON CONFLICT (role_id, permission_id) DO NOTHING`,
      [roleId, permissionId]
    );

    if ((result.rowCount || 0) > 0) {
      logger.info('Permission role\'e eklendi', { roleId, permissionId });
    }

    return (result.rowCount || 0) > 0;
  } catch (error) {
    logger.error('Permission eklenirken hata', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Tüm permission'ları al
 */
export async function getAllPermissions(): Promise<Array<{ id: string; name: string; resource: string; action: string }>> {
  try {
    const result = await pool.query(`SELECT id, name, resource, action FROM permissions ORDER BY resource, action`);
    return result.rows;
  } catch (error) {
    logger.error('Tum permission\'ler alınırken hata', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Tüm role'leri al
 */
export async function getAllRoles(): Promise<Array<{ id: string; name: string; is_system: boolean }>> {
  try {
    const result = await pool.query(`SELECT id, name, is_system FROM roles ORDER BY name`);
    return result.rows;
  } catch (error) {
    logger.error('Tum roller alınırken hata', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Role ID'sini adından al
 */
export async function getRoleIdByName(roleName: string): Promise<string | null> {
  try {
    const result = await pool.query(`SELECT id FROM roles WHERE name = $1`, [roleName]);
    return result.rows[0]?.id || null;
  } catch (error) {
    logger.error('Role ID alınırken hata', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Permission ID'sini adından al
 */
export async function getPermissionIdByName(permissionName: string): Promise<string | null> {
  try {
    const result = await pool.query(`SELECT id FROM permissions WHERE name = $1`, [permissionName]);
    return result.rows[0]?.id || null;
  } catch (error) {
    logger.error('Permission ID alınırken hata', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}
