"use strict";
var appSettings = require('./settings.json');
var checkAuth = require('./lib/checkAuth');
var exec=require('child_process').exec;
var spawn=require('child_process').spawn;
var mongoose = require('mongoose');
var async = require('async');
var fs=require('fs');
var models = require('./models');
var dnsModel =   models.dnsModel;
var ipGrpDNS =   models.ipGrpDNSModel;
var statistics = models.statisticsModel;
var topQueries = models.topQueriesModel;
var topDomains = models.topDomainsModel;
var EventEmitter = require('events').EventEmitter;
var terminalEvent = new EventEmitter();

module.exports = function(app, io){

  // SocketIO ////////////////////////////////////////////////////////////
  io.on('connection', function (socket) {
    //console.log("socket.io connected");
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
    let sAMAccountName;
    if (req.user && req.user.displayName) {
      sAMAccountName = req.user.displayName;
    } else {
      if (req.session && req.session.username) sAMAccountName = req.session.username;
    };

    var jadeStats={};
    var logsFsStats={};

    async.waterfall([
      function(callback){ statistics.findOne({}, callback) },
      function(stats, callback){  // <--- читаем содержимое каталога
        jadeStats = stats;
        fs.readdir(appSettings.logsDir, callback)
      },
      function(files, callback){  // <--- выбираем только *eve.json*
        files.forEach(function(file){
          if (file.match(appSettings.logsName)) {
            logsFsStats[file]=fs.statSync(appSettings.logsDir + "/" + file);
          }
        });
        callback(null, logsFsStats);
      }
    ],
    function(err, logsFsStats){  // <--- выбираем только файлы
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

      res.render("loadLogs", {
        "title":     "Загрузка журналов в базу данных",
        "dbStats":   jadeStats,
        "fileStats": jadeFileStats,
        "session":   sAMAccountName,
        "authType":  req.session.authType
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
      function(callbackSeries) {  // <--- Устанавливаем метку об импорте в БД
        console.log("\nУстанавливаем метку об импорте в БД");
        statistics.findOneAndUpdate({},
          { $set: { importing: true }},
          { "upsert": true},
         function(err, updated) {
           //console.log(updated);
           callbackSeries(err, updated)
        })
      },

      function(callbackSeries) {  // <--- Удаляем старые отфильтрованные журналы
        console.log("\nУдаляем старые отфильтрованные журналы");
        terminalEvent.emit("consoleLog", "Удаляем старые отфильтрованные журналы.");
        var logsFsStats={};

        async.waterfall([
          function(callback){  // <--- читаем содержимое каталога
            fs.readdir(appSettings.filteredDir, callback)
          },
          function(files, callback){  // <--- выбираем только *eve.json*
            files.forEach(function(file){
              if (file.match(appSettings.logsName)) {
                logsFsStats[file]=fs.statSync(appSettings.filteredDir + "/" + file);
              }
            });
            callback(null, logsFsStats);
          }
        ],
        function(err, logsFsStats){  // <--- выбираем только файлы
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

      function(callbackSeries){   // <-- Удаляем старые коллекции БД
        console.log("\nУдаляем старые коллекции БД");
        terminalEvent.emit("consoleLog", "Удаляем старые записи из БД.");
        async.parallel([
        /*  function(callbackParallel){ mongoose.connection.collections['dns'].drop(callbackParallel)},
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
          console.log("\nDrop collections result: %j", dropResult)
          callbackSeries(err, dropResult);
        })
      },

      function(callbackSeries){  // <--- Фильтруем журналы Suricata
        console.log("\nФильтруем журналы Suricata");
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
          //  " | sed 's/\\\\u/\\\\\\\\u/' | tr [:upper:] [:lower:] > " + filteredFile;
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

      function(callbackSeries){  // <--- Импортируем журналы в MongoDB
        console.log("\nИмпортируем журналы в MongoDB");

        async.eachSeries(importFiles, importLog, function(err){
          terminalEvent.emit("consoleLog", "Начинаем обработку загруженных данных");
          callbackSeries(err);
        });

        function importLog(impFile, callbackEach){
          let error = null;
          terminalEvent.emit("consoleLog", "Импортируем файл " + impFile + " в БД.");

          var filteredFile = appSettings.filteredDir + "/" + impFile;
          var cmdArgs =  ["-u", appSettings.mongoUser, "-p", appSettings.mongoPwd, `--authenticationDatabase=${appSettings.db}`, "--db", appSettings.db, "--collection", appSettings.dnsCollection, "--file", filteredFile];
//          /opt/mongodb/bin/mongoimport --db suricata --collection dns -f eve.json

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
            console.log("Процесс импорта завершился с кодом: " + code);
            if (code > 0) error = new Error("Ошибка при импорте");
            callbackEach(error);
          });
        };
      },

      function(callbackSeries){  // <--- Чистим NS, SOA записи
        console.log("\nЧистим NS, SOA записи");
        dnsModel.remove({"src_ip" :
          {$in: appSettings.excludedIP }},
          function(err, deleted) {
            console.log("deleted: %s", deleted);
             callbackSeries(err, deleted) }
        );
      },

      function(callbackSeries){  // <--- считаем topQueries
        terminalEvent.emit("consoleLog", "Считаем список наиболее частых DNS запросов.");
        console.log("\nСчитаем список наиболее частых DNS запросов");
        dnsModel.aggregate([
          { $group: {_id: { $toLower:  "$dns.rrname"} , value: { $sum: 1 } } },
          { $sort: { "value": -1 } },
          { $out : "topQueries" } ],
          function(err, result) {
            //console.log(result);
            callbackSeries(err, result) }
        )
      },

      function(callbackSeries){  // <--- считаем topDomains
        console.log("\nСчитаем список наиболее частых доменов в DNS запросах");
        terminalEvent.emit("consoleLog", "Считаем список наиболее частых доменов в DNS запросах.");
        var o = {};
        o.map = function() { // <--- map
          if (this._id) {
            var a=this._id.split('.');
            var dom1=a[a.length-1];  // ru
            var dom2=a[a.length-2];  // company
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

      function(callbackSeries){  // <--- считаем ipGrpDNS
        console.log("\nГруппируем записи по источникам запросов");
        terminalEvent.emit("consoleLog", "Группируем записи по источникам запросов.");
        dnsModel.aggregate([
          { $group: {_id: "$src_ip", queries: { $sum: 1 }, "rrnames": { $addToSet: { $toLower: "$dns.rrname"}}}},
          { $sort: { "queries": -1 } },
          { $out : "ipGrpDNS" }
        ],
          function(err, result) { callbackSeries(err, result) }
        )
      },

      function(callbackSeries){  // <--- считаем статистику
        console.log("\nСчитаем статистику по загруженным данным");
        terminalEvent.emit("consoleLog", "Считаем статистику по загруженным данным.");
        dnsModel.aggregate([
          { $group: {_id: null, "minDate": {$min: "$timestamp"}, "maxDate": {$max: "$timestamp"}, "numRecords": {$sum: 1}}},
          { $project: { _id: false, "minDate": true, "maxDate": true, "numRecords": true }}
        ],
        function(err, tmpStats) {
          var tmpStatsFixed= {
            "minDate": new Date(tmpStats[0].minDate.replace("t","T")),
            "maxDate": new Date(tmpStats[0].maxDate.replace("t","T")),
            "numRecords": tmpStats[0].numRecords,
            "importing":  false
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
        statistics.findOneAndUpdate({}, {$set: {"importing": false}}, (err, result) => {});
      } else {
        terminalEvent.emit("consoleLog", "<strong>Импорт файлов завершён.</strong>");
      }
    });

  });

}
