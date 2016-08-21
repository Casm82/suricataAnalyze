"use strict";
var checkAuth = require('./lib/checkAuth');
var models = require('./models');
var ipGrpDNS=models.ipGrpDNSModel;
var statistics=models.statisticsModel;
var filtersList=models.filtersListModel;
var filteredReports=models.filteredReportsModel;
var topQueries=models.topQueriesModel;
var topDomains=models.topDomainsModel;

module.exports = function(app){

  //////////////////////////////////////////////////////////////////////////////////////////
  app.get('/viewFullLog.:ext', checkAuth, function(req, res) {
    let sAMAccountName;
    if (req.user && req.user.displayName) {
      sAMAccountName = req.user.displayName;
    } else {
      if (req.session && req.session.username) sAMAccountName = req.session.username;
    };

    var ext=req.params.ext;
    ipGrpDNS.find({}).
      sort({"queries": -1}).
      exec(function (err, records) {
        if (err) return err;
        if (ext == "html") {
          statistics.findOne({}, function(err, dbStats){
            res.render("viewFullLog", {
              "title":   "Все обращения к DNS",
              "records":  records,
              "dbStats":  dbStats,
              "session":  sAMAccountName,
              "authType": req.session.authType
            });
          });
        }
        if (ext == "json") { res.json(records) };
      });
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  app.get('/viewTopQueries.:ext', checkAuth, function(req, res) {
    let sAMAccountName;
    if (req.user && req.user.displayName) {
      sAMAccountName = req.user.displayName;
    } else {
      if (req.session && req.session.username) sAMAccountName = req.session.username;
    };

    var ext=req.params.ext;
    topQueries.find().
      sort({"value": -1}).
      exec(function (err, topQueriesList) {
        if (err) return err;
        if (ext == "html") {
          statistics.findOne({}, function(err, dbStats){
            res.render("viewTop", {
              "title":    "Список наиболее частых DNS запросов", 
              "records":  topQueriesList,
              "dbStats":  dbStats,
              "session":  sAMAccountName,
              "authType": req.session.authType
            });
          });
        }
        if (ext == "json") { res.json(topQueriesList) };
      });
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  app.get('/viewTopDomains.:ext', checkAuth, function(req, res) {
    let sAMAccountName;
    if (req.user && req.user.displayName) {
      sAMAccountName = req.user.displayName;
    } else {
      if (req.session && req.session.username) sAMAccountName = req.session.username;
    };

    var ext=req.params.ext;
    topDomains.find({}).
      sort({"value": -1}).
      exec(function (err, topDomainsList) {
        if (err) return err;
        if (ext == "html") {
          statistics.findOne({}, function(err, dbStats){
            res.render("viewTop", {
              "title":    "Список наиболее частых доменов в DNS запросах", 
              "records":  topDomainsList,
              "dbStats":  dbStats,
              "session":  sAMAccountName,
              "authType": req.session.authType
            });
          });
        }
        if (ext == "json") { res.json(topDomainsList) };
      });
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  app.get('/viewReport/:id', checkAuth, function(req, res) {
    let sAMAccountName;
    if (req.user && req.user.displayName) {
      sAMAccountName = req.user.displayName;
    } else {
      if (req.session && req.session.username) sAMAccountName = req.session.username;
    };

    filteredReports.findById(req.params.id,
      function (err, queriesReport) {

        if (err) return err;
        statistics.findOne({}, function(err, dbStats){
          res.render("viewReport", {
            "title":        "Обращения к DNS", 
            "queriesReport": queriesReport,
            "dbStats":       dbStats,
            "session":       sAMAccountName,
            "authType":      req.session.authType
          });
        });
    });
  });

}
