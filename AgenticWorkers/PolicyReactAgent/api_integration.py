"""
API Integration for REACT Policy Agent
Provides REST endpoints to trigger policy searches
"""
from flask import Flask, request, jsonify
from react_agent import PolicyReactAgent
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)


@app.route('/api/policies/search', methods=['POST'])
def search_policies():
    """
    Search for department policies using REACT agent
    
    Request body:
    {
        "department_id": 1,  // optional
        "query_text": "traffic violations",  // optional
        "query_embedding": [0.1, 0.2, ...],  // optional
        "max_attempts": 10,  // optional
        "retry_delay": 2.0  // optional
    }
    """
    try:
        data = request.get_json()
        
        department_id = data.get('department_id')
        query_text = data.get('query_text')
        query_embedding = data.get('query_embedding')
        max_attempts = data.get('max_attempts', 10)
        retry_delay = data.get('retry_delay', 2.0)
        
        # Initialize agent
        agent = PolicyReactAgent(
            max_attempts=max_attempts,
            retry_delay=retry_delay
        )
        
        # Execute search
        result = agent.fetch_policies(
            department_id=department_id,
            query_text=query_text,
            query_embedding=query_embedding
        )
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/policies/department/<int:department_id>', methods=['GET'])
def get_department_policies(department_id):
    """
    Get all policies for a specific department
    Uses REACT agent to ensure policies are found
    """
    try:
        max_attempts = int(request.args.get('max_attempts', 10))
        retry_delay = float(request.args.get('retry_delay', 2.0))
        
        agent = PolicyReactAgent(
            max_attempts=max_attempts,
            retry_delay=retry_delay
        )
        
        result = agent.fetch_policies(department_id=department_id)
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "PolicyReactAgent"
    }), 200


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
