import { pool } from '../lib/postgres';

export async function up() {
  await pool.query(`
    -- places: search_vector column + GIN index
    ALTER TABLE places ADD COLUMN IF NOT EXISTS search_vector tsvector;

    UPDATE places SET search_vector =
      to_tsvector('turkish',
        coalesce(name, '') || ' ' ||
        coalesce(short_description, '') || ' ' ||
        coalesce(description, '') || ' ' ||
        coalesce(address, '')
      );

    CREATE INDEX IF NOT EXISTS places_search_vector_gin
      ON places USING GIN(search_vector);

    -- places: auto-update trigger
    CREATE OR REPLACE FUNCTION places_search_vector_update() RETURNS trigger AS $func$
    BEGIN
      NEW.search_vector :=
        to_tsvector('turkish',
          coalesce(NEW.name, '') || ' ' ||
          coalesce(NEW.short_description, '') || ' ' ||
          coalesce(NEW.description, '') || ' ' ||
          coalesce(NEW.address, '')
        );
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS places_search_vector_trigger ON places;
    CREATE TRIGGER places_search_vector_trigger
      BEFORE INSERT OR UPDATE ON places
      FOR EACH ROW EXECUTE FUNCTION places_search_vector_update();

    -- blog_posts: search_vector column + GIN index
    ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS search_vector tsvector;

    UPDATE blog_posts SET search_vector =
      to_tsvector('turkish',
        coalesce(title, '') || ' ' ||
        coalesce(excerpt, '') || ' ' ||
        coalesce(category, '')
      );

    CREATE INDEX IF NOT EXISTS blog_posts_search_vector_gin
      ON blog_posts USING GIN(search_vector);

    CREATE OR REPLACE FUNCTION blog_posts_search_vector_update() RETURNS trigger AS $func2$
    BEGIN
      NEW.search_vector :=
        to_tsvector('turkish',
          coalesce(NEW.title, '') || ' ' ||
          coalesce(NEW.excerpt, '') || ' ' ||
          coalesce(NEW.category, '')
        );
      RETURN NEW;
    END;
    $func2$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS blog_posts_search_vector_trigger ON blog_posts;
    CREATE TRIGGER blog_posts_search_vector_trigger
      BEFORE INSERT OR UPDATE ON blog_posts
      FOR EACH ROW EXECUTE FUNCTION blog_posts_search_vector_update();

    -- events: search_vector column + GIN index
    ALTER TABLE events ADD COLUMN IF NOT EXISTS search_vector tsvector;

    UPDATE events SET search_vector =
      to_tsvector('turkish',
        coalesce(title, '') || ' ' ||
        coalesce(description, '') || ' ' ||
        coalesce(location, '') || ' ' ||
        coalesce(category, '')
      );

    CREATE INDEX IF NOT EXISTS events_search_vector_gin
      ON events USING GIN(search_vector);

    CREATE OR REPLACE FUNCTION events_search_vector_update() RETURNS trigger AS $func3$
    BEGIN
      NEW.search_vector :=
        to_tsvector('turkish',
          coalesce(NEW.title, '') || ' ' ||
          coalesce(NEW.description, '') || ' ' ||
          coalesce(NEW.location, '') || ' ' ||
          coalesce(NEW.category, '')
        );
      RETURN NEW;
    END;
    $func3$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS events_search_vector_trigger ON events;
    CREATE TRIGGER events_search_vector_trigger
      BEFORE INSERT OR UPDATE ON events
      FOR EACH ROW EXECUTE FUNCTION events_search_vector_update();
  `);
}

export async function down() {
  await pool.query(`
    DROP TRIGGER IF EXISTS places_search_vector_trigger ON places;
    DROP TRIGGER IF EXISTS blog_posts_search_vector_trigger ON blog_posts;
    DROP TRIGGER IF EXISTS events_search_vector_trigger ON events;
    DROP FUNCTION IF EXISTS places_search_vector_update();
    DROP FUNCTION IF EXISTS blog_posts_search_vector_update();
    DROP FUNCTION IF EXISTS events_search_vector_update();
    DROP INDEX IF EXISTS places_search_vector_gin;
    DROP INDEX IF EXISTS blog_posts_search_vector_gin;
    DROP INDEX IF EXISTS events_search_vector_gin;
    ALTER TABLE places DROP COLUMN IF EXISTS search_vector;
    ALTER TABLE blog_posts DROP COLUMN IF EXISTS search_vector;
    ALTER TABLE events DROP COLUMN IF EXISTS search_vector;
  `);
}
