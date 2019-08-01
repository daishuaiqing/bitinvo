module.exports = function (grunt) {
	grunt.registerTask('build', [
		// 'compileAssets',
		//'linkAssetsBuild',
        'clean:build',
        'clean:tmp', //clean all file under ./tmp/public
        'clean:webpack', // clean folder dist generated by webpack
        'copy:audio', // copy audios to www
        'webpack', // call webpack to generate content to folder dist
        // 'copy:webpack', // copy webpack dist to www
        'copy:build' // copy www/**/* to ./tmp/public
	]);
};