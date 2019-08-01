'use strict';
const Promise = require('bluebird');

module.exports = {
  gunValidation: function(gunId){
    sails.log.debug('Validate InComing Gun Info: Get Gun Id ' + gunId);
    return CabinetModule.findOne({gun: gunId}).then((data) => {
      if(data){
        sails.log.debug(data);
        sails.log.error('Validate InComing Gun Info : Gun Already In Cabinet' + data.id);
        return data.id;
      }else{
        sails.log.verbose('Validate InComing Gun Info : Gun Is Free');
        return null;
      }
    }).catch((err) => {
      sails.log.error('Validate InComing Gun Info : Error');
      sails.log.error(err);
    })
  },
  userValidation: function(userId){
    sails.log.debug('Validate InComing User Info,Id :' + userId);
  },
  orgValidation: function(){
    sails.log.debug('Validate Org Root Info:Start');
    return Org.find().then((data) => {
      if(data){
        let result = false;
        let count = 0;
        data.map((e) => {
          if(e.superior == null){
            count++;
            result = true; 
          };
        });
        if(count > 1){
          sails.log.error('Validate Org Root Info:Error:DB has more Than One Root Org')
          return Promise.reject('More Than One Root Org');
        }else{
          sails.log.verbose('Validate Org Root Info:Success:Result is' + result);
          return Promise.resolve(result);
        }
      }else{
        sails.log.error('Validate Org Root Info:Error:DB has No Root Org Exists')
        return Promise.reject("No Org");
      }
    });
  }
}
