/* MIT License
 *
 * Copyright (c) 2025 Mike Chambers, Kamila Kolpashnikova
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const {app, DocumentIntentOptions, File, LocationOptions, ColorModel, FittingOptions} = require("indesign");

// Helper function to get unit for intent
const getUnitForIntent = (intent) => {
    if(intent && intent.toString() === DocumentIntentOptions.WEB_INTENT.toString()) {
        return "px";
    }
    return "pt"; // Default to points
};

// Helper to find item by ID
// Note: InDesign UXP may use different ID properties - adjust as needed
const findItemById = (document, itemId) => {
    // Try different ID properties
    const checkId = (item, id) => {
        return item.id === id || 
               item.itemID === id || 
               (item.name && item.name === id) ||
               String(item.id) === String(id);
    };
    
    // Search all pages
    for(let i = 0; i < document.pages.length; i++) {
        const page = document.pages[i];
        for(let j = 0; j < page.pageItems.length; j++) {
            const item = page.pageItems[j];
            if(checkId(item, itemId)) {
                return item;
            }
        }
    }
    // Search master spreads
    for(let i = 0; i < document.masterSpreads.length; i++) {
        const spread = document.masterSpreads[i];
        for(let j = 0; j < spread.pages.length; j++) {
            const page = spread.pages[j];
            for(let k = 0; k < page.pageItems.length; k++) {
                const item = page.pageItems[k];
                if(checkId(item, itemId)) {
                    return item;
                }
            }
        }
    }
    return null;
};

// =============================================================================
// DOCUMENT OPERATIONS
// =============================================================================

const createDocument = async (command) => {
    console.log("createDocument");
    const options = command.options;
    let documents = app.documents;
    let margins = options.margins;
    let unit = getUnitForIntent(DocumentIntentOptions.WEB_INTENT);

    app.marginPreferences.bottom = `${margins.bottom}${unit}`;
    app.marginPreferences.top = `${margins.top}${unit}`;
    app.marginPreferences.left = `${margins.left}${unit}`;
    app.marginPreferences.right = `${margins.right}${unit}`;
    app.marginPreferences.columnCount = options.columns.count;
    app.marginPreferences.columnGutter = `${options.columns.gutter}${unit}`;

    let documentPreferences = {
        pageWidth: `${options.pageWidth}${unit}`,
        pageHeight: `${options.pageHeight}${unit}`,
        pagesPerDocument: options.pagesPerDocument,
        facingPages: options.facingPages,
        intent: DocumentIntentOptions.WEB_INTENT
    };

    const showingWindow = true;
    documents.add({showingWindow, documentPreferences});
    return {status: "success", message: "Document created"};
};

const openDocument = async (command) => {
    console.log("openDocument");
    const options = command.options;
    const filePath = options.filePath;
    const file = new File(filePath);
    app.open(file);
    return {status: "success", message: `Opened ${filePath}`};
};

const saveDocument = async (command) => {
    console.log("saveDocument");
    const document = app.activeDocument;
    const options = command.options;
    
    if(options.filePath) {
        const file = new File(options.filePath);
        document.save(file);
        return {status: "success", message: `Saved to ${options.filePath}`};
    } else {
        document.save();
        return {status: "success", message: "Document saved"};
    }
};

const closeDocument = async (command) => {
    console.log("closeDocument");
    const document = app.activeDocument;
    const options = command.options;
    
    if(options.saveChanges) {
        document.save();
    }
    document.close();
    return {status: "success", message: "Document closed"};
};

const exportDocument = async (command) => {
    console.log("exportDocument");
    const document = app.activeDocument;
    const options = command.options;
    const file = new File(options.filePath);
    
    // Map format string to ExportFormat enum
    const formatMap = {
        "PDF": ExportFormat.PDF_TYPE,
        "JPEG": ExportFormat.JPEG,
        "PNG": ExportFormat.PNG,
        "EPS": ExportFormat.EPS_TYPE,
        "EPUB": ExportFormat.EPUB_FIXED_LAYOUT,
        "HTML": ExportFormat.HTML,
        "IDML": ExportFormat.IN_DESIGN_MARKUP
    };
    
    const exportFormat = formatMap[options.format] || ExportFormat.PDF_TYPE;
    
    // Basic export - more options can be added
    document.exportFile(exportFormat, file);
    return {status: "success", message: `Exported to ${options.filePath}`};
};

const getDocumentInfo = async (command) => {
    console.log("getDocumentInfo");
    const document = app.activeDocument;
    const docPrefs = document.documentPreferences;
    
    return {
        status: "success",
        pageWidth: docPrefs.pageWidth,
        pageHeight: docPrefs.pageHeight,
        pagesPerDocument: docPrefs.pagesPerDocument,
        facingPages: docPrefs.facingPages,
        pageCount: document.pages.length,
        filePath: document.fullName ? document.fullName.fsName : null
    };
};

const setDocumentPreferences = async (command) => {
    console.log("setDocumentPreferences");
    const document = app.activeDocument;
    const docPrefs = document.documentPreferences;
    const options = command.options;
    
    if(options.pageWidth !== undefined) {
        docPrefs.pageWidth = options.pageWidth;
    }
    if(options.pageHeight !== undefined) {
        docPrefs.pageHeight = options.pageHeight;
    }
    if(options.pagesFacing !== undefined) {
        docPrefs.facingPages = options.pagesFacing;
    }
    if(options.bleedUniform !== undefined) {
        docPrefs.documentBleedUniformSize = options.bleedUniform;
    }
    
    return {status: "success", message: "Document preferences updated"};
};

// =============================================================================
// PAGE OPERATIONS
// =============================================================================

const addPage = async (command) => {
    console.log("addPage");
    const document = app.activeDocument;
    const options = command.options;
    const count = options.count || 1;
    const atIndex = options.atIndex;
    const masterPage = options.masterPage;
    
    const pages = document.pages;
    let insertAfter = null;
    
    if(atIndex !== undefined && atIndex < pages.length) {
        insertAfter = pages[atIndex];
    } else {
        insertAfter = pages[pages.length - 1];
    }
    
    for(let i = 0; i < count; i++) {
        const newPage = pages.add();
        if(masterPage) {
            // Apply master page if specified
            const master = document.masterSpreads.itemByName(masterPage);
            if(master) {
                newPage.appliedMaster = master;
            }
        }
    }
    
    return {status: "success", message: `Added ${count} page(s)`};
};

const deletePage = async (command) => {
    console.log("deletePage");
    const document = app.activeDocument;
    const options = command.options;
    const pageIndex = options.pageIndex;
    
    const page = document.pages[pageIndex];
    if(page) {
        page.remove();
        return {status: "success", message: `Deleted page ${pageIndex}`};
    }
    throw new Error(`Page ${pageIndex} not found`);
};

const duplicatePage = async (command) => {
    console.log("duplicatePage");
    const document = app.activeDocument;
    const options = command.options;
    const pageIndex = options.pageIndex;
    const insertAt = options.insertAt;
    
    const page = document.pages[pageIndex];
    if(!page) {
        throw new Error(`Page ${pageIndex} not found`);
    }
    
    const newPage = page.duplicate();
    if(insertAt !== undefined) {
        newPage.move(LocationOptions.AFTER, document.pages[insertAt]);
    }
    
    return {status: "success", message: `Duplicated page ${pageIndex}`};
};

const movePage = async (command) => {
    console.log("movePage");
    const document = app.activeDocument;
    const options = command.options;
    const pageIndex = options.pageIndex;
    const destinationIndex = options.destinationIndex;
    
    const page = document.pages[pageIndex];
    const destination = document.pages[destinationIndex];
    
    if(page && destination) {
        page.move(LocationOptions.AFTER, destination);
        return {status: "success", message: `Moved page ${pageIndex} to ${destinationIndex}`};
    }
    throw new Error("Page or destination not found");
};

const getPageCount = async (command) => {
    console.log("getPageCount");
    const document = app.activeDocument;
    return {
        status: "success",
        pageCount: document.pages.length
    };
};

const getPageItems = async (command) => {
    console.log("getPageItems");
    const document = app.activeDocument;
    const options = command.options;
    const pageIndex = options.pageIndex;
    
    const page = document.pages[pageIndex];
    if(!page) {
        throw new Error(`Page ${pageIndex} not found`);
    }
    
    const items = [];
    for(let i = 0; i < page.pageItems.length; i++) {
        const item = page.pageItems[i];
        items.push({
            id: item.id,
            type: item.constructor.name,
            bounds: item.geometricBounds
        });
    }
    
    return {status: "success", items: items};
};

const setPageSize = async (command) => {
    console.log("setPageSize");
    const document = app.activeDocument;
    const options = command.options;
    const pageIndex = options.pageIndex;
    const width = options.width;
    const height = options.height;
    
    const page = document.pages[pageIndex];
    if(!page) {
        throw new Error(`Page ${pageIndex} not found`);
    }
    
    const docPrefs = document.documentPreferences;
    docPrefs.pageWidth = width;
    docPrefs.pageHeight = height;
    
    return {status: "success", message: `Set page ${pageIndex} size to ${width}x${height}`};
};

// =============================================================================
// TEXT FRAME OPERATIONS
// =============================================================================

const createTextFrame = async (command) => {
    console.log("createTextFrame");
    const document = app.activeDocument;
    const options = command.options;
    const pageIndex = options.pageIndex;
    const bounds = options.bounds;
    const content = options.content || "";
    const columns = options.columns || 1;
    const columnGutter = options.columnGutter || 12;
    
    const page = document.pages[pageIndex];
    if(!page) {
        throw new Error(`Page ${pageIndex} not found`);
    }
    
    const textFrame = page.textFrames.add();
    textFrame.geometricBounds = [bounds.y, bounds.x, bounds.y + bounds.height, bounds.x + bounds.width];
    textFrame.textFramePreferences.textColumnCount = columns;
    textFrame.textFramePreferences.textColumnGutter = columnGutter;
    
    if(content) {
        textFrame.contents = content;
    }
    
    return {status: "success", frameId: textFrame.id, message: "Text frame created"};
};

const setTextContent = async (command) => {
    console.log("setTextContent");
    const document = app.activeDocument;
    const options = command.options;
    const frameId = options.frameId;
    const content = options.content;
    const append = options.append || false;
    
    const item = findItemById(document, frameId);
    if(!item || item.constructor.name !== "TextFrame") {
        throw new Error(`Text frame ${frameId} not found`);
    }
    
    if(append) {
        item.contents += content;
    } else {
        item.contents = content;
    }
    
    return {status: "success", message: "Text content updated"};
};

const getTextContent = async (command) => {
    console.log("getTextContent");
    const document = app.activeDocument;
    const options = command.options;
    const frameId = options.frameId;
    
    const item = findItemById(document, frameId);
    if(!item || item.constructor.name !== "TextFrame") {
        throw new Error(`Text frame ${frameId} not found`);
    }
    
    return {status: "success", content: item.contents};
};

const setTextStyle = async (command) => {
    console.log("setTextStyle");
    const document = app.activeDocument;
    const options = command.options;
    const frameId = options.frameId;
    const startIndex = options.startIndex;
    const endIndex = options.endIndex;
    
    const item = findItemById(document, frameId);
    if(!item || item.constructor.name !== "TextFrame") {
        throw new Error(`Text frame ${frameId} not found`);
    }
    
    const text = item.texts[0];
    const charPrefs = text.characters.itemByRange(startIndex || 0, endIndex || text.characters.length - 1).characterPreferences;
    
    if(options.fontFamily) {
        charPrefs.appliedFont = document.fonts.itemByName(options.fontFamily);
    }
    if(options.fontSize !== undefined) {
        charPrefs.pointSize = options.fontSize;
    }
    if(options.color) {
        // Handle color - could be RGB or CMYK
        if(options.color.r !== undefined) {
            const swatch = document.swatches.add();
            swatch.color = new Color();
            swatch.color.model = ColorModel.PROCESS;
            swatch.color.colorValue = [options.color.r, options.color.g, options.color.b];
            charPrefs.fillColor = swatch;
        }
    }
    if(options.justification) {
        // Map justification string - InDesign UXP uses string values
        const justMap = {
            "LEFT_ALIGN": "left",
            "CENTER_ALIGN": "center",
            "RIGHT_ALIGN": "right",
            "FULLY_JUSTIFIED": "justify"
        };
        if(justMap[options.justification]) {
            text.paragraphs[0].justification = justMap[options.justification];
        }
    }
    
    return {status: "success", message: "Text style applied"};
};

const setParagraphStyle = async (command) => {
    console.log("setParagraphStyle");
    const document = app.activeDocument;
    const options = command.options;
    const frameId = options.frameId;
    const paragraphIndex = options.paragraphIndex;
    
    const item = findItemById(document, frameId);
    if(!item || item.constructor.name !== "TextFrame") {
        throw new Error(`Text frame ${frameId} not found`);
    }
    
    const text = item.texts[0];
    const paragraph = paragraphIndex !== undefined ? text.paragraphs[paragraphIndex] : text.paragraphs[0];
    const paraPrefs = paragraph.paragraphPreferences;
    
    if(options.spaceBefore !== undefined) {
        paraPrefs.spaceBefore = options.spaceBefore;
    }
    if(options.spaceAfter !== undefined) {
        paraPrefs.spaceAfter = options.spaceAfter;
    }
    if(options.leftIndent !== undefined) {
        paraPrefs.leftIndent = options.leftIndent;
    }
    if(options.rightIndent !== undefined) {
        paraPrefs.rightIndent = options.rightIndent;
    }
    if(options.firstLineIndent !== undefined) {
        paraPrefs.firstLineIndent = options.firstLineIndent;
    }
    
    return {status: "success", message: "Paragraph style applied"};
};

const setTextFrameOptions = async (command) => {
    console.log("setTextFrameOptions");
    const document = app.activeDocument;
    const options = command.options;
    const frameId = options.frameId;
    
    const item = findItemById(document, frameId);
    if(!item || item.constructor.name !== "TextFrame") {
        throw new Error(`Text frame ${frameId} not found`);
    }
    
    const framePrefs = item.textFramePreferences;
    
    if(options.columns !== undefined) {
        framePrefs.textColumnCount = options.columns;
    }
    if(options.columnGutter !== undefined) {
        framePrefs.textColumnGutter = options.columnGutter;
    }
    if(options.insetSpacing) {
        framePrefs.insetSpacing = [options.insetSpacing.top, options.insetSpacing.right, options.insetSpacing.bottom, options.insetSpacing.left];
    }
    
    return {status: "success", message: "Text frame options updated"};
};

const linkTextFrames = async (command) => {
    console.log("linkTextFrames");
    const document = app.activeDocument;
    const options = command.options;
    const sourceFrameId = options.sourceFrameId;
    const targetFrameId = options.targetFrameId;
    
    const sourceFrame = findItemById(document, sourceFrameId);
    const targetFrame = findItemById(document, targetFrameId);
    
    if(!sourceFrame || !(sourceFrame instanceof TextFrame)) {
        throw new Error(`Source text frame ${sourceFrameId} not found`);
    }
    if(!targetFrame || !(targetFrame instanceof TextFrame)) {
        throw new Error(`Target text frame ${targetFrameId} not found`);
    }
    
    sourceFrame.nextTextFrame = targetFrame;
    return {status: "success", message: "Text frames linked"};
};

const unlinkTextFrame = async (command) => {
    console.log("unlinkTextFrame");
    const document = app.activeDocument;
    const options = command.options;
    const frameId = options.frameId;
    
    const frame = findItemById(document, frameId);
    if(!frame || !(frame instanceof TextFrame)) {
        throw new Error(`Text frame ${frameId} not found`);
    }
    
    frame.nextTextFrame = null;
    return {status: "success", message: "Text frame unlinked"};
};

// =============================================================================
// GRAPHICS OPERATIONS
// =============================================================================

const createRectangle = async (command) => {
    console.log("createRectangle");
    const document = app.activeDocument;
    const options = command.options;
    const pageIndex = options.pageIndex;
    const bounds = options.bounds;
    
    const page = document.pages[pageIndex];
    if(!page) {
        throw new Error(`Page ${pageIndex} not found`);
    }
    
    const rect = page.rectangles.add();
    rect.geometricBounds = [bounds.y, bounds.x, bounds.y + bounds.height, bounds.x + bounds.width];
    
    if(options.fillColor) {
        // Apply fill color if provided
    }
    if(options.strokeColor) {
        // Apply stroke color if provided
    }
    
    return {status: "success", itemId: rect.id, message: "Rectangle created"};
};

const createOval = async (command) => {
    console.log("createOval");
    const document = app.activeDocument;
    const options = command.options;
    const pageIndex = options.pageIndex;
    const bounds = options.bounds;
    
    const page = document.pages[pageIndex];
    if(!page) {
        throw new Error(`Page ${pageIndex} not found`);
    }
    
    const oval = page.ovals.add();
    oval.geometricBounds = [bounds.y, bounds.x, bounds.y + bounds.height, bounds.x + bounds.width];
    
    return {status: "success", itemId: oval.id, message: "Oval created"};
};

const createPolygon = async (command) => {
    console.log("createPolygon");
    const document = app.activeDocument;
    const options = command.options;
    const pageIndex = options.pageIndex;
    const bounds = options.bounds;
    const sides = options.sides || 6;
    
    const page = document.pages[pageIndex];
    if(!page) {
        throw new Error(`Page ${pageIndex} not found`);
    }
    
    const polygon = page.polygons.add();
    polygon.geometricBounds = [bounds.y, bounds.x, bounds.y + bounds.height, bounds.x + bounds.width];
    polygon.polygonPreferences.numberOfSides = sides;
    
    return {status: "success", itemId: polygon.id, message: "Polygon created"};
};

const createLine = async (command) => {
    console.log("createLine");
    const document = app.activeDocument;
    const options = command.options;
    const pageIndex = options.pageIndex;
    const startX = options.startX;
    const startY = options.startY;
    const endX = options.endX;
    const endY = options.endY;
    
    const page = document.pages[pageIndex];
    if(!page) {
        throw new Error(`Page ${pageIndex} not found`);
    }
    
    const line = page.graphicLines.add();
    line.paths[0].entirePath = [[startX, startY], [endX, endY]];
    
    return {status: "success", itemId: line.id, message: "Line created"};
};

const placeImage = async (command) => {
    console.log("placeImage");
    const document = app.activeDocument;
    const options = command.options;
    const pageIndex = options.pageIndex;
    const filePath = options.filePath;
    const bounds = options.bounds;
    
    const page = document.pages[pageIndex];
    if(!page) {
        throw new Error(`Page ${pageIndex} not found`);
    }
    
    const file = new File(filePath);
    const image = page.rectangles.add();
    image.geometricBounds = bounds ? [bounds.y, bounds.x, bounds.y + bounds.height, bounds.x + bounds.width] : undefined;
    image.place(file);
    
    return {status: "success", itemId: image.id, message: "Image placed"};
};

const fitContent = async (command) => {
    console.log("fitContent");
    const document = app.activeDocument;
    const options = command.options;
    const itemId = options.itemId;
    const fitOption = options.fitOption || "FIT_CONTENT_TO_FRAME";
    
    const item = findItemById(document, itemId);
    if(!item) {
        throw new Error(`Item ${itemId} not found`);
    }
    
    if(item.constructor.name === "Image" || item.constructor.name === "Rectangle" && item.images.length > 0) {
        // Fit image to frame
        try {
            item.fit(FittingOptions.FILL_PROPORTIONALLY);
        } catch(e) {
            // Try alternative fit method
            item.fit(FittingOptions.FIT_CONTENT_TO_FRAME);
        }
    }
    
    return {status: "success", message: "Content fitted"};
};

// =============================================================================
// SELECTION OPERATIONS
// =============================================================================

const selectItem = async (command) => {
    console.log("selectItem");
    const document = app.activeDocument;
    const options = command.options;
    const itemId = options.itemId;
    const addToSelection = options.addToSelection || false;
    
    const item = findItemById(document, itemId);
    if(!item) {
        throw new Error(`Item ${itemId} not found`);
    }
    
    if(addToSelection) {
        app.selection.push(item);
    } else {
        app.selection = [item];
    }
    
    return {status: "success", message: "Item selected"};
};

const selectAll = async (command) => {
    console.log("selectAll");
    const document = app.activeDocument;
    const options = command.options;
    const pageIndex = options.pageIndex;
    
    if(pageIndex !== undefined) {
        const page = document.pages[pageIndex];
        app.selection = page.pageItems;
    } else {
        // Select all items in document
        const allItems = [];
        for(let i = 0; i < document.pages.length; i++) {
            allItems.push(...document.pages[i].pageItems);
        }
        app.selection = allItems;
    }
    
    return {status: "success", message: "Items selected"};
};

const deselectAll = async (command) => {
    console.log("deselectAll");
    app.selection = [];
    return {status: "success", message: "Selection cleared"};
};

const getSelection = async (command) => {
    console.log("getSelection");
    const selection = app.selection;
    const items = [];
    
    for(let i = 0; i < selection.length; i++) {
        items.push({
            id: selection[i].id,
            type: selection[i].constructor.name,
            bounds: selection[i].geometricBounds
        });
    }
    
    return {status: "success", items: items};
};

// =============================================================================
// ITEM MANIPULATION
// =============================================================================

const moveItem = async (command) => {
    console.log("moveItem");
    const document = app.activeDocument;
    const options = command.options;
    const itemId = options.itemId;
    const x = options.x;
    const y = options.y;
    const relative = options.relative || false;
    
    const item = findItemById(document, itemId);
    if(!item) {
        throw new Error(`Item ${itemId} not found`);
    }
    
    if(relative) {
        item.move([x, y]);
    } else {
        const bounds = item.geometricBounds;
        const width = bounds[3] - bounds[1];
        const height = bounds[2] - bounds[0];
        item.geometricBounds = [y, x, y + height, x + width];
    }
    
    return {status: "success", message: "Item moved"};
};

const resizeItem = async (command) => {
    console.log("resizeItem");
    const document = app.activeDocument;
    const options = command.options;
    const itemId = options.itemId;
    const width = options.width;
    const height = options.height;
    const anchor = options.anchor || "CENTER";
    
    const item = findItemById(document, itemId);
    if(!item) {
        throw new Error(`Item ${itemId} not found`);
    }
    
    const bounds = item.geometricBounds;
    const currentWidth = bounds[3] - bounds[1];
    const currentHeight = bounds[2] - bounds[0];
    
    // Handle anchor point for resizing
    let newX = bounds[1];
    let newY = bounds[0];
    
    if(anchor.includes("RIGHT")) {
        newX = bounds[3] - width;
    } else if(anchor.includes("CENTER")) {
        newX = bounds[1] + (currentWidth - width) / 2;
    }
    
    if(anchor.includes("BOTTOM")) {
        newY = bounds[2] - height;
    } else if(anchor.includes("CENTER")) {
        newY = bounds[0] + (currentHeight - height) / 2;
    }
    
    item.geometricBounds = [newY, newX, newY + height, newX + width];
    
    return {status: "success", message: "Item resized"};
};

const rotateItem = async (command) => {
    console.log("rotateItem");
    const document = app.activeDocument;
    const options = command.options;
    const itemId = options.itemId;
    const angle = options.angle;
    const anchor = options.anchor || "CENTER";
    
    const item = findItemById(document, itemId);
    if(!item) {
        throw new Error(`Item ${itemId} not found`);
    }
    
    item.rotationAngle = angle;
    
    return {status: "success", message: "Item rotated"};
};

const duplicateItem = async (command) => {
    console.log("duplicateItem");
    const document = app.activeDocument;
    const options = command.options;
    const itemId = options.itemId;
    const offsetX = options.offsetX || 10;
    const offsetY = options.offsetY || 10;
    
    const item = findItemById(document, itemId);
    if(!item) {
        throw new Error(`Item ${itemId} not found`);
    }
    
    const duplicate = item.duplicate();
    duplicate.move([offsetX, offsetY]);
    
    return {status: "success", itemId: duplicate.id, message: "Item duplicated"};
};

const deleteItem = async (command) => {
    console.log("deleteItem");
    const document = app.activeDocument;
    const options = command.options;
    const itemId = options.itemId;
    
    const item = findItemById(document, itemId);
    if(!item) {
        throw new Error(`Item ${itemId} not found`);
    }
    
    item.remove();
    return {status: "success", message: "Item deleted"};
};

const groupItems = async (command) => {
    console.log("groupItems");
    const document = app.activeDocument;
    const options = command.options;
    const itemIds = options.itemIds;
    
    const items = itemIds.map(id => findItemById(document, id)).filter(item => item !== null);
    if(items.length === 0) {
        throw new Error("No valid items found");
    }
    
    const group = items[0].parent.groups.add(items);
    return {status: "success", groupId: group.id, message: "Items grouped"};
};

const ungroupItems = async (command) => {
    console.log("ungroupItems");
    const document = app.activeDocument;
    const options = command.options;
    const groupId = options.groupId;
    
    const item = findItemById(document, groupId);
    if(!item || item.constructor.name !== "Group") {
        throw new Error(`Group ${groupId} not found`);
    }
    
    item.ungroup();
    return {status: "success", message: "Group ungrouped"};
};

const setItemFill = async (command) => {
    console.log("setItemFill");
    const document = app.activeDocument;
    const options = command.options;
    const itemId = options.itemId;
    const color = options.color;
    const tint = options.tint || 100;
    
    const item = findItemById(document, itemId);
    if(!item) {
        throw new Error(`Item ${itemId} not found`);
    }
    
    if(color) {
        // Create or find swatch
        let swatch = document.swatches.itemByName("MCP_" + JSON.stringify(color));
        if(!swatch.isValid) {
            swatch = document.swatches.add();
            swatch.name = "MCP_" + Date.now();
            swatch.color = new Color();
            if(color.r !== undefined) {
                swatch.color.model = ColorModel.PROCESS;
                swatch.color.colorValue = [color.r/255, color.g/255, color.b/255];
            }
        }
        item.fillColor = swatch;
        item.fillTint = tint;
    } else {
        item.fillColor = document.swatches[0]; // None
    }
    
    return {status: "success", message: "Fill applied"};
};

const setItemStroke = async (command) => {
    console.log("setItemStroke");
    const document = app.activeDocument;
    const options = command.options;
    const itemId = options.itemId;
    const color = options.color;
    const weight = options.weight;
    const type = options.type;
    
    const item = findItemById(document, itemId);
    if(!item) {
        throw new Error(`Item ${itemId} not found`);
    }
    
    if(weight !== undefined) {
        item.strokeWeight = weight;
    }
    if(color) {
        let swatch = document.swatches.itemByName("MCP_STROKE_" + JSON.stringify(color));
        if(!swatch.isValid) {
            swatch = document.swatches.add();
            swatch.name = "MCP_STROKE_" + Date.now();
            swatch.color = new Color();
            if(color.r !== undefined) {
                swatch.color.model = ColorModel.PROCESS;
                swatch.color.colorValue = [color.r/255, color.g/255, color.b/255];
            }
        }
        item.strokeColor = swatch;
    }
    
    return {status: "success", message: "Stroke applied"};
};

const setItemEffects = async (command) => {
    console.log("setItemEffects");
    // Effects implementation would go here
    return {status: "success", message: "Effects applied (stub)"};
};

const arrangeItem = async (command) => {
    console.log("arrangeItem");
    const document = app.activeDocument;
    const options = command.options;
    const itemId = options.itemId;
    const arrangement = options.arrangement; // BRING_TO_FRONT, SEND_TO_BACK, BRING_FORWARD, SEND_BACKWARD
    
    const item = findItemById(document, itemId);
    if(!item) {
        throw new Error(`Item ${itemId} not found`);
    }
    
    switch(arrangement) {
        case "BRING_TO_FRONT":
            item.bringToFront();
            break;
        case "SEND_TO_BACK":
            item.sendToBack();
            break;
        case "BRING_FORWARD":
            item.bringForward();
            break;
        case "SEND_BACKWARD":
            item.sendBackward();
            break;
    }
    
    return {status: "success", message: "Item arranged"};
};

const alignItems = async (command) => {
    console.log("alignItems");
    const document = app.activeDocument;
    const options = command.options;
    const itemIds = options.itemIds;
    const alignment = options.alignment; // LEFT, CENTER, RIGHT, TOP, BOTTOM
    
    const items = itemIds.map(id => findItemById(document, id)).filter(item => item !== null);
    if(items.length < 2) {
        throw new Error("Need at least 2 items to align");
    }
    
    // Use first item as reference
    const reference = items[0];
    const refBounds = reference.geometricBounds;
    
    for(let i = 1; i < items.length; i++) {
        const item = items[i];
        const bounds = item.geometricBounds;
        
        switch(alignment) {
            case "LEFT":
                item.move([refBounds[1] - bounds[1], 0]);
                break;
            case "CENTER_HORIZONTAL":
                const refCenterX = (refBounds[1] + refBounds[3]) / 2;
                const itemCenterX = (bounds[1] + bounds[3]) / 2;
                item.move([refCenterX - itemCenterX, 0]);
                break;
            case "RIGHT":
                item.move([refBounds[3] - bounds[3], 0]);
                break;
            case "TOP":
                item.move([0, refBounds[0] - bounds[0]]);
                break;
            case "CENTER_VERTICAL":
                const refCenterY = (refBounds[0] + refBounds[2]) / 2;
                const itemCenterY = (bounds[0] + bounds[2]) / 2;
                item.move([0, refCenterY - itemCenterY]);
                break;
            case "BOTTOM":
                item.move([0, refBounds[2] - bounds[2]]);
                break;
        }
    }
    
    return {status: "success", message: "Items aligned"};
};

const distributeItems = async (command) => {
    console.log("distributeItems");
    // Distribution implementation
    return {status: "success", message: "Items distributed (stub)"};
};

// =============================================================================
// LAYER OPERATIONS
// =============================================================================

const createLayer = async (command) => {
    console.log("createLayer");
    const document = app.activeDocument;
    const options = command.options;
    const layerName = options.layerName;
    
    const layer = document.layers.add();
    layer.name = layerName;
    
    return {status: "success", layerName: layer.name, message: "Layer created"};
};

const getLayers = async (command) => {
    console.log("getLayers");
    const document = app.activeDocument;
    const layers = [];
    
    for(let i = 0; i < document.layers.length; i++) {
        const layer = document.layers[i];
        layers.push({
            name: layer.name,
            visible: layer.visible,
            locked: layer.locked
        });
    }
    
    return {status: "success", layers: layers};
};

const setLayerProperties = async (command) => {
    console.log("setLayerProperties");
    const document = app.activeDocument;
    const options = command.options;
    const layerName = options.layerName;
    
    const layer = document.layers.itemByName(layerName);
    if(!layer.isValid) {
        throw new Error(`Layer ${layerName} not found`);
    }
    
    if(options.visible !== undefined) {
        layer.visible = options.visible;
    }
    if(options.locked !== undefined) {
        layer.locked = options.locked;
    }
    if(options.color !== undefined) {
        layer.layerColor = options.color;
    }
    
    return {status: "success", message: "Layer properties updated"};
};

const deleteLayer = async (command) => {
    console.log("deleteLayer");
    const document = app.activeDocument;
    const options = command.options;
    const layerName = options.layerName;
    
    const layer = document.layers.itemByName(layerName);
    if(!layer.isValid) {
        throw new Error(`Layer ${layerName} not found`);
    }
    
    layer.remove();
    return {status: "success", message: "Layer deleted"};
};

const moveItemToLayer = async (command) => {
    console.log("moveItemToLayer");
    const document = app.activeDocument;
    const options = command.options;
    const itemId = options.itemId;
    const layerName = options.layerName;
    
    const item = findItemById(document, itemId);
    const layer = document.layers.itemByName(layerName);
    
    if(!item) {
        throw new Error(`Item ${itemId} not found`);
    }
    if(!layer.isValid) {
        throw new Error(`Layer ${layerName} not found`);
    }
    
    item.itemLayer = layer;
    return {status: "success", message: "Item moved to layer"};
};

const reorderLayer = async (command) => {
    console.log("reorderLayer");
    const document = app.activeDocument;
    const options = command.options;
    const layerName = options.layerName;
    const position = options.position;
    
    const layer = document.layers.itemByName(layerName);
    if(!layer.isValid) {
        throw new Error(`Layer ${layerName} not found`);
    }
    
    layer.move(LocationOptions.AT_BEGINNING, document.layers[position]);
    return {status: "success", message: "Layer reordered"};
};

// =============================================================================
// MASTER PAGE OPERATIONS
// =============================================================================

const createMasterPage = async (command) => {
    console.log("createMasterPage");
    const document = app.activeDocument;
    const options = command.options;
    const name = options.name;
    const basedOn = options.basedOn;
    
    const masterSpread = document.masterSpreads.add();
    masterSpread.namePrefix = name;
    
    return {status: "success", masterName: masterSpread.namePrefix, message: "Master page created"};
};

const getMasterPages = async (command) => {
    console.log("getMasterPages");
    const document = app.activeDocument;
    const masters = [];
    
    for(let i = 0; i < document.masterSpreads.length; i++) {
        const master = document.masterSpreads[i];
        masters.push({
            name: master.namePrefix,
            pageCount: master.pages.length
        });
    }
    
    return {status: "success", masterPages: masters};
};

const applyMasterPage = async (command) => {
    console.log("applyMasterPage");
    const document = app.activeDocument;
    const options = command.options;
    const pageIndex = options.pageIndex;
    const masterName = options.masterName;
    
    const page = document.pages[pageIndex];
    const master = document.masterSpreads.itemByName(masterName);
    
    if(!page) {
        throw new Error(`Page ${pageIndex} not found`);
    }
    if(!master.isValid) {
        throw new Error(`Master page ${masterName} not found`);
    }
    
    page.appliedMaster = master;
    return {status: "success", message: "Master page applied"};
};

const deleteMasterPage = async (command) => {
    console.log("deleteMasterPage");
    const document = app.activeDocument;
    const options = command.options;
    const masterName = options.masterName;
    
    const master = document.masterSpreads.itemByName(masterName);
    if(!master.isValid) {
        throw new Error(`Master page ${masterName} not found`);
    }
    
    master.remove();
    return {status: "success", message: "Master page deleted"};
};

const overrideMasterItem = async (command) => {
    console.log("overrideMasterItem");
    const document = app.activeDocument;
    const options = command.options;
    const pageIndex = options.pageIndex;
    const itemId = options.itemId;
    
    const page = document.pages[pageIndex];
    const item = findItemById(document, itemId);
    
    if(!page) {
        throw new Error(`Page ${pageIndex} not found`);
    }
    if(!item) {
        throw new Error(`Item ${itemId} not found`);
    }
    
    item.overridePageItem();
    return {status: "success", message: "Master item overridden"};
};

// =============================================================================
// STYLE OPERATIONS
// =============================================================================

const createParagraphStyle = async (command) => {
    console.log("createParagraphStyle");
    const document = app.activeDocument;
    const options = command.options;
    const name = options.name;
    
    const style = document.paragraphStyles.add();
    style.name = name;
    
    // Apply properties if provided
    if(options.fontFamily) {
        style.appliedFont = document.fonts.itemByName(options.fontFamily);
    }
    if(options.fontSize !== undefined) {
        style.pointSize = options.fontSize;
    }
    
    return {status: "success", styleName: style.name, message: "Paragraph style created"};
};

const createCharacterStyle = async (command) => {
    console.log("createCharacterStyle");
    const document = app.activeDocument;
    const options = command.options;
    const name = options.name;
    
    const style = document.characterStyles.add();
    style.name = name;
    
    return {status: "success", styleName: style.name, message: "Character style created"};
};

const createObjectStyle = async (command) => {
    console.log("createObjectStyle");
    const document = app.activeDocument;
    const options = command.options;
    const name = options.name;
    
    const style = document.objectStyles.add();
    style.name = name;
    
    return {status: "success", styleName: style.name, message: "Object style created"};
};

const getParagraphStyles = async (command) => {
    console.log("getParagraphStyles");
    const document = app.activeDocument;
    const styles = [];
    
    for(let i = 0; i < document.paragraphStyles.length; i++) {
        styles.push(document.paragraphStyles[i].name);
    }
    
    return {status: "success", styles: styles};
};

const getCharacterStyles = async (command) => {
    console.log("getCharacterStyles");
    const document = app.activeDocument;
    const styles = [];
    
    for(let i = 0; i < document.characterStyles.length; i++) {
        styles.push(document.characterStyles[i].name);
    }
    
    return {status: "success", styles: styles};
};

const getObjectStyles = async (command) => {
    console.log("getObjectStyles");
    const document = app.activeDocument;
    const styles = [];
    
    for(let i = 0; i < document.objectStyles.length; i++) {
        styles.push(document.objectStyles[i].name);
    }
    
    return {status: "success", styles: styles};
};

const applyParagraphStyle = async (command) => {
    console.log("applyParagraphStyle");
    const document = app.activeDocument;
    const options = command.options;
    const frameId = options.frameId;
    const styleName = options.styleName;
    const paragraphIndex = options.paragraphIndex;
    
    const item = findItemById(document, frameId);
    if(!item || item.constructor.name !== "TextFrame") {
        throw new Error(`Text frame ${frameId} not found`);
    }
    
    const style = document.paragraphStyles.itemByName(styleName);
    if(!style.isValid) {
        throw new Error(`Paragraph style ${styleName} not found`);
    }
    
    if(paragraphIndex !== undefined) {
        item.texts[0].paragraphs[paragraphIndex].appliedParagraphStyle = style;
    } else {
        item.texts[0].paragraphs[0].appliedParagraphStyle = style;
    }
    
    return {status: "success", message: "Paragraph style applied"};
};

const applyCharacterStyle = async (command) => {
    console.log("applyCharacterStyle");
    const document = app.activeDocument;
    const options = command.options;
    const frameId = options.frameId;
    const styleName = options.styleName;
    const startIndex = options.startIndex || 0;
    const endIndex = options.endIndex;
    
    const item = findItemById(document, frameId);
    if(!item || item.constructor.name !== "TextFrame") {
        throw new Error(`Text frame ${frameId} not found`);
    }
    
    const style = document.characterStyles.itemByName(styleName);
    if(!style.isValid) {
        throw new Error(`Character style ${styleName} not found`);
    }
    
    const text = item.texts[0];
    const end = endIndex !== undefined ? endIndex : text.characters.length - 1;
    text.characters.itemByRange(startIndex, end).appliedCharacterStyle = style;
    
    return {status: "success", message: "Character style applied"};
};

const applyObjectStyle = async (command) => {
    console.log("applyObjectStyle");
    const document = app.activeDocument;
    const options = command.options;
    const itemId = options.itemId;
    const styleName = options.styleName;
    
    const item = findItemById(document, itemId);
    if(!item) {
        throw new Error(`Item ${itemId} not found`);
    }
    
    const style = document.objectStyles.itemByName(styleName);
    if(!style.isValid) {
        throw new Error(`Object style ${styleName} not found`);
    }
    
    item.appliedObjectStyle = style;
    return {status: "success", message: "Object style applied"};
};

const deleteStyle = async (command) => {
    console.log("deleteStyle");
    const document = app.activeDocument;
    const options = command.options;
    const styleType = options.styleType; // PARAGRAPH, CHARACTER, OBJECT
    const styleName = options.styleName;
    const replaceWith = options.replaceWith;
    
    let style;
    if(styleType === "PARAGRAPH") {
        style = document.paragraphStyles.itemByName(styleName);
    } else if(styleType === "CHARACTER") {
        style = document.characterStyles.itemByName(styleName);
    } else if(styleType === "OBJECT") {
        style = document.objectStyles.itemByName(styleName);
    }
    
    if(!style || !style.isValid) {
        throw new Error(`Style ${styleName} not found`);
    }
    
    if(replaceWith) {
        let replacement;
        if(styleType === "PARAGRAPH") {
            replacement = document.paragraphStyles.itemByName(replaceWith);
        } else if(styleType === "CHARACTER") {
            replacement = document.characterStyles.itemByName(replaceWith);
        } else if(styleType === "OBJECT") {
            replacement = document.objectStyles.itemByName(replaceWith);
        }
        if(replacement && replacement.isValid) {
            style.replaceWith(replacement);
        }
    }
    
    style.remove();
    return {status: "success", message: "Style deleted"};
};

// =============================================================================
// COLOR OPERATIONS
// =============================================================================

const createColorSwatch = async (command) => {
    console.log("createColorSwatch");
    const document = app.activeDocument;
    const options = command.options;
    const name = options.name;
    const color = options.color;
    
    const swatch = document.swatches.add();
    swatch.name = name;
    swatch.color = new Color();
    
    if(color.r !== undefined) {
        swatch.color.model = ColorModel.PROCESS;
        swatch.color.colorValue = [color.r/255, color.g/255, color.b/255];
    } else if(color.c !== undefined) {
        swatch.color.model = ColorModel.SPOT;
        swatch.color.colorValue = [color.c/100, color.m/100, color.y/100, color.k/100];
    }
    
    return {status: "success", swatchName: swatch.name, message: "Color swatch created"};
};

const getSwatches = async (command) => {
    console.log("getSwatches");
    const document = app.activeDocument;
    const swatches = [];
    
    for(let i = 0; i < document.swatches.length; i++) {
        const swatch = document.swatches[i];
        swatches.push({
            name: swatch.name,
            colorValue: swatch.color.colorValue
        });
    }
    
    return {status: "success", swatches: swatches};
};

const deleteSwatch = async (command) => {
    console.log("deleteSwatch");
    const document = app.activeDocument;
    const options = command.options;
    const swatchName = options.swatchName;
    const replaceWith = options.replaceWith || "Black";
    
    const swatch = document.swatches.itemByName(swatchName);
    if(!swatch.isValid) {
        throw new Error(`Swatch ${swatchName} not found`);
    }
    
    const replacement = document.swatches.itemByName(replaceWith);
    if(replacement && replacement.isValid) {
        swatch.replaceWith(replacement);
    }
    
    swatch.remove();
    return {status: "success", message: "Swatch deleted"};
};

const createGradientSwatch = async (command) => {
    console.log("createGradientSwatch");
    const document = app.activeDocument;
    const options = command.options;
    const name = options.name;
    const stops = options.stops;
    
    const swatch = document.gradientSwatches.add();
    swatch.name = name;
    
    // Add gradient stops
    for(let i = 0; i < stops.length; i++) {
        const stop = stops[i];
        const gradientStop = swatch.gradientStops.add();
        gradientStop.stopColor = document.swatches.itemByName(stop.colorName);
        gradientStop.location = stop.location;
    }
    
    return {status: "success", swatchName: swatch.name, message: "Gradient swatch created"};
};

// =============================================================================
// TABLE OPERATIONS
// =============================================================================

const createTable = async (command) => {
    console.log("createTable");
    const document = app.activeDocument;
    const options = command.options;
    const frameId = options.frameId;
    const rows = options.rows || 3;
    const columns = options.columns || 3;
    
    const item = findItemById(document, frameId);
    if(!item || item.constructor.name !== "TextFrame") {
        throw new Error(`Text frame ${frameId} not found`);
    }
    
    const table = item.texts[0].tables.add();
    table.rows.add(rows);
    table.columns.add(columns);
    
    return {status: "success", tableId: table.id, message: "Table created"};
};

const setTableCellContent = async (command) => {
    console.log("setTableCellContent");
    const document = app.activeDocument;
    const options = command.options;
    const tableId = options.tableId;
    const rowIndex = options.rowIndex;
    const columnIndex = options.columnIndex;
    const content = options.content;
    
    // Find table by ID (would need to search through text frames)
    // This is a simplified implementation
    return {status: "success", message: "Table cell content set (stub)"};
};

const setTableCellStyle = async (command) => {
    console.log("setTableCellStyle");
    return {status: "success", message: "Table cell style set (stub)"};
};

const addTableRows = async (command) => {
    console.log("addTableRows");
    return {status: "success", message: "Table rows added (stub)"};
};

const addTableColumns = async (command) => {
    console.log("addTableColumns");
    return {status: "success", message: "Table columns added (stub)"};
};

const deleteTableRows = async (command) => {
    console.log("deleteTableRows");
    return {status: "success", message: "Table rows deleted (stub)"};
};

const deleteTableColumns = async (command) => {
    console.log("deleteTableColumns");
    return {status: "success", message: "Table columns deleted (stub)"};
};

const mergeTableCells = async (command) => {
    console.log("mergeTableCells");
    return {status: "success", message: "Table cells merged (stub)"};
};

const setColumnWidth = async (command) => {
    console.log("setColumnWidth");
    return {status: "success", message: "Column width set (stub)"};
};

const setRowHeight = async (command) => {
    console.log("setRowHeight");
    return {status: "success", message: "Row height set (stub)"};
};

// =============================================================================
// TEXT SEARCH/REPLACE
// =============================================================================

const findText = async (command) => {
    console.log("findText");
    const document = app.activeDocument;
    const options = command.options;
    const findWhat = options.findWhat;
    
    // Use InDesign's find/change functionality
    const findChangePreferences = app.findChangePreferences;
    findChangePreferences.findWhat = findWhat;
    
    const results = [];
    // Search through all text frames
    for(let i = 0; i < document.pages.length; i++) {
        const page = document.pages[i];
        for(let j = 0; j < page.textFrames.length; j++) {
            const frame = page.textFrames[j];
            const content = frame.contents;
            if(content.includes(findWhat)) {
                results.push({
                    frameId: frame.id,
                    pageIndex: i
                });
            }
        }
    }
    
    return {status: "success", results: results};
};

const replaceText = async (command) => {
    console.log("replaceText");
    const document = app.activeDocument;
    const options = command.options;
    const findWhat = options.findWhat;
    const replaceWith = options.replaceWith;
    
    // Replace in all text frames
    for(let i = 0; i < document.pages.length; i++) {
        const page = document.pages[i];
        for(let j = 0; j < page.textFrames.length; j++) {
            const frame = page.textFrames[j];
            frame.contents = frame.contents.replace(new RegExp(findWhat, 'g'), replaceWith);
        }
    }
    
    return {status: "success", message: "Text replaced"};
};

const findGrep = async (command) => {
    console.log("findGrep");
    return {status: "success", message: "Grep find (stub)"};
};

const replaceGrep = async (command) => {
    console.log("replaceGrep");
    return {status: "success", message: "Grep replace (stub)"};
};

// =============================================================================
// HYPERLINK OPERATIONS
// =============================================================================

const createHyperlink = async (command) => {
    console.log("createHyperlink");
    return {status: "success", message: "Hyperlink created (stub)"};
};

const createPageReference = async (command) => {
    console.log("createPageReference");
    return {status: "success", message: "Page reference created (stub)"};
};

const getHyperlinks = async (command) => {
    console.log("getHyperlinks");
    const document = app.activeDocument;
    const hyperlinks = [];
    
    for(let i = 0; i < document.hyperlinks.length; i++) {
        hyperlinks.push({
            id: document.hyperlinks[i].id,
            name: document.hyperlinks[i].name
        });
    }
    
    return {status: "success", hyperlinks: hyperlinks};
};

const deleteHyperlink = async (command) => {
    console.log("deleteHyperlink");
    return {status: "success", message: "Hyperlink deleted (stub)"};
};

// =============================================================================
// DOCUMENT UTILITIES
// =============================================================================

const runPreflight = async (command) => {
    console.log("runPreflight");
    return {status: "success", message: "Preflight run (stub)"};
};

const packageDocument = async (command) => {
    console.log("packageDocument");
    return {status: "success", message: "Document packaged (stub)"};
};

const getFonts = async (command) => {
    console.log("getFonts");
    const document = app.activeDocument;
    const fonts = [];
    
    for(let i = 0; i < document.fonts.length; i++) {
        fonts.push(document.fonts[i].name);
    }
    
    return {status: "success", fonts: fonts};
};

const getLinks = async (command) => {
    console.log("getLinks");
    const document = app.activeDocument;
    const links = [];
    
    for(let i = 0; i < document.links.length; i++) {
        const link = document.links[i];
        links.push({
            id: link.id,
            name: link.name,
            filePath: link.filePath
        });
    }
    
    return {status: "success", links: links};
};

const updateLink = async (command) => {
    console.log("updateLink");
    const document = app.activeDocument;
    const options = command.options;
    const linkId = options.linkId;
    
    const link = document.links.itemByID(linkId);
    if(link && link.isValid) {
        link.update();
        return {status: "success", message: "Link updated"};
    }
    throw new Error(`Link ${linkId} not found`);
};

const embedLink = async (command) => {
    console.log("embedLink");
    const document = app.activeDocument;
    const options = command.options;
    const linkId = options.linkId;
    
    const link = document.links.itemByID(linkId);
    if(link && link.isValid) {
        link.embed();
        return {status: "success", message: "Link embedded"};
    }
    throw new Error(`Link ${linkId} not found`);
};

const unembedLink = async (command) => {
    console.log("unembedLink");
    const document = app.activeDocument;
    const options = command.options;
    const linkId = options.linkId;
    const filePath = options.filePath;
    
    const link = document.links.itemByID(linkId);
    if(link && link.isValid) {
        link.unembed(filePath);
        return {status: "success", message: "Link unembedded"};
    }
    throw new Error(`Link ${linkId} not found`);
};

// =============================================================================
// SCRIPTING AND NAVIGATION
// =============================================================================

const executeScript = async (command) => {
    console.log("executeScript");
    const options = command.options;
    const script = options.script;
    
    // Execute JavaScript in InDesign context
    eval(script);
    return {status: "success", message: "Script executed"};
};

const undo = async (command) => {
    console.log("undo");
    app.undo();
    return {status: "success", message: "Undone"};
};

const redo = async (command) => {
    console.log("redo");
    app.redo();
    return {status: "success", message: "Redone"};
};

const zoom = async (command) => {
    console.log("zoom");
    const options = command.options;
    const level = options.level;
    const fit = options.fit;
    
    if(level !== undefined) {
        app.activeWindow.zoomPercentage = level;
    } else if(fit) {
        // Handle fit options
    }
    
    return {status: "success", message: "Zoomed"};
};

const goToPage = async (command) => {
    console.log("goToPage");
    const document = app.activeDocument;
    const options = command.options;
    const pageIndex = options.pageIndex;
    
    const page = document.pages[pageIndex];
    if(page) {
        app.activeWindow.activePage = page;
        return {status: "success", message: `Navigated to page ${pageIndex}`};
    }
    throw new Error(`Page ${pageIndex} not found`);
};

// =============================================================================
// COMMAND HANDLERS REGISTRY
// =============================================================================

const commandHandlers = {
    // Document operations
    createDocument,
    openDocument,
    saveDocument,
    closeDocument,
    exportDocument,
    getDocumentInfo,
    setDocumentPreferences,
    
    // Page operations
    addPage,
    deletePage,
    duplicatePage,
    movePage,
    getPageCount,
    getPageItems,
    setPageSize,
    
    // Text frame operations
    createTextFrame,
    setTextContent,
    getTextContent,
    setTextStyle,
    setParagraphStyle,
    setTextFrameOptions,
    linkTextFrames,
    unlinkTextFrame,
    
    // Graphics operations
    createRectangle,
    createOval,
    createPolygon,
    createLine,
    placeImage,
    fitContent,
    
    // Selection operations
    selectItem,
    selectAll,
    deselectAll,
    getSelection,
    
    // Item manipulation
    moveItem,
    resizeItem,
    rotateItem,
    duplicateItem,
    deleteItem,
    groupItems,
    ungroupItems,
    setItemFill,
    setItemStroke,
    setItemEffects,
    arrangeItem,
    alignItems,
    distributeItems,
    
    // Layer operations
    createLayer,
    getLayers,
    setLayerProperties,
    deleteLayer,
    moveItemToLayer,
    reorderLayer,
    
    // Master page operations
    createMasterPage,
    getMasterPages,
    applyMasterPage,
    deleteMasterPage,
    overrideMasterItem,
    
    // Style operations
    createParagraphStyle,
    createCharacterStyle,
    createObjectStyle,
    getParagraphStyles,
    getCharacterStyles,
    getObjectStyles,
    applyParagraphStyle,
    applyCharacterStyle,
    applyObjectStyle,
    deleteStyle,
    
    // Color operations
    createColorSwatch,
    getSwatches,
    deleteSwatch,
    createGradientSwatch,
    
    // Table operations
    createTable,
    setTableCellContent,
    setTableCellStyle,
    addTableRows,
    addTableColumns,
    deleteTableRows,
    deleteTableColumns,
    mergeTableCells,
    setColumnWidth,
    setRowHeight,
    
    // Text search/replace
    findText,
    replaceText,
    findGrep,
    replaceGrep,
    
    // Hyperlink operations
    createHyperlink,
    createPageReference,
    getHyperlinks,
    deleteHyperlink,
    
    // Document utilities
    runPreflight,
    packageDocument,
    getFonts,
    getLinks,
    updateLink,
    embedLink,
    unembedLink,
    
    // Scripting and navigation
    executeScript,
    undo,
    redo,
    zoom,
    goToPage
};

const parseAndRouteCommand = async (command) => {
    let action = command.action;
    console.log(`parseAndRouteCommand: Looking for handler for action: ${action}`);
    
    let f = commandHandlers[action];

    if (typeof f !== "function") {
        console.error(`Unknown Command: ${action}. Available commands:`, Object.keys(commandHandlers).slice(0, 20));
        throw new Error(`Unknown Command: ${action}`);
    }
    
    console.log(`Found handler: ${f.name}, executing...`);
    try {
        const result = await f(command);
        console.log(`Handler ${f.name} completed successfully`);
        return result;
    } catch (error) {
        console.error(`Error in handler ${f.name}:`, error);
        throw error;
    }
};

const getActiveDocumentSettings = (command) => {
    const document = app.activeDocument;
    if (!document) {
        return null;
    }
    
    try {
        const d = document.documentPreferences;
        const documentPreferences = {
            pageWidth: d.pageWidth,
            pageHeight: d.pageHeight,
            pagesPerDocument: d.pagesPerDocument,
            facingPages: d.facingPages,
            measurementUnit: getUnitForIntent(d.intent)
        };

        const marginPreferences = {
            top: document.marginPreferences.top,
            bottom: document.marginPreferences.bottom,
            left: document.marginPreferences.left,
            right: document.marginPreferences.right,
            columnCount: document.marginPreferences.columnCount,
            columnGutter: document.marginPreferences.columnGutter
        };
        return {documentPreferences, marginPreferences};
    } catch (e) {
        console.error("Error getting document settings:", e);
        return null;
    }
};

const checkRequiresActiveDocument = async (command) => {
    if (!requiresActiveDocument(command)) {
        return;
    }

    let document = app.activeDocument;
    if (!document) {
        throw new Error(
            `${command.action} : Requires an open InDesign document`
        );
    }
};

const requiresActiveDocument = (command) => {
    const noDocRequired = ["createDocument"];
    return !noDocRequired.includes(command.action);
};

module.exports = {
    getActiveDocumentSettings,
    checkRequiresActiveDocument,
    parseAndRouteCommand
};
