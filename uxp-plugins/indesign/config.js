// Proxy Server Configuration
// This file is used by the UXP plugin to connect to the proxy server.
// Update PROXY_HOST and PROXY_PORT to match your .env file settings.
// Use 127.0.0.1 or localhost if proxy runs on the same machine as InDesign.
// Use the server's IP address (e.g., 192.168.2.13) if proxy runs on a remote machine.

const PROXY_HOST = "192.168.2.13";
const PROXY_PORT = "3001";

module.exports = {
    PROXY_HOST,
    PROXY_PORT,
    PROXY_URL: `http://${PROXY_HOST}:${PROXY_PORT}`
};
