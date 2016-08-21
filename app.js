#!/bin/env node
var appSettings = require('./settings.json');
var routes = require('./routes');
var express = require('express');
var middlewares = require('express-middlewares');
var session = require('express-session');
var MongoDBStore = require('connect-mongodb-session')(session);
var socketio = require('socket.io');
var mongoose = require('mongoose');
var https = require('https');
var path = require('path');
var fs = require('fs');
var app = express();
var passport = require("passport");
var passportSetup = require("./lib/passportSetup");

var sslcert = {
  key:  fs.readFileSync('./cert/key.pem'),
  cert: fs.readFileSync('./cert/cert.pem')
};

var httpsServer = require('https').createServer(sslcert, app);
var io = socketio.listen(httpsServer);

// Параметры Express
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.set('x-powered-by', false);

app.use(middlewares.favicon(path.join(__dirname, "static", "images", "favicon.png")));
app.use(middlewares.bodyParser());
app.use(express.static(path.join(__dirname, "static")));
//var crypto = require('crypto');
//var cookieSecret = crypto.randomBytes(32).toString("base64");
var cookieSecret = "asd6Gsjb/asadsawVJx22AW7TgVxK2UCoqPhXFOBs=";
app.use(middlewares.cookieParser(cookieSecret));

var store = new MongoDBStore({
  uri: appSettings.mongoConnection,
  collection: 'sessions'
});

app.use(session({
  "secret": cookieSecret,
  "name":   "suricata.sid",
  "resave":  false,
  "saveUninitialized": false,
  "cookie": { maxAge: 2592000000, secure: true },
  "store":  store
}));

app.use(passport.initialize());
app.use(passport.session());

// Подключаемся к MongoDB
mongoose.connect(appSettings.mongoConnection, function (err) {
  if (err) throw err;
  passportSetup(passport);
  routes(app, io, passport);
  httpsServer.listen(appSettings.port, function(){
    console.log('Express server listening on https://'+ process.env.HOSTNAME + ':' + appSettings.port);
  });
});    // <--- mongoose.connect()
