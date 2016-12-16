let jnet = require('./json_net');
let server = new jnet.JSONServer();

let sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('tracker.db');


server.on('json_connection', function (jsocket) {

  console.log('Connected to new client ' + JSON.stringify(jsocket.remoteAddress));
  let ip = jsocket.remoteAddress;

  let handshake = false;

  let responses = {

    put_rfid: function put_rfid(object) {
      console.log("put_rfid");

      let rfid_tag = object.rfid_tag_id;
      let dev_id = object.device_id;
      let dur = object.duration;
      let dt = object.date_time;

      // Check data is of expected types
      if (!(typeof rfid_tag === 'string')) {
        jsocket.jwrite({ error: "RFID value must be a string" });
      }
      else if (!(typeof dev_id === 'string')) {
        jsocket.jwrite({ error: "Device ID must be a string" });
      }
      else if (dt <= 0 || !(typeof dt === 'number')) {
        jsocket.jwrite({ error: "Timestamp is invalid" });
      }
      else if (dur <= 0 || !(typeof dur === 'number')) {
        jsocket.jwrite({ error: "Duration is invalid" });
      }
      else {
        let time_rec = Math.floor(new Date() / 1000);
        let event_id = 0;
        db.each("SELECT event_id FROM events ORDER BY event_id desc LIMIT 1",
        function(err, row) {
          event_id = row.event_id + 1;
        },
        function(err, rows) {
          if (rows === 0) {
            event_id = 0
          }
          db.run("INSERT into events(event_id, date_time, time_received, duration, device_id, rfid_tag_id) \
                                VALUES (?, ?, ?, ?, ?, ?)", [event_id, dt, time_rec, dur, dev_id, rfid_tag]);
          jsocket.jwrite({ result: "logged", eventId: event_id });
        });
      }
    },

    get_rfid: function get_rfid(object) {
      console.log("Get RFID");

      // Check all object values are of the correct type
      if ("device_id" in object && typeof object.device_id !== 'string') {
        jsocket.jwrite({ error: "Device ID must be a string" });
      }
      else if ("eventID" in object && typeof object.eventID !== 'number') {
        jsocket.jwrite({ error: "Event ID must be a number" });
      }
      // Return single event requested
      else if (typeof object.device_id === 'string' && typeof object.eventID === 'number') {
        console.log("Getting Specified Event for Device");
        // Find and send event for device ID
        let query_str = "SELECT * FROM events WHERE \
                         device_id = '" + object.device_id + "' and\
                         event_id = '" + object.eventID +"'";
        db.each(query_str,
        function(err, row) {
          jsocket.jwrite({"result":"retrieved", "data":row});
        },
        function(err, rows) {
          if (rows === 0 ){
            jsocket.jwrite({"error":"no data found"});
          }
        });
      }
      // Return all events for device
      else if (typeof object.device_id === 'string') {
        console.log("Getting All Events for Device");
        // Find and send all events for device ID
        let query_str = "SELECT *, rowid AS id FROM events WHERE device_id = '"  + object.device_id + "'";
        let data = {};
        db.each(query_str,
          function(err, row) {
            data[row.id] = row;
          },
          function(err, rows) {
            if (rows === 0 ){
              jsocket.jwrite({"error":"no data found"});
            }
            else {
              jsocket.jwrite({"result":"all events", "data":data});
            }
          });
      }
    }
  };

  jsocket.on('json', function (object) {

    console.log("Recieved object: " + JSON.stringify(object));

    if (object.command == "end") {
      console.log("Disconnecting from " + JSON.stringify(jsocket.remoteAddress) + "\n");
      jsocket.jwrite({ message: "goodbye" });
      //db.close();
      jsocket.end();
    }
    else if (object.command == "ee590") {
      console.log("Handshake with: " + ip);
      handshake = true;
      jsocket.jwrite({ message: "Greetings" });
    }
    else if (responses[object.command] && handshake) {
      responses[object.command](object);
    }
    else if (handshake) {
      jsocket.error("Unknown command '" + object.command + "'");
    }
    else {
      jsocket.jwrite({ error: "not yet acquainted" });
    }
  });

  jsocket.on('timeout', function () {
    jsocket.jwrite({ message: 'goodbye' });
    jsocket.end();
  });

  jsocket.on('json_error', function (err) {
    jsocket.jwrite({ error: err.message });
  });

  //jsocket.setTimeout(5 * 60 * 1000);
});

server.on('error', function (err) {
  throw err;
});

server.listen(8080, function () {
  console.log('server bound');
});
