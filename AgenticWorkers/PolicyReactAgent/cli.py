#!/usr/bin/env python3
"""
CLI tool for Policy REACT Agent
"""
import argparse
import json
import sys
from dotenv import load_dotenv
from react_agent import PolicyReactAgent

load_dotenv()


def main():
    parser = argparse.ArgumentParser(
        description='Policy REACT Agent - Guaranteed policy retrieval from vector DB',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Search by department
  python cli.py --department 1

  # Search with custom retry settings
  python cli.py --department 1 --max-attempts 15 --retry-delay 3.0

  # Search all policies
  python cli.py --all

  # Search with query text
  python cli.py --department 1 --query "traffic violations"

  # Show detailed thought log
  python cli.py --department 1 --verbose
        """
    )
    
    parser.add_argument(
        '--department', '-d',
        type=int,
        help='Department ID to search'
    )
    
    parser.add_argument(
        '--query', '-q',
        type=str,
        help='Query text for context'
    )
    
    parser.add_argument(
        '--all', '-a',
        action='store_true',
        help='Search all policies (no department filter)'
    )
    
    parser.add_argument(
        '--max-attempts',
        type=int,
        default=10,
        help='Maximum retry attempts (default: 10)'
    )
    
    parser.add_argument(
        '--retry-delay',
        type=float,
        default=2.0,
        help='Delay between retries in seconds (default: 2.0)'
    )
    
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Show detailed thought log'
    )
    
    parser.add_argument(
        '--json',
        action='store_true',
        help='Output results as JSON'
    )
    
    parser.add_argument(
        '--limit',
        type=int,
        default=10,
        help='Maximum number of policies to display (default: 10)'
    )
    
    args = parser.parse_args()
    
    # Validate arguments
    if not args.all and not args.department:
        parser.error('Either --department or --all must be specified')
    
    # Initialize agent
    agent = PolicyReactAgent(
        max_attempts=args.max_attempts,
        retry_delay=args.retry_delay
    )
    
    # Execute search
    department_id = None if args.all else args.department
    
    if not args.json:
        print(f"\n🤖 Policy REACT Agent")
        print("=" * 80)
        if department_id:
            print(f"Searching for policies in department {department_id}...")
        else:
            print("Searching for all policies...")
        if args.query:
            print(f"Query: {args.query}")
        print()
    
    result = agent.fetch_policies(
        department_id=department_id,
        query_text=args.query
    )
    
    # Output results
    if args.json:
        # JSON output
        output = {
            'success': result['success'],
            'policies': result['policies'][:args.limit],
            'metadata': result['metadata']
        }
        print(json.dumps(output, indent=2, default=str))
    else:
        # Human-readable output
        print("=" * 80)
        print("RESULTS")
        print("=" * 80)
        
        if result['success']:
            print(f"✅ Success!")
            print(f"   Found: {result['metadata']['total_policies_found']} policies")
            print(f"   Attempts: {result['metadata']['attempts']}")
            print(f"   Time: {result['metadata']['elapsed_time_seconds']}s")
            print(f"   Source: {result.get('source', 'react_agent')}")
            
            if result['policies']:
                print(f"\n📄 Policies (showing {min(len(result['policies']), args.limit)}):")
                print("-" * 80)
                
                for i, policy in enumerate(result['policies'][:args.limit], 1):
                    print(f"\n{i}. {policy['title']}")
                    print(f"   ID: {policy['id']}")
                    print(f"   Department: {policy['department_id']}")
                    if policy.get('similarity_score'):
                        print(f"   Similarity: {policy['similarity_score']:.4f}")
                    print(f"   Created: {policy['created_at']}")
                    if policy.get('file_url'):
                        print(f"   URL: {policy['file_url']}")
                    
                    # Show content preview
                    content = policy.get('content', '')
                    if content:
                        preview = content[:200] + '...' if len(content) > 200 else content
                        print(f"   Preview: {preview}")
        else:
            print(f"❌ No policies found after {result['metadata']['attempts']} attempts")
        
        # Show thought log if verbose
        if args.verbose and result['metadata'].get('thought_log'):
            print("\n" + "=" * 80)
            print("THOUGHT LOG")
            print("=" * 80)
            
            for thought in result['metadata']['thought_log']:
                print(f"\n[{thought['type'].upper()}] {thought['content']}")
                print(f"   Time: {thought['timestamp']}")
        
        print("\n" + "=" * 80)
    
    # Exit code
    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()
