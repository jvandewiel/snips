/*
Modified for RPI version
Install & compile HID* stuff as per: https://github.com/node-hid/node-hid/
Expect to receive messages on the MQTT channels defined below

See also https://github.com/Fuhua-Chen/ReSpeaker-Microphone-Array-HID-tool

execute as 'node respeaker_pixels.js test' to run the tests or
execute as 'node respeaker_pixels.js' to run as mqtt client
*/

var hid = require('./node_modules/node-hid'); // custom install
hid.setDriverType("libusb"); // required on Linux for RPI pre init, might be different on Windows/mac
var sleep = require('sleep'); // npm instal
var mqtt = require('mqtt'); // npm install
var client = mqtt.connect('mqtt://localhost:1883');

var device = new hid.HID(0x2886, 0x0007); // actual re-speaker device
var address = 0; // adress for pixel ring ?
var data = new Array();
var length = 0;
const REPORT_ID = 0x00;
const REG_NUM = 0X46;
var args = process.argv.splice(2); // passed arguments, test run only

// Respeaker object
var ReSpeakerMicArrayHID = {

  // Pixel ring modes
  OFF: 0, // All LEDs set to 0 and off
  COLOR: 1, // All LEDs single color
  LISTENING_FORCE: 2, // Listen mode, auto sound direction
  WAITING: 3, // Rotating green
  SPEAKING: 4, // Strength & direction
  VOLUME: 5, // Volume control, green
  LED_DATA: 6, // ???
  LISTENING_AUTO: 7, // Listen mode, force sound direction

  //
  setLedMode: function(mode, data1, data2, data3) {
    /*
    [ REPORT_ID, 0x00, 0x00, 0x04, 0x00 //address and length
    , mode, data1, data2, data3 //data0~3
    ]
    */
    device.write([REPORT_ID, 0x00, 0x00, 0x04, 0x00, mode, data1, data2, data3]);
  },

  getRegValue: function(reg, length) {
    var tmp = [REPORT_ID, reg, 0x80, length, 0, 0, 0];
    device.write(tmp);
    tmp = device.readSync();
    console.log(tmp[0].toString(16), ",", tmp[1].toString(16), ",", tmp[2].toString(16), ",", tmp[3].toString(16), ",", tmp[4].toString(16), ",", tmp[5].toString(16), ",", tmp[6].toString(16), ",", tmp[7].toString(16));
  },

  setRegValue: function(reg, length, arr) {
    var tmp = [REPORT_ID, reg, 0, length, 0, arr[0], arr[1], arr[2], arr[3]];
    device.write(tmp);
  },

  getAllData: function() {
    for (var reg = 0; reg < REG_NUM; reg++) {
      var tmp = [REPORT_ID, reg, 0x80, 4, 0, 0, 0];
      device.write(tmp);
      tmp = device.readSync();
      var str = "";
      for (var i = 0; i < tmp.length; i++) {
        str += tmp[i].toString(16) + ",";
      }
      console.log(str);
    }
  },

  setLedOff: function() {
    this.setLedMode(this.OFF, 0, 0, 0);
  },

  // Set color; expected input is for options r,b,g is value between 0..255
  setLedColor: function(options) {
    // get hexvalue
    /*
    var r = (options.red || 0).toString(16),
        g = (options.green || 0).toString(16),
        b = (options.blue || 0).toString(16);
        */
    // padding
    //this.setLedMode(this.COLOR, b.length == 2 ? b : "0" + b, g.length == 2 ? g : "0" + g, r.length == 2 ? r : "0" + r);
    var r = options.red || 0,
      g = options.green || 0,
      b = options.blue || 0;
    this.setLedMode(this.COLOR, b, g, r);
  },

  // Listening mode
  setListeningAuto: function() {
    this.setLedMode(this.LISTENING_AUTO, 0, 0, 0);
  },

  // Listening mode
  setListeningForce: function(direction) {
    this.setLedMode(this.LISTENING_FORCE, 0, direction & 0xFF, (direction >> 8) & 0xFF);
  },

  // Waiting mode
  setWaiting: function() {
    this.setLedMode(this.WAITING, 0, 0, 0);
  },

  /*
  set speaking mode with passed options object
  options.level = 0..?, direction = ??
  */
  setSpeaking: function(options) {
    //self.write(0, [self.speaking_mode, strength, direction & 0xFF, (direction >> 8) & 0xFF])
    //this.setLedMode(this.SPEAKING, options.level, options.direction, 0);
    console.log(options);
    this.setLedMode(this.SPEAKING, options.level, options.direction & 0xFF, (options.direction >> 8) & 0xFF);
  },

  /*
  set number of pixels for volume in options
  options: { level: int between 1 .. 12 } for each pixel. Runs
  */
  setVolume: function(level) {
    this.setLedMode(this.VOLUME, 0, 0, level || 1);
  },

  setLedData: function() {
    this.setLedMode(this.LED_DATA, 0, 0, 0);
  },

  setVoiceLocation: function() {
    this.setLedMode(this.VOICE_LOCATION, 0, 0, 0);
  },
};

