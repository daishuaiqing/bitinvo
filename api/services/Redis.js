var redis = require('redis')
var bluebird = require('bluebird');
var client = redis.createClient('6379', 'localhost');

client.select(2, function(err, data){
  if(err){
    sails.log.error('Redis Select DB Failed');
    sails.log.error(err);
  }else{
    sails.log.info('Redis client Start Success');
  }
});

bluebird.promisifyAll(redis.RedisClient.prototype);

module.exports = client;