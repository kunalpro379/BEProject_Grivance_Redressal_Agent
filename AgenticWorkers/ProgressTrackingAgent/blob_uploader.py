"""
Azure Blob Storage uploader for progress reports
Uploads markdown reports to Azure Blob Storage and saves URLs to database
"""
import os
import datetime
import json
from azure.storage.blob import BlobServiceClient
from pathlib import Path
import config
from database import DatabaseService

class BlobUploader:
    def __init__(self):
        self.connection_string = config.AZURE_STORAGE_CONNECTION_STRING
        self.container_name = config.AZURE_STORAGE_CONTAINER_NAME
        self.blob_folder = "progress-reports"
        self.db = DatabaseService()
        
        if not self.connection_string:
            print("⚠️  Azure Storage connection string not configured - reports will only be saved locally")
            self.blob_service_client = None
        else:
            self.blob_service_client = BlobServiceClient.from_connection_string(self.connection_string)
            print("✅ Azure Blob Storage client initialized")
    
    def upload_report(self, report_path: str, department_id: str, department_name: str) -> str:
        """
        Upload a report to Azure Blob Storage and save URL to database
        
        Args:
            report_path: Local path to the markdown report file
            department_id: UUID of the department
            department_name: Name of the department
            
        Returns:
            Blob URL if successful, None otherwise
        """
        if not self.blob_service_client:
            print("⚠️  Skipping blob upload - Azure Storage not configured")
            return None
        
        try:
            # Get container client
            container_client = self.blob_service_client.get_container_client(self.container_name)
            
            # Ensure container exists
            try:
                container_client.create_container()
                print(f"✅ Created container: {self.container_name}")
            except Exception:
                # Container already exists
                pass
            
            # Extract filename and metadata from path
            file_path = Path(report_path)
            filename = file_path.name
            
            # Extract date and time from filename
            # Format: department_Water_Supply_Department_20260301_040940.md
            parts = filename.replace('.md', '').split('_')
            if len(parts) >= 2:
                date_str = parts[-2]  # YYYYMMDD
                time_str = parts[-1]  # HHMMSS
                report_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
                report_time = f"{time_str[:2]}:{time_str[2:4]}:{time_str[4:6]}"
            else:
                report_date = datetime.datetime.now().strftime("%Y-%m-%d")
                report_time = datetime.datetime.now().strftime("%H:%M:%S")
            
            # Create blob path: progress-reports/{departmentId}/{filename}
            blob_name = f"{self.blob_folder}/{department_id}/{filename}"
            
            # Get blob client
            blob_client = container_client.get_blob_client(blob_name)
            
            # Check if blob already exists
            if blob_client.exists():
                print(f"   ℹ️  Blob already exists: {blob_name}")
                blob_url = blob_client.url
            else:
                # Read file content
                with open(report_path, 'rb') as data:
                    file_content = data.read()
                
                # Upload to blob with metadata
                from azure.storage.blob import ContentSettings
                
                blob_client.upload_blob(
                    file_content,
                    overwrite=True,
                    content_settings=ContentSettings(content_type='text/markdown'),
                    metadata={
                        'uploadedAt': datetime.datetime.now().isoformat(),
                        'source': 'progress-tracking-agent',
                        'departmentId': department_id,
                        'departmentName': department_name,
                        'reportDate': report_date,
                        'reportTime': report_time
                    }
                )
                
                blob_url = blob_client.url
                print(f"   ✅ Uploaded to blob: {blob_name}")
            
            # Save URL to database
            self._save_url_to_database(
                department_id=department_id,
                blob_url=blob_url,
                filename=filename,
                report_date=report_date,
                report_time=report_time,
                department_name=department_name
            )
            
            return blob_url
            
        except Exception as e:
            print(f"   ❌ Error uploading to blob: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def _save_url_to_database(self, department_id: str, blob_url: str, filename: str, 
                              report_date: str, report_time: str, department_name: str):
        """Save blob URL to department_dashboards table"""
        try:
            # Create report metadata
            report_metadata = {
                'url': blob_url,
                'fileName': filename,
                'uploadedAt': datetime.datetime.now().isoformat(),
                'reportDate': report_date,
                'reportTime': report_time,
                'departmentName': department_name
            }
            
            # Get database connection
            conn = self.db._get_connection()
            cur = conn.cursor()
            
            # Insert or update department_dashboards table
            query = """
                INSERT INTO department_dashboards (department_id, dashboard_data, created_at, updated_at)
                VALUES (%s, %s, NOW(), NOW())
                ON CONFLICT (department_id)
                DO UPDATE SET 
                  dashboard_data = jsonb_set(
                    COALESCE(department_dashboards.dashboard_data, '{}'::jsonb),
                    '{progressReports}',
                    COALESCE(department_dashboards.dashboard_data->'progressReports', '[]'::jsonb) || %s::jsonb
                  ),
                  updated_at = NOW()
            """
            
            # Wrap in progressReports array for JSONB concatenation
            progress_reports_array = json.dumps([report_metadata])
            
            cur.execute(
                query,
                (department_id, json.dumps({'progressReports': [report_metadata]}), progress_reports_array)
            )
            
            conn.commit()
            cur.close()
            conn.close()
            
            print(f"   💾 Saved URL to database for department: {department_name} ({department_id})")
            
        except Exception as e:
            print(f"   ❌ Error saving URL to database: {e}")
            import traceback
            traceback.print_exc()
