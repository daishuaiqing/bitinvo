'use strict';

var _ = require('lodash');
const co = require('co');

function replaceNull(values) {
  values = _.mapValues(values, function (value) {
    return (value === 'undefined' || value === 'null' || value === '') ? null : value;
  });
  return values;
}

function replaceNullToString(values) {
  values = _.pickBy(values, (value, key) => {
    if (value === undefined || value === null || value === '') {
      return false;
    } else {
      return true;
    }
  });
  return values;
}

function delay(time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time)
  })
}

function promiseQuery(sql) {
  return new Promise((resolve, reject) => {
    User.query(sql, (err, rs) => {
      if (err) return reject(err);
      return resolve(rs)
    })
  })
}

function purifyStringArr(arr) {
  let tmp = [];
  for (let i in arr) {
    if (arr[i].length > 0) tmp.push(arr[i]);
  }
  return tmp;
}

function record(cb) {
  co(function* () {
    let value = yield sails.services.redis.getAsync('videoRecordType');
    if (!value) {
      const sys = yield System.findOne({ key: 'videoRecordType' });
      if (!sys) {
        value = 'pic';
        yield sails.services.redis.setAsync('videoRecordType', 'pic');
      } else if (sys) {
        value = sys.value;
        yield sails.services.redis.setAsync('videoRecordType', value);
      }
    }
    switch (value) {
      case 'pic': return yield Promise.resolve(sails.services.camera.capture);
      case 'video': return yield Promise.resolve(sails.services.camera.startRecording);
      case 'null':
      default: return yield Promise.resolve(function (onComplete) {
        onComplete(null);
      });
    }
  }).then((fn) => {
    cb(null, fn);
  }).catch((e) => {
    cb(err);
  })
}

function uniArr(arr) {
  let tmp = {};
  for (let i in arr) {
    if (arr[i]) tmp[arr[i]] = true;
  }
  return Object.keys(tmp);
}

module.exports = {
  delay,
  replaceNull,
  replaceNullToString,
  promiseQuery,
  purifyStringArr,
  record,
  uniArr
}