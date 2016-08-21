"use strict";
var checkAuth = require('./lib/checkAuth');
var async = require('async');
var mongoose = require('mongoose');
var models = require('./models');
var dnsModel=models.dnsModel;
var filteredReports=models.filteredReportsModel;
var statistics=models.statisticsModel;

module.exports = function(app){

  //////////////////////////////////////////////////////////////////////////////////////////
  app.post('/search', checkAuth, function(req, res) {
    if (req.body&&req.body.srcip)    {res.redirect("/search/srcip/" + req.body.srcip)};
    if (req.body&&req.body.rrname)   {res.redirect("/search/rrname/" + req.body.rrname)};
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  app.get('/search/srcip/:srcip', checkAuth, function(req, res) {
    let sAMAccountName;
    if (req.user && req.user.displayName) {
      sAMAccountName = req.user.displayName;
    } else {
      if (req.session && req.session.username) sAMAccountName = req.session.username;
    };

    var srcip=req.params.srcip;
    async.parallel([
      function(callback){
        dnsModel.find({"src_ip": srcip})
          .select("timestamp dest_ip dns.rrname dns.rrtype")
          .sort("timestamp")
          .exec(callback);
      },
      function(callback){
        statistics.findOne().exec(callback);
      }
    ],
    function (err, results){
      if (err) throw err;
      res.render("searchSRCIP", {
        "title":    "DNS запросы с адреса " + srcip,
        "records":  results[0],
        "dbStats":  results[1],
        "session":  sAMAccountName,
        "authType": req.session.authType
      });
    })
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  app.get('/search/rrname/:rrname', checkAuth, function(req, res) {
    let sAMAccountName;
    if (req.user && req.user.displayName) {
      sAMAccountName = req.user.displayName;
    } else {
      if (req.session && req.session.username) sAMAccountName = req.session.username;
    };

    var rrname=req.params.rrname;
    async.parallel([
      function(callback){
        dnsModel.find({"dns.rrname": {$regex: new RegExp(rrname, "i") }})
          .select("timestamp src_ip dest_ip dns.rrtype")
          .exec(callback);
      },
      function(callback){
        statistics.findOne().exec(callback);
      }
    ],
    function (err, results){
      if (err) throw err;
      var sortRecords = results[0].sort(
        function(a,b) {
          if ( a.timestamp <  b.timestamp) { return -1 };
          if ( a.timestamp == b.timestamp) { return  0 };
          if ( a.timestamp >  b.timestamp) { return  1 };
        }
      );
      res.render("searchRRNAME", {
        "title":    "DNS запросы, содержащие \"" + rrname + "\"",
        "records":  sortRecords,
        "dbStats":  results[1],
        "session":  sAMAccountName,
        "authType": req.session.authType
      });
    })
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  app.post('/report', checkAuth, function(req, res) {
    let sAMAccountName;
    if (req.user && req.user.displayName) {
      sAMAccountName = req.user.displayName;
    } else {
      if (req.session && req.session.username) sAMAccountName = req.session.username;
    };

    var reportIP = req.body.reportIP;
    var filterName = req.body.filterName;
// db.filteredReports.aggregate([{$unwind: "$hosts"}, {$match: {"filterName" : "random15", "hosts._id": "192.168.1.172"} }, { $project: {"minDate":1 , "maxDate":1, "created":1, "rrnames": "$hosts.rrnames" } } ]);

    filteredReports.aggregate([
      {$match: {"filterName" : filterName} },
      {$unwind: "$hosts"},
      {$match: {"filterName" : filterName, "hosts._id": reportIP} },
      {$project: {"minDate":1 , "maxDate":1, "created":1, "rrnames": "$hosts.rrnames"} },
      {$sort: { "created": -1 } }],
      function(err, result) {
        if (err) throw err;
        res.render("reportIP", {
          "title":      "DNS запросы с адреса " + reportIP,
          "filterName": filterName,
          "records":    result,
          "session":    sAMAccountName
        });
      }
    );
  });
}
