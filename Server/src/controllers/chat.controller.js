import pool from '../config/database.js';

// Get accessible users for chat based on hierarchy
export const getAccessibleUsers = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT * FROM get_accessible_users_for_chat($1)',
      [userId]
    );

    res.json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    console.error('Get accessible users error:', error);
    res.status(500).json({ error: 'Failed to fetch accessible users' });
  }
};

// Create or get direct chat room
export const createOrGetDirectRoom = async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.body;

    if (!otherUserId) {
      return res.status(400).json({ error: 'Other user ID is required' });
    }

    // Check if room already exists
    const existingRoom = await pool.query(
      `SELECT cr.id, cr.room_type, cr.room_name, cr.created_at
       FROM chat_rooms cr
       JOIN room_members rm1 ON cr.id = rm1.room_id
       JOIN room_members rm2 ON cr.id = rm2.room_id
       WHERE cr.room_type = 'direct'
         AND rm1.user_id = $1
         AND rm2.user_id = $2
         AND cr.is_active = true
       LIMIT 1`,
      [userId, otherUserId]
    );

    if (existingRoom.rows.length > 0) {
      return res.json({
        success: true,
        room: existingRoom.rows[0],
        isNew: false
      });
    }

    // Create new room
    const newRoom = await pool.query(
      `INSERT INTO chat_rooms (room_type, created_by)
       VALUES ('direct', $1)
       RETURNING id, room_type, room_name, created_at`,
      [userId]
    );

    const roomId = newRoom.rows[0].id;

    // Add both users as members
    await pool.query(
      `INSERT INTO room_members (room_id, user_id, role_in_room)
       VALUES ($1, $2, 'member'), ($1, $3, 'member')`,
      [roomId, userId, otherUserId]
    );

    res.json({
      success: true,
      room: newRoom.rows[0],
      isNew: true
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Failed to create chat room' });
  }
};

// Create grievance chat room
export const createGrievanceRoom = async (req, res) => {
  try {
    const userId = req.user.id;
    const { grievanceId, memberIds } = req.body;

    if (!grievanceId) {
      return res.status(400).json({ error: 'Grievance ID is required' });
    }

    // Check if room already exists
    const existingRoom = await pool.query(
      `SELECT id, room_type, room_name, created_at
       FROM chat_rooms
       WHERE grievance_id = $1 AND is_active = true
       LIMIT 1`,
      [grievanceId]
    );

    if (existingRoom.rows.length > 0) {
      return res.json({
        success: true,
        room: existingRoom.rows[0],
        isNew: false
      });
    }

    // Get grievance details
    const grievance = await pool.query(
      `SELECT grievance_id, grievance_text FROM usergrievance WHERE id = $1`,
      [grievanceId]
    );

    if (grievance.rows.length === 0) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    const roomName = `Grievance: ${grievance.rows[0].grievance_id}`;

    // Create room
    const newRoom = await pool.query(
      `INSERT INTO chat_rooms (room_type, room_name, grievance_id, created_by)
       VALUES ('grievance', $1, $2, $3)
       RETURNING id, room_type, room_name, created_at`,
      [roomName, grievanceId, userId]
    );

    const roomId = newRoom.rows[0].id;

    // Add creator
    await pool.query(
      `INSERT INTO room_members (room_id, user_id, role_in_room)
       VALUES ($1, $2, 'admin')`,
      [roomId, userId]
    );

    // Add other members if provided
    if (memberIds && memberIds.length > 0) {
      const memberValues = memberIds.map(id => `('${roomId}', '${id}', 'member')`).join(',');
      await pool.query(
        `INSERT INTO room_members (room_id, user_id, role_in_room)
         VALUES ${memberValues}`
      );
    }

    res.json({
      success: true,
      room: newRoom.rows[0],
      isNew: true
    });
  } catch (error) {
    console.error('Create grievance room error:', error);
    res.status(500).json({ error: 'Failed to create grievance chat room' });
  }
};