var COLORMAX = 255; // signed byte??
var INC_SLEEP = Math.round(2000 / COLORMAX); // sleeptime in ms for color increase over 2 secs

// Test functions

// Run through volume cycle, from 1..12 leds
function volumeCycle() {
  console.log("VOLUME mode, increasing number of green counter-clockwise");
  for (var level = 0; level < 13; level++) {
    ReSpeakerMicArrayHID.setVolume(level);
    sleep.msleep(500); // sleep for 500 msec
  }
  console.log("All OFF");
  ReSpeakerMicArrayHID.setLedOff();
};

// Run through a cycle with increasing intensity and a single color
// passed parameter is string: red, green, blue, white
function colorCycle(color) {
  ReSpeakerMicArrayHID.setLedOff();
  console.log("All ON, color " + color + ", increasing intensity");
  var options = {};
  for (var i = 0; i < COLORMAX; i++) {
    switch (color) {
      case 'red':
        options = {
          red: i
        };
        break;
      case 'green':
        options = {
          green: i
        };
        break;
      case 'blue':
        options = {
          blue: i
        };
        break;
      case 'white':
        options = {
          red: i,
          blue: i,
          green: i
        };
        break;
        // defaults to white
      default:
        options = {
          red: i,
          blue: i,
          green: i
        };
        break;
    }
    ReSpeakerMicArrayHID.setLedColor(options);
    sleep.msleep(INC_SLEEP); // sleep for 500 msec
  };
  console.log("All OFF");
  ReSpeakerMicArrayHID.setLedOff();
};

// Run wait cycle for 2 secs
function waitCycle() {
  ReSpeakerMicArrayHID.setLedOff();
  console.log("WAITING mode, rotating green clockwise");
  ReSpeakerMicArrayHID.setWaiting();
  sleep.msleep(2000); // sleep for 2000 msec
  console.log("All OFF");
  ReSpeakerMicArrayHID.setLedOff();
};

// Run listen cycle for 5 secs
function listenAutoCycle() {
  ReSpeakerMicArrayHID.setLedOff();
  console.log("LISTENING mode, LEDs activated based on sound direction");
  ReSpeakerMicArrayHID.setListeningAuto();
  sleep.msleep(5000); // sleep for 5000 msec
  console.log("All OFF");
  ReSpeakerMicArrayHID.setLedOff();
};

// Force listen direction, rotating
function listenForceCycle() {
  ReSpeakerMicArrayHID.setLedOff();
  console.log("LISTENING mode, LEDs activated based FORCED direction");
  for (var dir = 0; dir < 255; dir++) {
    console.log(dir);
    ReSpeakerMicArrayHID.setListeningForce(dir);
    sleep.msleep(500); // sleep for 5000 msec
  };
  console.log("All OFF");
  ReSpeakerMicArrayHID.setLedOff();
};

// Run speaking cycle for 2 secs - no idea
function speakingCycle() {
  ReSpeakerMicArrayHID.setLedOff();
  console.log("SPEAKING mode");
  for (var level = 2; level < 9; level++) {
    var options = {
      level: 200,
      direction: 200
    };
    ReSpeakerMicArrayHID.setSpeaking(options);
    sleep.msleep(1000); // sleep for 2000 msec.
  }
  console.log("All OFF");
  ReSpeakerMicArrayHID.setLedOff();
};

