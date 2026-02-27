#!/usr/bin/env python3
"""
Real-time Queue Monitor
Watch queue size decrease as worker processes messages
"""

import time
from azure.storage.queue import QueueClient
from config.settings import settings

def monitor_queue(interval=10, duration=300):
    """
    Monitor queue for specified duration
    
    Args:
        interval: Check every X seconds
        duration: Total monitoring time in seconds
    """
    print("="*70)
    print("QUEUE MONITOR - Real-time Tracking")
    print("="*70)
    
    try:
        queue_client = QueueClient.from_connection_string(
            settings.AZURE_CONNECTION_STRING,
            settings.WEBCRAWLER_QUEUE
        )
        
        print(f"\n📊 Queue: {settings.WEBCRAWLER_QUEUE}")
        print(f"⏱️  Checking every {interval} seconds")
        print(f"⏳ Duration: {duration} seconds ({duration//60} minutes)")
        print("\n" + "-"*70)
        print(f"{'Time':<12} | {'Messages':<10} | {'Change':<10} | {'Rate/min':<10}")
        print("-"*70)
        
        start_time = time.time()
        prev_count = None
        prev_time = start_time
        
        while (time.time() - start_time) < duration:
            try:
                properties = queue_client.get_queue_properties()
                current_count = properties.approximate_message_count
                current_time = time.time()
                
                # Calculate change
                if prev_count is not None:
                    change = prev_count - current_count
                    time_diff = (current_time - prev_time) / 60  # minutes
                    rate = change / time_diff if time_diff > 0 else 0
                    
                    # Format output
                    elapsed = int(current_time - start_time)
                    time_str = f"{elapsed//60}m {elapsed%60}s"
                    change_str = f"{change:+d}" if change != 0 else "0"
                    
                    # Status indicator
                    if change > 0:
                        status = "✅ Decreasing"
                    elif change < 0:
                        status = "⚠️  Increasing"
                    else:
                        status = "⏸️  Stable"
                    
                    print(f"{time_str:<12} | {current_count:<10} | {change_str:<10} | {rate:>6.1f}/min  {status}")
                else:
                    print(f"0m 0s        | {current_count:<10} | -          | -          Initial")
                
                prev_count = current_count
                prev_time = current_time
                
                # Check if queue is empty
                if current_count == 0:
                    print("\n" + "="*70)
                    print("🎉 QUEUE IS EMPTY!")
                    print("="*70)
                    break
                
                time.sleep(interval)
                
            except KeyboardInterrupt:
                print("\n\n⏹️  Monitoring stopped by user")
                break
            except Exception as e:
                print(f"\n❌ Error: {e}")
                time.sleep(interval)
        
        # Final summary
        elapsed_total = int(time.time() - start_time)
        print("\n" + "="*70)
        print("SUMMARY")
        print("="*70)
        
        if prev_count is not None:
            properties = queue_client.get_queue_properties()
            final_count = properties.approximate_message_count
            total_processed = prev_count - final_count if prev_count > final_count else 0
            
            print(f"\n⏱️  Total time: {elapsed_total//60}m {elapsed_total%60}s")
            print(f"📊 Messages processed: {total_processed}")
            print(f"📉 Remaining: {final_count}")
            
            if total_processed > 0:
                avg_rate = (total_processed / elapsed_total) * 60
                print(f"⚡ Average rate: {avg_rate:.1f} messages/minute")
                
                if final_count > 0:
                    eta_seconds = int(final_count / (total_processed / elapsed_total))
                    eta_minutes = eta_seconds // 60
                    print(f"⏳ ETA to empty: ~{eta_minutes} minutes")
        
        print("\n" + "="*70)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    import sys
    
    # Parse arguments
    interval = 10  # Check every 10 seconds
    duration = 300  # Monitor for 5 minutes
    
    if len(sys.argv) > 1:
        interval = int(sys.argv[1])
    if len(sys.argv) > 2:
        duration = int(sys.argv[2])
    
    print("\n💡 Usage: python monitor_queue.py [interval_seconds] [duration_seconds]")
    print(f"   Example: python monitor_queue.py 5 600  (check every 5s for 10 min)\n")
    
    monitor_queue(interval, duration)
