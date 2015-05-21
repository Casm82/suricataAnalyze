#!/bin/sh
#set -x
appDir=`dirname $0`
logsDir=/var/log/suricata
filteredLogs=/var/log/analyze
db=suricata
dnsCollection=dns

echo "Cleaning MongoDB collections"
/opt/mongodb/bin/mongo ${db} < ${appDir}/c1_clearCollections.js

echo "Cleaning old temp logs files"
find ${filteredLogs} -type f -regextype posix-awk -regex "(.*)/eve.json(\.[0-9]+)?" -exec rm {} \;

echo ""
logs=`find ${logsDir} -maxdepth 1 -type f -regextype posix-awk -regex "(.*)/eve.json(\.[0-9]+)?" | sort `
echo $logs
#nums=`echo $logs | wc -w`	# загружаем всё
nums=2	# загружаем только последние два отчёта
i=1
while [ $i -le $nums ]; do
   logFile=`echo ${logs} | cut -d ' ' -f $i `
   filtered=${filteredLogs}/`basename ${logFile}`
   echo "Filtering file: $logFile"
#   grep -P '"rrtype":"A+"' ${logFile} | sed 's/\\u/\\\\u/' | tr [:upper:] [:lower:] > ${filtered}
   grep -P '"rrtype":"A+"' ${logFile} | tr [:upper:] [:lower:] > ${filtered}
   echo ""
   echo "Importing into MongoDB: ${filtered}"
   /opt/mongodb/bin/mongoimport --db ${db} --collection ${dnsCollection} < ${filtered}
   echo ""
   i=$(($i + 1))
done

echo "Cleaning old temp logs files"
find ${filteredLogs} -type f -regextype posix-awk -regex "(.*)/eve.json(-[0-9]+)?" -exec rm {} \;

echo ""
echo "Removing records from name servers"
/opt/mongodb/bin/mongo ${db} < ${appDir}/c2_removeNS.js

echo ""
echo "Calculating top sites"
/opt/mongodb/bin/mongo ${db} < ${appDir}/w1_topQueries.js

echo ""
echo "Calculating top domains"
/opt/mongodb/bin/mongo ${db} < ${appDir}/w2_topDomains.js

echo ""
echo "Grouping dns queries by source ip"
/opt/mongodb/bin/mongo ${db} < ${appDir}/g1_ipGrpDNS.js
/opt/mongodb/bin/mongo ${db} < ${appDir}/g2_statistics.js

echo "Generate report"
curl -k 'https://127.0.0.1:3000/filterRecords' --data 'filterName=dns'
curl -k 'https://127.0.0.1:3000/filterRecords' --data 'filterName=default'
