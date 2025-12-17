export function resizeCanvasToBlob(canvas, maxWidth = 512) {
    // This is a helper if we needed to resize manually, 
    // but canvas.toDataURL with quality 0.5 is usually sufficient for Vision APIs
    // to keep payload size down.
    return canvas.toDataURL('image/jpeg', 0.5);
}

export function resizeCanvasToBlob(canvas, maxWidth = 512) {
    // This is a helper if we needed to resize manually, 
    // but canvas.toDataURL with quality 0.5 is usually sufficient for Vision APIs
    // to keep payload size down.
    return canvas.toDataURL('image/jpeg', 0.5);
}

