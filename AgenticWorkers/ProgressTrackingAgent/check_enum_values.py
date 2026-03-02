"""
Check the actual enum values in the database
"""
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Query to get enum values for escalation_level
    cur.execute("""
        SELECT 
            t.typname as enum_name,
            e.enumlabel as enum_value
        FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid  
        WHERE t.typname LIKE '%escalation%'
        ORDER BY e.enumsortorder;
    """)
    
    results = cur.fetchall()
    
    if results:
        print("Found escalation_level enum values:")
        print("=" * 60)
        for enum_name, enum_value in results:
            print(f"  {enum_name}: '{enum_value}'")
    else:
        print("No escalation enum found. Checking all enums...")
        
        cur.execute("""
            SELECT 
                t.typname as enum_name,
                e.enumlabel as enum_value
            FROM pg_type t 
            JOIN pg_enum e ON t.oid = e.enumtypid  
            ORDER BY t.typname, e.enumsortorder;
        """)
        
        results = cur.fetchall()
        current_enum = None
        for enum_name, enum_value in results:
            if enum_name != current_enum:
                print(f"\n{enum_name}:")
                current_enum = enum_name
            print(f"  - '{enum_value}'")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