// Run rainbow cycles
function rainbowCycle() {
  ReSpeakerMicArrayHID.setLedOff();
  console.log("Rainbow cycle");
  // start with red
  var rgb = [255, 0, 0];
  // Choose the colors to increment and decrement.
  for (var decColor = 0; decColor < 3; decColor += 1) {
    var incColor = decColor == 2 ? 0 : decColor + 1;
    // cross-fade the two colours.
    for (var i = 0; i < 255; i += 1) {
      rgb[decColor] -= 1;
      rgb[incColor] += 1;
      ReSpeakerMicArrayHID.setLedColor({
        red: rgb[0],
        green: rgb[1],
        blue: rgb[2]
      });
      sleep.msleep(20);
    }
  };
  console.log("All OFF");
  ReSpeakerMicArrayHID.setLedOff();
};

// Run various test cycles
function runTestCycles() {
  //speakingCycle(); // Does not work
  colorCycle('red');
  colorCycle('blue');
  colorCycle('green');
  colorCycle('white');
  rainbowCycle();
  volumeCycle();
  waitCycle();
  //listenAutoCycle();
  //listenForceCycle(); // Does not work
  // default to listening
  ReSpeakerMicArrayHID.setListeningAuto()
  process.exit();
};

// handling of incoming mqtt msg and related call to ReSpeakerMicArrayHID
client.on('message', function(topic, message) {
  switch (topic) {
    case '/respeaker/pixels/volume':
      console.log("/volume message");
      var data = JSON.parse(message);
      // set volume - bounds check
      data.volume > 12 ? data.volume = 12 : data.volume;
      ReSpeakerMicArrayHID.setVolume(data.volume);
      break;
    case '/respeaker/pixels/off':
      console.log("/off message");
      ReSpeakerMicArrayHID.setLedOff();
      break;
    case '/respeaker/pixels/wait':
      console.log("/wait message");
      ReSpeakerMicArrayHID.setWaiting();
      break;
    case '/respeaker/pixels/color':
      console.log("/color message");
      var data = JSON.parse(message);
      //console.log(data);
      // extract rgb and set, expect {red: 0..255, green: 0..255, blue: 0..255 }
      // defaults to white if nothing passed
      ReSpeakerMicArrayHID.setLedColor(data);
      break;
    case '/respeaker/pixels/listen':
      console.log("Listen");
      ReSpeakerMicArrayHID.setListeningAuto();
      break;
    case '/respeaker/pixels/status':
      console.log("Status");
      // read all registers and return
      var status = {
        reg: 1,
        reg2: 2
      };
      client.publish('/respeaker/pixels/messages', JSON.stringify(status));
      break;
    case '/respeaker/pixels/test':
      console.log("test");
      var devs = hid.devices();
      /*
      on RPI3 using libusb found as
      devices: [{
        vendorId: 10374,
        productId: 7,
        path: '0001:0004:04',
        manufacturer: 'SeeedStudio',
        product: 'ReSpeaker MicArray UAC2.0',
        release: 50,
        interface: 4
      }]
      */
      //console.log(devs);
      client.publish('/respeaker/pixels/messages', JSON.stringify(devs));
      runTestCycle()
      break;
    default:
      console.log("Default - no handler");
  }
})

/*
Main entry point
if script is called with param 'test' then run through the test cycle,
if not, setup mqtt and listeners
*/
if (args && args.length == 1) {
  if (args[0].toString() == "test") {
    console.log("Running test cycles");
    runTestCycles();
  }
} else {
  console.log("Setting up mqtt listeners");
  // set up mqtt client and subscribe to messages
  client.on('connect', function() {
    // mqtt messages to respond to
    /*
    for snips as per https://github.com/snipsco/snips-platform-documentation/wiki/6.--Miscellaneous#hermes-protocol
    1. hermes/hotword/default/detected
    2. hermes/hotword/wait
    3. hermes/asr/toggleOn
    4. hermes/asr/textCaptured
    5. hermes/asr/toggleOff
    6. hermes/nlu/query
    7. hermes/nlu/intentParsed
    8. hermes/intent/#
    9. hermes/hotword/toggleOn
    */
    client.subscribe('/respeaker/pixels/volume');
    client.subscribe('/respeaker/pixels/off');
    client.subscribe('/respeaker/pixels/wait');
    client.subscribe('/respeaker/pixels/color');
    client.subscribe('/respeaker/pixels/listen');
    client.subscribe('/respeaker/pixels/status');
    client.subscribe('/respeaker/pixels/test');
    // status channel for returning messages
    client.publish('/respeaker/pixels/messages', 'Initialized')
  });
}
