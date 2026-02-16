-- Migration: Add embedding column to UserGrievance table
-- Description: Adds vector column for storing embeddings from sentence-transformers

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to UserGrievance table
-- Using vector(384) for all-MiniLM-L6-v2 model (384 dimensions)
ALTER TABLE "UserGrievance" 
ADD COLUMN IF NOT EXISTS embedding vector(384);

-- Create index for faster similarity search
CREATE INDEX IF NOT EXISTS usergrievance_embedding_idx 
ON "UserGrievance" 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Add comment
COMMENT ON COLUMN "UserGrievance".embedding IS 'Sentence embedding vector (384 dimensions) for semantic search';
