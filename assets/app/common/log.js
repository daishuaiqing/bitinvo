var log = require('loglevel');

var StackTrace = require('stacktrace-js');

log.setLevel('debug');

var errorHandler = function(error){
  if(typeof error === 'string'){
    log.error(error); 
  }else if(error instanceof Error){
    var callback = function(stackframes) {
      var stringifiedStack = stackframes.map(function(sf) {
        return sf.toString();
      }).join('\n');
      log.error(stringifiedStack);
    };

    var errback = function(err) { 
      log.error(err.message); 
    };

    StackTrace.fromError(error).then(callback).catch(errback);
  }
}

module.exports = {
  info : log.info,
  error : errorHandler,
  debug : log.debug
};