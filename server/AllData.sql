/*
 cat AllData.sql | sqlite3 .\tracker.db
*/
.headers on
.mode column
select *
from events
inner join rfid_tags on events.rfid_tag_id=rfid_tags.rfid_tag_id
inner join devices on events.device_id=devices.device_id
;
