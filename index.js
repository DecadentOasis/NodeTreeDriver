var PixelPusher = require('heroic-pixel-pusher');
var PixelStrip = PixelPusher.PixelStrip;
var NanoTimer = require('nanotimer');
var midi = require('midi');
var patterns = require('./patterns');
var bpminfo = require('./bpminfo');

var pixelpusher = new PixelPusher();

var timer = null;


var input = new midi.input();

try {
    // Configure a callback.
    input.on('message', function (deltaTime, message) {
        bpminfo.handleMessage(deltaTime, message);
    });
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
}

var UPDATE_FREQUENCY_MILLIS = 15; // 15 is just faster than 60 FPS
timer = new NanoTimer();
var intvl = '' + UPDATE_FREQUENCY_MILLIS + 'm';
console.log(intvl);
timer.setInterval(tick, '', intvl);
var lastTick = (new Date).getTime();

var pattern = new patterns.patterns[0](pixelpusher, bpminfo);


function tick() {
    pattern.tick((new Date).getTime() - lastTick);
    lastTick = (new Date).getTime();
}

pixelpusher.on('discover', function (controller) {

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
        //if (!!timer) timer.clearInterval();
    });

});

pixelpusher.on('error', function (err) {
    console.log('PixelPusher Error: ' + err.message);
});