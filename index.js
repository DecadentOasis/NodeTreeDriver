var PixelPusher = require('heroic-pixel-pusher');
var PixelStrip = PixelPusher.PixelStrip;

new PixelPusher().on('discover', function(controller) {
    var timer = null;
    // log connection data on initial discovery
    console.log('-----------------------------------');
    console.log('Discovered PixelPusher on network: ');
    console.log(controller.params.pixelpusher);
    console.log('-----------------------------------');

    // capture the update message sent back from the pp controller
    controller.on('update', function() {
        console.log ({
            updatePeriod  : Math.round(
                this.params.pixelpusher.updatePeriod * 100) / 100,
            deltaSequence : this.params.pixelpusher.deltaSequence,
            powerTotal    : this.params.pixelpusher.powerTotal
        });
    }).on('timeout', function() {
        // be sure to handel the situation when the controller dissappears.
        // this could be due to power cycle or network conditions
        console.log(
            'TIMEOUT : PixelPusher at address [' + controller.params.ipAddress + 
            '] with MAC (' + controller.params.macAddress + 
            ') has timed out. Awaiting re-discovery....');
        if (!!timer) clearInterval(timer);
    });

    // aquire the number of strips that the controller has said it
    // has connected via the pixel.rc config file
    var NUM_STRIPS = controller.params.pixelpusher.numberStrips;
    var STRIPS_PER_PACKET = controller.params.pixelpusher.stripsPerPkt;
    var NUM_PACKETS_PER_UPDATE = NUM_STRIPS/STRIPS_PER_PACKET;

    // aquire the number of pixels we that the controller reports is
    // in each strip. This is set in the pixel.rc
    var PIXELS_PER_STRIP = controller.params.pixelpusher.pixelsPerStrip;

    // create a loop that will send commands to the PP to update the strip
    var UPDATE_FREQUENCY_MILLIS = 15;// 15 is just faster than 60 FPS

    var HUE_INCR_PER_MS = 0.01;

    var index = 0;

    var that = this;


    timer = setInterval(function() {
        // create an array to hold the data for all the strips at once
        // loop

        var tinycolor = require("tinycolor2");
        var strips = [];
        for (var stripId = 0; stripId< NUM_STRIPS; stripId ++){
            var s = new PixelStrip(stripId,PIXELS_PER_STRIP);

            for (var i = 0; i < PIXELS_PER_STRIP; i++) {
                var rgb = tinycolor.fromRatio(
                    {
                        h: (((i + index)%PIXELS_PER_STRIP)/PIXELS_PER_STRIP), 
                        s: 1,
                        l: .51 }
                    ).toRgb();
                s.getPixel(i).setColor(rgb.r, rgb.g, rgb.b, 255);
            }
            // render the strip data into the correct format for sending
            // to the pixel pusher controller
            var renderedStripData = s.getStripData();
            // add this data to our list of strip data to send
            strips.push(renderedStripData);
        }
        // inform the controller of the new strip frame
        controller.refresh(strips);
        index += HUE_INCR_PER_MS * UPDATE_FREQUENCY_MILLIS;
        if (index > PIXELS_PER_STRIP) {
            index = 0;
        }
        

    }, UPDATE_FREQUENCY_MILLIS);

}).on('error', function(err) {
  console.log('PixelPusher Error: ' + err.message);
});

