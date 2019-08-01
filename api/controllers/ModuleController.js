/**
 * ModuleController
 *
 * @description :: Server-side logic for modules
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
  index : function(req, res){
    sails.log.debug('To render module page to path %s', req.path);
    sails.log.debug('Server Asset path is : %s',sails.config.webpackUrl);
    var module =  req.param('moduleName');
    return res.view({
      title : module,
      module : module,
      isLocal : req.isLocal,
      isProd : process.env.NODE_ENV === 'production'
    });
  }
};
