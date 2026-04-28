/**
 * Advanced Data Import/Export Module
 * Bulk operations with Excel, CSV validation and transformation
 */

import { query } from '../postgres';
import { parseCSV, generateCSV } from '../csv-excel';

export interface ImportConfig {
  entityType: 'places' | 'users' | 'reviews' | 'events';
  format: 'csv' | 'excel' | 'json';
  validateOnly?: boolean;
  skipErrors?: boolean;
  updateExisting?: boolean;
  mapping?: Record<string, string>;
  transformations?: Record<string, (value: any) => any>;
}

export interface ImportResult {
  total: number;
  imported: number;
  updated: number;
  errors: Array<{ row: number; field: string; message: string; value: any }>;
  warnings: Array<{ row: number; message: string }>;
}

export interface ExportConfig {
  entityType: string;
  format: 'csv' | 'excel' | 'json';
  filters?: Record<string, any>;
  fields?: string[];
  includeRelated?: boolean;
  sort?: { field: string; direction: 'asc' | 'desc' };
}

/**
 * Import data from file
 */
export async function importData(
  fileContent: string | Buffer,
  config: ImportConfig
): Promise<ImportResult> {
  const result: ImportResult = {
    total: 0,
    imported: 0,
    updated: 0,
    errors: [],
    warnings: []
  };

  // Parse data based on format
  let rows: any[];
  try {
    switch (config.format) {
      case 'csv':
        rows = await parseCSV(fileContent as string);
        break;
      case 'json':
        rows = JSON.parse(fileContent as string);
        break;
      default:
        throw new Error(`Unsupported format: ${config.format}`);
    }
  } catch (error: any) {
    result.errors.push({ row: 0, field: 'file', message: error.message, value: null });
    return result;
  }

  result.total = rows.length;

  // Process each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    try {
      // Apply field mapping
      const mappedData = config.mapping 
        ? mapFields(row, config.mapping)
        : row;

      // Apply transformations
      const transformedData = config.transformations
        ? applyTransformations(mappedData, config.transformations)
        : mappedData;

      // Validate row
      const validation = validateRow(transformedData, config.entityType);
      if (!validation.valid) {
        result.errors.push(...validation.errors.map(e => ({ ...e, row: rowNum })));
        if (!config.skipErrors) continue;
      }

      // Check for existing record
      if (config.updateExisting && transformedData.id) {
        const existing = await findExisting(config.entityType, transformedData.id);
        if (existing) {
          if (!config.validateOnly) {
            await updateEntity(config.entityType, transformedData.id, transformedData);
          }
          result.updated++;
          continue;
        }
      }

      // Insert new record
      if (!config.validateOnly) {
        await insertEntity(config.entityType, transformedData);
      }
      result.imported++;

    } catch (error: any) {
      result.errors.push({
        row: rowNum,
        field: 'general',
        message: error.message,
        value: null
      });
      if (!config.skipErrors) break;
    }
  }

  return result;
}

/**
 * Export data to file
 */
export async function exportData(config: ExportConfig): Promise<{
  data: string | Buffer;
  filename: string;
  recordCount: number;
}> {
  // Build query
  const { sql, params } = buildExportQuery(config);
  
  // Execute query
  const result = await query(sql, params);
  
  // Format output
  let output: string | Buffer;
  const timestamp = new Date().toISOString().split('T')[0];
  let extension: string;

  switch (config.format) {
    case 'csv':
      output = generateCSV(result.rows);
      extension = 'csv';
      break;
    case 'json':
      output = JSON.stringify(result.rows, null, 2);
      extension = 'json';
      break;
    default:
      throw new Error(`Unsupported format: ${config.format}`);
  }

  return {
    data: output,
    filename: `${config.entityType}_export_${timestamp}.${extension}`,
    recordCount: result.rows.length
  };
}

/**
 * Map fields according to configuration
 */
function mapFields(row: any, mapping: Record<string, string>): any {
  const result: any = {};
  for (const [source, target] of Object.entries(mapping)) {
    if (row[source] !== undefined) {
      result[target] = row[source];
    }
  }
  return result;
}

/**
 * Apply transformations to data
 */
function applyTransformations(
  data: any,
  transformations: Record<string, (value: any) => any>
): any {
  const result = { ...data };
  for (const [field, transform] of Object.entries(transformations)) {
    if (result[field] !== undefined) {
      result[field] = transform(result[field]);
    }
  }
  return result;
}

/**
 * Validate row data
 */
