'use strict';
module.exports = class {
  constructor(head){
    this._head = head || 'Sails Logger';
  }
  basic(msg, func){
    if(func){
      return `##### ${this._head} : ${func} : ${msg}`; 
    }else{
      return `#### ${this._head} : ${msg}`;
    }
  }
  log(str, level){
    sails.log[level](str);
  }
  silly(msg, func){
    this.log(this.basic(msg, func), 'silly');
  }
  debug(msg, func){
    this.log(this.basic(msg, func), 'debug');
  }
  info(msg, func){
    this.log(this.basic(msg, func), 'info');
  }
  verbose(msg, func){
    this.log(this.basic(msg, func), 'verbose');
  }
  error(msg, func){
    this.log(this.basic(msg, func), 'error');
  }
}