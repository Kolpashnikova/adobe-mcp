# How to Verify UXP Plugin Compatibility with New CC App Versions

This guide explains how to verify that the InDesign UXP plugin (and other Adobe MCP plugins) are compatible with new versions of Adobe Creative Cloud applications.

## Quick Compatibility Check

### 1. Check Minimum Version Requirement

The plugin's minimum supported version is specified in `manifest.json`:

**InDesign Plugin** (`uxp-plugins/indesign/manifest.json`):
```json
"host": [
  {
    "app": "ID",
    "minVersion": "20.2.0"
  }
]
```

**What this means:**
- The plugin requires InDesign version **20.2.0 or higher**
- If your CC app version is below this, the plugin **will not load**
- If your CC app version is at or above this, proceed to testing

**To check your InDesign version:**
- Open InDesign
- Go to **Help → About InDesign**
- Compare the version number with `20.2.0`

### 2. Test Plugin Loading

**Step-by-step verification:**

1. **Launch Adobe UXP Developer Tools**
   - Available from Creative Cloud desktop app
   - Or search "UXP Developer Tools" in Windows/macOS

2. **Load the Plugin**
   - Click **"Add Plugin"**
   - Navigate to `uxp-plugins/indesign/`
   - Select `manifest.json`
   - Click **"Load"**

3. **Check for Errors**
   - ✅ **Success**: Plugin appears in the list without errors
   - ❌ **Failure**: Error message indicates compatibility issue
     - Common errors:
       - "Plugin requires InDesign version X.X.X or higher"
       - "Manifest version incompatible"
       - "Required API not available"

### 3. Test Basic Functionality

**Test the connection:**

1. **Start the proxy server:**
   ```bash
   adobe-proxy
   ```
   Should show: `Command proxy server running on ws://localhost:3001`

2. **Start the MCP server:**
   ```bash
   adobe-indesign
   ```
   Should show: `Adobe InDesign MCP Server running on stdio`

3. **Open InDesign** and load the plugin

4. **Connect the plugin:**
   - Open the plugin panel (Plugins menu → InDesign MCP Agent)
   - Click **"Connect"** button
   - Status should change to **"Connected"**
   - Check browser console (F12) for connection messages

### 4. Test a Simple Command

**Test document creation:**

1. Ensure all services are running (proxy + MCP + InDesign with plugin connected)

2. Use the MCP server to create a document:
   ```python
   # Via Python or MCP client
   create_document(
       width=800,
       height=600,
       pages=1
   )
   ```

3. **Expected result:**
   - ✅ New InDesign document opens
   - ✅ Document has correct dimensions
   - ✅ No error messages in console

### 5. Check for API Changes

**Review Adobe's UXP API documentation:**

1. **Check Adobe's release notes:**
   - Visit [Adobe UXP Developer Portal](https://developer.adobe.com/photoshop/uxp/)
   - Look for breaking changes in recent versions
   - Check InDesign-specific API changes

2. **Review plugin code for deprecated APIs:**
   - Check `uxp-plugins/indesign/commands/index.js`
   - Look for APIs that might have changed:
     - `app.documents.add()` - Document creation
     - `app.marginPreferences` - Margin settings
     - `DocumentIntentOptions` - Document intent options

3. **Common breaking changes:**
   - API method signatures changed
   - Enum values renamed or removed
   - New required parameters
   - Deprecated methods removed

### 6. Full Integration Test

**Run the complete test suite:**

```bash
# Windows PowerShell
.\run-tests.ps1

# Windows CMD
run-tests.bat

# Linux/macOS
python -m pytest tests/
```

**What to watch for:**
- ✅ All tests pass
- ❌ Tests fail with API errors
- ❌ Connection timeouts
- ❌ Unexpected behavior

## Troubleshooting Compatibility Issues

### Issue: Plugin Won't Load

**Symptoms:**
- Error in UXP Developer Tools when loading plugin
- Plugin doesn't appear in the list

**Solutions:**
1. Check `minVersion` in `manifest.json` matches your app version
2. Update `manifestVersion` if needed (currently `5`)
3. Check Adobe UXP Developer Tools is up to date
4. Verify InDesign version: `Help → About InDesign`

### Issue: Plugin Loads But Won't Connect

**Symptoms:**
- Plugin loads successfully
- "Connect" button doesn't work
- Connection errors in console

**Solutions:**
1. Verify proxy server is running: `http://localhost:3001`
2. Check firewall isn't blocking port 3001
3. Verify Socket.IO connection in browser console (F12)
4. Check network permissions in `manifest.json`:
   ```json
   "requiredPermissions": {
     "network": {
       "domains": "all"
     }
   }
   ```

### Issue: Commands Fail After Connection

**Symptoms:**
- Plugin connects successfully
- Commands return errors
- API calls fail

**Solutions:**
1. Check browser console (F12) for JavaScript errors
2. Verify API methods still exist in new CC version
3. Check for API signature changes
4. Review Adobe's API documentation for changes

### Issue: Unexpected Behavior

**Symptoms:**
- Commands execute but produce wrong results
- Features work differently than expected

**Solutions:**
1. Check Adobe's release notes for behavior changes
2. Test each command individually
3. Compare behavior with previous CC version
4. Review plugin code for version-specific logic

## Version Compatibility Matrix

| Plugin | Min Version | Tested Versions | Status |
|--------|------------|-----------------|--------|
| InDesign | 20.2.0 | - | ⚠️ Needs testing |
| Photoshop | 26.0.0 | - | ⚠️ Needs testing |
| Premiere | 25.3.0 | - | ⚠️ Needs testing |
| Illustrator | - | - | ⚠️ Needs testing |

**Legend:**
- ✅ Fully compatible
- ⚠️ Needs testing
- ❌ Incompatible

## Updating for New CC Versions

If you need to update the plugin for a new CC version:

1. **Update `minVersion` in `manifest.json`** if you want to require a newer version
2. **Test all commands** with the new CC version
3. **Update API calls** if Adobe changed the API
4. **Update documentation** with tested versions
5. **Create a new release** with version notes

## Resources

- [Adobe UXP Developer Portal](https://developer.adobe.com/photoshop/uxp/)
- [InDesign UXP API Reference](https://developer.adobe.com/indesign/uxp/)
- [UXP Plugin Manifest Reference](https://developer.adobe.com/photoshop/uxp/2023/guides/uxp-manifest/)
- [Adobe Creative Cloud Release Notes](https://helpx.adobe.com/creative-cloud/release-notes.html)

## Quick Verification Checklist

- [ ] Check `minVersion` in `manifest.json` matches your CC app version
- [ ] Plugin loads in UXP Developer Tools without errors
- [ ] Proxy server starts successfully (`adobe-proxy`)
- [ ] MCP server starts successfully (`adobe-indesign`)
- [ ] Plugin connects to proxy server (status shows "Connected")
- [ ] Test `create_document` command works
- [ ] Check browser console (F12) for errors
- [ ] Review Adobe's release notes for breaking changes
- [ ] Run full test suite if available

If all checks pass, the plugin is compatible! ✅
