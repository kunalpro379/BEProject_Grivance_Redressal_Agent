#!/usr/bin/env python3
"""
Test script to send a message to ResearchAnalyst queue
"""

import json
import os
from datetime import datetime
from azure.storage.queue import QueueClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def send_test_message():
    """Send a test message to the ResearchAnalyst queue"""
    
    # Get configuration
    connection_string = os.getenv('AZURE_STORAGE_CONNECTION_STRING')
    queue_name = os.getenv('AZURE_QUEUE_RESEARCHANALYST_NAME', 'researchanalyst')
    
    if not connection_string:
        print("❌ AZURE_STORAGE_CONNECTION_STRING not found in .env")
        return
    
    print(f"📤 Sending test message to queue: {queue_name}")
    
    # Create queue client
    queue_client = QueueClient.from_connection_string(
        conn_str=connection_string,
        queue_name=queue_name
    )
    
    # Create test message
    # NOTE: Use the grievance_id STRING (like "GRV-2024-001234"), NOT the UUID
    message = {
        "grievance_id": "GRV-2024-001234",  # Use actual grievance_id from your database
        "timestamp": datetime.now().isoformat(),
        "source": "TestScript"
    }
    
    print(f"\n📝 Message content:")
    print(json.dumps(message, indent=2))
    print(f"\n⚠️  IMPORTANT: Make sure 'grievance_id' is the string ID (like 'GRV-2024-001234'),")
    print(f"   NOT the UUID from usergrievance.id column!")
    
    # Send message
    try:
        message_json = json.dumps(message)
        queue_client.send_message(message_json)
        print(f"\n✅ Message sent successfully!")
        print(f"   Queue: {queue_name}")
        print(f"   Grievance ID: {message['grievance_id']}")
    except Exception as e:
        print(f"\n❌ Error sending message: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    send_test_message()
