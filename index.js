var PixelPusher = require('heroic-pixel-pusher');
var PixelStrip = PixelPusher.PixelStrip;
var NanoTimer = require('nanotimer');
var tinycolor = require("tinycolor2");
var midi = require('midi');

new PixelPusher().on('discover', function(controller) {
    var timer = null;
    // log connection data on initial discovery
    console.log('-----------------------------------');
    console.log('Discovered PixelPusher on network: ');
    console.log(controller.params.pixelpusher);
    console.log('-----------------------------------');

    // capture the update message sent back from the pp controller
    controller.on('update', function update() {
        console.log({
            updatePeriod: Math.round(
                this.params.pixelpusher.updatePeriod * 100) / 100,
            deltaSequence: this.params.pixelpusher.deltaSequence,
            powerTotal: this.params.pixelpusher.powerTotal
        });
    }).on('timeout', function timeout() {
        // be sure to handel the situation when the controller dissappears.
        // this could be due to power cycle or network conditions
        console.log(
            'TIMEOUT : PixelPusher at address [' + controller.params.ipAddress +
            '] with MAC (' + controller.params.macAddress +
            ') has timed out. Awaiting re-discovery....');
        if (!!timer) timer.clearInterval();
    });

    // aquire the number of strips that the controller has said it
    // has connected via the pixel.rc config file
    var NUM_STRIPS = controller.params.pixelpusher.numberStrips;
    var STRIPS_PER_PACKET = controller.params.pixelpusher.stripsPerPkt;
    var NUM_PACKETS_PER_UPDATE = NUM_STRIPS / STRIPS_PER_PACKET;

    // aquire the number of pixels we that the controller reports is
    // in each strip. This is set in the pixel.rc
    var PIXELS_PER_STRIP = controller.params.pixelpusher.pixelsPerStrip;

    // create a loop that will send commands to the PP to update the strip
    var UPDATE_FREQUENCY_MILLIS = 15; // 15 is just faster than 60 FPS

    var HUE_INCR_PER_MS = 0.005;

    var index = 0;

    var MIDI_PPQN = 24
    var MIDI_CLOCK = 248;
    var MIDI_START = 251;
    var MIDI_CONTINUE = 252;
    var clocks = 0;
    var count = 0;
    var beats = [];
    var bpm = 120;
    var mspb = 600;



    var strips = [];
    for (var stripNum = 0; stripNum < PIXELS_PER_STRIP; stripNum++) {
        strips.push(new PixelStrip(stripNum, PIXELS_PER_STRIP));
    }
    var input = new midi.input();
    
    // Count the available input ports.
    input.getPortCount();

    // Get the name of a specified input port.
    input.getPortName(0);

    // Configure a callback.
    input.on('message', function(deltaTime, message) {
        // The message is an array of numbers corresponding to the MIDI bytes:
        //   [status, data1, data2]
        // https://www.cs.cf.ac.uk/Dave/Multimedia/node158.html has some helpful
        // information interpreting the messages.
        // console.log('m:' + message + ' d:' + deltaTime);
        if (message == MIDI_CLOCK) {
            if (clocks % MIDI_PPQN == 0) {
                console.log("Quarter note");
                var beatTime = new Date().getTime();
                clocks = 0;
                beats.push(beatTime);
                if (beats.length > 1) {
                    if (beats.length > 4) {
                        beats.shift();
                    }
                    mspb = (beats[beats.length - 1] - beats[0]) / (beats.length - 1);
                    bpm = 60000 / mspb;
                }
                count = Math.round(count) + 1;
            }
            clocks++;
        } else {
            if (message == MIDI_START || message == MIDI_CONTINUE) {
                console.log("MIDI Synced.");
                clocks = 0;
                count = 0;
            }
        }
    });

    function beat() {
        var passed = (new Date).getTime() - beats[beats.length - 1];
        return count + passed / mspb;
    }

    function pulse() {
        return Math.exp(-Math.pow(Math.pow(beat() % 1, 0.3) - 0.5, 2) / 0.05)
    }


    // Open the first available input port.
    input.openPort(0);

    // Sysex, timing, and active sensing messages are ignored
    // by default. To enable these message types, pass false for
    // the appropriate type in the function below.
    // Order: (Sysex, Timing, Active Sensing)
    // For example if you want to receive only MIDI Clock beats
    // you should use
    // input.ignoreTypes(true, false, true)
    input.ignoreTypes(true, false, true);

    timer = new NanoTimer();
    var intvl = '' + UPDATE_FREQUENCY_MILLIS + 'm';
    console.log(intvl);
    timer.setInterval(tick, '', intvl);

    function tick() {
        // create an array to hold the data for all the strips at once
        // loop

        var rendered = [];
        var pulseval = pulse();
        if (pulseval < 0.2) {
            pulseval = 0.2;
        };

        console.log(pulseval);
        for (var stripId = 0; stripId < NUM_STRIPS; stripId++) {
            var s = strips[stripId];

            for (var i = 0; i < PIXELS_PER_STRIP; i++) {
                var rgb = tinycolor.fromRatio({
                    h: (((i + index) % PIXELS_PER_STRIP) / PIXELS_PER_STRIP),
                    s: pulseval,
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
        index += HUE_INCR_PER_MS * UPDATE_FREQUENCY_MILLIS;
        if (index > PIXELS_PER_STRIP) {
            index = 0;
        }
    };
    //input.closePort();

}).on('error', function(err) {
    console.log('PixelPusher Error: ' + err.message);
});