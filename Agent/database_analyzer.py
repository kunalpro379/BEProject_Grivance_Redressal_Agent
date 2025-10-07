#!/usr/bin/env python3
"""
Database Analyzer for PostgreSQL Databases
Connects to multiple databases and extracts table/column information
"""

import psycopg2
import json
from datetime import datetime
import sys
from typing import Dict, List, Any

class DatabaseAnalyzer:
    def __init__(self):
        self.databases = {
            "Database 1": "postgresql://neondb_owner:npg_guEDpc41nrbV@ep-orange-tree-ae1ujojp-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
            "Database 2": "postgresql://neondb_owner:npg_D3h5QNKcmHek@ep-spring-term-adebssla-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
            "Database 3": "postgresql://neondb_owner:npg_czCHWS3ZQ5mJ@ep-calm-violet-adhbrwhg-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
            "Database 4": "postgresql://neondb_owner:npg_RHui54ULlKre@ep-curly-salad-adh6uyhc-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
        }
        self.results = {}

    def connect_to_database(self, db_name: str, connection_string: str) -> Dict[str, Any]:
        """Connect to a database and extract schema information"""
        try:
            print(f"🔗 Connecting to {db_name}...")
            conn = psycopg2.connect(connection_string)
            cursor = conn.cursor()
            
            # Get database info
            cursor.execute("SELECT current_database(), version()")
            db_info = cursor.fetchone()
            
            # Get all tables
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
            
            # Get table details with columns
            table_details = {}
            for schema, table, owner in tables:
                table_key = f"{schema}.{table}"
                
                # Get columns for this table
                cursor.execute("""
                    SELECT 
                        column_name,
                        data_type,
                        is_nullable,
                        column_default,
                        character_maximum_length
                    FROM information_schema.columns 
                    WHERE table_schema = %s AND table_name = %s
                    ORDER BY ordinal_position
                """, (schema, table))
                
                columns = cursor.fetchall()
                
                # Get primary keys
                cursor.execute("""
                    SELECT kcu.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu 
                        ON tc.constraint_name = kcu.constraint_name
                    WHERE tc.table_schema = %s 
                        AND tc.table_name = %s 
                        AND tc.constraint_type = 'PRIMARY KEY'
                """, (schema, table))
                
                primary_keys = [row[0] for row in cursor.fetchall()]
                
                # Get foreign keys
                cursor.execute("""
                    SELECT 
                        kcu.column_name,
                        ccu.table_schema AS foreign_table_schema,
                        ccu.table_name AS foreign_table_name,
                        ccu.column_name AS foreign_column_name
                    FROM information_schema.table_constraints AS tc 
                    JOIN information_schema.key_column_usage AS kcu
                        ON tc.constraint_name = kcu.constraint_name
                    JOIN information_schema.constraint_column_usage AS ccu
                        ON ccu.constraint_name = tc.constraint_name
                    WHERE tc.constraint_type = 'FOREIGN KEY' 
                        AND tc.table_schema = %s 
                        AND tc.table_name = %s
                """, (schema, table))
                
                foreign_keys = cursor.fetchall()
                
                # Get row count
                try:
                    cursor.execute(f'SELECT COUNT(*) FROM "{schema}"."{table}"')
                    row_count = cursor.fetchone()[0]
                except:
                    row_count = "Unable to count"
                
                table_details[table_key] = {
                    "schema": schema,
                    "table": table,
                    "owner": owner,
                    "row_count": row_count,
                    "columns": [
                        {
                            "name": col[0],
                            "type": col[1],
                            "nullable": col[2] == "YES",
                            "default": col[3],
                            "max_length": col[4]
                        } for col in columns
                    ],
                    "primary_keys": primary_keys,
                    "foreign_keys": [
                        {
                            "column": fk[0],
                            "references_schema": fk[1],
                            "references_table": fk[2],
                            "references_column": fk[3]
                        } for fk in foreign_keys
                    ]
                }
            
            cursor.close()
            conn.close()
            
            return {
                "database_name": db_info[0],
                "version": db_info[1],
                "connection_status": "Success",
                "tables_count": len(tables),
                "tables": table_details
            }
            
        except Exception as e:
            return {
                "database_name": db_name,
                "connection_status": "Failed",
                "error": str(e),
                "tables_count": 0,
                "tables": {}
            }

    def analyze_all_databases(self):
        """Analyze all databases"""
        print("🚀 Starting Database Analysis")
        print("=" * 50)
        
        for db_name, connection_string in self.databases.items():
            print(f"\n📊 Analyzing {db_name}...")
            result = self.connect_to_database(db_name, connection_string)
            self.results[db_name] = result
            
            if result["connection_status"] == "Success":
                print(f"✅ Connected successfully")
                print(f"📋 Found {result['tables_count']} tables")
            else:
                print(f"❌ Connection failed: {result.get('error', 'Unknown error')}")

    def print_summary(self):
        """Print a summary of all databases"""
        print("\n" + "="*60)
        print("📊 DATABASE ANALYSIS SUMMARY")
        print("="*60)
        
        total_tables = 0
        successful_connections = 0
        
        for db_name, result in self.results.items():
            print(f"\n🗄️  {db_name}")
            print("-" * 40)
            
            if result["connection_status"] == "Success":
                successful_connections += 1
                print(f"✅ Status: Connected")
                print(f"📊 Database: {result['database_name']}")
                print(f"📋 Tables: {result['tables_count']}")
                total_tables += result['tables_count']
                
                if result['tables_count'] > 0:
                    print("\n📝 Tables found:")
                    for table_key, table_info in result['tables'].items():
                        print(f"  • {table_key} ({table_info['row_count']} rows)")
                        print(f"    Columns: {len(table_info['columns'])}")
                        for col in table_info['columns'][:3]:  # Show first 3 columns
                            print(f"      - {col['name']} ({col['type']})")
                        if len(table_info['columns']) > 3:
                            print(f"      ... and {len(table_info['columns']) - 3} more columns")
            else:
                print(f"❌ Status: Failed")
                print(f"🔍 Error: {result.get('error', 'Unknown error')}")
        
        print(f"\n📈 SUMMARY STATISTICS")
        print(f"✅ Successful connections: {successful_connections}/{len(self.databases)}")
        print(f"📋 Total tables found: {total_tables}")

    def save_results(self, filename="database_analysis_results.json"):
        """Save results to JSON file"""
        try:
            output_data = {
                "analysis_timestamp": datetime.now().isoformat(),
                "total_databases": len(self.databases),
                "results": self.results
            }
            
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(output_data, f, indent=2, ensure_ascii=False)
            
            print(f"\n💾 Results saved to: {filename}")
        except Exception as e:
            print(f"❌ Error saving results: {e}")

    def print_detailed_schema(self):
        """Print detailed schema information"""
        print("\n" + "="*60)
        print("🔍 DETAILED SCHEMA INFORMATION")
        print("="*60)
        
        for db_name, result in self.results.items():
            if result["connection_status"] == "Success":
                print(f"\n🗄️  {db_name} - {result['database_name']}")
                print("=" * 50)
                
                for table_key, table_info in result['tables'].items():
                    print(f"\n📋 Table: {table_key}")
                    print(f"   Owner: {table_info['owner']}")
                    print(f"   Rows: {table_info['row_count']}")
                    print(f"   Columns: {len(table_info['columns'])}")
                    
                    print("   📝 Column Details:")
                    for col in table_info['columns']:
                        nullable = "NULL" if col['nullable'] else "NOT NULL"
                        default = f", DEFAULT: {col['default']}" if col['default'] else ""
                        max_len = f"({col['max_length']})" if col['max_length'] else ""
                        print(f"      • {col['name']}: {col['type']}{max_len} {nullable}{default}")
                    
                    if table_info['primary_keys']:
                        print(f"   🔑 Primary Keys: {', '.join(table_info['primary_keys'])}")
                    
                    if table_info['foreign_keys']:
                        print("   🔗 Foreign Keys:")
                        for fk in table_info['foreign_keys']:
                            print(f"      • {fk['column']} → {fk['references_schema']}.{fk['references_table']}.{fk['references_column']}")

def main():
    """Main function"""
    print("🔍 PostgreSQL Database Analyzer")
    print("=" * 40)
    
    analyzer = DatabaseAnalyzer()
    
    try:
        # Analyze all databases
        analyzer.analyze_all_databases()
        
        # Print summary
        analyzer.print_summary()
        
        # Print detailed schema
        analyzer.print_detailed_schema()
        
        # Save results
        analyzer.save_results()
        
    except KeyboardInterrupt:
        print("\n⏹️  Analysis interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
