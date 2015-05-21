use suricata;
db.dns.aggregate([
{ $group: {_id: "$src_ip", queries: { $sum: 1 }, "rrnames": { $addToSet: { $toLower:  "$dns.rrname"} } }},
{ $sort: { queries: -1 } },
{ $out : "ipGrpDNS" }
]);
