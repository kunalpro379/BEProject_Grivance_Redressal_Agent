# Vector Embeddings Storage for RAG System

This script stores vector embeddings from various CSV files into a Neon database for use in a Retrieval-Augmented Generation (RAG) system.

## What it does

The script reads the following CSV files and creates vector embeddings for semantic search:

1. **categorized_grievances_dataset.csv** - Grievance descriptions and categories
2. **categories_and_subcategories.csv** - Category and subcategory mappings
3. **organization.csv** - Organization names
4. **public_authority.csv** - Public authority names
5. **Department.csv** - Department names
6. **OfficerDepartment.csv** - Officer and department details
7. **state-district.csv** - State and district names
8. **user.csv** - User names and locations

## Features

- Uses `all-MiniLM-L6-v2` model for generating 384-dimensional embeddings
- Creates optimized database tables with vector indexes for fast similarity search
- Handles large datasets efficiently with progress bars
- Combines multiple text fields for better semantic representation
- Creates vector indexes using `ivfflat` for fast cosine similarity search

## Database Tables Created

The script creates the following tables in your Neon database:

- `categorized_grievances_embeddings` - Grievance descriptions and categories
- `category_subcategory_embeddings` - Categories and subcategories
- `organization_embeddings` - Organization names
- `public_authority_embeddings` - Public authority names
- `department_embeddings` - Department names
- `officer_department_embeddings` - Officer and department details
- `state_district_embeddings` - State and district names
- `user_embeddings` - User names and locations

## Installation

1. Install the required dependencies:
```bash
pip install -r requirements_embeddings.txt
```

2. Make sure you have access to your Neon database with the connection string provided.

## Usage

1. Navigate to the preprocessed folder:
```bash
cd preprocessed
```

2. Run the script:
```bash
python store_embeddings.py
```

The script will:
- Connect to your Neon database
- Create all necessary tables with vector support
- Process each CSV file and generate embeddings
- Store the embeddings in the database
- Create optimized indexes for fast similarity search

## Database Connection

The script uses the following Neon database connection string:
```
postgresql://neondb_owner:npg_guEDpc41nrbV@ep-orange-tree-ae1ujojp-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

## Vector Search Capabilities

After running the script, you can perform semantic similarity searches using PostgreSQL vector operations:

```sql
-- Find similar grievances
SELECT description, category, 
       1 - (combined_embedding <=> '[0.1, 0.2, ...]') as similarity
FROM categorized_grievances_embeddings
ORDER BY combined_embedding <=> '[0.1, 0.2, ...]'
LIMIT 10;

-- Find similar organizations
SELECT org_name,
       1 - (org_embedding <=> '[0.1, 0.2, ...]') as similarity
FROM organization_embeddings
ORDER BY org_embedding <=> '[0.1, 0.2, ...]'
LIMIT 10;
```

## Performance Notes

- The script processes data in batches and commits after each dataset
- Vector indexes are created for fast similarity search
- Uses `ivfflat` indexing with 100 lists for optimal performance
- Embeddings are generated using a lightweight model for speed

## Troubleshooting

- Make sure your Neon database supports the `vector` extension
- Ensure you have sufficient database storage for all embeddings
- Check that all CSV files are in the same directory as the script
- Monitor memory usage when processing large datasets

## Output

The script provides detailed logging of the embedding generation process and will display progress bars for each dataset being processed.
