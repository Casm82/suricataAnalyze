use suricata;
db.dns.remove({"src_ip" : {$in: ["172.16.1.10", "172.16.1.11", "172.16.1.12"]}})
