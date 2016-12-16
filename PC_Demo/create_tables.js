var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('demotracker.db');
// Create Tables
db.serialize(function() {
  db.run("CREATE TABLE if not exists rfid_tags (\
              rfid_tag_id TEXT PRIMARY KEY,\
              description TEXT,\
              location TEXT)");
  db.run("CREATE TABLE if not exists devices (\
              device_id TEXT PRIMARY KEY,\
              description TEXT,\
              owner TEXT)");
  db.run("CREATE TABLE if not exists events (\
              event_id INTEGER PRIMARY KEY,\
              date_time INTEGER NOT NULL,\
              time_received INTEGER NOT NULL,\
              duration INTEGER NOT NULL,\
              device_id TEXT NOT NULL,\
              rfid_tag_id TEXT NOT NULL,\
              FOREIGN KEY(device_id) REFERENCES devices(device_id),\
              FOREIGN KEY(rfid_tag_id) REFERENCES rfid_tags(rfid_tag_id)\
              )");

  // Device Table
  db.run("INSERT into devices(device_id, description, owner) \
                      VALUES (?, ?, ?)", ['PC_01', 'PC running demo software', 'Hily']);
  // RFID Tag Table
  db.run("INSERT into rfid_tags(rfid_tag_id, description, location) \
                        VALUES (?, ?, ?)", ['b64fde44', 'Food/Eating', 'kitchen']);
  db.run("INSERT into rfid_tags(rfid_tag_id, description, location) \
                        VALUES (?, ?, ?)", ['b630e744', 'Fun', 'Office']);
  db.run("INSERT into rfid_tags(rfid_tag_id, description, location) \
                        VALUES (?, ?, ?)", ['d69c4845', 'Chores', 'None']);
  db.run("INSERT into rfid_tags(rfid_tag_id, description, location) \
                        VALUES (?, ?, ?)", ['16f7b448', 'Homework', 'Office']);
  db.run("INSERT into rfid_tags(rfid_tag_id, description, location) \
                        VALUES (?, ?, ?)", ['3686d146', 'Workout', 'Living Room']);
  db.run("INSERT into rfid_tags(rfid_tag_id, description, location) \
                        VALUES (?, ?, ?)", ['6d1b2b2b', 'Reading', 'Bedroom']);
});

db.close();
