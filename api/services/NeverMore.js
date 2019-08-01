'use strict';
const _ = require('lodash');
let me = this;
//阻止state
me.blockState = {
  humidity: false,
  power_off: false,
  power_low: false
}
//检查阻止情况
exports.check = (name) => {
  return me.blockState[name];
}

//设置阻止
exports.block = (name) => {
  me.blockState[name] = true;
}

//接触阻止
exports.unlock = (name) => {
  me.blockState[name] = false;
}