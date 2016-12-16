/*
*/
.headers on
.mode column
select rfid_tags.description, location,
strftime('%M:%S', CAST(sum(duration) / 86400.0 AS DATETIME))  as "Duration"
from events
inner join rfid_tags on events.rfid_tag_id=rfid_tags.rfid_tag_id
inner join devices on events.device_id=devices.device_id
group by location
;
