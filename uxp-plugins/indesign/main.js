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

const { entrypoints, UI } = require("uxp");
const { io } = require("./socket.io.js");
const app = require("indesign");
const config = require("./config.js");

const {
    parseAndRouteCommand,
    checkRequiresActiveDocument,
    getActiveDocumentSettings
} = require("./commands/index.js");

const APPLICATION = "indesign";
const PROXY_URL = config.PROXY_URL;

let socket = null;
let httpClientId = null;
let httpPolling = false;
let httpPollAbortController = null;

const onCommandPacket = async (packet) => {
    let command = packet.command;

    let out = {
        senderId: packet.senderId,
    };

    try {
        //this will throw if an active document is required and not open
        await checkRequiresActiveDocument(command);

        let response = await parseAndRouteCommand(command);

        out.response = response;
        out.status = "SUCCESS";
        
        // Only get document settings if document exists
        try {
            out.activeDocument = getActiveDocumentSettings(command);
        } catch (docError) {
            console.warn("Could not get document settings:", docError);
            out.activeDocument = null;
        }
        //out.projectItems = await getProjectContentInfo();
        
    } catch (e) {
        console.error(`Error in command ${command.action}:`, e);
        out.status = "FAILURE";
        out.message = `Error calling ${command.action} : ${e}`;
    }

    return out;
};

// HTTP-based connection using fetch (works around UXP WebSocket blocking)
async function connectToServerHTTP() {
    try {
        // Generate unique client ID
        httpClientId = `uxp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Register with proxy server
        const registerResponse = await fetch(`${PROXY_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: httpClientId, application: APPLICATION })
        });
        
        if (!registerResponse.ok) {
            throw new Error(`Registration failed: ${registerResponse.status}`);
        }
        
        const registerData = await registerResponse.json();
        console.log(`HTTP client registered: ${registerData.clientId}`);
        
        httpPolling = true;
        updateButton();
        
        // Start polling for commands
        startHTTPPolling();
        
        return true;
    } catch (error) {
        console.error('HTTP connection failed:', error);
        httpPolling = false;
        updateButton();
        return false;
    }
}

