
-- Check if the database "questions" exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'questions') THEN
        -- Create the database if it doesn't exist
        CREATE DATABASE questions;
    END IF;
END $$;

