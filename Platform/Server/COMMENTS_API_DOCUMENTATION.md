# Comments API Documentation

## Overview

The Comments API allows citizens and officials to add, view, update, and delete comments on grievances. Officials can also add internal comments that are only visible to other officials.

## Base URL

```
http://localhost:5000/api
```

## Authentication

All endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### 1. Add Comment to Grievance

Add a new comment to a specific grievance.

**Endpoint:** `POST /grievances/:grievanceId/comments`

**Parameters:**
- `grievanceId` (path) - UUID of the grievance

**Request Body:**
```json
{
  "comment": "This is my comment text",
  "isInternal": false,
  "attachments": [
    {
      "name": "screenshot.png",
      "url": "https://storage.example.com/file.png",
      "type": "image/png"
    }
  ]
}
```

**Fields:**
- `comment` (required) - The comment text
- `isInternal` (optional) - Boolean, true for internal comments (officials only)
- `attachments` (optional) - Array of attachment objects

**Response:** `201 Created`
```json
{
  "message": "Comment added successfully",
  "comment": {
    "id": "comment-uuid",
    "grievance_id": "grievance-uuid",
    "user_id": "user-uuid",
    "comment": "This is my comment text",
    "is_internal": false,
    "attachments": [...],
    "created_at": "2026-02-28T10:30:00.000Z",
    "user": {
      "name": "John Doe",
      "email": "john@example.com",
      "role": "citizen"
    }
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/api/grievances/11655943-6c26-437f-9d11-f0a0eda3380a/comments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "I would like to add more details about this issue.",
    "isInternal": false
  }'
```

---

### 2. Get All Comments for a Grievance

Retrieve all comments for a specific grievance.

**Endpoint:** `GET /grievances/:grievanceId/comments`

**Parameters:**
- `grievanceId` (path) - UUID of the grievance

**Response:** `200 OK`
```json
{
  "grievanceId": "grievance-uuid",
  "comments": [
    {
      "id": "comment-uuid-1",
      "grievance_id": "grievance-uuid",
      "user_id": "user-uuid",
      "comment": "First comment",
      "is_internal": false,
      "attachments": null,
      "created_at": "2026-02-28T10:00:00.000Z",
      "user": {
        "name": "John Doe",
        "email": "john@example.com",
        "role": "citizen"
      }
    },
    {
      "id": "comment-uuid-2",
      "grievance_id": "grievance-uuid",
      "user_id": "officer-uuid",
      "comment": "We are looking into this",
      "is_internal": false,
      "attachments": null,
      "created_at": "2026-02-28T11:00:00.000Z",
      "user": {
        "name": "Officer Smith",
        "email": "officer@gov.in",
        "role": "department_officer"
      }
    }
  ],
  "totalCount": 2,
  "includesInternal": false
}
```

**Notes:**
- Citizens only see public comments (`is_internal: false`)
- Officials see both public and internal comments
- Comments are ordered by creation time (oldest first)

**Example:**
```bash
curl -X GET http://localhost:5000/api/grievances/11655943-6c26-437f-9d11-f0a0eda3380a/comments \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 3. Get Comment Count

Get the total number of comments for a grievance.

**Endpoint:** `GET /grievances/:grievanceId/comments/count`

**Parameters:**
- `grievanceId` (path) - UUID of the grievance

**Response:** `200 OK`
```json
{
  "grievanceId": "grievance-uuid",
  "commentCount": 5
}
```

**Example:**
```bash
curl -X GET http://localhost:5000/api/grievances/11655943-6c26-437f-9d11-f0a0eda3380a/comments/count \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 4. Update Comment

Update an existing comment (only by the comment owner).

**Endpoint:** `PUT /comments/:commentId`

**Parameters:**
- `commentId` (path) - UUID of the comment

**Request Body:**
```json
{
  "comment": "Updated comment text",
  "attachments": [...]
}
```

**Response:** `200 OK`
```json
{
  "message": "Comment updated successfully",
  "comment": {
    "id": "comment-uuid",
    "grievance_id": "grievance-uuid",
    "user_id": "user-uuid",
    "comment": "Updated comment text",
    "is_internal": false,
    "attachments": [...],
    "created_at": "2026-02-28T10:30:00.000Z",
    "user": {
      "name": "John Doe",
      "email": "john@example.com",
      "role": "citizen"
    }
  }
}
```

**Example:**
```bash
curl -X PUT http://localhost:5000/api/comments/comment-uuid \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Updated: I would like to add more details."
  }'
```

---

### 5. Delete Comment

Delete a comment (only by the comment owner or admin).

**Endpoint:** `DELETE /comments/:commentId`

**Parameters:**
- `commentId` (path) - UUID of the comment

**Response:** `200 OK`
```json
{
  "message": "Comment deleted successfully"
}
```

