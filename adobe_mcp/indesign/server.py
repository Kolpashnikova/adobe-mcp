# MIT License
#
# Copyright (c) 2025 Mike Chambers, Kamila Kolpashnikova
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

from mcp.server.fastmcp import FastMCP
from ..shared import init, sendCommand, createCommand, socket_client
import sys
import os
from pathlib import Path
from typing import Optional, List
from enum import Enum
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path)

# Create an MCP server
mcp_name = "Adobe InDesign MCP Server"
mcp = FastMCP(mcp_name, log_level="ERROR")
print(f"{mcp_name} running on stdio", file=sys.stderr)

APPLICATION = "indesign"
PROXY_HOST = os.getenv('PROXY_HOST', 'localhost')
PROXY_PORT = os.getenv('PROXY_PORT', '3001')
PROXY_URL = f'http://{PROXY_HOST}:{PROXY_PORT}'
PROXY_TIMEOUT = 20

socket_client.configure(
    app=APPLICATION,
    url=PROXY_URL,
    timeout=PROXY_TIMEOUT
)

init(APPLICATION, socket_client)

# =============================================================================
# CONSTANTS
# =============================================================================

BLEND_MODES = [
    "NORMAL", "MULTIPLY", "SCREEN", "OVERLAY", "SOFT_LIGHT", "HARD_LIGHT",
    "COLOR_DODGE", "COLOR_BURN", "DARKEN", "LIGHTEN", "DIFFERENCE",
    "EXCLUSION", "HUE", "SATURATION", "COLOR", "LUMINOSITY"
]

EXPORT_FORMATS = [
    "PDF", "JPEG", "PNG", "EPS", "EPUB", "HTML", "IDML", "INX"
]

LAYER_COLORS = [
    "LIGHT_BLUE", "RED", "GREEN", "BLUE", "YELLOW", "MAGENTA", "CYAN",
    "GRAY", "BLACK", "ORANGE", "DARK_GREEN", "TEAL", "TAN", "BROWN",
    "VIOLET", "GOLD", "DARK_BLUE", "PINK", "LAVENDER", "BRICK_RED",
    "OLIVE_GREEN", "PEACH", "BURGUNDY", "GRASS_GREEN", "OCHRE", "PURPLE",
    "LIGHT_GRAY", "CHARCOAL", "GRID_BLUE", "GRID_ORANGE", "FIESTA",
    "LIGHT_OLIVE", "LIPSTICK", "CUTE_TEAL", "SULPHUR", "GRID_GREEN", "WHITE"
]

STROKE_TYPES = [
    "SOLID", "DASHED", "DOTTED", "TRIPLE_STRIPE", "THICK_THIN",
    "THIN_THICK", "THIN_THICK_THIN", "THICK_THIN_THICK",
    "JAPANESE_DOTS", "WHITE_DIAMOND", "WAVY", "STRAIGHT_HASH", "LEFT_SLANT_HASH",
    "RIGHT_SLANT_HASH", "SINGLE_WAVY", "CANNED_DASHED_3X2", "CANNED_DASHED_4X4"
]

JUSTIFICATION = [
    "LEFT_ALIGN", "CENTER_ALIGN", "RIGHT_ALIGN", "LEFT_JUSTIFIED",
    "CENTER_JUSTIFIED", "RIGHT_JUSTIFIED", "FULLY_JUSTIFIED",
    "AWAY_FROM_BINDING_SIDE", "TOWARD_BINDING_SIDE"
]

VERTICAL_JUSTIFICATION = [
    "TOP_ALIGN", "CENTER_ALIGN", "BOTTOM_ALIGN", "JUSTIFY_ALIGN"
]

FONT_STYLES = [
    "REGULAR", "BOLD", "ITALIC", "BOLD_ITALIC"
]

PAGE_SIDE = [
    "LEFT_HAND", "RIGHT_HAND", "SINGLE_SIDED"
]

# =============================================================================
# DOCUMENT OPERATIONS
# =============================================================================

@mcp.tool()
def create_document(
    width: int,
    height: int,
    pages: int = 1,
    pages_facing: bool = False,
    columns: dict = {"count": 1, "gutter": 12},
    margins: dict = {"top": 36, "bottom": 36, "left": 36, "right": 36},
    bleed: dict = {"top": 0, "bottom": 0, "left": 0, "right": 0},
    slug: dict = {"top": 0, "bottom": 0, "left": 0, "right": 0}
):
    """Create a new InDesign document with specified dimensions and settings.
    
    Args:
        width: Page width in points (72 points = 1 inch)
        height: Page height in points
        pages: Number of pages to create
        pages_facing: Whether to use facing pages (spreads)
        columns: Column settings {"count": int, "gutter": int}
        margins: Margin settings {"top": int, "bottom": int, "left": int, "right": int}
        bleed: Bleed settings {"top": int, "bottom": int, "left": int, "right": int}
        slug: Slug area settings {"top": int, "bottom": int, "left": int, "right": int}
    """
    command = createCommand("createDocument", {
        "intent": "WEB_INTENT",
        "pageWidth": width,
        "pageHeight": height,
        "margins": margins,
        "columns": columns,
        "pagesPerDocument": pages,
        "pagesFacing": pages_facing,
        "bleed": bleed,
        "slug": slug
    })
    return sendCommand(command)


@mcp.tool()
def open_document(file_path: str):
    """Open an existing InDesign document.
    
    Args:
        file_path: Full path to the .indd file
    """
    command = createCommand("openDocument", {
        "filePath": file_path
    })
    return sendCommand(command)


@mcp.tool()
def save_document(file_path: Optional[str] = None):
    """Save the current document.
    
    Args:
        file_path: Optional path to save as new file. If None, saves to current location.
    """
    params = {}
    if file_path:
        params["filePath"] = file_path
    command = createCommand("saveDocument", params)
    return sendCommand(command)


@mcp.tool()
def close_document(save_changes: bool = True):
    """Close the current document.
    
    Args:
        save_changes: Whether to save changes before closing
    """
    command = createCommand("closeDocument", {
        "saveChanges": save_changes
    })
    return sendCommand(command)


@mcp.tool()
def export_document(
    file_path: str,
    format: str = "PDF",
    page_range: str = "ALL",
    quality: str = "HIGH",
    spread: bool = False
):
    """Export the document to various formats.
    
    Args:
        file_path: Destination file path
        format: Export format (PDF, JPEG, PNG, EPS, EPUB, HTML, IDML)
        page_range: Pages to export ("ALL", "1-5", "1,3,5", etc.)
        quality: Export quality (LOW, MEDIUM, HIGH, MAXIMUM)
        spread: Export as spreads instead of individual pages
    """
    command = createCommand("exportDocument", {
        "filePath": file_path,
        "format": format.upper(),
        "pageRange": page_range,
        "quality": quality.upper(),
        "exportSpreads": spread
    })
    return sendCommand(command)


@mcp.tool()
def get_document_info():
    """Get information about the current document including pages, size, and settings."""
    command = createCommand("getDocumentInfo", {})
    return sendCommand(command)


