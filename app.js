#!/bin/env node
var appSettings = require('./settings.json'),
	routes = require('./routes'),
	express = require('express'),
	expressMiddlewares = require('express-middlewares'),
	socketio = require('socket.io'),
	mongoose = require('mongoose'),
	https = require('https'),
	path = require('path'),
	fs = require('fs'),
	app = express();

var sslcert = {
    key: fs.readFileSync(__dirname + '/cert/suricata.pem'),
    cert: fs.readFileSync(__dirname + '/cert/suricata.crt.pem') };    

var HTTPSserver = require('https').createServer(sslcert, app);
var io = socketio.listen(HTTPSserver);
io.set('log level', 1);

// Параметры Express
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('x-powered-by', false);
app.use(expressMiddlewares.favicon());
app.use(expressMiddlewares.bodyParser());
app.use(express.static(path.join(__dirname, 'static')));

var crypto = require('crypto');
var cookieSecret = crypto.randomBytes(32).toString("base64");

app.use(expressMiddlewares.cookieParser(cookieSecret));
app.use(expressMiddlewares.session(
    {	secret: cookieSecret,
		cookie: { maxAge: 604800000, secure: true }
/*		store: new (require('express-sessions'))({
			storage: 'mongodb',
			instance: mongoose,
			host: 'localhost',
			port: 27017,
			db: 'suricata',
			collection: 'sessions',
			expire: 604800000 
		}) */
	}
));

// Подключаемся к MongoDB
mongoose.connect("mongodb://localhost/suricata", function (err) {
	if (err) throw err;
	routes(app, io);
    HTTPSserver.listen(appSettings.port, function(){
        console.log('Express server listening on https://'+ process.env.HOSTNAME + ':' + appSettings.port);
    });
});		// <--- mongoose.connect()
