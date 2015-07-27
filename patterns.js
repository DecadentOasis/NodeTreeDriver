var tinycolor = require("tinycolor2");

module.exports = {
    patterns: [RainbowBeatPattern]
};

function BasePattern(pixelpusher, bpminfo) {
    this.pixelpusher = pixelpusher;
    this.bpminfo = bpminfo;
    this.patternData = {};
}

BasePattern.prototype.tick = function tick(ms_since) {

};

function RainbowBeatPattern(pixelpusher, bpminfo) {
    BasePattern.call(this, pixelpusher, bpminfo);
    this.HUE_INCR_PER_MS = 0.005;
}

RainbowBeatPattern.prototype.tick = function tick(ms_since) {
    var rendered = [];
    var pulseval = this.bpminfo.pulse();
    if (pulseval < 0.2) {
        pulseval = 0.2;
    }
    Object.keys(pixelpusher.controllers).forEach(function (key) {
        var controller = pixelpusher.controllers[key];
        var NUM_STRIPS = controller.params.pixelpusher.numberStrips;
        var PIXELS_PER_STRIP = controller.params.pixelpusher.pixelsPerStrip;
        var strips = [];
        for (var stripNum = 0; stripNum < PIXELS_PER_STRIP; stripNum++) {
            strips.push(new PixelStrip(stripNum, PIXELS_PER_STRIP));
        }
        for (var stripId = 0; stripId < NUM_STRIPS; stripId++) {
            var s = strips[stripId];

            for (var i = 0; i < PIXELS_PER_STRIP; i++) {
                var rgb = tinycolor.fromRatio({
                    h: (((i + this.patternData.index) % PIXELS_PER_STRIP) / PIXELS_PER_STRIP),
                    s: 1 - pulseval,
                    l: .51
                }).toRgb();
                s.getPixel(i).setColor(rgb.r, rgb.g, rgb.b, 255);
            }
            // render the strip data into the correct format for sending
            // to the pixel pusher controller
            // add this data to our list of strip data to send
            rendered.push(s.getStripData());
        }
        // inform the controller of the new strip frame
        controller.refresh(rendered);
        this.patternData.index += this.HUE_INCR_PER_MS * ms_since;
        if (this.patternData.index > PIXELS_PER_STRIP) {
            this.patternData.index = 0;
        }
    });
};

RainbowBeatPattern.prototype = Object.create(BasePattern.prototype);