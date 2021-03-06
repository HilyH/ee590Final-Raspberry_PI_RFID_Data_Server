/*
 cat EventsHomework.sql | sqlite3 .\tracker.db
*/
.headers on
.mode column
select rfid_tags.description, location, date(date_time, 'unixepoch', 'localtime') as "Date",
strftime('%M:%S', CAST((duration) / 86400.0 AS DATETIME))  as "Duration"
from events
inner join rfid_tags on events.rfid_tag_id=rfid_tags.rfid_tag_id
inner join devices on events.device_id=devices.device_id
where rfid_tags.description = "Homework" and Duration > 10
;
