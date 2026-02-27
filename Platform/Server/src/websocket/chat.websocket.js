const WebSocket = require('ws');
const url = require('url');
const jwt = require('jsonwebtoken');
const { handleWebSocketConnection } = require('../controllers/chat.controller');

const setupChatWebSocket = (server) => {
  const wss = new WebSocket.Server({ 
    server,
    path: '/ws/chat'
  });

  wss.on('connection', (ws, req) => {
    try {
      // Parse query parameters
      const parameters = url.parse(req.url, true);
      const userId = parameters.query.userId;
      const token = parameters.query.token || req.headers.authorization?.replace('Bearer ', '');

      // Verify authentication
      if (!token) {
        ws.close(1008, 'Authentication required');
        return;
      }

      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          ws.close(1008, 'Invalid token');
          return;
        }

        // Verify userId matches token
        if (decoded.id !== userId) {
          ws.close(1008, 'User ID mismatch');
          return;
        }

        // Handle the connection
        handleWebSocketConnection(ws, req, userId);
      });
    } catch (error) {
      console.error('WebSocket connection error:', error);
      ws.close(1011, 'Internal server error');
    }
  });

  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });

  console.log('Chat WebSocket server initialized');
  return wss;
};

module.exports = { setupChatWebSocket };
