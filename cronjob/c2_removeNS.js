use suricata;
db.dns.remove({"src_ip" : {$in: ["172.16.1.1", "172.16.1.2"]}})
