module.exports = function(app, io){
var appSettings = require('./settings.json'),
	checkAuth = require('./lib/checkAuth'),
	exec=require('child_process').exec,
	spawn=require('child_process').spawn,
	mongoose = require('mongoose'),
	async = require('async'),
	fs=require('fs');	

var models = require('./models'),
	dnsModel=models.dnsModel,
	ipGrpDNS=models.ipGrpDNSModel,
	statistics=models.statisticsModel,
	topQueries=models.topQueriesModel,
	topDomains=models.topDomainsModel;

var EventEmitter = require('events').EventEmitter;
var terminalEvent = new EventEmitter();

// SocketIO ////////////////////////////////////////////////////////////
io.on('connection', function (socket) {
	console.log("socket.io connected");

	terminalEvent.on("consoleLog", function(msg){
		socket.emit("consoleLog", msg);
	});
	
	terminalEvent.on("consoleErr", function(msg){
		socket.emit("consoleErr", msg);
	});

	terminalEvent.on("consoleClear", function(){
		socket.emit("consoleClear")
	});

});

	////////////////////////////////////////////////////////////////////////
	app.get('/loadLogs', checkAuth, function(req, res) {
		var jadeStats={};
		var logsFsStats={};
	
		async.waterfall([
			function(callback){ statistics.findOne({}, callback) },
			function(stats, callback){	// <--- читаем содержимое каталога
				jadeStats = stats;
				fs.readdir(appSettings.logsDir, callback)
			},
			function(files, callback){	// <--- выбираем только *eve.json*
				files.forEach(function(file){
					if (file.match(appSettings.logsName)) { 
						logsFsStats[file]=fs.statSync(appSettings.logsDir + "/" + file);
					}
				});
				callback(null, logsFsStats);
			}
		],
		function(err, logsFsStats){	// <--- выбираем только файлы
			if (err) throw err;
			var fileStatsUnsort={};
			for (var file in logsFsStats) {
				if (logsFsStats[file].isFile()){
					fileStatsUnsort[file] = {
						mtime: logsFsStats[file].mtime,
						size: logsFsStats[file].size
					};
				}
			}
		
			// Сортируем объект со статистикой файлов по дате mtime
			var jadeFileStats={};
			var propNames=[];
			for (var p in fileStatsUnsort) {
				propNames.push(p);
			}
	
			propNames.sort(function(a,b){
				if (fileStatsUnsort[a].mtime >  fileStatsUnsort[b].mtime) { return -1 };
				if (fileStatsUnsort[a].mtime == fileStatsUnsort[b].mtime) { return  0 };
				if (fileStatsUnsort[a].mtime <  fileStatsUnsort[b].mtime) { return  1 };
			});
			
			propNames.forEach(function(prop){
				jadeFileStats[prop] = fileStatsUnsort[prop];
			});
	
	
			res.render("loadLogs",
				{"title": "Загрузка журналов в базу данных",
				 "dbStats": jadeStats,
				 "fileStats": jadeFileStats,
				 "session": req.session.user
			    });
		}
		); // <--- waterfall
	});

	////////////////////////////////////////////////////////////////////////
	app.post('/loadLogs', checkAuth, function(req, res) {
		var importFiles=req.body;

		if (importFiles.length) {
			terminalEvent.emit("consoleClear");
			res.status(200);
			res.send("importing" + importFiles.toString());
		} else {
			terminalEvent.emit("consoleErr", "Необходимо выбрать файл.");
			return;
		};
	

		async.series([

			function(callbackSeries) {	// <--- устанавливаем метку об импорте в БД
				console.log("\nseries set label");
				statistics.findOneAndUpdate({},
					 { $set: { importing: true }},
					 { "upsert": true},
					function(err, updated) {
						//console.log(updated);
						callbackSeries(err, updated)
				})
			},

			function(callbackSeries) {	// <--- удаляем старые отфильтрованные журналы
				console.log("\nseries clear temp logs");
				terminalEvent.emit("consoleLog", "Удаляем старые отфильтрованные журналы.");
				var logsFsStats={};
				
				async.waterfall([
					function(callback){	// <--- читаем содержимое каталога
						fs.readdir(appSettings.filteredDir, callback)
					},
					function(files, callback){	// <--- выбираем только *eve.json*
						files.forEach(function(file){
							if (file.match(appSettings.logsName)) {
								logsFsStats[file]=fs.statSync(appSettings.filteredDir + "/" + file);
							}
						});
						callback(null, logsFsStats);
					}
				],
				function(err, logsFsStats){	// <--- выбираем только файлы
					if (err) throw err;
					//console.log(logsFsStats);
					if (logsFsStats) {
						for (var file in logsFsStats) {
							if (logsFsStats[file].isFile()){
								//console.log("removing file: %s", file);
								fs.unlinkSync(appSettings.filteredDir + "/" + file);
							}
						}
					}
					callbackSeries(err);
				}
				); // <--- waterfall
			},

			function(callbackSeries){ 	// <-- Удаляем старые коллекции БД
				console.log("\nseries delete colls");
				terminalEvent.emit("consoleLog", "Удаляем старые записи из БД.");
				async.parallel([
/*					function(callbackParallel){ mongoose.connection.collections['dns'].drop(callbackParallel)},
					function(callbackParallel){ mongoose.connection.collections['ipGrpDNS'].drop(callbackParallel)},
					function(callbackParallel){ mongoose.connection.collections['topQueries'].drop(callbackParallel)},
					function(callbackParallel){ mongoose.connection.collections['topDomains'].drop(callbackParallel)} */
					function(callbackParallel){ dnsModel.remove({}, callbackParallel)},
					function(callbackParallel){ ipGrpDNS.remove({}, callbackParallel)},
					function(callbackParallel){ topQueries.remove({}, callbackParallel)},
					function(callbackParallel){ topDomains.remove({}, callbackParallel)}
				],
				function (err, dropResult){
					if (err) throw err;
					console.log(dropResult)
					callbackSeries(err, dropResult);
				})
			},

			function(callbackSeries){	// <--- фильтруем журналы Suricata
				console.log("\nseries grep logs");
				var grepFileStatus = new EventEmitter();
	
				var i=0;
				var grepResult=[];
				grepFileStatus.on("completed", function(result){
					i++;
					grepResult.push(result);
					if (i == importFiles.length) { callbackSeries(null, grepResult)};
				});
	
				importFiles.forEach(function(impFile){ grepLog(impFile) });
	
				function grepLog(impFile){
					terminalEvent.emit("consoleLog", "Выбираем DNS записи типа А и АААА из файла: " + impFile);
					var grepFile = appSettings.logsDir + "/" + impFile;
					var filteredFile = appSettings.filteredDir + "/" + impFile;
					var cmd = "grep -P \'\"rrtype\":\"A+\"\' " + grepFile + 
					//	" | sed 's/\\\\u/\\\\\\\\u/' | tr [:upper:] [:lower:] > " + filteredFile;
						" | tr [:upper:] [:lower:] > " + filteredFile;
					//console.log(cmd);
	
					exec(cmd, function (error, stdout, stderr) {
						if (error || stderr) {
							console.log('exec error: ' + error);
							grepStatus.emit("completed", {"grepFile": grepFile, "result": error||stderr});
						} else {
							grepFileStatus.emit("completed", {"grepFile": grepFile, "result": true});
						}
					});
				};
			},

			function(callbackSeries){	// <--- импортируем журналы в MongoDB
				console.log("\nseries import filtered");
				async.eachSeries(importFiles, importLog, function(err){
					if( err ) {
						console.log('A file failed to process');
						terminalEvent.emit("consoleLog", "Начинаем обработку загруженных данных");
						callbackSeries(err);
					} else {
						console.log('All files have been processed successfully');
						terminalEvent.emit("consoleLog", "Начинаем обработку загруженных данных");
						callbackSeries(err);
					}
				});
	
				function importLog(impFile, callbackEach){
					terminalEvent.emit("consoleLog", "Импортируем файл " + impFile + " в БД.");
					var filteredFile = appSettings.filteredDir + "/" + impFile;
					var cmdArgs =  ["--db", appSettings.db, "--collection",
									 appSettings.dnsCollection, "--file", filteredFile];
//					/opt/mongodb/bin/mongoimport --db suricata --collection dns -f eve.json
					//console.log(cmdArgs);
	
					var mongoImp = spawn(appSettings.mongoBinDir + "/mongoimport", cmdArgs);
					
					mongoImp.stdout.on('data', function (data) {
						var txt = data.toString().replace(/\n/, "<br>");
						terminalEvent.emit("consoleLog", txt)
					});
	
					mongoImp.stderr.on('data', function (data) {
						console.log('stderr: ' + data);
						var txt = data.toString().replace(/\n/, "<br>");
						terminalEvent.emit("consoleLog", txt)
					});
	
					mongoImp.on('close', function (code) {
						console.log('child process exited with code ' + code);
						callbackEach();
					});
				};
			},

			function(callbackSeries){	// <--- чистим NS, SOA записи
				console.log("\nseries cleaning");
				dnsModel.remove({"src_ip" :
					{$in: appSettings.excludedIP }},
					function(err, deleted) {
						console.log("deleted: %s", deleted);
						 callbackSeries(err, deleted) }
				);
			},

			function(callbackSeries){	// <--- считаем topQueries
				terminalEvent.emit("consoleLog", "Считаем список наиболее частых DNS запросов.");
				console.log("\nseries aggregate topQueries");
				dnsModel.aggregate([
					{ $group: {_id: { $toLower:  "$dns.rrname"} , value: { $sum: 1 } } },
					{ $sort: { "value": -1 } },
					{ $out : "topQueries" } ],
					function(err, result) {
						//console.log(result);
						callbackSeries(err, result) }
				)
			},

			function(callbackSeries){	// <--- считаем topDomains
				console.log("\nseries map-reduce topDomains");
				terminalEvent.emit("consoleLog", "Считаем список наиболее частых доменов в DNS запросах.");
				var o = {};
				o.map = function() { // <--- map
					if (this._id) {
						var a=this._id.split('.');
						var dom1=a[a.length-1];  // ru
						var dom2=a[a.length-2];  // domain
						var domain= dom2?dom2 + "." + dom1:dom1
						emit(domain, this.value)
					}
				};
	
				o.reduce = function(domain, counts) { // <--- reduce
					return Array.sum(counts);
				};
	
				o.out = {replace: "topDomains"};
	
				topQueries.mapReduce(o, function (err, model, stats) {
					//console.log(stats);
					callbackSeries(err, stats);
				});
			},

			function(callbackSeries){	// <--- считаем ipGrpDNS
				console.log("\nseries aggregate ipGrpDNS");
				terminalEvent.emit("consoleLog", "Группируем записи по источникам запросов.");
				dnsModel.aggregate([
					{ $group: {_id: "$src_ip", queries: { $sum: 1 }, "rrnames": { $addToSet: { $toLower: "$dns.rrname"}}}},
					{ $sort: { "queries": -1 } },
					{ $out : "ipGrpDNS" }
				],
					function(err, result) { callbackSeries(err, result) }
				)
			},

			function(callbackSeries){	// <--- считаем статистику
				console.log("\nseries calc stats");
				terminalEvent.emit("consoleLog", "Считаем статистику по загруженным данным.");
				dnsModel.aggregate([
					{ $group: {_id: null, "minDate": {$min: "$timestamp"}, "maxDate": {$max: "$timestamp"}, "numRecords": {$sum: 1}}},
					{ $project: { _id: false, "minDate": true, "maxDate": true, "numRecords": true }}
				],
				function(err, tmpStats) {
					var tmpStatsFixed= {
						"minDate": new Date(tmpStats[0].minDate.replace("t"," ")),
						"maxDate": new Date(tmpStats[0].maxDate.replace("t"," ")),
						"numRecords": tmpStats[0].numRecords,
						"importing": false
					};
					statistics.findOneAndUpdate({}, tmpStatsFixed, function(err, result){
						//console.log("save fixed stat %s", result);
						callbackSeries(err, result);
					});
				});
			}

		],
		function(err, seriesResult){
			//console.log("\nseries final result");
			if (err) {
				terminalEvent.emit("consoleErr", "Возникла ошибка при импорте.");
			} else {
				terminalEvent.emit("consoleLog", "<strong>Импорт файлов завершён.</strong>");
			}
		});

	});

}
