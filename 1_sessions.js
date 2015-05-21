module.exports = function(app){
var checkAuth = require('./lib/checkAuth');

	//////////////////////////////////////////////////////////////////////////////////////////
	app.post('/session', function(req, res) {
		var user = {
				username: req.body.username.toString(),
				password: req.body.password.toString(),
				granted: null
		};

		var authProc = require('child_process').fork(__dirname + '/lib/domainAuth.js');
		authProc.send(user);
	
        authProc.on('message', function(authResult) {
			authResult.ip = req.ip;
			console.log("\nauthResult: %j", authResult);
			
            if (authResult.authed) {
                if(authResult.grantedUser){
                // авторизован и есть доступ
                    user.granted = true;
                    req.session.user = {username: user.username, granted: user.granted};
                    res.redirect('/app');
                } else {
                // авторизован, но нет в группе для доступа
                    req.session.user = null;
                    res.render("authError",
                        {
                            username: user.username,
                            code: "notPermited",
                            group:  appSettings.groupName
                        });
                }
            } else {
                // ошибка авторизации
                req.session.user = null;
                res.render("authError", { username: user.username, code: "notAuthed"});
            }
            authProc.kill();
            });
	});

	//////////////////////////////////////////////////////////////////////////////////////////
	app.get('/logout', checkAuth, function(req, res){
		console.log("logout");
		if (req.session.user) {
			req.session.destroy();
			res.redirect('/');
		}
	});
}