@mcp.tool()
def set_document_preferences(
    page_width: Optional[int] = None,
    page_height: Optional[int] = None,
    pages_facing: Optional[bool] = None,
    bleed_uniform: Optional[int] = None
):
    """Set document-level preferences.
    
    Args:
        page_width: New page width in points
        page_height: New page height in points
        pages_facing: Enable/disable facing pages
        bleed_uniform: Uniform bleed value for all sides
    """
    params = {}
    if page_width is not None:
        params["pageWidth"] = page_width
    if page_height is not None:
        params["pageHeight"] = page_height
    if pages_facing is not None:
        params["pagesFacing"] = pages_facing
    if bleed_uniform is not None:
        params["bleedUniform"] = bleed_uniform
    command = createCommand("setDocumentPreferences", params)
    return sendCommand(command)


# =============================================================================
# PAGE OPERATIONS
# =============================================================================

@mcp.tool()
def add_page(
    at_index: Optional[int] = None,
    count: int = 1,
    master_page: Optional[str] = None
):
    """Add new page(s) to the document.
    
    Args:
        at_index: Position to insert pages (None = end of document)
        count: Number of pages to add
        master_page: Name of master page to apply
    """
    params = {"count": count}
    if at_index is not None:
        params["atIndex"] = at_index
    if master_page:
        params["masterPage"] = master_page
    command = createCommand("addPage", params)
    return sendCommand(command)


@mcp.tool()
def delete_page(page_index: int):
    """Delete a page from the document.
    
    Args:
        page_index: Zero-based index of the page to delete
    """
    command = createCommand("deletePage", {
        "pageIndex": page_index
    })
    return sendCommand(command)


@mcp.tool()
def duplicate_page(page_index: int, insert_at: Optional[int] = None):
    """Duplicate a page.
    
    Args:
        page_index: Index of the page to duplicate
        insert_at: Where to insert the duplicate (None = after original)
    """
    params = {"pageIndex": page_index}
    if insert_at is not None:
        params["insertAt"] = insert_at
    command = createCommand("duplicatePage", params)
    return sendCommand(command)


@mcp.tool()
def move_page(page_index: int, destination_index: int):
    """Move a page to a new position.
    
    Args:
        page_index: Current index of the page
        destination_index: New position for the page
    """
    command = createCommand("movePage", {
        "pageIndex": page_index,
        "destinationIndex": destination_index
    })
    return sendCommand(command)


@mcp.tool()
def get_page_count():
    """Get the total number of pages in the document."""
    command = createCommand("getPageCount", {})
    return sendCommand(command)


@mcp.tool()
def get_page_items(page_index: int):
    """Get all items on a specific page.
    
    Args:
        page_index: Zero-based index of the page
    """
    command = createCommand("getPageItems", {
        "pageIndex": page_index
    })
    return sendCommand(command)


@mcp.tool()
def set_page_size(
    page_index: int,
    width: int,
    height: int
):
    """Set the size of a specific page.
    
    Args:
        page_index: Index of the page to resize
        width: New width in points
        height: New height in points
    """
    command = createCommand("setPageSize", {
        "pageIndex": page_index,
        "width": width,
        "height": height
    })
    return sendCommand(command)


# =============================================================================
# TEXT FRAME OPERATIONS
# =============================================================================

@mcp.tool()
def create_text_frame(
    page_index: int,
    x: float,
    y: float,
    width: float,
    height: float,
    content: str = "",
    columns: int = 1,
    column_gutter: float = 12
):
    """Create a new text frame on a page.
    
    Args:
        page_index: Page to create the frame on
        x: X position from top-left in points
        y: Y position from top-left in points
        width: Frame width in points
        height: Frame height in points
        content: Initial text content
        columns: Number of columns in the frame
        column_gutter: Space between columns in points
    """
    command = createCommand("createTextFrame", {
        "pageIndex": page_index,
        "bounds": {"x": x, "y": y, "width": width, "height": height},
        "content": content,
        "columns": columns,
        "columnGutter": column_gutter
    })
    return sendCommand(command)


@mcp.tool()
def set_text_content(frame_id: str, content: str, append: bool = False):
    """Set or append text content in a text frame.
    
    Args:
        frame_id: ID of the text frame
        content: Text content to set or append
        append: If True, append to existing content; if False, replace
    """
    command = createCommand("setTextContent", {
        "frameId": frame_id,
        "content": content,
        "append": append
    })
    return sendCommand(command)


@mcp.tool()
def get_text_content(frame_id: str):
    """Get the text content of a text frame.
    
    Args:
        frame_id: ID of the text frame
    """
    command = createCommand("getTextContent", {
        "frameId": frame_id
    })
    return sendCommand(command)


@mcp.tool()
def set_text_style(
    frame_id: str,
    font_family: Optional[str] = None,
    font_style: Optional[str] = None,
    font_size: Optional[float] = None,
    leading: Optional[float] = None,
    tracking: Optional[int] = None,
    color: Optional[dict] = None,
    justification: Optional[str] = None,
    start_index: Optional[int] = None,
    end_index: Optional[int] = None
):
    """Apply text styling to a text frame or text selection.
    
    Args:
        frame_id: ID of the text frame
        font_family: Font family name (e.g., "Arial", "Times New Roman")
        font_style: Font style (REGULAR, BOLD, ITALIC, BOLD_ITALIC)
        font_size: Font size in points
        leading: Line spacing in points (or "AUTO")
        tracking: Character spacing in thousandths of an em
        color: Text color as {"r": 0-255, "g": 0-255, "b": 0-255} or {"c": 0-100, "m": 0-100, "y": 0-100, "k": 0-100}
        justification: Text alignment (LEFT_ALIGN, CENTER_ALIGN, RIGHT_ALIGN, FULLY_JUSTIFIED, etc.)
        start_index: Start character index for partial styling
        end_index: End character index for partial styling
    """
    params = {"frameId": frame_id}
    if font_family:
        params["fontFamily"] = font_family
    if font_style:
        params["fontStyle"] = font_style
    if font_size is not None:
        params["fontSize"] = font_size
    if leading is not None:
        params["leading"] = leading
    if tracking is not None:
        params["tracking"] = tracking
    if color:
        params["color"] = color
    if justification:
        params["justification"] = justification
    if start_index is not None:
        params["startIndex"] = start_index
    if end_index is not None:
        params["endIndex"] = end_index
    command = createCommand("setTextStyle", params)
    return sendCommand(command)


@mcp.tool()
def set_paragraph_style(
    frame_id: str,
    space_before: Optional[float] = None,
    space_after: Optional[float] = None,
    first_line_indent: Optional[float] = None,
    left_indent: Optional[float] = None,
    right_indent: Optional[float] = None,
    drop_cap_lines: Optional[int] = None,
    drop_cap_characters: Optional[int] = None,
    paragraph_index: Optional[int] = None
):
    """Apply paragraph-level styling.
    
    Args:
        frame_id: ID of the text frame
        space_before: Space before paragraph in points
        space_after: Space after paragraph in points
        first_line_indent: First line indent in points
        left_indent: Left indent in points
        right_indent: Right indent in points
        drop_cap_lines: Number of lines for drop cap
        drop_cap_characters: Number of characters for drop cap
        paragraph_index: Specific paragraph to style (None = all)
    """
    params = {"frameId": frame_id}
    if space_before is not None:
        params["spaceBefore"] = space_before
    if space_after is not None:
        params["spaceAfter"] = space_after
    if first_line_indent is not None:
        params["firstLineIndent"] = first_line_indent
    if left_indent is not None:
        params["leftIndent"] = left_indent
    if right_indent is not None:
        params["rightIndent"] = right_indent
    if drop_cap_lines is not None:
        params["dropCapLines"] = drop_cap_lines
    if drop_cap_characters is not None:
        params["dropCapCharacters"] = drop_cap_characters
    if paragraph_index is not None:
        params["paragraphIndex"] = paragraph_index
    command = createCommand("setParagraphStyle", params)
    return sendCommand(command)


