module.exports = function (grunt) {
	grunt.registerTask('default', [
        // 'compileAssets',
        'clean:dev',
        'copy:dev',
        //'linkAssets',  
        'watch']);
};
