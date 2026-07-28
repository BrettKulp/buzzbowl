// Two shims that let Phaser boot under jsdom. Both are inert under the `node`
// environment the unit tests run in.

// 1. jsdom decodes no images, so `onload` never fires. Phaser gates the start of its
//    main loop on the TextureManager finishing its base64 default textures, so without
//    this the game boots and then sits there forever with `isRunning === false`.
if (typeof HTMLImageElement !== 'undefined') {
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
        configurable: true,
        get() {
            return this.getAttribute('src') ?? '';
        },
        set(value) {
            this.setAttribute('src', value);
            Object.defineProperty(this, 'width', { value: 1, configurable: true });
            Object.defineProperty(this, 'height', { value: 1, configurable: true });
            setTimeout(() => {
                this.dispatchEvent(new Event('load'));
                if (typeof this.onload === 'function') this.onload();
            }, 0);
        },
    });
}

// 2. jsdom has no 2D canvas context, but Phaser measures every `scene.add.text()`
//    through one.
if (typeof HTMLCanvasElement !== 'undefined') {
    HTMLCanvasElement.prototype.getContext = function () {
        // Style properties (font, fillStyle, textBaseline, ...) are plain assignments,
        // so anything not listed here is absorbed by the object itself.
        return {
            measureText: (text) => ({
                // Returning the bounding-box keys keeps Phaser's MeasureText on its early
                // return. Without them it falls back to filling a canvas and scanning
                // getImageData for glyph bounds, which against a stub means a pointless
                // width x height scan and a bogus font size.
                width: String(text).length * 8,
                actualBoundingBoxAscent: 8,
                actualBoundingBoxDescent: 2,
            }),
            // Phaser probes inverse-alpha support at import time by writing a pixel,
            // reading it back and comparing. Consistent zeroed data satisfies the compare.
            getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h) * 4) }),
            putImageData: () => {},
            createImageData: (w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h) * 4) }),
            drawImage: () => {},
            clearRect: () => {},
            fillRect: () => {},
            fillText: () => {},
            strokeText: () => {},
            save: () => {},
            restore: () => {},
            scale: () => {},
            translate: () => {},
        };
    };
}
