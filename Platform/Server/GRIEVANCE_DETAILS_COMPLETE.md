# Grievance Details - Complete Implementation

## Overview

Complete implementation of grievance details view with:
- ✅ Full grievance information
- ✅ AI analysis (stored in JSONB columns)
- ✅ Comments system (citizens + officials)
- ✅ Timeline/workflow tracking
- ✅ Department allocation
- ✅ Real-time data from Tavily

## Backend API

### Main Endpoint

```
GET /api/grievances/:grievanceId/details
```

**Authentication:** Required (JWT token)

**Response Structure:**
```json
{
  "id": "uuid",
  "grievance_id": "GRV-20260228-778302",
  "status": "pending",
  "priority": "high",
  "created_at": "2026-02-28T10:00:00Z",
  "updated_at": "2026-02-28T11:00:00Z",
  
  "grievance_text": "Original complaint text",
  "enhanced_query": "AI-enhanced description",
  
  "citizen": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+91-XXXXXXXXXX"
  },
  
  "department": {
    "id": "uuid",
    "name": "Sanitation Department",
    "description": "Handles waste management",
    "email": "sanitation@gov.in",
    "phone": "+91-XXXXXXXXXX"
  },
  
  "assigned_officer": {
    "id": "uuid",
    "name": "Officer Smith",
    "email": "officer@gov.in"
  },
  
  "analysis": {
    "category": {
      "main": "Sanitation",
      "sub": "Garbage Dumping In Vacant Lot/Land"
    },
    "location": {
      "address": "Mumbai, Maharashtra",
      "latitude": 19.076,
      "longitude": 72.8777,
      "landmarks": ["Near Railway Station", "Behind Market"],
      "area_type": "urban_slum"
    },
    "image": {
      "path": "https://storage.../image.jpg",
      "description": "Garbage pile with plastic waste",
      "key_objects": ["plastic bags", "food wrappers"],
      "scene_type": "Outdoor waste accumulation site",
      "extracted_text": "BALAR"
    },
    "sentiment": {
      "emotion": "Frustrated",
      "secondary_emotions": ["Angry", "Sad"],
      "intensity": 8
    },
    "severity": {
      "level": "Critical",
      "score": 9,
      "impact_scope": "Community",
      "consequences": ["Health risks", "Environmental pollution"]
    },
    "priority": {
      "level": "High",
      "urgency": "High",
      "justification": "Immediate health risk to community"
    },
    "fraud_risk": {
      "risk": "Low",
      "confidence": "Medium",
      "indicators": []
    },
    "validation": {
      "status": "validated",
      "score": 0.85,
      "is_valid": true,
      "reasoning": "Image matches complaint description"
    },
    "department": {
      "recommended": "Sanitation Department",
      "allocated": {
        "id": "uuid",
        "name": "Sanitation Department",
        "match_score": 0.95
      },
      "contact": {
        "phone": "+91-XXX",
        "email": "dept@gov.in"
      },
      "jurisdiction": "Mumbai Municipal Corporation"
    },
    "real_time_data": {
      "search_results": {
        "query1": {
          "results": [...],
          "answer": "..."
        }
      },
      "policy_queries": ["query1", "query2"]
    }
  },
  
  "comments": {
    "total": 5,
    "items": [
      {
        "id": "uuid",
        "comment": "This is urgent!",
        "is_internal": false,
        "created_at": "2026-02-28T10:30:00Z",
        "user": {
          "name": "John Doe",
          "email": "john@example.com",
          "role": "citizen"
        }
      }
    ]
  },
  
  "timeline": [
    {
      "stage": "submitted",
      "timestamp": "2026-02-28T10:00:00Z",
      "label": "Grievance Submitted",
      "description": "Citizen submitted the grievance",
      "actor": "John Doe"
    },
    {
      "stage": "assigned",
      "timestamp": "2026-02-28T10:15:00Z",
      "label": "Assigned to Department",
      "description": "Assigned to Sanitation Department",
      "actor": "System"
    }
  ],
  
  "raw": {
    "full_result": {...},
    "agent_outputs": {...},
    "processing_metadata": {...}
  }
}
```

### Comments Endpoints

```
POST   /api/grievances/:grievanceId/comments       - Add comment
GET    /api/grievances/:grievanceId/comments       - Get all comments
GET    /api/grievances/:grievanceId/comments/count - Get comment count
PUT    /api/comments/:commentId                    - Update comment
DELETE /api/comments/:commentId                    - Delete comment
```

