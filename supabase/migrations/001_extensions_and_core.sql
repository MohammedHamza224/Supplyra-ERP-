-- Migration 001: Extensions and Core Functions

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable moddatetime extension for automatic updated_at timestamp updates
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- Create standard updated_at trigger function if we don't want to rely solely on moddatetime
CREATE OR REPLACE FUNCTION set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
