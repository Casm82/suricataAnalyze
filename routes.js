module.exports = function(app, io) {

var appSettings = require('./settings.json');
var mongoose = require('mongoose');
var async = require('async');
var checkAuth = require('./lib/checkAuth');

var models = require('./models'),
	statistics=models.statisticsModel,
	filtersList=models.filtersListModel,
	filteredReports=models.filteredReportsModel;

	//////////////////////////////////////////////////////////////////////////////////////////
	app.get('/', function(req, res){
		if (req.session.user) { res.redirect('/app')
		} else {
			res.render('login', { title: "Вход", session: req.session });
		}
	});
	//////////////////////////////////////////////////////////////////////////////////////////

	require('./1_sessions.js')(app);

	require('./2_loadLogs.js')(app, io);

	require('./3_viewReports.js')(app);
	
	require('./4_search.js')(app);

	require('./5_filters.js')(app);
	
	require('./6_rest.js')(app);

	//////////////////////////////////////////////////////////////////////////////////////////

	app.get('/app', checkAuth, function(req, res) {
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
				// Находим последние отчёты
				filteredReports.find().select("_id hostsLength created filterName creator minDate maxDate numRecords")
				.exec(function(err, result){
					console.log(result);
				
					// Сортируем записи
					function sortRecords(n,m){
						if (n.created < m.created)  { var result=1};
						if (n.created == m.created) { var result=0};
						if (n.created > m.created)  { var result=-1};
						return result;	
					};
					result.sort(sortRecords);
					callback(err, result)
				});
			}
			],
			function(err, dbCollections){
				if (err) return err;
				res.render("selectTask", 
					{ "title": "Анализ DNS запросов",
					  "dbStats":	 dbCollections[0],
				  	  "filters": 	 dbCollections[1],
					  "listReports": dbCollections[2],
					  "appSettings": appSettings,
					  "session":	 req.session.user
					});
			}
		);
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

};		// <--- app()
