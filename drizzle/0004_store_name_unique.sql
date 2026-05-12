-- Add unique constraint on store names to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS stores_name_unique ON stores(name);
