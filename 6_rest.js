module.exports= function(app){
var appSettings = require('./settings.json');
var connect = require('connect');

var models = require('./models'),
	statistics=models.statisticsModel,
	ipGrpDNS=models.ipGrpDNSModel,
	topQueries=models.topQueriesModel,
	topDomains=models.topDomainsModel;

app.use('/rest/', function(req, res, next) {
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
				res.json({"info": "Анализ записей ещё не проводился. Загрузите журналы в БД для анализа - https://172.10.204.204:3000/loadLogs"})
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
				res.json({"info": "Анализ записей ещё не проводился. Загрузите журналы в БД для анализа - https://172.10.204.204:3000/loadLogs"})
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
				res.json({"info": "Анализ записей ещё не проводился. Загрузите журналы в БД для анализа - https://172.10.204.204:3000/loadLogs"})
			}
	});
});

}