@mcp.tool()
def set_text_frame_options(
    frame_id: str,
    vertical_justification: Optional[str] = None,
    inset_spacing: Optional[dict] = None,
    first_baseline_offset: Optional[str] = None,
    auto_size: Optional[str] = None,
    columns: Optional[int] = None,
    column_gutter: Optional[float] = None
):
    """Set text frame options.
    
    Args:
        frame_id: ID of the text frame
        vertical_justification: TOP_ALIGN, CENTER_ALIGN, BOTTOM_ALIGN, JUSTIFY_ALIGN
        inset_spacing: Inset from frame edges {"top": x, "bottom": x, "left": x, "right": x}
        first_baseline_offset: ASCENT, CAP_HEIGHT, LEADING, X_HEIGHT, FIXED
        auto_size: OFF, HEIGHT_ONLY, WIDTH_ONLY, HEIGHT_AND_WIDTH, HEIGHT_AND_WIDTH_PROPORTIONALLY
        columns: Number of columns
        column_gutter: Space between columns
    """
    params = {"frameId": frame_id}
    if vertical_justification:
        params["verticalJustification"] = vertical_justification
    if inset_spacing:
        params["insetSpacing"] = inset_spacing
    if first_baseline_offset:
        params["firstBaselineOffset"] = first_baseline_offset
    if auto_size:
        params["autoSize"] = auto_size
    if columns is not None:
        params["columns"] = columns
    if column_gutter is not None:
        params["columnGutter"] = column_gutter
    command = createCommand("setTextFrameOptions", params)
    return sendCommand(command)


@mcp.tool()
def link_text_frames(source_frame_id: str, target_frame_id: str):
    """Link two text frames for text flow.
    
    Args:
        source_frame_id: ID of the source frame
        target_frame_id: ID of the target frame to link to
    """
    command = createCommand("linkTextFrames", {
        "sourceFrameId": source_frame_id,
        "targetFrameId": target_frame_id
    })
    return sendCommand(command)


@mcp.tool()
def unlink_text_frame(frame_id: str):
    """Unlink a text frame from its thread.
    
    Args:
        frame_id: ID of the frame to unlink
    """
    command = createCommand("unlinkTextFrame", {
        "frameId": frame_id
    })
    return sendCommand(command)


# =============================================================================
# GRAPHICS AND SHAPES
# =============================================================================

@mcp.tool()
def create_rectangle(
    page_index: int,
    x: float,
    y: float,
    width: float,
    height: float,
    fill_color: Optional[dict] = None,
    stroke_color: Optional[dict] = None,
    stroke_weight: float = 1,
    corner_radius: float = 0
):
    """Create a rectangle shape.
    
    Args:
        page_index: Page to create on
        x: X position in points
        y: Y position in points
        width: Width in points
        height: Height in points
        fill_color: Fill color {"r": 0-255, "g": 0-255, "b": 0-255} or CMYK
        stroke_color: Stroke color
        stroke_weight: Stroke thickness in points
        corner_radius: Corner radius for rounded corners
    """
    command = createCommand("createRectangle", {
        "pageIndex": page_index,
        "bounds": {"x": x, "y": y, "width": width, "height": height},
        "fillColor": fill_color,
        "strokeColor": stroke_color,
        "strokeWeight": stroke_weight,
        "cornerRadius": corner_radius
    })
    return sendCommand(command)


@mcp.tool()
def create_oval(
    page_index: int,
    x: float,
    y: float,
    width: float,
    height: float,
    fill_color: Optional[dict] = None,
    stroke_color: Optional[dict] = None,
    stroke_weight: float = 1
):
    """Create an oval/ellipse shape.
    
    Args:
        page_index: Page to create on
        x: X position in points
        y: Y position in points
        width: Width in points
        height: Height in points
        fill_color: Fill color
        stroke_color: Stroke color
        stroke_weight: Stroke thickness in points
    """
    command = createCommand("createOval", {
        "pageIndex": page_index,
        "bounds": {"x": x, "y": y, "width": width, "height": height},
        "fillColor": fill_color,
        "strokeColor": stroke_color,
        "strokeWeight": stroke_weight
    })
    return sendCommand(command)


@mcp.tool()
def create_polygon(
    page_index: int,
    x: float,
    y: float,
    width: float,
    height: float,
    sides: int = 6,
    star_inset: float = 0,
    fill_color: Optional[dict] = None,
    stroke_color: Optional[dict] = None,
    stroke_weight: float = 1
):
    """Create a polygon shape.
    
    Args:
        page_index: Page to create on
        x: X position in points
        y: Y position in points
        width: Width in points
        height: Height in points
        sides: Number of sides (3 for triangle, 5 for pentagon, etc.)
        star_inset: Inset percentage for star shape (0-100)
        fill_color: Fill color
        stroke_color: Stroke color
        stroke_weight: Stroke thickness
    """
    command = createCommand("createPolygon", {
        "pageIndex": page_index,
        "bounds": {"x": x, "y": y, "width": width, "height": height},
        "sides": sides,
        "starInset": star_inset,
        "fillColor": fill_color,
        "strokeColor": stroke_color,
        "strokeWeight": stroke_weight
    })
    return sendCommand(command)


@mcp.tool()
def create_line(
    page_index: int,
    start_x: float,
    start_y: float,
    end_x: float,
    end_y: float,
    stroke_color: Optional[dict] = None,
    stroke_weight: float = 1,
    stroke_type: str = "SOLID",
    start_arrow: Optional[str] = None,
    end_arrow: Optional[str] = None
):
    """Create a line.
    
    Args:
        page_index: Page to create on
        start_x: Start X position
        start_y: Start Y position
        end_x: End X position
        end_y: End Y position
        stroke_color: Line color
        stroke_weight: Line thickness
        stroke_type: SOLID, DASHED, DOTTED, etc.
        start_arrow: Arrowhead type for start
        end_arrow: Arrowhead type for end
    """
    params = {
        "pageIndex": page_index,
        "startPoint": {"x": start_x, "y": start_y},
        "endPoint": {"x": end_x, "y": end_y},
        "strokeWeight": stroke_weight,
        "strokeType": stroke_type
    }
    if stroke_color:
        params["strokeColor"] = stroke_color
    if start_arrow:
        params["startArrow"] = start_arrow
    if end_arrow:
        params["endArrow"] = end_arrow
    command = createCommand("createLine", params)
    return sendCommand(command)


