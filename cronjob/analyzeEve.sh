#!/bin/sh
#set -x
USER=suricataDB
PASSWD=xxxxxxx
appDir=`dirname $0`
logsDir=/var/log/suricata
filteredLogs=/var/log/analyze
db=suricata
dnsColl=dns
alertsColl=alerts
sshColl=ssh
httpColl=http

echo "Удаляем старые коллекции"
/opt/mongodb/bin/mongo -u $USER -p $PASSWD --authenticationDatabase=${db} ${db} < ${appDir}/c1_clearCollections.js

echo "Удаляем старые временные файлы"
find ${filteredLogs} -type f -regextype posix-awk -regex "(.*)/eve.json(\.[0-9]+)?" -exec rm {} \;

echo ""
logs=`find ${logsDir} -maxdepth 1 -type f -regextype posix-awk -regex "(.*)/eve.json(\.[0-9]+)?" | sort `
#nums=`echo $logs | wc -w`	# загружаем всё
nums=2	# загружаем только последние два отчёта
i=1
while [ $i -le $nums ]; do
  logFile=`echo ${logs} | cut -d ' ' -f $i `
  dnsLogs=${filteredLogs}/dns.`basename ${logFile}`
  alertsLogs=${filteredLogs}/alerts.`basename ${logFile}`
  sshLogs=${filteredLogs}/ssh.`basename ${logFile}`
  httpLogs=${filteredLogs}/http.`basename ${logFile}`
  echo "Выполняем фильтрацию записей в файле: $logFile"
  grep -i -P '"rrtype":"A+"'     ${logFile} | tr [:upper:] [:lower:] > ${dnsLogs}
  #grep '"event_type":"alert"' ${logFile} > ${alertsLogs}
  grep '"event_type":"ssh"'   ${logFile} > ${sshLogs}
#  grep '"event_type":"http"'  ${logFile} > ${httpLogs}
  echo ""
  echo "Импортируем записи в MongoDB: ${logFile}"
  /opt/mongodb/bin/mongoimport -u $USER -p $PASSWD --authenticationDatabase=${db} --db ${db} --collection ${dnsColl}    --file ${dnsLogs}
#  /opt/mongodb/bin/mongoimport -u $USER -p $PASSWD --authenticationDatabase=${db} --db ${db} --collection ${alertsColl} --file ${alertsLogs}
  /opt/mongodb/bin/mongoimport -u $USER -p $PASSWD --authenticationDatabase=${db} --db ${db} --collection ${sshColl}    --file ${sshLogs}
#  /opt/mongodb/bin/mongoimport -u $USER -p $PASSWD --authenticationDatabase=${db} --db ${db} --collection ${httpColl}   --file ${httpLogs}
  echo ""
  i=$(($i + 1))
done

echo "Удаляем временные файлы"
find ${filteredLogs} -type f -regextype posix-awk -regex "(.*)/(dns|alerts|ssh|http)\.eve\.json(\.[0-9]+)?" -exec rm {} \;

echo ""
echo "Удаляем записи dns от серверов DNS"
/opt/mongodb/bin/mongo -u $USER -p $PASSWD --authenticationDatabase=${db} ${db} < ${appDir}/c2_removeNS.js

echo ""
echo "Считаем список наиболее частых DNS запросов"
/opt/mongodb/bin/mongo -u $USER -p $PASSWD --authenticationDatabase=${db} ${db} < ${appDir}/w1_topQueries.js

echo ""
echo "Считаем список наиболее частых доменов в DNS запросах"
/opt/mongodb/bin/mongo -u $USER -p $PASSWD --authenticationDatabase=${db} ${db} < ${appDir}/w2_topDomains.js

echo ""
echo "Группируем записи по источнику ip"
/opt/mongodb/bin/mongo -u $USER -p $PASSWD --authenticationDatabase=${db} ${db} < ${appDir}/g1_ipGrpDNS.js
/opt/mongodb/bin/mongo -u $USER -p $PASSWD --authenticationDatabase=${db} ${db} < ${appDir}/g2_statistics.js

echo "Создаём отчёт"
curl -k 'https://127.0.0.1:3000/filterRecords' --data 'filterName=dns'
curl -k 'https://127.0.0.1:3000/filterRecords' --data 'filterName=random15'
