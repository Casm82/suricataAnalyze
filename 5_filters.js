module.exports = function(app){
var checkAuth = require('./lib/checkAuth');
var filterLib = require('./filterRecords');

var models = require('./models'),
	ipGrpDNS=models.ipGrpDNSModel,
	statistics=models.statisticsModel,
	filtersList=models.filtersListModel,
	filteredReports=models.filteredReportsModel,
	topQueries=models.topQueriesModel,
	topDomains=models.topDomainsModel;

	//////////////////////////////////////////////////////////////////////////////////////////
	app.get('/editFilters/:filterName', checkAuth, function(req, res) {
		var filterName=req.params.filterName;
		filtersList.findById(filterName, function (err, filter) {
			if (err) return err;
			res.render("editFilters", 
				{ "title": "Редактирование фильтров", 
				  "filter": filter,
				  "session": req.session.user
				});
		});
	});

	//////////////////////////////////////////////////////////////////////////////////////////
	app.post('/editFilters/', checkAuth, function(req, res) {
		var filterName=req.body.filterName;
		if (filterName) { // <--- если фильтры существуют
			filtersList.findById(filterName, function (err, filter) {
				if (err) return err;
				res.render("editFilters", 
					{ "title": "Редактирование фильтров", 
					  "filter": filter,
					  "session": req.session.user
					});
			});
		} else {
			var filter = {
				"_id":			 "default",
				"registeredComputers":	[],
				"whiteDomains":			[],
				"excludeChrome":	false,
				"excludePrinters":	false,
				"excludeXerox":		false,
			};
			res.render("editFilters", 
				{ "title": "Редактирование фильтров", 
				  "filter":				filter,
				  "session":			req.session.user,
				});
		}
	});

	//////////////////////////////////////////////////////////////////////////////////////////
	app.post('/saveFilter', checkAuth, function(req, res) {
		var registeredComputers=req.body.registeredComputers.
			replace(/\r\n/g,";").toLowerCase().split(";").
			filter(function(elm) {return elm && !elm.match(/\s/)}).
			sort();
		
		var whiteDomains=req.body.whiteDomains.
			replace(/\r\n/g,";").toLowerCase().split(";").
			filter(function(elm) {return elm && !elm.match(/\s/)}).
			sort();
	
		var filterName=req.body.filterName.trim().replace(/\s/g,"_");
	
		var filterRecord = {"_id": 			filterName, 
					"whiteDomains":			whiteDomains,
					"registeredComputers":	registeredComputers,
					"excludeChrome":		Boolean(req.body.excludeChrome)||false,
					"excludePrinters":		Boolean(req.body.excludePrinters)|false,
					"excludeXerox":			Boolean(req.body.excludeXerox)||false,
					"date": Date.now() };
	
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
		var filterName = req.body.filterName;
		var userLogin = req.session.user.username;

		var EventEmitter = require('events').EventEmitter;
		var filteringStatus = new EventEmitter();
		
		filterLib(filteringStatus, filterName, req.session.user.username);
		filteringStatus.on("completed", function(id) {
/*			res.render("filterRecords", 	// console 
				{  "title": "Фильтрация записей об обращении к DNS"}); */
			res.redirect("/viewReport/"+id);
		});
	});
}
