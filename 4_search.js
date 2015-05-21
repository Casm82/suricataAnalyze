module.exports = function(app){
var checkAuth = require('./lib/checkAuth');
var async = require('async');

var mongoose = require('mongoose');
var models = require('./models'),
	dnsModel=models.dnsModel,
	statistics=models.statisticsModel;

	//////////////////////////////////////////////////////////////////////////////////////////
	app.post('/search', checkAuth, function(req, res) {
		console.log(req.body);
		if (req.body&&req.body.srcip) {res.redirect("/search/srcip/" + req.body.srcip)};
		if (req.body&&req.body.rrname) {res.redirect("/search/rrname/" + req.body.rrname)};
	});

	//////////////////////////////////////////////////////////////////////////////////////////
	app.get('/search/srcip/:srcip', checkAuth, function(req, res) {
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
			res.render("searchSRCIP", 
				{ "title": "DNS запросы с адреса " + srcip, 
				  "records": results[0],
				  "dbStats": results[1],
				  "session": req.session.user
				});
		})
	});

	//////////////////////////////////////////////////////////////////////////////////////////
	app.get('/search/rrname/:rrname', checkAuth, function(req, res) {
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
			res.render("searchRRNAME", 
				{ "title": "DNS запросы, содержащие \"" + rrname + "\"",
				  "records": sortRecords,
				  "dbStats": results[1],
				  "session": req.session.user
				});
		})
	});

}
