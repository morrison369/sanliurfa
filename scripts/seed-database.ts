/**
 * Database Seeding Script
 * Generates realistic test data for development
 */

import { pool } from '../src/lib/postgres';
import { v4 as uuidv4 } from 'uuid';
import bcryptjs from 'bcryptjs';
import { deterministicInt, deterministicNumber } from '../src/lib/deterministic';

const PLACES_COUNT = 100;
const USERS_COUNT = 50;
const REVIEWS_PER_PLACE = 5;

const CATEGORIES = ['Restoran', 'Müze', 'Tarihi Site', 'Park', 'Kafe'];
const DISTRICTS = ['Merkez', 'Eyyübiye', 'Haliliye', 'Karakopru'];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    await pool.query('TRUNCATE TABLE users, places, reviews, favorites CASCADE');

    // Seed users
    console.log('👤 Creating users...');
    const users = [];
    for (let i = 0; i < USERS_COUNT; i++) {
      const userId = uuidv4();
      const hashedPassword = await bcryptjs.hash('TestPass123!@#', 12);

      await pool.query(
        `INSERT INTO users (id, email, password_hash, full_name, role, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          userId,
          `user${i}@example.com`,
          hashedPassword,
          `Test User ${i}`,
          i === 0 ? 'admin' : 'user'
        ]
      );

      users.push(userId);
    }
    console.log(`✅ Created ${USERS_COUNT} users`);

    // Seed places
    console.log('📍 Creating places...');
    const places = [];
    for (let i = 0; i < PLACES_COUNT; i++) {
      const placeId = uuidv4();
      const category = CATEGORIES[deterministicInt(`seed-place-category:${i}`, 0, CATEGORIES.length - 1)];
      const district = DISTRICTS[deterministicInt(`seed-place-district:${i}`, 0, DISTRICTS.length - 1)];

      await pool.query(
        `INSERT INTO places (id, name, description, category, district, latitude, longitude, rating, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          placeId,
          `Place ${i + 1}`,
          `Description for place ${i + 1}`,
          category,
          district,
          deterministicNumber(`seed-place-lat:${i}`, 37.1592, 37.2592, 6),
          deterministicNumber(`seed-place-lng:${i}`, 38.7969, 38.8969, 6),
          deterministicInt(`seed-place-rating:${i}`, 1, 5)
        ]
      );

      places.push(placeId);
    }
    console.log(`✅ Created ${PLACES_COUNT} places`);

    // Seed reviews
    console.log('⭐ Creating reviews...');
    let reviewCount = 0;
    for (let placeIndex = 0; placeIndex < places.length; placeIndex++) {
      const placeId = places[placeIndex];
      for (let i = 0; i < REVIEWS_PER_PLACE; i++) {
        const reviewId = uuidv4();
        const userId = users[deterministicInt(`seed-review-user:${placeIndex}:${i}`, 0, users.length - 1)];
        const rating = deterministicInt(`seed-review-rating:${placeIndex}:${i}`, 1, 5);

        await pool.query(
          `INSERT INTO reviews (id, place_id, user_id, rating, comment, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            reviewId,
            placeId,
            userId,
            rating,
            `This is a great place! Rating: ${rating} stars.`
          ]
        );

        reviewCount++;
      }
    }
    console.log(`✅ Created ${reviewCount} reviews`);

    // Seed favorites
    console.log('❤️ Creating favorites...');
    let favoriteCount = 0;
    for (let userIndex = 0; userIndex < Math.min(10, users.length); userIndex++) {
      const userId = users[userIndex];
      for (let i = 0; i < 10; i++) {
        const placeId = places[deterministicInt(`seed-favorite-place:${userIndex}:${i}`, 0, places.length - 1)];

        try {
          await pool.query(
            `INSERT INTO favorites (user_id, place_id, created_at)
             VALUES ($1, $2, NOW())`,
            [userId, placeId]
          );
          favoriteCount++;
        } catch {
          // Skip duplicates
        }
      }
    }
    console.log(`✅ Created ${favoriteCount} favorites`);

    console.log('🎉 Database seeding completed successfully!');
    console.log(`
    Summary:
    - Users: ${USERS_COUNT}
    - Places: ${PLACES_COUNT}
    - Reviews: ${reviewCount}
    - Favorites: ${favoriteCount}
    `);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
