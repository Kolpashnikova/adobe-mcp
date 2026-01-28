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

function connectToServer() {
    // Create new Socket.IO connection
    // Since HTTP works but WebSocket times out, try polling first (uses HTTP)
    // Polling is more reliable across firewalls and UXP sandbox restrictions
    console.log(`Attempting to connect to proxy server at: ${PROXY_URL}`);
    console.log(`Connection options: timeout=30000ms, transports=[polling, websocket] (polling first)`);
    
    socket = io(PROXY_URL, {
        transports: ["polling", "websocket"], // Try polling first since HTTP works
        upgrade: true,
        rememberUpgrade: false, // Don't remember upgrade to avoid WebSocket issues
        timeout: 30000, // 30 second connection timeout
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        forceNew: true,
        reconnectionDelayMax: 5000,
        maxHttpBufferSize: 1e6,
        // Force polling for initial connection
        autoConnect: true
    });

    socket.on("connect", () => {
        updateButton();
        console.log("Connected to server with ID:", socket.id);
        socket.emit("register", { application: APPLICATION });
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

    socket.on("connect_error", (error) => {
        updateButton();
        console.error("Connection error:", error);
        console.error(`Failed to connect to ${PROXY_URL}`);
        console.error(`Error type: ${error.type || 'unknown'}, Message: ${error.message || error}`);
        console.error(`Error details:`, JSON.stringify(error, null, 2));
        
        // Additional diagnostics
        if (error.message && error.message.includes('timeout')) {
            console.error(`TIMEOUT: The proxy server at ${PROXY_URL} is not reachable.`);
            console.error(`Possible causes:`);
            console.error(`1. Proxy server is not running`);
            console.error(`2. Firewall is blocking port 3001`);
            console.error(`3. Network connectivity issue between this machine and ${PROXY_URL}`);
            console.error(`4. Proxy server is only listening on localhost (should listen on 0.0.0.0)`);
        }
    });
    
    socket.on("connect_timeout", () => {
        console.error(`Connection timeout: Could not establish connection to ${PROXY_URL} within 30 seconds`);
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
        console.log("Disconnected from server");
    }
}

function sendResponsePacket(packet) {
    if (socket && socket.connected) {
        console.log("Sending response packet:", JSON.stringify(packet, null, 2));
        socket.emit("command_packet_response", {
            packet: packet,
        });
        console.log("Response packet sent successfully");
        return true;
    }
    console.error("Cannot send response: socket not connected");
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

    b.textContent = socket && socket.connected ? "Disconnect" : "Connect";
};

//Toggle button to make it start stop
document.getElementById("btnStart").addEventListener("click", () => {
    if (socket && socket.connected) {
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
