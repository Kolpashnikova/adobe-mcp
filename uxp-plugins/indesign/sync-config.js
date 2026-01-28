#!/usr/bin/env node
/**
 * Sync script to update manifest.json network domains from config.js
 * Run this after updating config.js to ensure manifest.json permissions match
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.js');
const manifestPath = path.join(__dirname, 'manifest.json');

// Load config
const config = require(configPath);
const PROXY_HOST = config.PROXY_HOST;
const PROXY_PORT = config.PROXY_PORT;

// Load manifest
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Update network domains
const domains = [
    `http://localhost:${PROXY_PORT}`,
    `http://127.0.0.1:${PROXY_PORT}`,
    `http://${PROXY_HOST}:${PROXY_PORT}`,
    `ws://localhost:${PROXY_PORT}`,
    `ws://127.0.0.1:${PROXY_PORT}`,
    `ws://${PROXY_HOST}:${PROXY_PORT}`
];

manifest.requiredPermissions.network.domains = domains;

// Write updated manifest
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Updated manifest.json with domains from config.js`);
console.log(`Proxy URL: http://${PROXY_HOST}:${PROXY_PORT}`);
