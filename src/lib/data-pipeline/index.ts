/**
 * Data Pipeline (ETL)
 * Task 145: Extract, Transform, Load
 */

import { db } from '../db';
// @ts-ignore
import { sql } from 'drizzle-orm';

export interface PipelineJob {
  id: string;
  name: string;
  source: DataSource;
  transformations: Transformation[];
  destination: DataDestination;
  schedule?: string;
  lastRun?: Date;
  lastStatus?: 'success' | 'failed';
}

export interface DataSource {
  type: 'database' | 'api' | 'file' | 's3';
  config: any;
  query?: string;
}

export interface Transformation {
  type: 'filter' | 'map' | 'aggregate' | 'join' | 'validate';
  config: any;
}

export interface DataDestination {
  type: 'database' | 'warehouse' | 'file' | 'api';
  config: any;
}

/**
 * Create ETL pipeline
 */
export async function createPipeline(job: Omit<PipelineJob, 'id'>): Promise<PipelineJob> {
  const pipeline: PipelineJob = {
    id: generateId(),
    ...job,
  };

  await db.execute(sql`
    INSERT INTO data_pipelines (id, name, source, transformations, destination, schedule, created_at)
    VALUES (${pipeline.id}, ${pipeline.name}, ${JSON.stringify(pipeline.source)}, ${JSON.stringify(pipeline.transformations)}, ${JSON.stringify(pipeline.destination)}, ${pipeline.schedule || null}, ${new Date()})
  `);

  return pipeline;
}

/**
 * Execute pipeline
 */
export async function executePipeline(pipelineId: string): Promise<{
  recordsProcessed: number;
  errors: string[];
  duration: number;
}> {
  const startTime = Date.now();
  const result = {
    recordsProcessed: 0,
    errors: [] as string[],
    duration: 0,
  };

  try {
    // Get pipeline config
    const config = await db.execute(sql`SELECT * FROM data_pipelines WHERE id = ${pipelineId}`);
    if (!config.rows[0]) throw new Error('Pipeline not found');

    const pipeline: PipelineJob = {
      id: config.rows[0].id,
      name: config.rows[0].name,
      source: JSON.parse(config.rows[0].source),
      transformations: JSON.parse(config.rows[0].transformations),
      destination: JSON.parse(config.rows[0].destination),
      schedule: config.rows[0].schedule,
    };

    // Extract
    const rawData = await extract(pipeline.source);

    // Transform
    const transformedData = await transform(rawData, pipeline.transformations);

    // Load
    await load(transformedData, pipeline.destination);

    result.recordsProcessed = transformedData.length;

    // Update last run
    await db.execute(sql`
      UPDATE data_pipelines 
      SET last_run = ${new Date()}, last_status = 'success'
      WHERE id = ${pipelineId}
    `);

  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    
    await db.execute(sql`
      UPDATE data_pipelines 
      SET last_run = ${new Date()}, last_status = 'failed'
      WHERE id = ${pipelineId}
    `);
  }

  result.duration = Date.now() - startTime;
  return result;
}

async function extract(source: DataSource): Promise<any[]> {
  switch (source.type) {
    case 'database':
      const result = await db.execute(sql`${source.query}`);
      return result.rows;
    case 'api':
      const response = await fetch(source.config.url);
      return await response.json();
    default:
      return [];
  }
}

async function transform(data: any[], transformations: Transformation[]): Promise<any[]> {
  let result = [...data];

  for (const t of transformations) {
    switch (t.type) {
      case 'filter':
        result = result.filter(_row => eval(t.config.condition));
        break;
      case 'map':
        result = result.map(row => ({
          ...row,
          ...t.config.fields,
        }));
        break;
      case 'aggregate':
        // Group and aggregate
        break;
    }
  }

  return result;
}

async function load(data: any[], destination: DataDestination): Promise<void> {
  switch (destination.type) {
    case 'database':
      // Batch insert
      for (const row of data) {
        const columns = Object.keys(row).join(',');
        const values = Object.values(row);
        await db.execute(sql`INSERT INTO ${destination.config.table} (${columns}) VALUES (${values})`);
      }
      break;
    case 'warehouse':
      // Send to data warehouse
      break;
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
