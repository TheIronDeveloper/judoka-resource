var passport = require('passport'),
	md5 = require('MD5'),
	_ = require('underscore');

/**
 * Authentication routes
 * @param app
 */
module.exports = function (app, models) {

	var UserModel = models.UserModel,
		PostModel = models.PostModel,
		JudoRanks = models.JudoRanks,
		rankRegex = new RegExp(/\s/);

	function registerPage(req, res) {
		res.render('user/register', req.model);
	}

	// Verify the user was logged in
	function isAdmin(req, resp, next) {
		if(req.user && req.user.isAdmin) {
			return next();
		}

		resp.send(500, 'User does not have proper privileges');
	}

	function renderAdminPage(req, res) {
		res.render('user/admin', req.model);
	}

	function postRegistration(req, res, next) {
		UserModel.register(new UserModel({ username : req.body.username, email : req.body.email }), req.body.password, function(err, user) {

			if (err || !user) {
				req.model.user = {};
				req.model.error = err;
				return res.render('user/register', req.model);
			}

			passport.authenticate('local')(req, res, function () {
				next();
			});
		});
	}

	// Update user
	function updateUser(req, resp, next) {
		var payload = req.body,
			user = req.user || {},
			updates = {},
			username = user.username;

		if (payload.gravatarEmail) {
			updates.gravatarEmail = payload.gravatarEmail;
			updates.gravatarHash = getGravatarHash(payload);
		}

		if (payload.email) {
			updates.email = payload.email;
		}

		if (payload.rank) {
			updates.rank = payload.rank;
		}

		if (payload.fullName) {
			updates.fullName = payload.fullName;
		}

		if (payload.location) {
			updates.location = payload.location;
		}

		UserModel.findOne({'username': username}, function (err, user){
			if(err) return console.error(err) ;
			_.extend(user, updates);

			user.save();
			req.user = user;
			next();
		});
	}

	function myAccountPage(req, resp) {

		req.model.judoRanks = JudoRanks;
		var user = req.model.user = req.user;
		if (!user) {
			return resp.render('user/login', req.model);
		}

		resp.render('user/myaccount', req.model);
	}

	function getGravatarHash(payload) {
		var gravatarEmail = payload.gravatarEmail,
			gravatarHash = md5(gravatarEmail.toLowerCase());

		return gravatarHash;
	}

	function loginPage(req, res) {
		res.render('user/login', req.model);
	}

	function redirectToLoggedInPage(req, res) {
		res.redirect('/myaccount');
	}

	function logoutPage(req, res) {
		req.logout();
		res.redirect('/');
	}

	function displayUsers(req, res) {
		res.render('user/index', req.model);
	}

	// Get a list of the users and place them on a map
	function getUsers(req, resp, next) {
		UserModel.find(function(err, users){
			if (err) return console.error(err);

			var userList = req.model.userList = [];
			var userMap = req.model.userMap = {};
			_.each(users, function(user) {
				if (user.rank) {
					user.rankClass = (user.rank).toLowerCase().replace(rankRegex, '-');
				}

				if (user.fullName) {
					user.displayName = user.fullName + ' ('+ user.username +')';
				} else {
					user.displayName = user.username;
				}

				if (user.username) {
					userList.push(user);
					userMap[user.id] = user.username;
				}
			});
			next();
		});
	}

	function findUser(req, res, next) {
		var username = req.param('username');
		UserModel.findOne({'username': username}, function(err, selectedUser){

			req.model.selectedUser = selectedUser;
			if(err || !selectedUser || !selectedUser._id) {
				req.model.error = err;
			}

			next();
		});
	}

	function deleteUser(req, res, next) {

		var selectedUser = req.model.selectedUser;
		selectedUser.remove(function (err, user) {
			if (err) {
				req.model.error = err;
				return next();
			}
			UserModel.findById(user._id, function (err, foundUser) {
				res.json({selectedUser: user});
			});
		});
	}


	function findPostsByUser(req, res, next) {

		var selectedUser = req.model.selectedUser || {};
		PostModel.find({'userId': selectedUser._id}, function(err, posts){

			var filteredPosts = [];
			if (err || !posts) {
				req.model.error = err;
			}

			req.model.posts = returnFilteredPosts(posts, req.model.userMap, req.model.isAdmin);
			return res.render('user/userPosts', req.model);
		});
	}

	function getAllPosts(req, res, next) {
		PostModel.find(function(err, posts){

			if (err || !posts) {
				req.model.error = err;
			}

			req.model.posts = returnFilteredPosts(posts, req.model.userMap, req.model.isAdmin);
			next();
		});
	}

	/**
	 * Returns a filteredPost set
	 * @param posts
	 * @param userMap
	 */
	function returnFilteredPosts(posts, userMap, isAdmin) {
		var filteredPosts = [];

		userMap = userMap || {};

		posts.forEach(function(post){
			var filteredPost = _.pick(post, 'pageId', 'title', 'type', 'userId', 'url', 'approved', '_id', 'timestamp'),
				postDate = new Date(filteredPost.timestamp),
				isApproved = filteredPost.approved;

			filteredPost.username = userMap[filteredPost.userId] || '';
			filteredPost.dateString = postDate.toDateString();

			// If the post is approved, or the user is an admin, add the filteredPost
			if (isApproved || isAdmin) {
				filteredPosts.push(filteredPost);
			}

		});
		return filteredPosts;
	}

	app.get('/users', getUsers, displayUsers);
	app.get('/users/:username', findUser, getUsers, findPostsByUser);
	app.delete('/users/:username', isAdmin, findUser, deleteUser);

	app.get('/myaccount', myAccountPage);
	app.post('/myaccount', updateUser, myAccountPage);

	app.get('/register', registerPage);
	app.get('/login', loginPage);
	app.get('/admin', isAdmin, getUsers, getAllPosts, renderAdminPage);
	app.get('/logout', logoutPage);

	app.post('/register', postRegistration, redirectToLoggedInPage);
	app.post('/login', passport.authenticate('local'), redirectToLoggedInPage);
};