@mcp.tool()
def place_image(
    page_index: int,
    file_path: str,
    x: float,
    y: float,
    width: Optional[float] = None,
    height: Optional[float] = None,
    fit_option: str = "PROPORTIONALLY"
):
    """Place an image on a page.
    
    Args:
        page_index: Page to place image on
        file_path: Path to the image file
        x: X position in points
        y: Y position in points
        width: Frame width (None = use image dimensions)
        height: Frame height (None = use image dimensions)
        fit_option: PROPORTIONALLY, FILL_PROPORTIONALLY, CONTENT_TO_FRAME, FRAME_TO_CONTENT, CENTER_CONTENT
    """
    params = {
        "pageIndex": page_index,
        "filePath": file_path,
        "position": {"x": x, "y": y},
        "fitOption": fit_option
    }
    if width is not None:
        params["width"] = width
    if height is not None:
        params["height"] = height
    command = createCommand("placeImage", params)
    return sendCommand(command)


@mcp.tool()
def fit_content(
    item_id: str,
    fit_option: str = "PROPORTIONALLY"
):
    """Fit content within a frame or frame to content.
    
    Args:
        item_id: ID of the item
        fit_option: PROPORTIONALLY, FILL_PROPORTIONALLY, CONTENT_TO_FRAME, FRAME_TO_CONTENT, CENTER_CONTENT
    """
    command = createCommand("fitContent", {
        "itemId": item_id,
        "fitOption": fit_option
    })
    return sendCommand(command)


# =============================================================================
# ITEM MANIPULATION
# =============================================================================

@mcp.tool()
def select_item(item_id: str, add_to_selection: bool = False):
    """Select an item.
    
    Args:
        item_id: ID of the item to select
        add_to_selection: Add to current selection instead of replacing
    """
    command = createCommand("selectItem", {
        "itemId": item_id,
        "addToSelection": add_to_selection
    })
    return sendCommand(command)


@mcp.tool()
def select_all(page_index: Optional[int] = None):
    """Select all items on a page or in the document.
    
    Args:
        page_index: Page to select from (None = current spread)
    """
    params = {}
    if page_index is not None:
        params["pageIndex"] = page_index
    command = createCommand("selectAll", params)
    return sendCommand(command)


@mcp.tool()
def deselect_all():
    """Deselect all items."""
    command = createCommand("deselectAll", {})
    return sendCommand(command)


@mcp.tool()
def get_selection():
    """Get information about currently selected items."""
    command = createCommand("getSelection", {})
    return sendCommand(command)


@mcp.tool()
def move_item(item_id: str, x: float, y: float, relative: bool = False):
    """Move an item to a new position.
    
    Args:
        item_id: ID of the item to move
        x: New X position (or X offset if relative)
        y: New Y position (or Y offset if relative)
        relative: If True, move relative to current position
    """
    command = createCommand("moveItem", {
        "itemId": item_id,
        "x": x,
        "y": y,
        "relative": relative
    })
    return sendCommand(command)


@mcp.tool()
def resize_item(
    item_id: str,
    width: Optional[float] = None,
    height: Optional[float] = None,
    scale_x: Optional[float] = None,
    scale_y: Optional[float] = None,
    anchor: str = "TOP_LEFT"
):
    """Resize an item.
    
    Args:
        item_id: ID of the item
        width: New width in points
        height: New height in points
        scale_x: Horizontal scale percentage
        scale_y: Vertical scale percentage
        anchor: Anchor point (TOP_LEFT, TOP_CENTER, TOP_RIGHT, CENTER_LEFT, CENTER, CENTER_RIGHT, BOTTOM_LEFT, BOTTOM_CENTER, BOTTOM_RIGHT)
    """
    params = {"itemId": item_id, "anchor": anchor}
    if width is not None:
        params["width"] = width
    if height is not None:
        params["height"] = height
    if scale_x is not None:
        params["scaleX"] = scale_x
    if scale_y is not None:
        params["scaleY"] = scale_y
    command = createCommand("resizeItem", params)
    return sendCommand(command)


@mcp.tool()
def rotate_item(item_id: str, angle: float, anchor: str = "CENTER"):
    """Rotate an item.
    
    Args:
        item_id: ID of the item
        angle: Rotation angle in degrees
        anchor: Anchor point for rotation
    """
    command = createCommand("rotateItem", {
        "itemId": item_id,
        "angle": angle,
        "anchor": anchor
    })
    return sendCommand(command)


@mcp.tool()
def duplicate_item(item_id: str, offset_x: float = 10, offset_y: float = 10):
    """Duplicate an item.
    
    Args:
        item_id: ID of the item to duplicate
        offset_x: Horizontal offset for duplicate
        offset_y: Vertical offset for duplicate
    """
    command = createCommand("duplicateItem", {
        "itemId": item_id,
        "offsetX": offset_x,
        "offsetY": offset_y
    })
    return sendCommand(command)


@mcp.tool()
def delete_item(item_id: str):
    """Delete an item.
    
    Args:
        item_id: ID of the item to delete
    """
    command = createCommand("deleteItem", {
        "itemId": item_id
    })
    return sendCommand(command)


@mcp.tool()
def group_items(item_ids: List[str]):
    """Group multiple items together.
    
    Args:
        item_ids: List of item IDs to group
    """
    command = createCommand("groupItems", {
        "itemIds": item_ids
    })
    return sendCommand(command)


@mcp.tool()
def ungroup_items(group_id: str):
    """Ungroup a group.
    
    Args:
        group_id: ID of the group to ungroup
    """
    command = createCommand("ungroupItems", {
        "groupId": group_id
    })
    return sendCommand(command)


@mcp.tool()
def set_item_fill(item_id: str, color: Optional[dict] = None, tint: float = 100):
    """Set the fill color of an item.
    
    Args:
        item_id: ID of the item
        color: Fill color (RGB or CMYK dict, or None for no fill)
        tint: Tint percentage (0-100)
    """
    command = createCommand("setItemFill", {
        "itemId": item_id,
        "color": color,
        "tint": tint
    })
    return sendCommand(command)


@mcp.tool()
def set_item_stroke(
    item_id: str,
    color: Optional[dict] = None,
    weight: float = 1,
    stroke_type: str = "SOLID",
    tint: float = 100
):
    """Set the stroke of an item.
    
    Args:
        item_id: ID of the item
        color: Stroke color (or None for no stroke)
        weight: Stroke weight in points
        stroke_type: SOLID, DASHED, DOTTED, etc.
        tint: Tint percentage
    """
    command = createCommand("setItemStroke", {
        "itemId": item_id,
        "color": color,
        "weight": weight,
        "strokeType": stroke_type,
        "tint": tint
    })
    return sendCommand(command)


@mcp.tool()
def set_item_effects(
    item_id: str,
    opacity: Optional[float] = None,
    blend_mode: Optional[str] = None,
    drop_shadow: Optional[dict] = None,
    inner_shadow: Optional[dict] = None,
    feather: Optional[dict] = None
):
    """Apply effects to an item.
    
    Args:
        item_id: ID of the item
        opacity: Opacity percentage (0-100)
        blend_mode: NORMAL, MULTIPLY, SCREEN, OVERLAY, etc.
        drop_shadow: {"enabled": bool, "angle": float, "distance": float, "blur": float, "spread": float, "opacity": float}
        inner_shadow: Similar to drop_shadow
        feather: {"enabled": bool, "width": float, "corners": "SHARP" or "ROUNDED"}
    """
    params = {"itemId": item_id}
    if opacity is not None:
        params["opacity"] = opacity
    if blend_mode:
        params["blendMode"] = blend_mode
    if drop_shadow:
        params["dropShadow"] = drop_shadow
    if inner_shadow:
        params["innerShadow"] = inner_shadow
    if feather:
        params["feather"] = feather
    command = createCommand("setItemEffects", params)
    return sendCommand(command)


