module.exports = function(app){
var checkAuth = require('./lib/checkAuth');

var models = require('./models'),
	ipGrpDNS=models.ipGrpDNSModel,
	statistics=models.statisticsModel,
	filtersList=models.filtersListModel,
	filteredReports=models.filteredReportsModel,
	topQueries=models.topQueriesModel,
	topDomains=models.topDomainsModel;
	
	//////////////////////////////////////////////////////////////////////////////////////////
	app.get('/viewFullLog.:ext', checkAuth, function(req, res) {
		var ext=req.params.ext;
		ipGrpDNS.find({}).
			sort({"queries": -1}).
			exec(function (err, records) {
				if (err) return err;
				if (ext == "html") {
					statistics.findOne({}, function(err, dbStats){
						res.render("viewFullLog",
							{"title": "Все обращения к DNS", 
							 "records": records,
							 "dbStats": dbStats,
					  		 "session": req.session.user
							});
					});
				}
				if (ext == "json") { res.json(records) };
			});
	});

	//////////////////////////////////////////////////////////////////////////////////////////
	app.get('/viewTopQueries.:ext', checkAuth, function(req, res) {
		var ext=req.params.ext;
		topQueries.find().
			sort({"value": -1}).
			exec(function (err, topQueriesList) {
				if (err) return err;
				if (ext == "html") {
					statistics.findOne({}, function(err, dbStats){
						res.render("viewTop", 
							{  "title": "Список наиболее частых DNS запросов", 
							   "records": topQueriesList,
							   "dbStats": dbStats,
					  		   "session": req.session.user
							});
					});
				}
				if (ext == "json") { res.json(topQueriesList) };
			});
	});

	//////////////////////////////////////////////////////////////////////////////////////////
	app.get('/viewTopDomains.:ext', checkAuth, function(req, res) {
		var ext=req.params.ext;
		topDomains.find({}).
			sort({"value": -1}).
			exec(function (err, topDomainsList) {
				if (err) return err;
				if (ext == "html") {
					statistics.findOne({}, function(err, dbStats){
						res.render("viewTop", 
							{  "title": "Список наиболее частых доменов в DNS запросах", 
							   "records": topDomainsList,
							   "dbStats": dbStats,
					  		   "session": req.session.user
							});
					});
				}
				if (ext == "json") { res.json(topDomainsList) };
			});
	});
	
	//////////////////////////////////////////////////////////////////////////////////////////
	app.get('/viewReport/:id', checkAuth, function(req, res) {
		filteredReports.findById(req.params.id,
			function (err, queriesReport) {

				if (err) return err;
				statistics.findOne({}, function(err, dbStats){
					res.render("viewReport", 
						{  "title": "Обращения к DNS", 
						   "queriesReport": queriesReport,
						   "dbStats": dbStats,
						   "session": req.session.user
						});
				});
		});
	});

}