function validateRow(data: any, entityType: string): {
  valid: boolean;
  errors: Array<{ field: string; message: string; value: any }>;
} {
  const errors: Array<{ field: string; message: string; value: any }> = [];

  const validators: Record<string, Record<string, (v: any) => string | null>> = {
    places: {
      name: (v) => !v || v.length < 2 ? 'Name must be at least 2 characters' : null,
      category_id: (v) => !v ? 'Category is required' : null,
      latitude: (v) => v && (isNaN(v) || v < -90 || v > 90) ? 'Invalid latitude' : null,
      longitude: (v) => v && (isNaN(v) || v < -180 || v > 180) ? 'Invalid longitude' : null,
    },
    users: {
      email: (v) => !v || !v.includes('@') ? 'Valid email required' : null,
      name: (v) => !v || v.length < 2 ? 'Name must be at least 2 characters' : null,
    },
    reviews: {
      place_id: (v) => !v ? 'Place ID is required' : null,
      rating: (v) => !v || v < 1 || v > 5 ? 'Rating must be between 1-5' : null,
    }
  };

  const entityValidators = validators[entityType];
  if (entityValidators) {
    for (const [field, validator] of Object.entries(entityValidators)) {
      const error = validator(data[field]);
      if (error) {
        errors.push({ field, message: error, value: data[field] });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Find existing entity
 */
async function findExisting(entityType: string, id: string): Promise<any | null> {
  const tableName = getTableName(entityType);
  const result = await query(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

/**
 * Insert new entity
 */
async function insertEntity(entityType: string, data: any): Promise<void> {
  const tableName = getTableName(entityType);
  const fields = Object.keys(data).filter(k => k !== 'id');
  
  if (fields.length === 0) return;

  const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
  const values = fields.map(f => data[f]);

  await query(
    `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`,
    values
  );
}

/**
 * Update existing entity
 */
async function updateEntity(entityType: string, id: string, data: any): Promise<void> {
  const tableName = getTableName(entityType);
  const fields = Object.keys(data).filter(k => k !== 'id');
  
  if (fields.length === 0) return;

  const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = [id, ...fields.map(f => data[f])];

  await query(
    `UPDATE ${tableName} SET ${setClause} WHERE id = $1`,
    values
  );
}

/**
 * Get table name for entity type
 */
function getTableName(entityType: string): string {
  const mapping: Record<string, string> = {
    places: 'places',
    users: 'users',
    reviews: 'reviews',
    events: 'events',
    categories: 'categories',
    blog_posts: 'blog_posts'
  };
  if (!mapping[entityType]) throw new Error(`Unknown entity type: ${entityType}`);
  return mapping[entityType];
}

/**
 * Build export query.
 *
 * **DEPRECATED — DO NOT USE.** Multiple SQL injection vector:
 * - `${config.fields?.join(', ')}` — arbitrary column list injection
 * - `${key} = $${paramIndex}` — filter column name (key) injection
 * - `${config.sort.field} ${config.sort.direction}` — ORDER BY column + direction injection
 *
 * Şu anda 0 caller var; runtime guard ile kilitlendi. Yeni export feature
 * gerekirse `lib/data/data-warehouse.ts:queryOLAP` pattern'ini referans al
 * (FIELD_ALLOWLIST + FILTER_KEY_ALLOWLIST + SORT_FIELD_ALLOWLIST per entityType).
 */
function buildExportQuery(_config: ExportConfig): { sql: string; params: any[] } {
  throw new Error(
    'buildExportQuery is deprecated and disabled — multiple SQL injection vectors. ' +
    'Use parametrized queries with strict allowlist (see lib/data/data-warehouse.ts:queryOLAP).',
  );
}

/**
 * Preview import (first 5 rows)
 */
export async function previewImport(
  fileContent: string,
  format: 'csv' | 'json'
): Promise<any[]> {
  let rows: any[];
  
  switch (format) {
    case 'csv':
      rows = await parseCSV(fileContent);
      break;
    case 'json':
      rows = JSON.parse(fileContent);
      break;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }

  return rows.slice(0, 5);
}

/**
 * Get import template
 */
export async function getImportTemplate(entityType: string): Promise<{
  fields: Array<{ name: string; required: boolean; type: string; description: string }>;
  sample: any;
}> {
  const templates: Record<string, any> = {
    places: {
      fields: [
        { name: 'name', required: true, type: 'string', description: 'Place name' },
        { name: 'category_id', required: true, type: 'uuid', description: 'Category ID' },
        { name: 'description', required: false, type: 'string', description: 'Description' },
        { name: 'address', required: false, type: 'string', description: 'Address' },
        { name: 'latitude', required: false, type: 'number', description: 'Latitude' },
        { name: 'longitude', required: false, type: 'number', description: 'Longitude' },
        { name: 'phone', required: false, type: 'string', description: 'Phone number' },
      ],
      sample: {
        name: 'Sample Restaurant',
        category_id: '123e4567-e89b-12d3-a456-426614174000',
        description: 'A great place to eat',
        address: '123 Main St',
        latitude: 37.1590,
        longitude: 38.7969,
        phone: '+90 555 123 4567'
      }
    },
    users: {
      fields: [
        { name: 'email', required: true, type: 'string', description: 'Email address' },
        { name: 'name', required: true, type: 'string', description: 'Full name' },
        { name: 'phone', required: false, type: 'string', description: 'Phone number' },
      ],
      sample: {
        email: 'user@example.com',
        name: 'John Doe',
        phone: '+90 555 123 4567'
      }
    }
  };

  return templates[entityType] || { fields: [], sample: {} };
}

/**
 * Bulk update with conditions
 */
export async function bulkUpdate(
  entityType: string,
  filters: Record<string, any>,
  updates: Record<string, any>
): Promise<{ updated: number }> {
  const tableName = getTableName(entityType);
  
  let sql = `UPDATE ${tableName} SET `;
  const params: any[] = [];
  let paramIndex = 1;

  // Build SET clause
  const setFields = Object.entries(updates).map(([key, _]) => {
    params.push(updates[key]);
    return `${key} = $${paramIndex++}`;
  });
  sql += setFields.join(', ');

  // Build WHERE clause
  const conditions = Object.entries(filters).map(([key, value]) => {
    params.push(value);
    return `${key} = $${paramIndex++}`;
  });
  
  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  sql += ` RETURNING id`;

  const result = await query(sql, params);
  return { updated: result.rowCount };
}

/**
 * Bulk delete with conditions
 */
export async function bulkDelete(
  entityType: string,
  filters: Record<string, any>
): Promise<{ deleted: number }> {
  const tableName = getTableName(entityType);
  
  let sql = `DELETE FROM ${tableName}`;
  const params: any[] = [];
  let paramIndex = 1;

  // Build WHERE clause
  const conditions = Object.entries(filters).map(([key, value]) => {
    params.push(value);
    return `${key} = $${paramIndex++}`;
  });
  
  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  sql += ` RETURNING id`;

  const result = await query(sql, params);
  return { deleted: result.rowCount };
}

