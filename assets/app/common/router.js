'use strict';
var page = require("page/index");
var qs = require('qs');
var pubsub = require('PubSubJS');
var Router = function(){
  log.info('Router has been created');
}

_.extend(Router, {
  NS : 'Router',
  pub : {
    changed : 'router.changed'
  },
  sub : {}
})
var prototype = {
  start: function(){
    page();
  },
  parse: function(ctx, next) {
    ctx.query = qs.parse(location.search.slice(1));
    next();
  },
  nav : function(path){
    var pathname, moduleName;
    if (path.indexOf('#window') > -1) {
      pathname = path.split('#')[0];
      moduleName = pathname.replace('/m/', '');
      pubsub.publish(Router.pub.changed, { moduleName: moduleName, isWindow: true});
    } else {
      page(path);
    }
  },
  handler : function(ctx, next){
    log.info('Router Handler');
    log.debug('module Name : ' + ctx.params.module);
    pubsub.publish(Router.pub.changed, ctx.params.module);
  },
  init : function(){
    page.base = '/m';
    page('*', _.bindKey(this, 'parse'));
    page('/m/:module', _.bindKey(this, 'handler'));
    return this;
  },
  destroy : function(){
    return this;
  }
}

_.extend(Router.prototype, prototype);
module.exports = new Router();
