module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		jshint: {
			all: [
				'Gruntfile.js',
				'index.js',
				'controllers/**/*.js',
				'models/*.js',
				'public/scripts/main.js',
				'public/scripts/app/**/*.js',
				'tests/**/*.js'
			]
		}
	});

	grunt.loadNpmTasks('grunt-contrib-jshint');

	// Default task(s).
	grunt.registerTask('default', ['jshint']);

};