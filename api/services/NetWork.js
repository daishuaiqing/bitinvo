'use strict'
const request = require('request');
/**
 * 代理方法
 * @param url
 * @param method
 * @param body(if have)
 * @param token(after base64,already remove build-in base64)
 * @param realuser(if have)
 * @return Promise
 */
exports.proxy = (url, method, body, token, realuser, pagination, onemachine) => {
  sails.log.debug('#### NetWork Service : Do Once Proxy ####');
  let option = {
    url, method, body,
    json: true,
    headers: {
      'authorization': token,
      'realuser': realuser
    },
    timeout: 10 * 1000
  }
  if(pagination === 'true'){
    option.headers.pagination = true;
  }
  if(onemachine === 'true'){
    option.headers.onemachine = true;
  }
  return new Promise((resolve, reject) => {
    request(option, (err, res) => {
      if(err) reject(err);
      resolve(res);
    })
  })
  .then((res) => {
    if(res.statusCode === 200 || res.statusCode === 201){
      if(typeof res.body === 'object'){
        return Promise.resolve(res);
      }else if(typeof res.body === 'string'){
        try{
          res.body = JSON.parse(res.body);
          return Promise.resolve(res);
        }catch(err){
          sails.log.silly('Body is not JSON, return default');
          return Promise.resolve(res);
        }
      }
    }else{
      return Promise.reject(res.body);
    }
  })
}
