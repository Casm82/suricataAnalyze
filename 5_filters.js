"use strict";
var checkAuth = require('./lib/checkAuth');
var filterLib = require('./filterRecords');
var models = require('./models');
var ipGrpDNS=models.ipGrpDNSModel;
var statistics=models.statisticsModel;
var filtersList=models.filtersListModel;
var filteredReports=models.filteredReportsModel;
var topQueries=models.topQueriesModel;
var topDomains=models.topDomainsModel;

module.exports = function(app){
  //////////////////////////////////////////////////////////////////////////////////////////
  app.get('/editFilters/:filterName', checkAuth, function(req, res) {
    let sAMAccountName;
    if (req.user && req.user.displayName) {
      sAMAccountName = req.user.displayName;
    } else {
      if (req.session && req.session.username) sAMAccountName = req.session.username;
    };

    var filterName=req.params.filterName;
    filtersList.findById(filterName, function (err, filter) {
      if (err) return err;
      res.render("editFilters", {
        "title":    "Редактирование фильтров",
        "filter":   filter,
        "session":  sAMAccountName,
        "authType": req.session.authType
      });
    });
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  app.post('/editFilters/', checkAuth, function(req, res) {
    let sAMAccountName;
    if (req.user && req.user.displayName) {
      sAMAccountName = req.user.displayName;
    } else {
      if (req.session && req.session.username) sAMAccountName = req.session.username;
    };

    var filterName=req.body.filterName;
    if (filterName) { // <--- если фильтры существуют
      filtersList.findById(filterName, function (err, filter) {
        if (err) return err;
        res.render("editFilters", {
          "title":    "Редактирование фильтров",
          "filter":   filter,
          "session":  sAMAccountName,
          "authType": req.session.authType
        });
      });
    } else {
      var filter = {
        "_id":                  "default",
        "registeredComputers":  [],
        "whiteDomains":         [],
        "regexpLists":          [],
      };
      res.render("editFilters", {
        "title":   "Редактирование фильтров",
        "filter":   filter,
        "session":  sAMAccountName,
        "authType": req.session.authType
      });
    }
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  app.post('/saveFilter', checkAuth, function(req, res) {
    var registeredComputersArr=req.body.registeredComputers.
      replace(/\r\n/g,";").toLowerCase().split(";").
      filter(function(elm) {return elm && !elm.match(/\s/)}).
      sort();

    var whiteDomainsArr=req.body.whiteDomains.
      replace(/\r\n/g,";").toLowerCase().split(";").
      filter(function(elm) {return elm && !elm.match(/\s/)}).
      sort();

    var regexpArr=req.body.regexpLists.
      replace(/\r\n/g,";").toLowerCase().split(";").
      filter(function(elm) {return elm && !elm.match(/\s/)}).
      sort();

    // Возвращает уникальный массив
    function uniqArray(a) {
      var b = [];
      if (a && a.length) {
        a.forEach(function(elm) {
          if (b.indexOf(elm) == -1 ) {b.push(elm)}
        })
      }
      return b;
    }

    var registeredComputers = uniqArray(registeredComputersArr);
    var whiteDomains = uniqArray(whiteDomainsArr);
    var regexpLists = uniqArray(regexpArr);

    var filterName=req.body.filterName.trim().replace(/\s/g,"_");

    var filterRecord = {
      "_id":                  filterName,
      "whiteDomains":         whiteDomains,
      "registeredComputers":  registeredComputers,
      "regexpLists":          regexpLists,
      "date":                 Date.now()
    };

    filtersList.findByIdAndUpdate(filterName, filterRecord, {upsert: true},
      function(err) {
        if (err) throw err;
        res.redirect("/app");
      });
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  app.post('/deleteFilter', checkAuth, function(req, res) {
    var filterName=req.body.filterName;
    if (filterName == "default") {
      res.status(200).send("<h2>Извините, фильтр default нельзя удалить.</h2>");
    } else {
      filtersList.findByIdAndRemove(filterName,
      function(err) {
        if (err) throw err;
        res.redirect("/app");
      });
    }
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  app.post('/filterRecords', checkAuth, function(req, res) {
    let sAMAccountName;
    if (req.user && req.user.displayName) {
      sAMAccountName = req.user.displayName;
    } else {
      if (req.session && req.session.username) sAMAccountName = req.session.username;
    };

    var filterName = req.body.filterName;
    var userLogin = sAMAccountName;

    var EventEmitter = require('events').EventEmitter;
    var filteringStatus = new EventEmitter();

    filterLib(filteringStatus, filterName, sAMAccountName);
    filteringStatus.on("completed", function(id) {
      res.redirect("/viewReport/"+id);
    });
  });
}
