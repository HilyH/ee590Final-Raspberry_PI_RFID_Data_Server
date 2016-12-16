
let jnet = require('./json_net');
let client = jnet.JSONSocket();
let port = process.argv[3];
let server = process.argv[2];
let host = "::ffff:" + client.address().address;  //IPv6
//let host = client.address().address;            //IPv4

let event_num = 0;
let event_log = [] ;

let tags = ["b64fde44","b630e744","d69c4845","16f7b448","3686d146","6d1b2b2b"];
let deviceID = "PC_01";

console.log("Demo Running");

// Randomly create faux tag reads
function createFauxTags() {
  console.log("Creating faux tag...");
  var tag = tags[Math.floor(Math.random() * 6) ]
  console.log("RFID Tag found: " + tag);
  var duration = Math.floor(Math.random() * 10000);
  console.log("Time button down: " + duration);
  event_log.push({ "command": "put_rfid", "device_id": deviceID,
                   "rfid_tag_id": tag, "duration": duration,
                   "date_time": Math.floor(new Date() / 1000) });
  console.log(event_log);
}

(function loop() {
    var rand = Math.round(Math.random() * ( 60 * 1000 ) + 1000 );
    console.log("Tag will be created in " + rand/1000 + "s");
    setTimeout(function() {
            createFauxTags();
            loop();
    }, rand);
}());

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
    client.jwrite({"command": "get_rfid", "device_id": deviceID ,"eventID": object.eventId});
  }
  else{
    // If server responses with requested data, check it matches the data requested.
    if(object.result === 'retrieved'){
      if (object.data.device_id === deviceID &&
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
