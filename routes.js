"use strict";
var appSettings = require('./settings.json');
var mongoose = require('mongoose');
var async = require('async');
var checkAuth = require('./lib/checkAuth');
var models = require('./models');
var statistics = models.statisticsModel;
var filtersList = models.filtersListModel;
var filteredReports = models.filteredReportsModel;

module.exports = function(app, io, passport) {

  require('./1_sessions.js')(app, passport);
  require('./2_loadLogs.js')(app, io);
  require('./3_viewReports.js')(app);
  require('./4_search.js')(app);
  require('./5_filters.js')(app);
  require('./6_rest.js')(app);
  require('./7_alerts.js')(app);
  require('./8_ssh.js')(app);

  //////////////////////////////////////////////////////////////////////////////////////////
  app.get('/', checkAuth, function(req, res) {
    let sAMAccountName;
    if (req.user && req.user.displayName) {
      sAMAccountName = req.user.displayName;
    } else {
      if (req.session && req.session.username) sAMAccountName = req.session.username;
    };

    async.parallel([
      function(callback){
        // Получаем статистику записей
        statistics.findOne().exec(callback);
      },

      function(callback){
        // Находим фильтры
        filtersList.find().sort("-date").select("_id").exec(callback);
      },
      function(callback){
        // Считаем количество отчётов
        filteredReports.count().exec(callback);
      }
      ],
      function(err, dbCollections){
        if (err) return err;
        res.render("selectTask",
          { "title": "Анализ DNS запросов",
            "dbStats":     dbCollections[0],
            "filters":     dbCollections[1],
            "numReports":  dbCollections[2],
            "appSettings": appSettings,
            "session":     sAMAccountName,
            "authType":    req.session.authType
          });
      }
    );
  });

  ////////////////////////////////////////////////////////////////////////////////
  app.get("/app", checkAuth, function(req, res) {
    res.redirect("/");
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  app.post('/listReports', checkAuth, function(req, res) {
    var listParam = req.body;
    var pageNum = Number(req.body.pageNum);
    var reportsPerPage = Number(req.body.reportsPerPage);

    //console.log(listParam);
    if (pageNum && reportsPerPage != NaN) {
      // Находим последние отчёты
      filteredReports.find()
        .select("_id hostsLength created filterName creator minDate maxDate numRecords")
        .exec(function(err, result){
          if (err) return err;
          // Сортируем записи в Node.js из-за ограничения памяти в MongoDB
          function sortRecords(n,m){
            if (n.created < m.created)  { var result=1};
            if (n.created == m.created) { var result=0};
            if (n.created > m.created)  { var result=-1};
            return result;
          };

          if (reportsPerPage > 0){
            var resultSlice = result
              .sort(sortRecords)
              .slice(reportsPerPage*(pageNum-1), reportsPerPage*pageNum);
          } else {
            var resultSlice = result.sort(sortRecords);
          }

          //console.log(resultSlice);
          res.render("elmListReports", { "listReports": resultSlice });
        });
    } else {
      res.status(200).send("Не верные параметры запроса");
    }
  });

  ////////////////////////////////////////////////////////////////////////////////////////
  app.use(function (req, res, next) {    // 404s
    if (req.accepts('html')) {
      return res.status(404).send("<h2>Извините, но я не могу найти эту страницу.</h2>");
    }
    if (req.accepts('json')) {
      return res.json({ error: 'Not found' });
    }
    // default response type
    res.type('txt');
    res.status(404).send("Не могу найти страницу.");
  })

  app.use(function (err, req, res, next) {    // 500
    console.error('error at %s\n', req.url, err.stack);
    res.status(500).send("<h2>Обнаружена ошибка в работе сервера. Обратитесь к Администратору.</h2>");
  })

};    // <--- app()