@mcp.tool()
def arrange_item(item_id: str, arrangement: str):
    """Change the stacking order of an item.
    
    Args:
        item_id: ID of the item
        arrangement: BRING_TO_FRONT, BRING_FORWARD, SEND_BACKWARD, SEND_TO_BACK
    """
    command = createCommand("arrangeItem", {
        "itemId": item_id,
        "arrangement": arrangement
    })
    return sendCommand(command)


@mcp.tool()
def align_items(
    item_ids: List[str],
    alignment: str,
    reference: str = "SELECTION"
):
    """Align multiple items.
    
    Args:
        item_ids: List of item IDs to align
        alignment: LEFT, CENTER, RIGHT, TOP, MIDDLE, BOTTOM
        reference: SELECTION, PAGE, SPREAD, MARGINS
    """
    command = createCommand("alignItems", {
        "itemIds": item_ids,
        "alignment": alignment,
        "reference": reference
    })
    return sendCommand(command)


@mcp.tool()
def distribute_items(
    item_ids: List[str],
    distribution: str,
    spacing: Optional[float] = None
):
    """Distribute items evenly.
    
    Args:
        item_ids: List of item IDs to distribute
        distribution: HORIZONTAL_CENTERS, VERTICAL_CENTERS, HORIZONTAL_SPACE, VERTICAL_SPACE
        spacing: Specific spacing value (None = distribute evenly)
    """
    params = {
        "itemIds": item_ids,
        "distribution": distribution
    }
    if spacing is not None:
        params["spacing"] = spacing
    command = createCommand("distributeItems", params)
    return sendCommand(command)


# =============================================================================
# LAYERS
# =============================================================================

@mcp.tool()
def create_layer(
    name: str,
    color: str = "LIGHT_BLUE",
    visible: bool = True,
    locked: bool = False,
    printable: bool = True
):
    """Create a new layer.
    
    Args:
        name: Layer name
        color: Layer color (LIGHT_BLUE, RED, GREEN, etc.)
        visible: Layer visibility
        locked: Layer lock state
        printable: Whether layer prints
    """
    command = createCommand("createLayer", {
        "name": name,
        "color": color,
        "visible": visible,
        "locked": locked,
        "printable": printable
    })
    return sendCommand(command)


@mcp.tool()
def get_layers():
    """Get all layers in the document."""
    command = createCommand("getLayers", {})
    return sendCommand(command)


@mcp.tool()
def set_layer_properties(
    layer_name: str,
    visible: Optional[bool] = None,
    locked: Optional[bool] = None,
    printable: Optional[bool] = None,
    new_name: Optional[str] = None,
    color: Optional[str] = None
):
    """Modify layer properties.
    
    Args:
        layer_name: Name of the layer to modify
        visible: Set visibility
        locked: Set locked state
        printable: Set printable state
        new_name: Rename the layer
        color: Change layer color
    """
    params = {"layerName": layer_name}
    if visible is not None:
        params["visible"] = visible
    if locked is not None:
        params["locked"] = locked
    if printable is not None:
        params["printable"] = printable
    if new_name:
        params["newName"] = new_name
    if color:
        params["color"] = color
    command = createCommand("setLayerProperties", params)
    return sendCommand(command)


@mcp.tool()
def delete_layer(layer_name: str):
    """Delete a layer.
    
    Args:
        layer_name: Name of the layer to delete
    """
    command = createCommand("deleteLayer", {
        "layerName": layer_name
    })
    return sendCommand(command)


@mcp.tool()
def move_item_to_layer(item_id: str, layer_name: str):
    """Move an item to a different layer.
    
    Args:
        item_id: ID of the item to move
        layer_name: Target layer name
    """
    command = createCommand("moveItemToLayer", {
        "itemId": item_id,
        "layerName": layer_name
    })
    return sendCommand(command)


@mcp.tool()
def reorder_layer(layer_name: str, position: int):
    """Change a layer's position in the layer stack.
    
    Args:
        layer_name: Name of the layer
        position: New position (0 = top)
    """
    command = createCommand("reorderLayer", {
        "layerName": layer_name,
        "position": position
    })
    return sendCommand(command)


# =============================================================================
# MASTER PAGES
# =============================================================================

@mcp.tool()
def create_master_page(
    name: str,
    prefix: str,
    based_on: Optional[str] = None,
    pages: int = 1
):
    """Create a new master page.
    
    Args:
        name: Master page name
        prefix: Master page prefix (e.g., "A", "B")
        based_on: Name of master page to base on
        pages: Number of pages in the master spread
    """
    params = {
        "name": name,
        "prefix": prefix,
        "pages": pages
    }
    if based_on:
        params["basedOn"] = based_on
    command = createCommand("createMasterPage", params)
    return sendCommand(command)


@mcp.tool()
def get_master_pages():
    """Get all master pages in the document."""
    command = createCommand("getMasterPages", {})
    return sendCommand(command)


@mcp.tool()
def apply_master_page(page_index: int, master_name: str):
    """Apply a master page to a document page.
    
    Args:
        page_index: Index of the page to apply master to
        master_name: Name of the master page to apply
    """
    command = createCommand("applyMasterPage", {
        "pageIndex": page_index,
        "masterName": master_name
    })
    return sendCommand(command)


@mcp.tool()
def delete_master_page(master_name: str):
    """Delete a master page.
    
    Args:
        master_name: Name of the master page to delete
    """
    command = createCommand("deleteMasterPage", {
        "masterName": master_name
    })
    return sendCommand(command)


@mcp.tool()
def override_master_item(page_index: int, item_id: str):
    """Override a master page item on a document page.
    
    Args:
        page_index: Index of the document page
        item_id: ID of the master page item to override
    """
    command = createCommand("overrideMasterItem", {
        "pageIndex": page_index,
        "itemId": item_id
    })
    return sendCommand(command)


# =============================================================================
# STYLES
# =============================================================================

@mcp.tool()
def create_paragraph_style(
    name: str,
    based_on: Optional[str] = None,
    font_family: Optional[str] = None,
    font_style: Optional[str] = None,
    font_size: Optional[float] = None,
    leading: Optional[float] = None,
    tracking: Optional[int] = None,
    justification: Optional[str] = None,
    space_before: Optional[float] = None,
    space_after: Optional[float] = None,
    first_line_indent: Optional[float] = None,
    color: Optional[dict] = None
):
    """Create a paragraph style.
    
    Args:
        name: Style name
        based_on: Parent style name
        font_family: Font family
        font_style: Font style (REGULAR, BOLD, etc.)
        font_size: Size in points
        leading: Line spacing
        tracking: Character spacing
        justification: Alignment
        space_before: Space before paragraph
        space_after: Space after paragraph
        first_line_indent: First line indent
        color: Text color
    """
    params = {"name": name}
    if based_on:
        params["basedOn"] = based_on
    if font_family:
        params["fontFamily"] = font_family
    if font_style:
        params["fontStyle"] = font_style
    if font_size is not None:
        params["fontSize"] = font_size
    if leading is not None:
        params["leading"] = leading
    if tracking is not None:
        params["tracking"] = tracking
    if justification:
        params["justification"] = justification
    if space_before is not None:
        params["spaceBefore"] = space_before
    if space_after is not None:
        params["spaceAfter"] = space_after
    if first_line_indent is not None:
        params["firstLineIndent"] = first_line_indent
    if color:
        params["color"] = color
    command = createCommand("createParagraphStyle", params)
    return sendCommand(command)


