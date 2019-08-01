'use strict';


let count = {};

const retryLimit = 5;
const noRetryLimit = 5*1000;

var setTimer = function(userId){
  OptLog.create({
    object: 'user',
    objectId: userId,
    action:'登录失败',
    log: '密码连续错误触发禁止',
    logType: 'error'
  }).exec((err, data) => {
    if(err) sails.log.error(err);
  });
  setTimeout(function(){
    sails.log.debug('Reset Limit');
    count[userId] = 0;
    sails.log.debug(count);
  },noRetryLimit);
}

exports.pwdWrong = function(userId){
  if(count[userId]){
    if(count[userId] == retryLimit){
      //触发禁止
      setTimer(userId);
      count[userId] = -99;
      return true;
    }else if(count[userId] == -99){
      return true;
    }else{
      count[userId]++;
      return false;
    }
  }else{
    count[userId] = 1;
    return false;
  };
};

exports.cleanWrong = function(userId){
  if(count[userId]){
    count[userId] = 0;
  }
};

exports.checkStatus = function(userId){
  if(count[userId]){
    if(count[userId] == 0){
      return false;
    }else if(count[userId] == -99){
      return true;
    }
  }
};
