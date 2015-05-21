module.exports = function (req, res, next) {
	if (! (req.session.user && req.session.user.granted)) {
		if (req.ip.match(/127\.0\.0\.1/)) {
			console.log("trusted ip");
			req.session.user = {username: "cron", granted: true};
			next();
		} else {
			res.render("authError", {code: "notLoggedIn"});
		}
	} else { next(); } 

}