// HTTP long polling for commands
async function startHTTPPolling() {
    if (!httpPolling || !httpClientId) return;
    
    // Abort previous poll if exists
    if (httpPollAbortController) {
        httpPollAbortController.abort();
    }
    
    httpPollAbortController = new AbortController();
    
    try {
        const response = await fetch(`${PROXY_URL}/poll/${httpClientId}?timeout=30000`, {
            method: 'GET',
            signal: httpPollAbortController.signal
        });
        
        if (!response.ok) {
            throw new Error(`Poll failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Process received commands
        if (data.commands && data.commands.length > 0) {
            for (const packet of data.commands) {
                console.log("Received command packet via HTTP:", JSON.stringify(packet, null, 2));
                try {
                    let response = await onCommandPacket(packet);
                    console.log("Command processed, sending response:", JSON.stringify(response, null, 2));
                    sendHTTPResponse(response);
                } catch (error) {
                    console.error("Error processing command packet:", error);
                    const errorResponse = {
                        senderId: packet.senderId,
                        status: "FAILURE",
                        message: `Error processing command: ${error.message || error}`
                    };
                    sendHTTPResponse(errorResponse);
                }
            }
        }
        
        // Continue polling
        if (httpPolling) {
            setTimeout(() => startHTTPPolling(), 100);
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            // Poll was aborted (normal)
            return;
        }
        console.error('HTTP polling error:', error);
        // Retry after delay
        if (httpPolling) {
            setTimeout(() => startHTTPPolling(), 2000);
        }
    }
}

// Send response via HTTP
async function sendHTTPResponse(packet) {
    try {
        await fetch(`${PROXY_URL}/response`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senderId: packet.senderId, response: packet })
        });
    } catch (error) {
        console.error('Failed to send HTTP response:', error);
    }
}

function connectToServer() {
    // Try WebSocket first, fallback to HTTP polling if WebSocket is blocked
    console.log(`Attempting to connect to proxy server at: ${PROXY_URL}`);
    console.log(`Trying WebSocket first, will fallback to HTTP polling if blocked`);
    
    socket = io(PROXY_URL, {
        transports: ["websocket"], // WebSocket only - UXP blocks XHR polling
        upgrade: false,
        timeout: 10000, // Shorter timeout for WebSocket attempt
        reconnection: false, // We'll handle fallback manually
        forceNew: true
    });

    socket.on("connect", () => {
        updateButton();
        console.log("Connected via WebSocket with ID:", socket.id);
        socket.emit("register", { application: APPLICATION });
        httpPolling = false; // WebSocket works, disable HTTP fallback
    });

    socket.on("command_packet", async (packet) => {
        console.log("Received command packet:", JSON.stringify(packet, null, 2));
        console.log("Command action:", packet.command ? packet.command.action : "NO COMMAND");

        try {
            let response = await onCommandPacket(packet);
            console.log("Command processed, sending response:", JSON.stringify(response, null, 2));
            sendResponsePacket(response);
        } catch (error) {
            console.error("Error processing command packet:", error);
            // Send error response
            const errorResponse = {
                senderId: packet.senderId,
                status: "FAILURE",
                message: `Error processing command: ${error.message || error}`
            };
            sendResponsePacket(errorResponse);
        }
    });

    socket.on("registration_response", (data) => {
        console.log("Received response:", data);
        //TODO: connect button here
    });

    socket.on("connect_error", async (error) => {
        console.error("WebSocket connection error:", error);
        console.error(`WebSocket failed, falling back to HTTP polling...`);
        
        // Fallback to HTTP polling
        socket.disconnect();
        socket = null;
        
        const httpConnected = await connectToServerHTTP();
        if (!httpConnected) {
            updateButton();
            console.error(`Both WebSocket and HTTP polling failed. Connection unavailable.`);
        }
    });
    
    socket.on("connect_timeout", async () => {
        console.error(`WebSocket timeout, falling back to HTTP polling...`);
        socket.disconnect();
        socket = null;
        await connectToServerHTTP();
    });

    socket.on("disconnect", (reason) => {
        updateButton();
        console.log("Disconnected from server. Reason:", reason);

        //TODO:connect button here
    });

    return socket;
}

function disconnectFromServer() {
    if (socket && socket.connected) {
        socket.disconnect();
        socket = null;
        console.log("Disconnected from WebSocket server");
    }
    
    if (httpPolling) {
        httpPolling = false;
        if (httpPollAbortController) {
            httpPollAbortController.abort();
            httpPollAbortController = null;
        }
        httpClientId = null;
        console.log("Disconnected from HTTP polling");
    }
    
    updateButton();
}

function sendResponsePacket(packet) {
    if (socket && socket.connected) {
        console.log("Sending response packet via WebSocket:", JSON.stringify(packet, null, 2));
        socket.emit("command_packet_response", {
            packet: packet,
        });
        console.log("Response packet sent successfully");
        return true;
    } else if (httpPolling) {
        console.log("Sending response packet via HTTP:", JSON.stringify(packet, null, 2));
        sendHTTPResponse(packet);
        return true;
    }
    console.error("Cannot send response: not connected");
    return false;
}

function sendCommand(command) {
    if (socket && socket.connected) {
        socket.emit("app_command", {
            application: APPLICATION,
            command: command,
        });
        return true;
    }
    return false;
}

entrypoints.setup({
    panels: {
        vanilla: {
            show(node) {},
        },
    },
});

let updateButton = () => {
    let b = document.getElementById("btnStart");
    const isConnected = (socket && socket.connected) || httpPolling;
    b.textContent = isConnected ? "Disconnect" : "Connect";
};

//Toggle button to make it start stop
document.getElementById("btnStart").addEventListener("click", () => {
    const isConnected = (socket && socket.connected) || httpPolling;
    if (isConnected) {
        disconnectFromServer();
    } else {
        connectToServer();
    }
});

const CONNECT_ON_LAUNCH = "connectOnLaunch";
// Save checkbox state in localStorage
document
    .getElementById("chkConnectOnLaunch")
    .addEventListener("change", function (event) {
        window.localStorage.setItem(
            CONNECT_ON_LAUNCH,
            JSON.stringify(event.target.checked)
        );
    });

// Retrieve checkbox state
const getConnectOnLaunch = () => {
    return JSON.parse(window.localStorage.getItem(CONNECT_ON_LAUNCH)) || false;
};

// Set checkbox state on page load
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("chkConnectOnLaunch").checked =
        getConnectOnLaunch();
});

window.addEventListener("load", (event) => {
    if (getConnectOnLaunch()) {
        connectToServer();
    }
});