## Database Schema

### AI Analysis Storage

All AI analysis is stored in JSONB columns in the `usergrievance` table:

```sql
-- Main analysis columns
full_result JSONB           -- Complete AI analysis output
agent_outputs JSONB         -- Individual agent outputs
processing_metadata JSONB   -- Processing information

-- Extracted fields for easy querying
category VARCHAR            -- Main category (e.g., "Sanitation")
sub_category VARCHAR        -- Sub category
priority VARCHAR            -- High/Medium/Low
validation_status VARCHAR   -- validated/rejected/no_image
validation_score NUMERIC    -- 0-1 score
department_id UUID          -- Allocated department (FK)

-- Location fields
latitude NUMERIC
longitude NUMERIC
location_address TEXT
extracted_location JSONB    -- Full location data

-- Image fields
image_path TEXT
image_description TEXT
```

### Comments Table

```sql
CREATE TABLE grievancecomments (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  grievance_id UUID REFERENCES usergrievance(id),
  user_id UUID REFERENCES users(id),
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  attachments JSONB
);
```

## Frontend Integration

### React Component Example

```jsx
import { useState, useEffect } from 'react';
import axios from 'axios';

function GrievanceDetailsPage({ grievanceId }) {
  const [details, setDetails] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGrievanceDetails();
  }, [grievanceId]);

  const fetchGrievanceDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/grievances/${grievanceId}/details`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      setDetails(response.data);
      setComments(response.data.comments.items);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching details:', error);
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/grievances/${grievanceId}/comments`,
        { comment: newComment },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setNewComment('');
      fetchGrievanceDetails(); // Refresh
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!details) return <div>Grievance not found</div>;

  return (
    <div className="grievance-details">
      {/* Header */}
      <div className="header">
        <h1>{details.grievance_id}</h1>
        <span className={`status ${details.status}`}>{details.status}</span>
        <span className={`priority ${details.priority}`}>{details.priority}</span>
      </div>

      {/* Grievance Info */}
      <section className="info-section">
        <h2>Grievance Information</h2>
        <p><strong>Submitted:</strong> {new Date(details.created_at).toLocaleString()}</p>
        <p><strong>Citizen:</strong> {details.citizen.name}</p>
        <p><strong>Description:</strong> {details.grievance_text}</p>
        {details.analysis.image.path && (
          <img src={details.analysis.image.path} alt="Grievance proof" />
        )}
      </section>

      {/* AI Analysis */}
      <section className="analysis-section">
        <h2>AI Analysis</h2>
        
        <div className="analysis-grid">
          <div className="analysis-card">
            <h3>Category</h3>
            <p>{details.analysis.category.main}</p>
            <p className="sub">{details.analysis.category.sub}</p>
          </div>

          <div className="analysis-card">
            <h3>Location</h3>
            <p>{details.analysis.location.address}</p>
            {details.analysis.location.landmarks.length > 0 && (
              <p className="landmarks">
                Landmarks: {details.analysis.location.landmarks.join(', ')}
              </p>
            )}
          </div>

          <div className="analysis-card">
            <h3>Severity</h3>
            <p className={`severity ${details.analysis.severity.level}`}>
              {details.analysis.severity.level}
            </p>
            <p>Score: {details.analysis.severity.score}/10</p>
          </div>

          <div className="analysis-card">
            <h3>Sentiment</h3>
            <p>{details.analysis.sentiment.emotion}</p>
            <p>Intensity: {details.analysis.sentiment.intensity}/10</p>
          </div>

          <div className="analysis-card">
            <h3>Validation</h3>
            <p className={details.analysis.validation.is_valid ? 'valid' : 'invalid'}>
              {details.analysis.validation.is_valid ? '✓ Valid' : '✗ Invalid'}
            </p>
            <p>Score: {(details.analysis.validation.score * 100).toFixed(0)}%</p>
          </div>

          <div className="analysis-card">
            <h3>Fraud Risk</h3>
            <p className={`risk ${details.analysis.fraud_risk.risk}`}>
              {details.analysis.fraud_risk.risk}
            </p>
          </div>
        </div>

        {/* Image Analysis */}
        {details.analysis.image.description && (
          <div className="image-analysis">
            <h3>Image Analysis</h3>
            <p>{details.analysis.image.description}</p>
            {details.analysis.image.key_objects.length > 0 && (
              <p>Objects: {details.analysis.image.key_objects.join(', ')}</p>
            )}
          </div>
        )}

        {/* Real-time Data */}
        {Object.keys(details.analysis.real_time_data.search_results).length > 0 && (
          <div className="real-time-data">
            <h3>Related Information</h3>
            {Object.entries(details.analysis.real_time_data.search_results).map(([query, data]) => (
              <div key={query} className="search-result">
                <h4>{query}</h4>
                {data.results && data.results.slice(0, 3).map((result, idx) => (
                  <div key={idx} className="result-item">
                    <a href={result.url} target="_blank" rel="noopener noreferrer">
                      {result.title}
                    </a>
                    <p>{result.content?.substring(0, 150)}...</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Department Info */}
      {details.department.id && (
        <section className="department-section">
          <h2>Assigned Department</h2>
          <p><strong>Name:</strong> {details.department.name}</p>
          <p><strong>Description:</strong> {details.department.description}</p>
          <p><strong>Contact:</strong> {details.department.email}</p>
          <p><strong>Phone:</strong> {details.department.phone}</p>
        </section>
      )}

      {/* Timeline */}
      <section className="timeline-section">
        <h2>Timeline</h2>
        <div className="timeline">
          {details.timeline.map((event, idx) => (
            <div key={idx} className="timeline-event">
              <div className="timeline-marker"></div>
              <div className="timeline-content">
                <h4>{event.label}</h4>
                <p>{event.description}</p>
                <span className="time">{new Date(event.timestamp).toLocaleString()}</span>
                {event.actor && <span className="actor">by {event.actor}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Comments */}
      <section className="comments-section">
        <h2>Comments ({details.comments.total})</h2>
        
        <div className="comments-list">
          {comments.map(comment => (
            <div key={comment.id} className="comment">
              <div className="comment-header">
                <strong>{comment.user.name}</strong>
                <span className="role">{comment.user.role}</span>
                {comment.is_internal && <span className="internal-badge">Internal</span>}
                <span className="time">{new Date(comment.created_at).toLocaleString()}</span>
              </div>
              <p className="comment-text">{comment.comment}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddComment} className="add-comment-form">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows="3"
          />
          <button type="submit">Post Comment</button>
        </form>
      </section>
    </div>
  );
}

export default GrievanceDetailsPage;
```

