/**
 * IoT Smart City Integration
 * Task 135: IoT Sensors
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import { logger } from '../logging';

export interface IoTSensor {
  id: string;
  type: 'air_quality' | 'noise' | 'temperature' | 'traffic' | 'parking' | 'crowd';
  location: { lat: number; lng: number };
  placeId?: string;
  status: 'active' | 'inactive' | 'error';
  lastReading?: SensorReading;
  installedAt: Date;
}

export interface SensorReading {
  sensorId: string;
  timestamp: Date;
  values: Record<string, number>;
  quality: 'good' | 'moderate' | 'poor' | 'critical';
}

export interface AirQualityData {
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  temperature: number;
  humidity: number;
}

// Mock sensor network
const sensors = new Map<string, IoTSensor>();

/**
 * Register new sensor
 */
export async function registerSensor(
  type: IoTSensor['type'],
  location: { lat: number; lng: number },
  placeId?: string
): Promise<IoTSensor> {
  const sensor: IoTSensor = {
    id: generateId(),
    type,
    location,
    placeId,
    status: 'active',
    installedAt: new Date(),
  };

  sensors.set(sensor.id, sensor);

  await db.execute(sql`
    INSERT INTO iot_sensors (id, type, latitude, longitude, place_id, status, installed_at)
    VALUES (${sensor.id}, ${sensor.type}, ${location.lat}, ${location.lng}, ${placeId || null}, ${sensor.status}, ${sensor.installedAt})
  `);

  return sensor;
}

/**
 * Store sensor reading
 */
export async function storeReading(reading: SensorReading): Promise<void> {
  const sensor = sensors.get(reading.sensorId);
  if (sensor) {
    sensor.lastReading = reading;
  }

  await db.execute(sql`
    INSERT INTO sensor_readings (id, sensor_id, timestamp, values, quality)
    VALUES (${generateId()}, ${reading.sensorId}, ${reading.timestamp}, ${JSON.stringify(reading.values)}, ${reading.quality})
  `);

  // Check thresholds and alert if needed
  await checkThresholds(reading);
}

/**
 * Get air quality for location
 */
export async function getAirQuality(
  lat: number,
  lng: number,
  radius: number = 2000
): Promise<AirQualityData | null> {
  // Find nearest air quality sensor
  const result = await db.execute(sql`
    SELECT * FROM iot_sensors 
    WHERE type = 'air_quality' 
    AND status = 'active'
    AND (6371 * acos(
      cos(radians(${lat})) * cos(radians(latitude)) *
      cos(radians(longitude) - radians(${lng})) +
      sin(radians(${lat})) * sin(radians(latitude))
    )) <= ${radius / 1000}
    ORDER BY 
      (6371 * acos(
        cos(radians(${lat})) * cos(radians(latitude)) *
        cos(radians(longitude) - radians(${lng})) +
        sin(radians(${lat})) * sin(radians(latitude))
      ))
    LIMIT 1
  `);

  if (!result.rows[0]) return null;

  const sensorId = result.rows[0].id;
  
  // Get latest reading
  const readingResult = await db.execute(sql`
    SELECT * FROM sensor_readings 
    WHERE sensor_id = ${sensorId}
    ORDER BY timestamp DESC
    LIMIT 1
  `);

  if (!readingResult.rows[0]) return null;

  const values = JSON.parse(readingResult.rows[0].values);
  
  return {
    aqi: values.aqi || 50,
    pm25: values.pm25 || 25,
    pm10: values.pm10 || 40,
    no2: values.no2 || 30,
    o3: values.o3 || 35,
    temperature: values.temperature || 20,
    humidity: values.humidity || 60,
  };
}

/**
 * Get crowd density for place
 */
export async function getCrowdDensity(placeId: string): Promise<{
  level: 'low' | 'moderate' | 'high' | 'very_high';
  percentage: number;
  estimatedWait?: number;
}> {
  const result = await db.execute(sql`
    SELECT values FROM sensor_readings r
    JOIN iot_sensors s ON s.id = r.sensor_id
    WHERE s.place_id = ${placeId} AND s.type = 'crowd'
    ORDER BY r.timestamp DESC
    LIMIT 1
  `);

  if (!result.rows[0]) {
    return { level: 'low', percentage: 20 };
  }

  const values = JSON.parse(result.rows[0].values);
  const percentage = values.occupancy || 30;

  let level: 'low' | 'moderate' | 'high' | 'very_high' = 'low';
  if (percentage > 80) level = 'very_high';
  else if (percentage > 60) level = 'high';
  else if (percentage > 40) level = 'moderate';

  return {
    level,
    percentage,
    estimatedWait: level === 'high' || level === 'very_high' ? 15 : undefined,
  };
}

/**
 * Get parking availability
 */
export async function getParkingAvailability(areaId: string): Promise<{
  total: number;
  available: number;
  updatedAt: Date;
}> {
  const result = await db.execute(sql`
    SELECT values, timestamp FROM sensor_readings r
    JOIN iot_sensors s ON s.id = r.sensor_id
    WHERE s.place_id = ${areaId} AND s.type = 'parking'
    ORDER BY r.timestamp DESC
    LIMIT 1
  `);

  if (!result.rows[0]) {
    return { total: 100, available: 45, updatedAt: new Date() };
  }

  const values = JSON.parse(result.rows[0].values);
  
  return {
    total: values.total || 100,
    available: values.available || 0,
    updatedAt: new Date(result.rows[0].timestamp),
  };
}

async function checkThresholds(reading: SensorReading): Promise<void> {
  // Alert logic for critical values
  if (reading.quality === 'critical') {
    logger.info(`[IoT] Critical reading from sensor ${reading.sensorId}`);
    // Send alerts
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
