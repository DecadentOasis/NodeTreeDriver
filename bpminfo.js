var BpmInfo = function() {

    var that = this;

    if (!(that instanceof BpmInfo)) return new BpmInfo();

    this.MIDI_PPQN = 24;
    this.MIDI_CLOCK = 248;
    this.MIDI_START = 250;
    this.MIDI_STOP = 252;
    this.MIDI_CONTINUE = 251;
    this.clocks = 0;
    this.count = 0;
    this.beats = [];
    this.bpm = 120;
    this.mspb = 600;
};

BpmInfo.prototype.handleMessage = function(deltaTime, message) {
    // The message is an array of numbers corresponding to the MIDI bytes:
    //   [status, data1, data2]
    // https://www.cs.cf.ac.uk/Dave/Multimedia/node158.html has some helpful
    // information interpreting the messages.
    // console.log('m:' + message + ' d:' + deltaTime);
    if (message == this.MIDI_CLOCK) {
        if (this.clocks % this.MIDI_PPQN == 0) {
            console.log("Quarter note");
            this.clocks = 0;
            this.beats.push(new Date().getTime());
            if (this.beats.length > 1) {
                if (this.beats.length > 4) {
                    this.beats.shift();
                }
                this.mspb = (this.beats[this.beats.length - 1] - this.beats[0]) / (this.beats.length - 1);
                this.bpm = 60000 / this.mspb;
            }
            this.count = Math.round(this.count) + 1;
        }
        this.clocks++;
    } else {
        if (message == this.MIDI_START || message == this.MIDI_CONTINUE) {
            console.log("MIDI Synced.");
            this.clocks = 0;
            this.count = 0;
        }
    }
}


BpmInfo.prototype.beat = function() {
    var passed = (new Date).getTime() - this.beats[this.beats.length - 1];
    return this.count + passed / this.mspb;
}

BpmInfo.prototype.pulse = function() {
    var beat = this.beat();
    var r = Math.exp(-Math.pow(Math.pow(beat % 1, 0.3) - 0.5, 2) / 0.05);
    return r;
}

module.exports = BpmInfo();