### CSS Example

```css
.grievance-details {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 30px;
}

.status, .priority {
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}

.status.pending { background: #fef3c7; color: #92400e; }
.status.assigned { background: #dbeafe; color: #1e40af; }
.status.resolved { background: #d1fae5; color: #065f46; }

.priority.high { background: #fee2e2; color: #991b1b; }
.priority.medium { background: #fed7aa; color: #9a3412; }
.priority.low { background: #e0e7ff; color: #3730a3; }

.info-section, .analysis-section, .department-section, 
.timeline-section, .comments-section {
  background: white;
  padding: 25px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.analysis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  margin-top: 20px;
}

.analysis-card {
  padding: 15px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.analysis-card h3 {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 8px;
}

.timeline {
  position: relative;
  padding-left: 30px;
}

.timeline-event {
  position: relative;
  padding-bottom: 30px;
}

.timeline-marker {
  position: absolute;
  left: -30px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #3b82f6;
  border: 3px solid white;
  box-shadow: 0 0 0 2px #3b82f6;
}

.timeline-event::before {
  content: '';
  position: absolute;
  left: -24px;
  top: 12px;
  bottom: -30px;
  width: 2px;
  background: #e5e7eb;
}

.timeline-event:last-child::before {
  display: none;
}

.comments-list {
  margin-bottom: 20px;
}

.comment {
  padding: 15px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 10px;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  font-size: 14px;
}

.role {
  padding: 2px 8px;
  background: #f3f4f6;
  border-radius: 4px;
  font-size: 12px;
}

.internal-badge {
  padding: 2px 8px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 4px;
  font-size: 12px;
}

.add-comment-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.add-comment-form textarea {
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-family: inherit;
  resize: vertical;
}

.add-comment-form button {
  align-self: flex-end;
  padding: 8px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.add-comment-form button:hover {
  background: #2563eb;
}
```

## Testing

```bash
# Start server
cd Platform/Server
npm run dev

# Test the endpoint
curl -X GET http://localhost:5000/api/grievances/YOUR_GRIEVANCE_ID/details \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Summary

✅ Backend API complete with all endpoints
✅ Comments system fully functional
✅ AI analysis stored in JSONB columns
✅ Frontend React component example provided
✅ CSS styling included
✅ Ready to integrate with your frontend!
