# Troubleshooting Connection Issues

## Proxy Server Timeout Errors

If you see timeout errors like:
```
Connection error: Error: timeout
Failed to connect to http://192.168.2.13:3001
```

### Step 1: Verify Proxy Server is Running

On the Linux server, check if the proxy is listening:
```bash
ss -tuln | grep 3001
# Should show: tcp LISTEN 0 511 0.0.0.0:3001
```

### Step 2: Test HTTP Connectivity

From your macOS machine (where InDesign runs), test basic connectivity:
```bash
curl http://192.168.2.13:3001/status
# Should return: {"status":"running","port":3001,...}
```

### Step 3: Check Firewall

On the Linux server, ensure port 3001 is open:

**For UFW:**
```bash
sudo ufw allow 3001/tcp
sudo ufw reload
```

**For firewalld:**
```bash
sudo firewall-cmd --add-port=3001/tcp --permanent
sudo firewall-cmd --reload
```

**For iptables:**
```bash
sudo iptables -A INPUT -p tcp --dport 3001 -j ACCEPT
sudo iptables-save
```

### Step 4: Verify Network Connectivity

From macOS, ping the Linux server:
```bash
ping 192.168.2.13
```

### Step 5: Check Proxy Server Configuration

Ensure the proxy server is listening on all interfaces (`0.0.0.0`), not just `localhost`:
```javascript
server.listen(PORT, '0.0.0.0', () => {
  // Should listen on 0.0.0.0, not 127.0.0.1
});
```

### Step 6: Update Configuration

1. Update `.env` file with correct `PROXY_HOST`:
   ```
   PROXY_HOST=192.168.2.13
   PROXY_PORT=3001
   ```

2. Update `uxp-plugins/indesign/config.js` to match:
   ```javascript
   const PROXY_HOST = "192.168.2.13";
   const PROXY_PORT = "3001";
   ```

3. Run sync script to update manifest:
   ```bash
   cd uxp-plugins/indesign && node sync-config.js
   ```

4. Reload the UXP plugin in InDesign

### Step 7: Check UXP Developer Console

In InDesign, open Developer Console and look for:
- Connection attempt logs
- Detailed error messages
- Network permission errors

### Common Issues

1. **Firewall blocking port 3001**: Most common issue. Open the port on Linux server.
2. **Proxy server only listening on localhost**: Ensure it listens on `0.0.0.0`.
3. **Wrong IP address**: Verify `PROXY_HOST` in `.env` matches the Linux server's IP.
4. **Network segmentation**: macOS and Linux server must be on the same network or have routing configured.
