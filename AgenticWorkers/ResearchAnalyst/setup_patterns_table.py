#!/usr/bin/env python3
"""
Setup script to create grievance_patterns tables in the database
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import psycopg2

# Load environment variables
load_dotenv()

def create_patterns_tables():
    """Create the grievance_patterns and grievance_pattern_links tables"""
    
    # Get database connection string
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("❌ DATABASE_URL not found in .env file")
        return False
    
    print("📊 Creating grievance_patterns tables...")
    
    try:
        # Connect to database
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Read SQL file
        sql_file = Path(__file__).parent / "create_patterns_table.sql"
        with open(sql_file, 'r') as f:
            sql = f.read()
        
        # Execute SQL
        cursor.execute(sql)
        
        print("✅ Tables created successfully!")
        print("   - grievance_patterns")
        print("   - grievance_pattern_links")
        
        # Check if tables exist
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('grievance_patterns', 'grievance_pattern_links')
            ORDER BY table_name
        """)
        
        tables = cursor.fetchall()
        print(f"\n✓ Verified {len(tables)} tables exist:")
        for table in tables:
            print(f"   - {table[0]}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = create_patterns_tables()
    sys.exit(0 if success else 1)
