/**
* setting for https://github.com/sgress454/sails-hook-autoreload
*/

module.exports.autoreload = {
  active: false,
  usePolling: false,
  overrideMigrateSetting : false,
  dirs: [
    "api/models",
    "api/controllers",
    "api/services",
    "views",
    "config/locales",
    "config/routes"
  ],
  ignored: [
    // Ignore all files with .ts extension
    "**.ts"
  ]
};