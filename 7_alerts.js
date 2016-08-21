"use strict";
var checkAuth = require('./lib/checkAuth');
var models = require('./models');
var alerts = models.alertsModel;

module.exports = function(app){

  //////////////////////////////////////////////////////////////////////////////////////////
  app.get('/viewAlerts.:ext', checkAuth, function(req, res) {
    let sAMAccountName;
    if (req.user && req.user.displayName) {
      sAMAccountName = req.user.displayName;
    } else {
      if (req.session && req.session.username) sAMAccountName = req.session.username;
    };

    var ext=req.params.ext;
    if (ext) {
      alerts.aggregate([
        { $group: {_id: {"sig_id": "$alert.signature_id", "sig_txt": "$alert.signature"}, "count": { $sum: 1 }} },
        { $sort: { "count": -1 } }],
        function(err, result) {
          if (err) throw err;
          if (ext == "html") {
            res.render("viewAlerts", {
              "title":    "Предупреждения об аномальной сетевой активности",
              "records":  result,
              "session":  sAMAccountName,
              "authType": req.session.authType
            });
          }
          if (ext == "json") { res.json(result) };
        }
      );
    } else {
      res.status(500).end("Щта?")
    }
  });

  //////////////////////////////////////////////////////////////////////////////////////////
  app.get('/viewAlert/:sigId', checkAuth, function(req, res) {
    let sAMAccountName;
    if (req.user && req.user.displayName) {
      sAMAccountName = req.user.displayName;
    } else {
      if (req.session && req.session.username) sAMAccountName = req.session.username;
    };

    var sigId=req.params.sigId;
    if (sigId) {
      alerts
        .find({"alert.signature_id": sigId})
        .select("alert.signature_id alert.signature timestamp src_ip src_port dest_ip dest_port")
        .exec(function(err, records) {
          if (err) throw err;
          res.render("viewSignature", {
            "title":    "Предупреждения об аномальной сетевой активности",
            "records":  records,
            "session":  sAMAccountName,
            "authType": req.session.authType
          });
        }
      );
    } else {
      res.status(500).end("Щта?")
    }
  });

}
