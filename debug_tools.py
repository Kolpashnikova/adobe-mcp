#!/usr/bin/env python3
"""Debug script to list all registered MCP tools."""
import sys
sys.path.insert(0, '/home/mila/Documents/apps/adobe-mcp')

from adobe_mcp.indesign.server import mcp
import inspect

# Get all tools registered with FastMCP
print("=" * 60)
print("Registered MCP Tools")
print("=" * 60)

# FastMCP stores tools in _tools attribute
if hasattr(mcp, '_tools'):
    tools = mcp._tools
    print(f"\nTotal tools found: {len(tools)}")
    for i, (name, tool_info) in enumerate(tools.items(), 1):
        print(f"\n{i}. {name}")
        if hasattr(tool_info, '__doc__') and tool_info.__doc__:
            doc = tool_info.__doc__.strip().split('\n')[0]
            print(f"   Description: {doc}")
        if hasattr(tool_info, '__annotations__'):
            print(f"   Parameters: {tool_info.__annotations__}")
else:
    print("Could not find _tools attribute")
    print("Trying alternative method...")
    
    # Try to find decorated functions
    module = sys.modules['adobe_mcp.indesign.server']
    tools_found = []
    for name, obj in inspect.getmembers(module):
        if inspect.isfunction(obj) and hasattr(obj, '__mcp_tool__'):
            tools_found.append(name)
    
    print(f"\nFound {len(tools_found)} tools via inspection:")
    for name in tools_found[:20]:  # Show first 20
        print(f"  - {name}")
    if len(tools_found) > 20:
        print(f"  ... and {len(tools_found) - 20} more")

print("\n" + "=" * 60)
