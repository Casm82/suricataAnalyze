db.dns.aggregate([ 
{ $group: {_id: { $toLower:  "$dns.rrname"} , value: { $sum: 1 } } },
{ $sort: { "value": -1 } },
{ $out : "topQueries" }
]);
