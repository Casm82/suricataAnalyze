var appSettings = require('../settings.json');

process.on('message', function (user) {
	var username = user.username,
		password = user.password;

	var ActiveDirectory = require('activedirectory');
	var ad = new ActiveDirectory(appSettings.ldapConfig);

	ad.authenticate(username + "@" + appSettings.domain, password, function(err, auth) {
	var loginTime = new Date();
	var authResult = {
		"time": loginTime.toLocaleString(), 
		"error": err, "username": username,
		"authed": auth, "grantedUser": null};
		
		if (err) { process.send(authResult); return;}

		if (auth) {
			ad.isUserMemberOf(username, appSettings.groupName, function(err, isMember) {
				if (err) { console.log('ERROR: ' +JSON.stringify(err)); return; }
				authResult.grantedUser=isMember;
				process.send(authResult);
			});
		} else {
			//console.log('Authentication failed! %j %j', user, authResult);
			process.send(authResult);
		}
	});
})
