/*
Modified for RPI version
Install & compile HID* stuff as per: https://github.com/node-hid/node-hid/
Expect to receive messages on the MQTT channels below
*/
var hid = require('./node_modules/node-hid');
var mqtt = require('mqtt');
var client = mqtt.connect('mqtt://localhost:1883');


// set up mqtt client and subscribe to messages
client.on('connect', function() {
  // mqtt messages to respond to
  client.subscribe('/respeaker/pixels/volume');
  client.subscribe('/respeaker/pixels/off');
  client.subscribe('/respeaker/pixels/wait');
  client.subscribe('/respeaker/pixels/color');
  client.subscribe('/respeaker/pixels/listen');
  client.subscribe('/respeaker/pixels/status');
  // status channel
  client.publish('/respeaker/pixels/messages', 'Initialized')
})

// handling of incoming mqtt msg and related call to ReSpeakerMicArrayHID
client.on('message', function(topic, message) {
  // message is Buffer
  console.log(message.toString());
  console.log(topic.toString());
  //client.end()
  switch (topic) {
    case '/respeaker/pixels/volume':
      console.log("Volume");
      var data = JSON.parse(message);
      console.log(data);
      // set volume - bounds check
      ReSpeakerMicArrayHID.setVolume(data.volume);
      break;
    case '/respeaker/pixels/off':
      console.log("Off");
      ReSpeakerMicArrayHID.setLedOff();
      break;
    case '/respeaker/pixels/wait':
      console.log("Wait");
      ReSpeakerMicArrayHID.setWaiting();
      break;
    case '/respeaker/pixels/color':
      console.log("Color");
      ReSpeakerMicArrayHID.setLedColor(5, 5, 5)
      break;
    case '/respeaker/pixels/listen':
      console.log("Listen");
      ReSpeakerMicArrayHID.setListening();
      break;
    case '/respeaker/pixels/status':
      console.log("Status");
      var status = {
        reg: 1,
        reg2: 2
      };
      client.publish('/respeaker/pixels/messages', JSON.stringify(status));
      break;
    case '/respeaker/pixels/test':
        console.log("test");
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
        var devs = hid.devices();
        console.log(devs);
        client.publish('/respeaker/pixels/messages', JSON.stringify(devs));
        // run through a test cycle
        
        break;
    default:
      console.log("Default - no handler");
  }
})

//var args = process.argv.splice(2);


hid.setDriverType("libusb");
var device = new hid.HID(0x2886, 0x0007);
var addr = 0;
var data = new Array();
var length = 0;
var reportID = 0x00;
var REG_NUM = 0X46;

console.log(device);

var ReSpeakerMicArrayHID = {
  // Pixel ring modes
  LEDMODES: {
    OFF: 0, // All LEDs set to 0 and off
    COLOR: 1, // All LEDs single color
    LISTENING: 2, // Listen mode, indicating sound direction
    WAITING: 3, // Rotating green
    SPEAKING: 4, // Strength & direction
    VOLUME: 5, // Volume control, green
    LED_DATA: 6, // ???
    VOICE_LOCATION: 7 // ???
  },

  //
  setLedMode: function(mode, data1, data2, data3) {
    /*
    [ reportID, 0x00, 0x00, 0x04, 0x00 //address and length
    , mode, data1, data2, data3 //data0~3
    ]
    */
    device.write([reportID, 0x00, 0x00, 0x04, 0x00, mode, data1, data2, data3]);
  },

  get_reg_value: function(reg, length) {
    var tmp = [reportID, reg, 0x80, length, 0, 0, 0];
    device.write(tmp);
    tmp = device.readSync();
    console.log(tmp[0].toString(16), ",", tmp[1].toString(16), ",", tmp[2].toString(16), ",", tmp[3].toString(16), ",", tmp[4].toString(16), ",", tmp[5].toString(16), ",", tmp[6].toString(16), ",", tmp[7].toString(16));
  },

  set_reg_value: function(reg, length, arr) {
    var tmp = [reportID, reg, 0, length, 0, arr[0], arr[1], arr[2], arr[3]];
    device.write(tmp);
  },

  getAllData: function() {
    for (var i = 0; i < REG_NUM; i++) {
      this.get_reg_value(i, 4);
    }
  },

  setLedOff: function() {
    this.setLedMode(LEDMODES.OFF, 0, 0, 0);
  },

  setLedColor: function(r, g, b) {
    this.setLedMode(LEDMODES.COLOR, b, g, r);
  },

  setListening: function() {
    this.setLedMode(LEDMODES.LISTENING, 0, 0, 0);
  },

  setWaiting: function() {
    this.setLedMode(LEDMODES.WAITING, 0, 0, 0);
  },

  setSpeaking: function(level) {
    this.setLedMode(LEDMODES.SPEAKING, level, 0, 0);
  },

  setVolume: function(volumeLevel) {
    this.setLedMode(LEDMODES.VOLUME, 0, 0, volumeLevel);
  },

  setLedData: function() {
    this.setLedMode(LEDMODES.LED_DATA, 0, 0, 0);
  },

  setVoiceLocation: function() {
    this.setLedMode(LEDMODES.VOICE_LOCATION, 0, 0, 0);
  },

}

//module.exports.ReSpeakerMicArrayHID=ReSpeakerMicArrayHID

/*
ReSpeakerMicArrayHID.set_led_all_color(2,0xef,0xfd);

*/

/*
if(!args || args.length ==0){
    console.log("params error");
}
else{
	var command = args.toString();
    if(command==="getall")
    {
        console.log(args)
        ReSpeakerMicArrayHID.get_all_data();
    }
    else
    {
        addr = parseInt(args[0]);
        length = parseInt(args[1]);
        var value = parseInt(args[2]);
        data = [(value & 0xff), ((value>>8) & 0xff), ((value>>16) & 0xff), ((value>>24) & 0xff)];
        ReSpeakerMicArrayHID.set_reg_value(addr,length,data);
        ReSpeakerMicArrayHID.get_reg_value(addr,length);
    }
}
*/
/*
if (!args || args.length == 0) {
  console.log("params error");
} else {
  var command = args[0].toString();
  if (command === "getall") {
    console.log(args)
    ReSpeakerMicArrayHID.get_all_data();
  } else if (command === "get") {
    addr = parseInt(args[1]);
    length = parseInt(args[2]);
    ReSpeakerMicArrayHID.get_reg_value(addr, length);
  } else if (command === "set") {
    addr = parseInt(args[1]);
    length = parseInt(args[2]);
    if (length > 4 || length <= 0 || addr < 0 || addr >= REG_NUM) {
      console.log("params error");
      return;
    }
    var value = parseInt(args[3]);
    data = [(value & 0xff), ((value >> 8) & 0xff), ((value >> 16) & 0xff), ((value >> 24) & 0xff)];
    ReSpeakerMicArrayHID.set_reg_value(addr, length, data);
    ReSpeakerMicArrayHID.get_reg_value(addr, length);
  }
}
*/
