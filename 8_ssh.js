"use strict";
var checkAuth = require('./lib/checkAuth');
var models = require('./models');
var async = require('async');
var ssh = models.sshModel;

module.exports = function(app){

  //////////////////////////////////////////////////////////////////////////////////////////
  app.get('/viewSSH.:ext', checkAuth, function(req, res) {
    let sAMAccountName;
    if (req.user && req.user.displayName) {
      sAMAccountName = req.user.displayName;
    } else {
      if (req.session && req.session.username) sAMAccountName = req.session.username;
    };

    var ext=req.params.ext;
    if (ext) {
      async.parallel([
        function(callback){
          ssh.aggregate([
            { $group: {_id: "$src_ip", "count": { $sum: 1 }} },
            { $sort: { "count": -1 } }],
            function(err, result) { callback(err, result) }
          );
        },
        function(callback){
          ssh.aggregate([
            { $group: {_id: "$dest_ip", "count": { $sum: 1 }} },
            { $sort: { "count": -1 } }],
            function(err, result) { callback(err, result) }
          );
        },
      ], function (err, resultAsync){
        if (ext == "html") {
          res.render("viewSSH", {
            "title":       "Использование SSH",
            "ssh_clients": resultAsync[0],
            "ssh_servers": resultAsync[1],
            "session":     sAMAccountName,
            "authType":    req.session.authType
          });
        }
        if (ext == "json") { res.json(resultAsync) };
      }
    );  // async
    } else {
      res.status(500).end("Щта?")
    }
  });

}