**Example:**
```bash
curl -X DELETE http://localhost:5000/api/comments/comment-uuid \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Permissions

### Citizens
- ✅ Can add public comments to any grievance
- ✅ Can view all public comments
- ✅ Can edit their own comments
- ✅ Can delete their own comments
- ❌ Cannot add internal comments
- ❌ Cannot view internal comments

### Officials (Department Officers, City Officials, etc.)
- ✅ Can add public comments
- ✅ Can add internal comments
- ✅ Can view all comments (public + internal)
- ✅ Can edit their own comments
- ✅ Can delete their own comments

### Admins
- ✅ All official permissions
- ✅ Can delete any comment

---

## Database Schema

```sql
CREATE TABLE grievancecomments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  grievance_id UUID NOT NULL REFERENCES usergrievance(id),
  user_id UUID NOT NULL REFERENCES users(id),
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  attachments JSONB,
  embedding VECTOR
);
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Comment text is required"
}
```

### 403 Forbidden
```json
{
  "error": "You can only edit your own comments"
}
```

### 404 Not Found
```json
{
  "error": "Grievance not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to add comment",
  "message": "Database connection error"
}
```

---

## Usage Examples

### JavaScript/Fetch

```javascript
// Add a comment
async function addComment(grievanceId, commentText) {
  const response = await fetch(`http://localhost:5000/api/grievances/${grievanceId}/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      comment: commentText,
      isInternal: false
    })
  });
  
  return await response.json();
}

// Get comments
async function getComments(grievanceId) {
  const response = await fetch(`http://localhost:5000/api/grievances/${grievanceId}/comments`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  return await response.json();
}

// Update comment
async function updateComment(commentId, newText) {
  const response = await fetch(`http://localhost:5000/api/comments/${commentId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      comment: newText
    })
  });
  
  return await response.json();
}

// Delete comment
async function deleteComment(commentId) {
  const response = await fetch(`http://localhost:5000/api/comments/${commentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  return await response.json();
}
```

### React Example

```jsx
import { useState, useEffect } from 'react';

function GrievanceComments({ grievanceId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [grievanceId]);

  const fetchComments = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/grievances/${grievanceId}/comments`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const data = await response.json();
      setComments(data.comments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:5000/api/grievances/${grievanceId}/comments`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ comment: newComment })
        }
      );

      if (response.ok) {
        setNewComment('');
        fetchComments(); // Refresh comments
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="comments-section">
      <h3>Comments ({comments.length})</h3>
      
      {/* Comment List */}
      <div className="comments-list">
        {comments.map(comment => (
          <div key={comment.id} className="comment">
            <div className="comment-header">
              <strong>{comment.user.name}</strong>
              <span>{new Date(comment.created_at).toLocaleString()}</span>
            </div>
            <p>{comment.comment}</p>
          </div>
        ))}
      </div>

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows="3"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Posting...' : 'Post Comment'}
        </button>
      </form>
    </div>
  );
}
```

---

## Testing

### Test Script

Save as `test_comments.js`:

```javascript
const API_URL = 'http://localhost:5000/api';
let token = 'YOUR_JWT_TOKEN';
let grievanceId = 'YOUR_GRIEVANCE_ID';

async function testComments() {
  // 1. Add a comment
  console.log('1. Adding comment...');
  const addResponse = await fetch(`${API_URL}/grievances/${grievanceId}/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      comment: 'Test comment from API'
    })
  });
  const newComment = await addResponse.json();
  console.log('Added:', newComment);

  // 2. Get all comments
  console.log('\n2. Getting all comments...');
  const getResponse = await fetch(`${API_URL}/grievances/${grievanceId}/comments`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const allComments = await getResponse.json();
  console.log('Comments:', allComments);

  // 3. Get comment count
  console.log('\n3. Getting comment count...');
  const countResponse = await fetch(`${API_URL}/grievances/${grievanceId}/comments/count`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const count = await countResponse.json();
  console.log('Count:', count);
}

testComments();
```

Run with:
```bash
node test_comments.js
```

---

## Notes

1. **Internal Comments**: Only officials can create and view internal comments. This is useful for internal discussions that citizens shouldn't see.

2. **Attachments**: The attachments field is JSONB and can store any JSON structure. Common use case is storing file URLs.

3. **Embedding**: The embedding column is for future vector search functionality on comments.

4. **Real-time Updates**: Consider implementing WebSocket for real-time comment updates.

5. **Pagination**: For grievances with many comments, consider adding pagination parameters.

---

## Future Enhancements

- [ ] Add pagination for comments
- [ ] Add comment reactions (like, helpful, etc.)
- [ ] Add comment threading (replies to comments)
- [ ] Add real-time updates via WebSocket
- [ ] Add comment notifications
- [ ] Add rich text formatting support
- [ ] Add @mentions for officials
- [ ] Add comment search functionality
