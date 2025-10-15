CREATE DATABASE spektra_db OWNER spektra_user;

-- Users table
CREATE TABLE users (
    email VARCHAR(255) PRIMARY KEY,
    hashed_password VARCHAR(255),
    user_name VARCHAR(255)
);

-- ID table for unique search terms
CREATE TABLE search_queries (
    query_id SERIAL PRIMARY KEY,
    -- display_id VARCHAR(10) GENERATED ALWAYS AS ('SI' || LPAD(query_id::text, 4, '0')) STORED,
    search_term VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API data table
CREATE TABLE api_data (
    search_id SERIAL PRIMARY KEY,
    query_id INTEGER NOT NULL REFERENCES search_queries(query_id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    search_term VARCHAR(255) NOT NULL, 
    fetched_data JSONB, 
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API calls tracking table
CREATE TABLE api_calls_tracker (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    api_calls INTEGER DEFAULT 0,
    call_limit INTEGER DEFAULT 20,
    month VARCHAR(20),  -- Format: "January 2025"
    UNIQUE(user_email, month)
);


