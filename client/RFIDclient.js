let rc522 = require("rc522");     // RFID Reader Module
let wpi = require('wiring-pi');   // Raspberry PI GPIO Module
let jnet = require('./json_net');

let client = jnet.JSONSocket();
let port = '8080';
let server = '192.168.1.8';
let host = "::ffff:" + client.address().address;  //IPv6
//let host = client.address().address;            //IPv4

let event_num = 0;
let event_log = [] ;

let rfid_num = "";
let rfid_read_time = 0;

console.log("Ready to Read RFID Tags");

wpi.setup('wpi');
// Button
let button_pin = 4;
wpi.pinMode(button_pin, wpi.INPUT);
wpi.pullUpDnControl(button_pin, wpi.PUD_UP);
let time_dur = 0;
let timer_start = 0;
let first = 0; // This is needed so first button press isn't filtered by debounce
// LED
let led_pin = 0;
wpi.pinMode(led_pin, wpi.OUTPUT);
wpi.pullUpDnControl(led_pin, wpi.PUD_DOWN);


// RFID Reader
rc522(function(rfidSerialNumber){
  rfid_num = rfidSerialNumber;
  rfid_read_time = Math.floor(new Date() / 1000);
  rfid_num = rfid_num.replace("InitRc522",""); // TODO fix this
  console.log("\nRFID Tag found: " + rfid_num);

  // Blink LED once to indicate Tag Found
  wpi.digitalWrite(led_pin,wpi.HIGH);
  wpi.delay(200);
  wpi.digitalWrite(led_pin,wpi.LOW);

});


// Detect button press and release
wpi.wiringPiISR(button_pin, wpi.INT_EDGE_BOTH  , function(delta) {
  if (delta > 50000 || first == 0){         // Debounce 50ms
    let pin = wpi.digitalRead(button_pin);  // On press begin timing
    if (pin == 0){
      timer_start = Math.floor(new Date() / 1000);
    }
    else {                                  // On release
      first = 1;
      time_dur = Math.floor(new Date() / 1000) - timer_start; // Calc duration
      console.log("Time button down: " + time_dur);
      console.log("Last RFID read was: " + rfid_num);
      if(rfid_num === '' || rfid_read_time <= 0){ // Check if a tag was found
        console.log("Error no tag read");
      }
      // Ensure tag was read close to when button was pressed.
      else if ( Math.abs( rfid_read_time - (Math.floor(new Date() / 1000) - time_dur) ) < 10 ){
        // Add event to event_log
        event_log.push({ "command": "put_rfid", "device_id": "PI_01",
                         "rfid_tag_id": rfid_num, "duration": time_dur,
                         "date_time": rfid_read_time });
        console.log(event_log);
        // Clear data
        time_dur = 0;
        rfid_num = '';
        rfid_read_time = 0;
      }
      else{
        console.log("Error, RFID Tag not read with button press");
      }
    }
    console.log("button " + pin);
  }
});


// Periodically send event_log data to server
setInterval(function () {
    if (event_log.length > 0){
      console.log("Sending Data");
      client.connect(port, server);
    }
    else{
      console.log("No Data to Send");
    }
}, (30 * 1000) );


// When connected to server log tag
client.on('connect', function () {

  console.log("Connected to: " + server + " on port: " + port);

  // Set pointer to 0
  event_num = 0;

  // Add get all method to commnds to send
  event_log.push({ "command": "get_rfid", "device_id": "PI_01"});
  // Add command to end connection at end of list
  event_log.push({ "command": "end" });

  // Start connection with handshake
  client.jwrite({ "command": "ee590" });
});


// On server response print response and repond with new messsage
client.on('json', function (object) {

  console.log(JSON.stringify(object)); // Print result recieved

  // If the server responds that data has been logged, request it back to check it.
  if (object.result === 'logged' && object.eventId !== undefined){
    client.jwrite({"command": "get_rfid", "device_id": "PI_01" ,"eventID": object.eventId});
  }
  else{
    // If server responses with requested data, check it matches the data requested.
    if(object.result === 'retrieved'){
      if (object.data.device_id === "PI_01" &&
          object.data.rfid_tag_id === event_log[event_num].rfid_tag_id &&
          object.data.duration === event_log[event_num].duration  &&
          object.data.date_time === event_log[event_num].date_time ){
        console.log("Data is correct");
        event_num += 1;
      }
      else {
        // TODO decide how to correct an error
        console.log("Error data logged incorrectly");
        event_num += 1;
      }
    }
    // If server is retrieving "all events" for that device, display them
    else if(object.result === 'all events'){
      event_num += 1;
    }
    // If server has sucessfully closed the connection, clear the event log
    else if (object.message === 'goodbye'){
      event_log = [];
    }
    // Write next command
    if (object.message !== 'goodbye' && event_num < event_log.length) {
      client.jwrite(event_log[event_num]);
    }
  }
});


client.on('error', function (err) {
  throw err;
});
