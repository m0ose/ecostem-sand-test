
import {ImageLoader} from './Util';

export class StripeScan {
    constructor() {
        this.server = "http://192.168.1.133:8080/shot.jpg";
        this.imageLoader = new ImageLoader();

        /* the canvas on which we draw the gray code stripes */
        this.screenCanvas = null;
        this.screenCtx = null;

        /* the canvas in which we store the correspondence */
        this.outputCanvas = null;
        this.outputCtx = null;

        /* temporary/working space canvas to store camera frame pixels */
        this.cameraCanvas = null;
        this.cameraCtx = null;
    }

    makeCanvases(width, height) {
        var outputCanvas = document.createElement('canvas');
        var cameraCanvas = document.createElement('canvas');

        outputCanvas.width = cameraCanvas.width = width;
        outputCanvas.height = cameraCanvas.height = height;

        this.outputCanvas = outputCanvas;
        this.outputCtx = outputCanvas.getContext('2d');

        /* It's important that we start with all r/g/b values set to 0
           and all opacity values set to 255. */
        this.outputCtx.fillStyle = 'black';
        this.outputCtx.fillRect(0, 0, width, height);

        this.cameraCanvas = cameraCanvas;
        this.cameraCtx = cameraCanvas.getContext('2d');
    }

    scan(canvas, doneCallback) {
        this.screenCanvas = canvas;
        this.screenCtx = canvas.getContext('2d');

        /* Grab an image just to get dimensions */
        this.grabCameraImage((img) => {
            this.makeCanvases(img.width, img.height);
            /* numSteps is how many level of stripes to flash. numSteps == 7
               would mean the finest level will display 2^7 = 128 stripes, giving
               a resolution of 128 x 128 for the correspondence raster. */
            this.numSteps = 7;

            this.blackFrame(() => {
                this.whiteFrame(() => {
                    this.paintAndProcessStripes(this.numSteps, 'vertical', () => {
                        this.paintAndProcessStripes(this.numSteps, 'horizontal', () => {
                            this.invoke(doneCallback, this.outputCanvas);
                        });
                    });
                });
            });
        });
    }

    invoke(callback, arg) {
        if (typeof callback === 'function') {
            callback(arg);
        }
    }

    /* Projects an all-white frame and uses the frame to rule out all the pixels
       that are not bright enough as being outside the projection area. */
    whiteFrame(doneCallback) {
        this.screenCtx.fillStyle = 'white';
        this.screenCtx.fillRect(0, 0, this.screenCanvas.width, this.screenCanvas.height);

        var pixelCallback = (cameraPixels, outputPixels, idx) => {
            /* TODO: These are fixed heuristics for now */
            if (!(cameraPixels[idx] > 80 || cameraPixels[idx + 1] > 80 || cameraPixels[idx + 2] > 80)) {
                outputPixels[idx + 3] = 0;
            }
        };

        this.processEachCameraPixel(pixelCallback, doneCallback);
    }

    /* Projects an all-black frame and rules out all the pixels that are not
       dark enough as being outside the projection area. */
    blackFrame(doneCallback) {
        this.screenCtx.fillStyle = 'black';
        this.screenCtx.fillRect(0, 0, this.screenCanvas.width, this.screenCanvas.height);

        var pixelCallback = (cameraPixels, outputPixels, idx) => {
            /* TODO: Fixed heuristic */
            if (cameraPixels[idx] > 150 && cameraPixels[idx + 1] > 150 && cameraPixels[idx + 2] > 150) {
                outputPixels[idx + 3] = 0;
            }
        };

        this.processEachCameraPixel(pixelCallback, doneCallback);
    }

    /* Grabs an image from the camera server and iterates pixelCallback over
       each of its pixels. pixelCallback gets called with:

         pixelCallback(cameraPixels, outputPixels, index)

       where index is the offset of the current pixel. cameraPixels and outputPixels
       are the "data" properties of ImageData objects, so they contain a flat
       pixel representation where idx is the offset of the red component, idx+1
       is green, idx+2 is blue, and idx+3 is the alpha component.

       The callback should write its output into outputPixels, which are the
       pixels of the canvas returned by scan(). */
    processEachCameraPixel(pixelCallback, doneCallback) {
        /* No point in doing anything without a callback... */
        if (typeof pixelCallback !== 'function') {
            return;
        }

        /* Grab image from the server. */
        this.grabCameraImage((img) => {
            /* Put the image in the tmp/workspace canvas. */
            this.cameraCtx.drawImage(img, 0, 0);

            var w = this.cameraCanvas.width,
                h = this.cameraCanvas.height,
                /* Camera image pixels */
                cameraPixels = this.cameraCtx.getImageData(0, 0, w, h),
                /* Output canvas pixels */
                outputPixels = this.outputCtx.getImageData(0, 0, w, h);

            for (var i = 0; i < w; ++i) {
                for (var j = 0; j < h; ++j) {
                    var idx = (j * w + i) * 4;
                    /* Invoke the callback */
                    pixelCallback(cameraPixels.data, outputPixels.data, idx);
                }
            }

            /* Write the change pixels back into the output canvas. */
            this.outputCtx.putImageData(outputPixels, 0, 0);

            this.invoke(doneCallback);
        });
    }

