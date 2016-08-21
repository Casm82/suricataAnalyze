module.exports = function(filteringStatus, filterName, login){
  var mongoose = require('mongoose');
  var models = require('./models'),
    ipGrpDNS=models.ipGrpDNSModel,
    filtersList=models.filtersListModel,
    statistics=models.statisticsModel,
    filteredReports=models.filteredReportsModel;

  // Получаем отчёты по ip адресам
  ipGrpDNS.find({}, function (err, ipReports) {
    if (err) return err;

  // Получаем фильтры
  filtersList.findById(filterName, function (err, filterLists) {
    if (err) return err;

    var whiteDomains=filterLists.whiteDomains.
      filter(function(elm) {return elm}).
      sort();

    var registeredComputers=filterLists.registeredComputers.
      filter(function(elm) {return elm}).
      sort();

    var regexpList=filterLists.regexpLists.
      filter(function(elm) {return elm}).
      sort();

    // Фильтрово-сортировочный отчёт
    var queriesReport={
        "hosts":    [],
        "filterName":  filterName,
        "creator":    login,
        "created":    Date.now()
      };

    // Фильтруем записи по белому списку
    ipReports.forEach(function(query){
      // query: {"_id" : "172.16.1.1",
      //         "queries" : 341100,
      //         "rrnames" : [ "jabber.company.ru", "www.squid-cache.org" ]}
      // приводим адрес к формату: 123.12.34.123 -> 123.012.034.123
      var a=query._id.split(".");
      for (var n=0; n < a.length; n++) {
        switch (a[n].length) {
          case 2: a[n]="0" + a[n]; break;
          case 1: a[n]="00" + a[n]; break;
        }
      }
      var srcIp=a.join(".");
      var record={"_id": query._id, "srcIp": srcIp, "queries": query.queries , "rrnames": [] };
      // Фильтруем rrnames
      query.rrnames.forEach(function(hostname){
        // Убираем company.ru, пробелы и \\
        var fixedName=hostname.toLowerCase().
            replace(/(\.)?company\.ru/g,"").
            replace(/\\{2,}/,"").
            trim();
        var notInDNS=(registeredComputers.indexOf(fixedName) == -1);
        // Пытаемся разбить оставшуюся часть на домены
        var b=fixedName.split('.');
        //var dom2=b[b.length-2]||b[b.length-1];  // google
        var dom2=b[b.length-2];  // google
        // если есть dom2, то проверяем по белому списку
        var notInWhiteList=dom2?(whiteDomains.indexOf(dom2) == -1):true;
        var notInRegexpList = true;
        regexpList.forEach(function(regexpElm) {
          var regexp = new RegExp(regexpElm);
          if (fixedName.match(regexp)) { notInRegexpList = false };
        })
  /*
  console.log("\nfixedName: %s", fixedName);
  console.log("notInDNS: %j", notInDNS);
  console.log("notInWhiteList: %j", notInWhiteList);
  console.log("notInRegexpList: %j", notInRegexpList);
  */
        // Уникальные записи, прошедшие фильтр, помещаем в массив rrnames
        if (fixedName && notInDNS && notInWhiteList && notInRegexpList) {
          if (record.rrnames.indexOf(fixedName) == -1) {
            record.rrnames.push(fixedName);
          }
        }
      });

      // Если есть уникальные записи, то сохраняем
      if (record.rrnames.length) {
        record.rrnames=record.rrnames.sort();
        queriesReport.hosts.push(record);
      }

    }); // <--- всё записи об источниках dns запросов обработаны
  // Сортируем записи
  function sortRecords(n,m){
    if (n.srcIp < m.srcIp)  { var result=-1};
    if (n.srcIp == m.srcIp) { var result=0};
    if (n.srcIp > m.srcIp)  { var result=1};
    return result;
  };
  queriesReport.hosts.sort(sortRecords);
  queriesReport.hostsLength=queriesReport.hosts.length;

  // Вставляем в отчёт данные о периоде сбора данных
  statistics.findOne({}, function(err, statsRecord){
    queriesReport.minDate=statsRecord.minDate;
    queriesReport.maxDate=statsRecord.maxDate;
    queriesReport.numRecords=statsRecord.numRecords;

    // Сохраням отчёт в БД
    var dbRecord = new filteredReports(queriesReport);
    dbRecord.save(function(err, doc) {
      if (err) throw err;
//      console.log("Records filtered and saved in MongoDB.\n")
      filteringStatus.emit("completed", doc._id);
    });
  });

  });  // <--- фильтры
  });  // <--- отчёты
}