@mcp.tool()
def create_character_style(
    name: str,
    based_on: Optional[str] = None,
    font_family: Optional[str] = None,
    font_style: Optional[str] = None,
    font_size: Optional[float] = None,
    tracking: Optional[int] = None,
    color: Optional[dict] = None,
    underline: bool = False,
    strikethrough: bool = False
):
    """Create a character style.
    
    Args:
        name: Style name
        based_on: Parent style name
        font_family: Font family
        font_style: Font style
        font_size: Size in points
        tracking: Character spacing
        color: Text color
        underline: Apply underline
        strikethrough: Apply strikethrough
    """
    params = {"name": name}
    if based_on:
        params["basedOn"] = based_on
    if font_family:
        params["fontFamily"] = font_family
    if font_style:
        params["fontStyle"] = font_style
    if font_size is not None:
        params["fontSize"] = font_size
    if tracking is not None:
        params["tracking"] = tracking
    if color:
        params["color"] = color
    params["underline"] = underline
    params["strikethrough"] = strikethrough
    command = createCommand("createCharacterStyle", params)
    return sendCommand(command)


@mcp.tool()
def create_object_style(
    name: str,
    fill_color: Optional[dict] = None,
    stroke_color: Optional[dict] = None,
    stroke_weight: Optional[float] = None,
    corner_radius: Optional[float] = None,
    opacity: Optional[float] = None,
    drop_shadow: Optional[dict] = None
):
    """Create an object style.
    
    Args:
        name: Style name
        fill_color: Fill color
        stroke_color: Stroke color
        stroke_weight: Stroke weight
        corner_radius: Corner radius
        opacity: Opacity percentage
        drop_shadow: Drop shadow settings
    """
    params = {"name": name}
    if fill_color:
        params["fillColor"] = fill_color
    if stroke_color:
        params["strokeColor"] = stroke_color
    if stroke_weight is not None:
        params["strokeWeight"] = stroke_weight
    if corner_radius is not None:
        params["cornerRadius"] = corner_radius
    if opacity is not None:
        params["opacity"] = opacity
    if drop_shadow:
        params["dropShadow"] = drop_shadow
    command = createCommand("createObjectStyle", params)
    return sendCommand(command)


@mcp.tool()
def get_paragraph_styles():
    """Get all paragraph styles in the document."""
    command = createCommand("getParagraphStyles", {})
    return sendCommand(command)


@mcp.tool()
def get_character_styles():
    """Get all character styles in the document."""
    command = createCommand("getCharacterStyles", {})
    return sendCommand(command)


@mcp.tool()
def get_object_styles():
    """Get all object styles in the document."""
    command = createCommand("getObjectStyles", {})
    return sendCommand(command)


@mcp.tool()
def apply_paragraph_style(frame_id: str, style_name: str, paragraph_index: Optional[int] = None):
    """Apply a paragraph style to text.
    
    Args:
        frame_id: Text frame ID
        style_name: Name of the paragraph style
        paragraph_index: Specific paragraph (None = all text)
    """
    params = {
        "frameId": frame_id,
        "styleName": style_name
    }
    if paragraph_index is not None:
        params["paragraphIndex"] = paragraph_index
    command = createCommand("applyParagraphStyle", params)
    return sendCommand(command)


@mcp.tool()
def apply_character_style(
    frame_id: str,
    style_name: str,
    start_index: int,
    end_index: int
):
    """Apply a character style to a text range.
    
    Args:
        frame_id: Text frame ID
        style_name: Name of the character style
        start_index: Start character index
        end_index: End character index
    """
    command = createCommand("applyCharacterStyle", {
        "frameId": frame_id,
        "styleName": style_name,
        "startIndex": start_index,
        "endIndex": end_index
    })
    return sendCommand(command)


@mcp.tool()
def apply_object_style(item_id: str, style_name: str):
    """Apply an object style to an item.
    
    Args:
        item_id: Item ID
        style_name: Name of the object style
    """
    command = createCommand("applyObjectStyle", {
        "itemId": item_id,
        "styleName": style_name
    })
    return sendCommand(command)


@mcp.tool()
def delete_style(style_type: str, style_name: str, replace_with: Optional[str] = None):
    """Delete a style.
    
    Args:
        style_type: PARAGRAPH, CHARACTER, or OBJECT
        style_name: Name of the style to delete
        replace_with: Style to apply to text using the deleted style
    """
    params = {
        "styleType": style_type,
        "styleName": style_name
    }
    if replace_with:
        params["replaceWith"] = replace_with
    command = createCommand("deleteStyle", params)
    return sendCommand(command)


# =============================================================================
# COLORS AND SWATCHES
# =============================================================================

@mcp.tool()
def create_color_swatch(
    name: str,
    color_space: str = "RGB",
    values: dict = None
):
    """Create a color swatch.
    
    Args:
        name: Swatch name
        color_space: RGB or CMYK
        values: Color values - RGB: {"r": 0-255, "g": 0-255, "b": 0-255} or CMYK: {"c": 0-100, "m": 0-100, "y": 0-100, "k": 0-100}
    """
    command = createCommand("createColorSwatch", {
        "name": name,
        "colorSpace": color_space,
        "values": values or {"r": 0, "g": 0, "b": 0}
    })
    return sendCommand(command)


@mcp.tool()
def get_swatches():
    """Get all color swatches in the document."""
    command = createCommand("getSwatches", {})
    return sendCommand(command)


@mcp.tool()
def delete_swatch(swatch_name: str, replace_with: str = "Black"):
    """Delete a color swatch.
    
    Args:
        swatch_name: Name of swatch to delete
        replace_with: Swatch to use as replacement
    """
    command = createCommand("deleteSwatch", {
        "swatchName": swatch_name,
        "replaceWith": replace_with
    })
    return sendCommand(command)


@mcp.tool()
def create_gradient_swatch(
    name: str,
    gradient_type: str = "LINEAR",
    stops: List[dict] = None,
    angle: float = 0
):
    """Create a gradient swatch.
    
    Args:
        name: Swatch name
        gradient_type: LINEAR or RADIAL
        stops: List of color stops [{"color": {...}, "position": 0-100}, ...]
        angle: Gradient angle in degrees (for linear)
    """
    command = createCommand("createGradientSwatch", {
        "name": name,
        "gradientType": gradient_type,
        "stops": stops or [
            {"color": {"r": 255, "g": 255, "b": 255}, "position": 0},
            {"color": {"r": 0, "g": 0, "b": 0}, "position": 100}
        ],
        "angle": angle
    })
    return sendCommand(command)


# =============================================================================
# TABLES
# =============================================================================