    /* Fills the screen canvas with numStripes stripes. The stripes alternate
       in the following pattern (where 0 = white, 1 = black):
         Length 2:  01
         Length 4:  0110
         Length 8:  01100110
         Length 16: 0110011001100110
       This helps tagging pixels with their x- and y-coord in projector space
       by using a gray coding scheme. */
    paintStripes(numStripes, mode = 'vertical') {
        var stripeSize = (mode === 'vertical' ? this.screenCanvas.width : this.screenCanvas.height) / numStripes;

        /* This state machine determines what the next color should be. There are four states:
             0: white
             1: white
             2: black
             2: black
           We always start in state 1, painting a white stripe first. */
        var state = 1;
        var nextColor = () => {
            var ret;

            if (state === 0 || state === 1) {
                ret = 'white';
                state++;
            } else if (state === 2 || state === 3) {
                ret = 'black';
                state++;
            }

            if (state === 4) {
                state = 0;
            }

            return ret;
        };

        this.screenCtx.clearRect(0, 0, this.screenCanvas.width, this.screenCanvas.height);

        for (var x = 0; x < numStripes; ++x) {
            this.screenCtx.fillStyle = nextColor();
            if (mode === 'vertical') {
                this.screenCtx.fillRect(x * stripeSize, 0, x * stripeSize + stripeSize, this.screenCanvas.height);
            } else {
                this.screenCtx.fillRect(0, x * stripeSize, this.screenCanvas.width, x * stripeSize + stripeSize);
            }
        }
    }

    /* Grab an image from the camera, technically assuming that the image is of
       a striped frame (done by projecting the output of paintStripes), and
       markes each camera pixel with its position in projector space, where
       its x-position is the x-th vertical stripe, and the y-position is the
       y-th horizontal stripe (counting from 0), in the last, highest resolution
       striped frame. */
    processFrame(mode, doneCallback) {
        /* For now I store the corresponding projector pixel's x position in the
           red channel and the y position in the blue channel. If the mode is vertical,
           offset will be 0, which is offset of the red channel relative to the pixel
           2 is the offset of the blue channel. */
        var offset = mode === 'vertical' ? 0 : 2;

        var pixelCallback = (cameraPixels, outputPixels, idx) => {
            /* TODO: This uses a fixed heuristic for brightness detection that might not work depending
               on lighting conditions. */

            /* Gray Coding. For each striped frame, we progressively tag each
               pixel with its x- or y-coordinate in projector space (in terms of the
               vertical stripe number x and horizontal stripe number y -- counting
               from 0). The stripes are projected in a gray code scheme. The x-
               and y-coords are always stored in binary (not gray codes), and the
               conversion is done on the fly.

               The gray code frames look like (0=white, 1=black):
                 0               1
                 0       1       1       0
                 0   1   1   0   0   1   1   0, etc.

               We progressively assign indices to the corresponding pixels like:
               Frame 1:
                 0               1
               > 0               1
               Frame 2:
                 0       1       1       0
               > 00      01      10      11
               Frame 3:
                 0   1   1   0   0   1   1   0
               > 000 001 010 011 100 101 110 111 (notice: decimal 0-7)

               Assuming no noise, this will make sure that each pixel is marked with
               this precise x- and y-positions in projector space. */

            var prevBit = outputPixels[idx + offset] & 0x1,
                whiteBit = 0,
                blackBit = 1;

            /* If the LSB from the last frame is 1, flip the values. This is the
               whole trick to incrementally translating gray to binary. */
            if (prevBit === 1) {
                whiteBit = 1;
                blackBit = 0;
            }

            if (cameraPixels[idx] > 100 && cameraPixels[idx + 1] > 100 && cameraPixels[idx + 2] > 100) {
                outputPixels[idx + offset] = (outputPixels[idx + offset] << 1) | whiteBit;
            } else {
                outputPixels[idx + offset] = (outputPixels[idx + offset] << 1) | blackBit;
            }
        };

        this.processEachCameraPixel(pixelCallback, doneCallback);
    }

    /* Grab an image from the camera server and invoke the callback on it */
    grabCameraImage(callback) {
        /* Add a random element to the url to prevent the browser from
           returning a cached image. */
        var serverUrl = this.server + '?x=' + Math.random();
        setTimeout(() => this.imageLoader.load(serverUrl, (img) => this.invoke(callback, img)), 200);
    }

    /* Take the number of striped frames you want to run, the mode which
       determines if the sequence will be vertical or horizontal stripes,
       and label each pixel with its location in projector space (in terms
       of which horizontal and vertical stripe it blongs to). Images are
       stored in a temporary canvas that is overwritten with each frame.
       The projector-space position of each pixel is stored in the output
       canvas. */
    paintAndProcessStripes(n, mode, doneCallback) {
        if (n > 0) {
            var numStripes = Math.pow(2, (this.numSteps-n+1));
            this.paintStripes(numStripes, mode);
            this.processFrame(mode, () => this.paintAndProcessStripes(n-1, mode, doneCallback));
        }
        else {
            this.invoke(doneCallback);
        }
    }
}