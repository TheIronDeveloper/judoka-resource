module.exports = function(app, models){

	/**
	 * Before any of the other routes hit, lets make sure req.model is populated
	 */
	app.get('*', function(req, resp, next) {
		req.model = req.model || {};
		req.model.user = req.user;
		next();
	});

	require('./techniques')(app);
	require('./account')(app, models.AccountModel);
	require('./posts')(app, models);

	app.get('/', function(req, resp) {
		resp.render('home', req.model);
	});
};