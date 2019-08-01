/**
 * Run predefined tasks whenever watched file patterns are added, changed or deleted.
 *
 * ---------------------------------------------------------------
 *
 * Watch for changes on
 * - files in the `assets` folder
 * - the `tasks/pipeline.js` file
 * and re-run the appropriate tasks.
 *
 * For usage docs see:
 * 		https://github.com/gruntjs/grunt-contrib-watch
 *
 */
module.exports = function(grunt) {

	grunt.config.set('watch', {
        //interval: 5007,
		assets: {

			// Assets to watch:
			files: ['assets/audio/**/*','tasks/pipeline.js', '!**/node_modules/**', '!**/bower_components/**'],

			// When assets are changed:
			tasks: [
                'syncAssets' , 
                //'linkAssets'
            ]
		}
	});

	grunt.loadNpmTasks('grunt-contrib-watch');
};