@mcp.tool()
def create_table(
    page_index: int,
    x: float,
    y: float,
    width: float,
    height: float,
    rows: int = 3,
    columns: int = 3,
    header_rows: int = 0,
    footer_rows: int = 0
):
    """Create a table.
    
    Args:
        page_index: Page to create table on
        x: X position
        y: Y position
        width: Table width
        height: Table height
        rows: Number of body rows
        columns: Number of columns
        header_rows: Number of header rows
        footer_rows: Number of footer rows
    """
    command = createCommand("createTable", {
        "pageIndex": page_index,
        "bounds": {"x": x, "y": y, "width": width, "height": height},
        "rows": rows,
        "columns": columns,
        "headerRows": header_rows,
        "footerRows": footer_rows
    })
    return sendCommand(command)


@mcp.tool()
def set_table_cell_content(
    table_id: str,
    row: int,
    column: int,
    content: str
):
    """Set the content of a table cell.
    
    Args:
        table_id: ID of the table
        row: Row index (0-based)
        column: Column index (0-based)
        content: Cell text content
    """
    command = createCommand("setTableCellContent", {
        "tableId": table_id,
        "row": row,
        "column": column,
        "content": content
    })
    return sendCommand(command)


@mcp.tool()
def set_table_cell_style(
    table_id: str,
    row: int,
    column: int,
    fill_color: Optional[dict] = None,
    stroke_weight: Optional[float] = None,
    stroke_color: Optional[dict] = None,
    inset: Optional[dict] = None
):
    """Style a table cell.
    
    Args:
        table_id: ID of the table
        row: Row index
        column: Column index
        fill_color: Cell background color
        stroke_weight: Cell border weight
        stroke_color: Cell border color
        inset: Cell inset {"top": x, "bottom": x, "left": x, "right": x}
    """
    params = {
        "tableId": table_id,
        "row": row,
        "column": column
    }
    if fill_color:
        params["fillColor"] = fill_color
    if stroke_weight is not None:
        params["strokeWeight"] = stroke_weight
    if stroke_color:
        params["strokeColor"] = stroke_color
    if inset:
        params["inset"] = inset
    command = createCommand("setTableCellStyle", params)
    return sendCommand(command)


@mcp.tool()
def add_table_rows(table_id: str, at_index: int, count: int = 1):
    """Add rows to a table.
    
    Args:
        table_id: ID of the table
        at_index: Position to insert rows
        count: Number of rows to add
    """
    command = createCommand("addTableRows", {
        "tableId": table_id,
        "atIndex": at_index,
        "count": count
    })
    return sendCommand(command)


@mcp.tool()
def add_table_columns(table_id: str, at_index: int, count: int = 1):
    """Add columns to a table.
    
    Args:
        table_id: ID of the table
        at_index: Position to insert columns
        count: Number of columns to add
    """
    command = createCommand("addTableColumns", {
        "tableId": table_id,
        "atIndex": at_index,
        "count": count
    })
    return sendCommand(command)


@mcp.tool()
def delete_table_rows(table_id: str, at_index: int, count: int = 1):
    """Delete rows from a table.
    
    Args:
        table_id: ID of the table
        at_index: Starting row index
        count: Number of rows to delete
    """
    command = createCommand("deleteTableRows", {
        "tableId": table_id,
        "atIndex": at_index,
        "count": count
    })
    return sendCommand(command)


@mcp.tool()
def delete_table_columns(table_id: str, at_index: int, count: int = 1):
    """Delete columns from a table.
    
    Args:
        table_id: ID of the table
        at_index: Starting column index
        count: Number of columns to delete
    """
    command = createCommand("deleteTableColumns", {
        "tableId": table_id,
        "atIndex": at_index,
        "count": count
    })
    return sendCommand(command)


@mcp.tool()
def merge_table_cells(
    table_id: str,
    start_row: int,
    start_column: int,
    end_row: int,
    end_column: int
):
    """Merge table cells.
    
    Args:
        table_id: ID of the table
        start_row: Starting row index
        start_column: Starting column index
        end_row: Ending row index
        end_column: Ending column index
    """
    command = createCommand("mergeTableCells", {
        "tableId": table_id,
        "startRow": start_row,
        "startColumn": start_column,
        "endRow": end_row,
        "endColumn": end_column
    })
    return sendCommand(command)


@mcp.tool()
def set_column_width(table_id: str, column_index: int, width: float):
    """Set the width of a table column.
    
    Args:
        table_id: ID of the table
        column_index: Column index
        width: New width in points
    """
    command = createCommand("setColumnWidth", {
        "tableId": table_id,
        "columnIndex": column_index,
        "width": width
    })
    return sendCommand(command)


@mcp.tool()
def set_row_height(table_id: str, row_index: int, height: float, minimum: bool = False):
    """Set the height of a table row.
    
    Args:
        table_id: ID of the table
        row_index: Row index
        height: New height in points
        minimum: If True, set as minimum height; if False, set as exact height
    """
    command = createCommand("setRowHeight", {
        "tableId": table_id,
        "rowIndex": row_index,
        "height": height,
        "minimum": minimum
    })
    return sendCommand(command)


# =============================================================================
# FIND/REPLACE
# =============================================================================

@mcp.tool()
def find_text(
    search_string: str,
    whole_word: bool = False,
    case_sensitive: bool = False,
    include_hidden_layers: bool = False,
    include_locked_stories: bool = False
):
    """Find text in the document.
    
    Args:
        search_string: Text to search for
        whole_word: Match whole words only
        case_sensitive: Case sensitive search
        include_hidden_layers: Search hidden layers
        include_locked_stories: Search locked stories
    """
    command = createCommand("findText", {
        "searchString": search_string,
        "wholeWord": whole_word,
        "caseSensitive": case_sensitive,
        "includeHiddenLayers": include_hidden_layers,
        "includeLockedStories": include_locked_stories
    })
    return sendCommand(command)


@mcp.tool()
def replace_text(
    search_string: str,
    replace_string: str,
    whole_word: bool = False,
    case_sensitive: bool = False,
    replace_all: bool = True
):
    """Find and replace text in the document.
    
    Args:
        search_string: Text to search for
        replace_string: Replacement text
        whole_word: Match whole words only
        case_sensitive: Case sensitive search
        replace_all: Replace all occurrences
    """
    command = createCommand("replaceText", {
        "searchString": search_string,
        "replaceString": replace_string,
        "wholeWord": whole_word,
        "caseSensitive": case_sensitive,
        "replaceAll": replace_all
    })
    return sendCommand(command)


@mcp.tool()
def find_grep(
    grep_pattern: str,
    include_hidden_layers: bool = False,
    include_locked_stories: bool = False
):
    """Find text using GREP (regular expressions).
    
    Args:
        grep_pattern: GREP/regex pattern to search for
        include_hidden_layers: Search hidden layers
        include_locked_stories: Search locked stories
    """
    command = createCommand("findGrep", {
        "grepPattern": grep_pattern,
        "includeHiddenLayers": include_hidden_layers,
        "includeLockedStories": include_locked_stories
    })
    return sendCommand(command)


@mcp.tool()
def replace_grep(
    grep_pattern: str,
    replace_string: str,
    replace_all: bool = True
):
    """Find and replace text using GREP.
    
    Args:
        grep_pattern: GREP pattern to search for
        replace_string: Replacement text (can include GREP references like $1)
        replace_all: Replace all occurrences
    """
    command = createCommand("replaceGrep", {
        "grepPattern": grep_pattern,
        "replaceString": replace_string,
        "replaceAll": replace_all
    })
    return sendCommand(command)


