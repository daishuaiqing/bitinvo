/**
  Help init pubsub 
*/
var _ = require('lodash');
var pubsub = require('PubSubJS');

function init(topics){
  var me = this;
  _.each(topics, function(topicName/*value*/, handlerFn/*key*/){
    if(_.isArray(topicName)){
      _.each(topicName, function(topicName){
        pubsub.subscribe(topicName, function(msg, data){
          me[handlerFn].apply(me, [msg, data]);
        });
      })
    }
    else{
      pubsub.subscribe(topicName, function(msg, data){
        me[handlerFn].apply(me, [msg, data]);
      });
    }
  })
}

module.exports = function(scope, metadata){
  if(metadata){
    if(metadata.pub){
      init.call(scope, metadata.pub);
    }
    if(metadata.sub){
      init.call(scope, metadata.sub);
    }
  }
}