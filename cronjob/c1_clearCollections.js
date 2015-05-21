use suricata;
db.dbStats.update({}, {$set : {'importing': true}});
db.dns.drop();
db.ipGrpDNS.drop();
db.topQueries.drop()
db.topDomains.drop();
