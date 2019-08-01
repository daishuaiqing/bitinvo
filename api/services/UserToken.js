/**
 * 用来产生用户的token， 并且存在redis中，可以设置有效时间
 */
"use strict";

const client = require('./Redis');
const uuid = require('node-uuid');

module.exports = {
  generate : function(userId, expire){
    let token = uuid.v4();
    // 使用redis service
    client.set(token, userId);
    expire = !!expire ? expire : 2 * 60; // 两分钟内有效.
    client.expire(token, expire); 
    return token;
  }
};