// Get user's chat rooms
export const getUserRooms = async (req, res) => {
  try {
    const userId = req.user.id;

    const rooms = await pool.query(
      `SELECT 
        cr.id,
        cr.room_type,
        cr.room_name,
        cr.grievance_id,
        cr.department_id,
        cr.created_at,
        cr.updated_at,
        (
          SELECT json_build_object(
            'id', m.id,
            'content', m.content,
            'sender_id', m.sender_id,
            'sender_name', u.full_name,
            'created_at', m.created_at,
            'message_type', m.message_type
          )
          FROM messages m
          JOIN users u ON m.sender_id = u.id
          WHERE m.room_id = cr.id AND m.is_deleted = false
          ORDER BY m.created_at DESC
          LIMIT 1
        ) as last_message,
        (
          SELECT json_agg(
            json_build_object(
              'user_id', u.id,
              'full_name', u.full_name,
              'role', u.role,
              'profile_image', u.profile_image
            )
          )
          FROM room_members rm2
          JOIN users u ON rm2.user_id = u.id
          WHERE rm2.room_id = cr.id AND rm2.is_active = true AND rm2.user_id != $1
        ) as other_members,
        get_unread_count($1, cr.id) as unread_count
      FROM chat_rooms cr
      JOIN room_members rm ON cr.id = rm.room_id
      WHERE rm.user_id = $1 
        AND rm.is_active = true
        AND cr.is_active = true
      ORDER BY cr.updated_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      rooms: rooms.rows
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Failed to fetch chat rooms' });
  }
};

// Get messages for a room
export const getRoomMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { roomId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Check access
    const hasAccess = await pool.query(
      'SELECT can_user_access_room($1, $2) as has_access',
      [userId, roomId]
    );

    if (!hasAccess.rows[0].has_access) {
      return res.status(403).json({ error: 'Access denied to this room' });
    }

    // Get messages
    const messages = await pool.query(
      `SELECT 
        m.id,
        m.content,
        m.message_type,
        m.attachments,
        m.metadata,
        m.is_edited,
        m.created_at,
        m.sender_id,
        u.full_name as sender_name,
        u.profile_image as sender_image,
        u.role as sender_role,
        m.reply_to_message_id,
        (
          SELECT json_build_object(
            'id', rm.id,
            'content', rm.content,
            'sender_name', ru.full_name
          )
          FROM messages rm
          JOIN users ru ON rm.sender_id = ru.id
          WHERE rm.id = m.reply_to_message_id
        ) as reply_to_message,
        EXISTS(
          SELECT 1 FROM message_read_receipts mrr
          WHERE mrr.message_id = m.id AND mrr.user_id = $1
        ) as is_read_by_me
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.room_id = $2 
        AND m.is_deleted = false
      ORDER BY m.created_at DESC
      LIMIT $3 OFFSET $4`,
      [userId, roomId, limit, offset]
    );

    res.json({
      success: true,
      messages: messages.rows.reverse()
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// Send message
export const sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { roomId, content, messageType = 'text', attachments = [], replyToMessageId } = req.body;

    if (!roomId || !content) {
      return res.status(400).json({ error: 'Room ID and content are required' });
    }

    // Check access and permission
    const member = await pool.query(
      `SELECT can_send_messages FROM room_members
       WHERE room_id = $1 AND user_id = $2 AND is_active = true`,
      [roomId, userId]
    );

    if (member.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this room' });
    }

    if (!member.rows[0].can_send_messages) {
      return res.status(403).json({ error: 'You do not have permission to send messages' });
    }

    // Insert message
    const message = await pool.query(
      `INSERT INTO messages (room_id, sender_id, content, message_type, attachments, reply_to_message_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, content, message_type, attachments, created_at`,
      [roomId, userId, content, messageType, JSON.stringify(attachments), replyToMessageId]
    );

    // Get sender details
    const sender = await pool.query(
      `SELECT full_name, profile_image, role FROM users WHERE id = $1`,
      [userId]
    );

    const response = {
      ...message.rows[0],
      sender_id: userId,
      sender_name: sender.rows[0].full_name,
      sender_image: sender.rows[0].profile_image,
      sender_role: sender.rows[0].role
    };

    res.json({
      success: true,
      message: response
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// Mark messages as read
export const markMessagesAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    // Get unread messages
    const unreadMessages = await pool.query(
      `SELECT m.id
       FROM messages m
       WHERE m.room_id = $1
         AND m.sender_id != $2
         AND m.is_deleted = false
         AND NOT EXISTS (
           SELECT 1 FROM message_read_receipts mrr
           WHERE mrr.message_id = m.id AND mrr.user_id = $2
         )`,
      [roomId, userId]
    );

    if (unreadMessages.rows.length > 0) {
      const values = unreadMessages.rows.map(row => `('${row.id}', '${userId}')`).join(',');
      await pool.query(
        `INSERT INTO message_read_receipts (message_id, user_id)
         VALUES ${values}
         ON CONFLICT (message_id, user_id) DO NOTHING`
      );

      // Update last_read_at
      await pool.query(
        `UPDATE room_members
         SET last_read_at = NOW()
         WHERE room_id = $1 AND user_id = $2`,
        [roomId, userId]
      );
    }

    res.json({
      success: true,
      markedCount: unreadMessages.rows.length
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
};

// Add member to room (for hierarchy escalation)
export const addMemberToRoom = async (req, res) => {
  try {
    const userId = req.user.id;
    const { roomId, newMemberId } = req.body;

    if (!roomId || !newMemberId) {
      return res.status(400).json({ error: 'Room ID and new member ID are required' });
    }

    // Check if requester is admin of the room
    const isAdmin = await pool.query(
      `SELECT role_in_room FROM room_members
       WHERE room_id = $1 AND user_id = $2 AND is_active = true`,
      [roomId, userId]
    );

    if (isAdmin.rows.length === 0 || isAdmin.rows[0].role_in_room !== 'admin') {
      return res.status(403).json({ error: 'Only room admins can add members' });
    }

    // Add new member
    await pool.query(
      `INSERT INTO room_members (room_id, user_id, role_in_room)
       VALUES ($1, $2, 'member')
       ON CONFLICT (room_id, user_id) DO UPDATE
       SET is_active = true`,
      [roomId, newMemberId]
    );

    // Send system message
    await pool.query(
      `INSERT INTO messages (room_id, sender_id, content, message_type)
       VALUES ($1, $2, $3, 'system')`,
      [roomId, userId, `New member added to the conversation`]
    );

    res.json({
      success: true,
      message: 'Member added successfully'
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
};

// Get room details
export const getRoomDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { roomId } = req.params;

    // Check access
    const hasAccess = await pool.query(
      'SELECT can_user_access_room($1, $2) as has_access',
      [userId, roomId]
    );

    if (!hasAccess.rows[0].has_access) {
      return res.status(403).json({ error: 'Access denied to this room' });
    }

    const room = await pool.query(
      `SELECT 
        cr.id,
        cr.room_type,
        cr.room_name,
        cr.grievance_id,
        cr.department_id,
        cr.created_at,
        (
          SELECT json_agg(
            json_build_object(
              'user_id', u.id,
              'full_name', u.full_name,
              'role', u.role,
              'profile_image', u.profile_image,
              'role_in_room', rm.role_in_room,
              'can_send_messages', rm.can_send_messages
            )
          )
          FROM room_members rm
          JOIN users u ON rm.user_id = u.id
          WHERE rm.room_id = cr.id AND rm.is_active = true
        ) as members
      FROM chat_rooms cr
      WHERE cr.id = $1`,
      [roomId]
    );

    if (room.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({
      success: true,
      room: room.rows[0]
    });
  } catch (error) {
    console.error('Get room details error:', error);
    res.status(500).json({ error: 'Failed to fetch room details' });
  }
};

// Get subordinate users (users below in hierarchy)
export const getSubordinateUsers = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT * FROM get_subordinate_users($1)',
      [userId]
    );

    res.json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    console.error('Get subordinate users error:', error);
    res.status(500).json({ error: 'Failed to fetch subordinate users' });
  }
};

// Check if user can view another user's data
export const canViewUserData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.params;

    const result = await pool.query(
      'SELECT can_view_user_data($1, $2) as can_view',
      [userId, targetUserId]
    );

    res.json({
      success: true,
      canView: result.rows[0].can_view
    });
  } catch (error) {
    console.error('Check view permission error:', error);
    res.status(500).json({ error: 'Failed to check permission' });
  }
};

// WebSocket connection handler
export const handleWebSocketConnection = (ws, req, userId) => {
  console.log(`WebSocket connected for user: ${userId}`);

  // Listen for PostgreSQL notifications
  const client = pool.connect();
  
  client.then(pgClient => {
    pgClient.query(`LISTEN new_message_${userId}`);
    
    pgClient.on('notification', (msg) => {
      if (msg.channel === `new_message_${userId}`) {
        const payload = JSON.parse(msg.payload);
        ws.send(JSON.stringify({
          type: 'new_message',
          ...payload
        }));
      }
    });

    ws.on('close', () => {
      console.log(`WebSocket disconnected for user: ${userId}`);
      pgClient.query(`UNLISTEN new_message_${userId}`);
      pgClient.release();
    });
  }).catch(error => {
    console.error('WebSocket PostgreSQL connection error:', error);
  });

  // Handle incoming WebSocket messages
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
};
