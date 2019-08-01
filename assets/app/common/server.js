/*
  Server
*/
'use strict';
var pubsub = require('PubSubJS');

var Server = function(){
  log.info('Server has been created');
}

_.extend(Server, {
  NS : 'Server',
  pub : {
    changed : ''
  },
  sub : {
    signout : []
  }
})
var prototype = {
  init : function(){
    return this;
  },
  server : function(conf, enablePagination){
    log.debug('Requesting the server');
    var d = $.Deferred();
    if(enablePagination){
      conf.headers = _.merge({"Pagination" : true}, conf.headers);
    }

    if (!conf.headers) {
      conf.headers = {};
    }
    var clearCache = {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
    conf.headers = _.merge(clearCache, conf.headers);

    $.ajax(conf)
    .done(function(data){
      var pagination;
      if(enablePagination){
        pagination = {};
        pagination.total = data.total;
        pagination.filteredTotal = data.filteredTotal;
        pagination.skip = data.skip;
        pagination.limit = data.limit;
        data= _.isNil(data.data) ? data : data.data;
      }
      d.resolve(data, pagination);
    })
    .fail(function(err){
      log.debug(err);
      if(err.status == 403){
        pubsub.publish('request.forbidden');
      }
      d.reject(err)

    })
    .always(function(){
    })
    return d;
  },
  destroy : function(){
    return this;
  }
}

_.extend(Server.prototype, prototype);
module.exports = new Server();
/*
  Server
*/
