#!/usr/bin/env python3
"""
Quick Schema Viewer
Shows databases, tables, and basic column information
"""

import psycopg2
import sys

def get_quick_schema(connection_string, db_name):
    """Get quick schema information"""
    try:
        conn = psycopg2.connect(connection_string)
        cursor = conn.cursor()
        
        # Get database info
        cursor.execute("SELECT current_database(), version()")
        db_info = cursor.fetchone()
        
        # Get tables with basic info
        cursor.execute("""
            SELECT 
                schemaname,
                tablename,
                tableowner
            FROM pg_tables 
            WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
            ORDER BY schemaname, tablename
        """)
        tables = cursor.fetchall()
        
        print(f"🗄️  {db_name}")
        print(f"   Database: {db_info[0]}")
        print(f"   Tables: {len(tables)}")
        print()
        
        for schema, table, owner in tables:
            table_name = f"{schema}.{table}"
            print(f"📋 {table_name}")
            
            # Get column count and basic info
            cursor.execute("""
                SELECT 
                    column_name,
                    data_type
                FROM information_schema.columns 
                WHERE table_schema = %s AND table_name = %s
                ORDER BY ordinal_position
            """, (schema, table))
            
            columns = cursor.fetchall()
            print(f"   Columns: {len(columns)}")
            
            # Show first few columns
            for i, (col_name, col_type) in enumerate(columns[:5]):
                print(f"      • {col_name} ({col_type})")
            
            if len(columns) > 5:
                print(f"      ... and {len(columns) - 5} more columns")
            
            print()
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ {db_name}: {str(e)}")
        return False

def main():
    """Show quick schema for all databases"""
    print("🔍 Quick Database Schema Viewer")
    print("=" * 50)
    
    databases = {
        "Database 1": "postgresql://neondb_owner:npg_guEDpc41nrbV@ep-orange-tree-ae1ujojp-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
        "Database 2": "postgresql://neondb_owner:npg_D3h5QNKcmHek@ep-spring-term-adebssla-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
        "Database 3": "postgresql://neondb_owner:npg_czCHWS3ZQ5mJ@ep-calm-violet-adhbrwhg-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
        "Database 4": "postgresql://neondb_owner:npg_RHui54ULlKre@ep-curly-salad-adh6uyhc-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    }
    
    successful = 0
    total_tables = 0
    
    for db_name, connection_string in databases.items():
        if get_quick_schema(connection_string, db_name):
            successful += 1
    
    print("=" * 50)
    print(f"📊 SUMMARY")
    print(f"✅ Databases connected: {successful}/{len(databases)}")
    print(f"📋 Total tables found: {total_tables}")

if __name__ == "__main__":
    main()
