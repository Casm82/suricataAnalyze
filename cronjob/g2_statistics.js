use suricata;

db.dns.aggregate([
{ $group: {_id: null, "minDate": {$min: "$timestamp"}, "maxDate": {$max: "$timestamp"}, "numRecords": {$sum: 1} }},
{ $project: { _id: false, "minDate": true, "maxDate": true, "numRecords": true } },
{ $out : "tmpDBStats" }
]);

var tmpStats = db.tmpDBStats.findOne();
var dbStatsRecord= {
	"_id": tmpStats._id,
	"minDate": new Date(tmpStats.minDate.replace("t"," ")),
	"maxDate": new Date(tmpStats.maxDate.replace("t"," ")),
	"numRecords": tmpStats.numRecords
}

db.dbStats.drop();
db.dbStats.insert(dbStatsRecord);
db.tmpDBStats.drop();
