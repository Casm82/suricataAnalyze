"use strict";
var appSettings = require('./settings.json');
var connect = require('connect');
var models = require('./models');
var statistics=models.statisticsModel;
var ipGrpDNS=models.ipGrpDNSModel;
var topQueries=models.topQueriesModel;
var topDomains=models.topDomainsModel;

module.exports= function(app){

app.use('/rest/', function(req, res, next) {
  console.log("\nREST-запрос c %s", req.ip);
  console.log(req.headers);
  connect.basicAuth(appSettings.basicAuth.user, appSettings.basicAuth.password)(req, res, next);
});

app.use('/rest/', function(req, res, next) {
  statistics.findOne({}, function(err, dbStats) {
    if (dbStats.importing) {
      res.json({"info": "Производится импорт журналов Suricata в БД. Статистика недоступна."})
    } else { next() };
  })
});

app.get('/rest/getFullLog',
  function(req, res) {
  ipGrpDNS.find().
    sort({"queries": -1}).
    exec(function (err, records) {
      if (err) return err;
      if (records) {
        res.json(records)
      } else {
        res.json({"info": "Анализ записей ещё не проводился. Загрузите журналы в БД для анализа - https://172.16.1.1:3000/loadLogs"})
      }
  });
});

app.get('/rest/getTopQueries',
  function(req, res) {
  topQueries.find().
    sort({"value": -1}).
    exec(function (err, records) {
      if (err) return err;
      if (records) {
        res.json(records)
      } else {
        res.json({"info": "Анализ записей ещё не проводился. Загрузите журналы в БД для анализа - https://172.16.1.1:3000/loadLogs"})
      }
  });
});

app.get('/rest/getTopDomains',
  function(req, res) {
  topDomains.find().
    sort({"value": -1}).
    exec(function (err, records) {
      if (err) return err;
      if (records) {
        res.json(records)
      } else {
        res.json({"info": "Анализ записей ещё не проводился. Загрузите журналы в БД для анализа - https://172.16.1.1:3000/loadLogs"})
      }
  });
});

}
