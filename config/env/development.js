/**
 * Development environment settings
 *
 * This file can include shared settings for a development team,
 * such as API keys or remote database passwords.  If you're using
 * a version control solution for your Sails app, this file will
 * be committed to your repository unless you add it to your .gitignore
 * file.  If your repository will be publicly viewable, don't add
 * any private information to this file!
 *
 */

module.exports = {

  /***************************************************************************
   * Set the default database connection for models in the development       *
   * environment (see config/connections.js and config/models.js )           *
   ***************************************************************************/

  // models:{
  //   connection: 'localDiskDb'
  // },

  // models: {
  //   connection: 'memory'
  // },

  // models: {
  //   connection: 'sqlitedb'
  // },

  level: 'silly',
  /**
    * the setting requires
    * 1 you start webpack dev server on port 8080
    * 2 webpack.config.js to set correnct path
    *    output: {
    *        path: path.join(__dirname, "dist"),
    *        publicPath: "dist/", // relative path for github page
    *        .....
    */
  webpackUrl : 'http://127.0.0.1:8080/dist' // don't append slash /
};
