/* MIT License
 *
 * Copyright (c) 2025 Mike Chambers
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, 
  {
    transports: ["websocket", "polling"], // WebSocket first, polling fallback for non-UXP clients
    maxHttpBufferSize: 50 * 1024 * 1024,
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    allowEIO3: true, // Support older Engine.IO clients
    pingTimeout: 60000, // Increase ping timeout for slow connections
    pingInterval: 25000,
    // WebSocket-specific options
    perMessageDeflate: false, // Disable compression for better compatibility
    httpCompression: false
  }
);

const PORT = process.env.PROXY_PORT || 3001;
const PROXY_HOST = process.env.PROXY_HOST || '127.0.0.1';

// Add middleware
app.use(express.json());

// Status endpoint
app.get('/status', (req, res) => {
  const status = {
    status: 'running',
    port: PORT,
    clients: Object.keys(applicationClients).reduce((acc, app) => {
      acc[app] = applicationClients[app] ? applicationClients[app].size : 0;
      return acc;
    }, {}),
    uptime: process.uptime()
  };
  res.json(status);
});

// HTTP polling endpoints for UXP plugins (since WebSocket is blocked)
// Store pending commands by client ID
const pendingCommands = new Map(); // clientId -> queue of commands
const clientQueues = new Map(); // clientId -> { lastPoll, application }

// Register client via HTTP
app.post('/register', (req, res) => {
  const { clientId, application } = req.body;
  if (!clientId || !application) {
    return res.status(400).json({ error: 'clientId and application required' });
  }
  
  clientQueues.set(clientId, {
    application,
    lastPoll: Date.now()
  });
  
  if (!pendingCommands.has(clientId)) {
    pendingCommands.set(clientId, []);
  }
  
  console.log(`HTTP client registered: ${clientId} for ${application}`);
  res.json({ status: 'registered', clientId, application });
});

// Poll for commands (long polling)
app.get('/poll/:clientId', (req, res) => {
  const { clientId } = req.params;
  const timeout = parseInt(req.query.timeout) || 30000; // 30 second timeout
  
  // Update last poll time
  const clientInfo = clientQueues.get(clientId);
  if (clientInfo) {
    clientInfo.lastPoll = Date.now();
  }
  
  // Check for pending commands
  const queue = pendingCommands.get(clientId) || [];
  
  if (queue.length > 0) {
    // Return commands immediately
    const commands = queue.splice(0); // Clear queue
    return res.json({ commands, hasMore: false });
  }
  
  // Long polling: wait for command or timeout
  const startTime = Date.now();
  const checkInterval = setInterval(() => {
    const queue = pendingCommands.get(clientId) || [];
    if (queue.length > 0) {
      clearInterval(checkInterval);
      const commands = queue.splice(0);
      res.json({ commands, hasMore: false });
    } else if (Date.now() - startTime >= timeout) {
      clearInterval(checkInterval);
      res.json({ commands: [], hasMore: false });
    }
  }, 100);
  
  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(checkInterval);
  });
});

// Send command response via HTTP
app.post('/response', (req, res) => {
  const { senderId, response } = req.body;
  
  // Forward to Socket.IO clients if senderId is a socket ID
  if (senderId && applicationClients) {
    // Try to find the socket and emit response
    // This is a simplified version - in production you'd track socket IDs
    io.to(senderId).emit('packet_response', response);
  }
  
  res.json({ status: 'received' });
});
// Track clients by application
const applicationClients = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  socket.on('register', ({ application }) => {
    console.log(`Client ${socket.id} registered for application: ${application}`);
    
    // Store the application preference with this socket
    socket.data.application = application;
    
    // Register this client for this application
    if (!applicationClients[application]) {
      applicationClients[application] = new Set();
    }
    applicationClients[application].add(socket.id);
    
    // Optionally confirm registration
    socket.emit('registration_response', { 
      type: 'registration', 
      status: 'success', 
      message: `Registered for ${application}` 
    });
  });

  socket.on('command_packet_response', ({ packet }) => {
    const senderId = packet.senderId;
  
    if (senderId) {
      
      io.to(senderId).emit('packet_response', packet);
      console.log(`Sent confirmation to client ${senderId}`);
    } else {
      console.log(`No sender ID provided in packet`);
    }
  });

  socket.on('command_packet', ({ application, command }) => {
    console.log(`Command from ${socket.id} for application ${application}:`, command);
    
    // Register this client for this application if not already registered
    //if (!applicationClients[application]) {
    //  applicationClients[application] = new Set();
    //}
    //applicationClients[application].add(socket.id);
    
    // Process the command

    let packet = {
        senderId:socket.id,
        application:application,
        command:command
    }

    sendToApplication(packet)
    
    // Send response back to this client
    //socket.emit('json_response', { from: 'server', command });
  });
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Remove this client from all application registrations
    for (const app in applicationClients) {
      applicationClients[app].delete(socket.id);
      // Clean up empty sets
      if (applicationClients[app].size === 0) {
        delete applicationClients[app];
      }
    }
  });
});

// Add a function to send messages to clients by application
function sendToApplication(packet) {
    let application = packet.application
    
    // Send to Socket.IO clients
    if (applicationClients[application]) {
        console.log(`Sending to ${applicationClients[application].size} Socket.IO clients for ${application}`);
        let senderId = packet.senderId
        applicationClients[application].forEach(clientId => {
            io.to(clientId).emit('command_packet', packet);
        });
    }
    
    // Also send to HTTP polling clients
    let httpClientsFound = false;
    for (const [clientId, clientInfo] of clientQueues.entries()) {
        if (clientInfo.application === application) {
            httpClientsFound = true;
            const queue = pendingCommands.get(clientId) || [];
            queue.push(packet);
            pendingCommands.set(clientId, queue);
            console.log(`Queued command for HTTP client ${clientId}`);
        }
    }
    
    if (applicationClients[application] || httpClientsFound) {
        return true;
    }
    
    console.log(`No clients registered for application: ${application}`);
    return false;
}

// Example: Use this function elsewhere in your code
// sendToApplication('photoshop', { message: 'Update available' });

server.listen(PORT, '0.0.0.0', () => {
  console.log(`adb-mcp Command proxy server running on ws://0.0.0.0:${PORT}`);
  console.log(`Server accessible at ws://localhost:${PORT}`);
  if (PROXY_HOST !== '127.0.0.1' && PROXY_HOST !== 'localhost') {
    console.log(`Server accessible at ws://${PROXY_HOST}:${PORT}`);
  }
});