# =============================================================================
# HYPERLINKS AND CROSS-REFERENCES
# =============================================================================

@mcp.tool()
def create_hyperlink(
    source_frame_id: str,
    url: str,
    start_index: Optional[int] = None,
    end_index: Optional[int] = None
):
    """Create a URL hyperlink.
    
    Args:
        source_frame_id: Text frame containing the link text
        url: URL to link to
        start_index: Start character index (None = entire frame)
        end_index: End character index
    """
    params = {
        "sourceFrameId": source_frame_id,
        "url": url
    }
    if start_index is not None:
        params["startIndex"] = start_index
    if end_index is not None:
        params["endIndex"] = end_index
    command = createCommand("createHyperlink", params)
    return sendCommand(command)


@mcp.tool()
def create_page_reference(
    source_frame_id: str,
    destination_page: int,
    start_index: Optional[int] = None,
    end_index: Optional[int] = None
):
    """Create a hyperlink to another page in the document.
    
    Args:
        source_frame_id: Text frame containing the link text
        destination_page: Page number to link to
        start_index: Start character index
        end_index: End character index
    """
    params = {
        "sourceFrameId": source_frame_id,
        "destinationPage": destination_page
    }
    if start_index is not None:
        params["startIndex"] = start_index
    if end_index is not None:
        params["endIndex"] = end_index
    command = createCommand("createPageReference", params)
    return sendCommand(command)


@mcp.tool()
def get_hyperlinks():
    """Get all hyperlinks in the document."""
    command = createCommand("getHyperlinks", {})
    return sendCommand(command)


@mcp.tool()
def delete_hyperlink(hyperlink_id: str):
    """Delete a hyperlink.
    
    Args:
        hyperlink_id: ID of the hyperlink to delete
    """
    command = createCommand("deleteHyperlink", {
        "hyperlinkId": hyperlink_id
    })
    return sendCommand(command)


# =============================================================================
# PREFLIGHT AND PACKAGING
# =============================================================================

@mcp.tool()
def run_preflight(profile_name: Optional[str] = None):
    """Run preflight check on the document.
    
    Args:
        profile_name: Name of preflight profile to use (None = default)
    """
    params = {}
    if profile_name:
        params["profileName"] = profile_name
    command = createCommand("runPreflight", params)
    return sendCommand(command)


@mcp.tool()
def package_document(
    folder_path: str,
    copy_fonts: bool = True,
    copy_linked_graphics: bool = True,
    update_graphic_links: bool = True,
    include_pdf: bool = True,
    include_idml: bool = False
):
    """Package document for handoff.
    
    Args:
        folder_path: Destination folder path
        copy_fonts: Include document fonts
        copy_linked_graphics: Include linked images
        update_graphic_links: Update links to packaged location
        include_pdf: Include PDF export
        include_idml: Include IDML file
    """
    command = createCommand("packageDocument", {
        "folderPath": folder_path,
        "copyFonts": copy_fonts,
        "copyLinkedGraphics": copy_linked_graphics,
        "updateGraphicLinks": update_graphic_links,
        "includePdf": include_pdf,
        "includeIdml": include_idml
    })
    return sendCommand(command)


# =============================================================================
# UTILITIES
# =============================================================================

@mcp.tool()
def get_fonts():
    """Get all fonts used in the document."""
    command = createCommand("getFonts", {})
    return sendCommand(command)


@mcp.tool()
def get_links():
    """Get all linked files in the document."""
    command = createCommand("getLinks", {})
    return sendCommand(command)


@mcp.tool()
def update_link(link_id: str, new_path: Optional[str] = None):
    """Update a linked file.
    
    Args:
        link_id: ID of the link
        new_path: New file path (None = relink to same path)
    """
    params = {"linkId": link_id}
    if new_path:
        params["newPath"] = new_path
    command = createCommand("updateLink", params)
    return sendCommand(command)


@mcp.tool()
def embed_link(link_id: str):
    """Embed a linked file in the document.
    
    Args:
        link_id: ID of the link to embed
    """
    command = createCommand("embedLink", {
        "linkId": link_id
    })
    return sendCommand(command)


@mcp.tool()
def unembed_link(link_id: str, file_path: str):
    """Unembed a file and save it externally.
    
    Args:
        link_id: ID of the embedded item
        file_path: Path to save the file
    """
    command = createCommand("unembedLink", {
        "linkId": link_id,
        "filePath": file_path
    })
    return sendCommand(command)


@mcp.tool()
def execute_script(script: str):
    """Execute an ExtendScript/JavaScript in InDesign.
    
    Args:
        script: The script code to execute
    """
    command = createCommand("executeScript", {
        "script": script
    })
    return sendCommand(command)


@mcp.tool()
def undo():
    """Undo the last action."""
    command = createCommand("undo", {})
    return sendCommand(command)


@mcp.tool()
def redo():
    """Redo the last undone action."""
    command = createCommand("redo", {})
    return sendCommand(command)


@mcp.tool()
def zoom(level: Optional[float] = None, fit: Optional[str] = None):
    """Set the zoom level.
    
    Args:
        level: Zoom percentage (e.g., 100 for 100%)
        fit: Fit option (FIT_PAGE, FIT_SPREAD, ACTUAL_SIZE, FIT_VISIBLE)
    """
    params = {}
    if level is not None:
        params["level"] = level
    if fit:
        params["fit"] = fit
    command = createCommand("zoom", params)
    return sendCommand(command)


@mcp.tool()
def go_to_page(page_index: int):
    """Navigate to a specific page.
    
    Args:
        page_index: Zero-based index of the page to go to
    """
    command = createCommand("goToPage", {
        "pageIndex": page_index
    })
    return sendCommand(command)


# =============================================================================
# RESOURCE: INSTRUCTIONS
# =============================================================================

@mcp.resource("config://get_instructions")
def get_instructions() -> str:
    """Read this first! Returns information and instructions on how to use InDesign and this API"""
    return f"""
    You are an InDesign and design expert who is creative and loves to help other people learn to use InDesign and create.

    Rules to follow:

    1. Think deeply about how to solve the task
    2. Always check your work
    3. Read the info for the API calls to make sure you understand the requirements and arguments
    4. Measurements are in points (72 points = 1 inch, 1 point ≈ 0.353 mm)
    5. Colors can be specified as RGB {{"r": 0-255, "g": 0-255, "b": 0-255}} or CMYK {{"c": 0-100, "m": 0-100, "y": 0-100, "k": 0-100}}
    6. Page indices are zero-based (first page is 0)
    7. Text frame, item, and table IDs are returned when creating objects - save these for later operations

    Available Constants:
    - Blend Modes: {', '.join(BLEND_MODES)}
    - Export Formats: {', '.join(EXPORT_FORMATS)}
    - Layer Colors: {', '.join(LAYER_COLORS[:10])}... and more
    - Stroke Types: {', '.join(STROKE_TYPES[:8])}... and more
    - Justification: {', '.join(JUSTIFICATION)}
    - Vertical Justification: {', '.join(VERTICAL_JUSTIFICATION)}

    Common Workflows:
    1. Create document → Add pages → Create frames → Add content → Style → Export
    2. Open document → Find/Replace text → Update links → Preflight → Package
    3. Create master pages → Apply to document pages → Override items as needed
    """