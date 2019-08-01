'use strict';
const OverTimeRepeaterInterval = 10 * 60 * 1000;//test;
const _ = require('lodash');
const moment = require('moment');

module.exports = function OverTimeCheck(sails) {
  return {
    initialize: function (cb) {
      const sm = sails.services.fifoclient.sendFifoMessage;
      const Redis = sails.services.redis;
      function OverTimeRepeater() {
        sails.services.alarm.config('applicationOvertime', (err, config) => {
          if (err) {
            sails.log.error(err)
          } else if (config === 'true') {
            sails.log.verbose('Checking OverTime Application');
            Redis.smembersAsync('OverTime')
              .then((res) => {
                if (res) {
                  res.map((e) => {
                    Redis.hgetallAsync(e)
                      .then((e) => {
                        if (e.flatType == 'gun') {
                          Application.findOne({ id: e.id }).populate('applicant').exec((err, app) => {
                            if (app && app.cabinet === sails.config.cabinet.id && app.status === 'timeout' && app.applicant) {
                              sails.services.message.local({ topic: 'timeoutalert', value: { info: 'timeout alert', type: e.flatType } });
                              sails.log.error('Overtime Application Id:' + e.id + 'type:Gun')

                              let log = {
                                object: 'application',
                                objectId: e.id,
                                action: '枪支未按时归还报警',
                                log: `枪支未按时归还\n申请人 : ${app.applicant.alias || app.applicant.username} \n警号 : ${app.applicant.username} \n申请事由 : ${app.detail}\n起始时间 : ${moment(new Date(app.start)).format('YYYY年MM月DD日 HH时mm分')} \n结束时间 : ${moment(new Date(app.end)).format('YYYY年MM月DD日 HH时mm分')}`,
                                logType: 'warning'
                              };
                              OptLog.create(log).exec(function (err, suc) {
                                if (err) Promise.reject();
                                sails.log.verbose('###Check Application Status:Create Log Success###');
                              });
                              MessageExchange.uploadAlarmMsg({ log: log.log });
                              sails.services.message.alarm('枪支未按时归还报警', 'gunovertime', 'local');
                              sm('setAlertState', {
                                canId: 253,
                                type: 0,
                                state: 0
                              });
                            }
                          })
                        } else if (e.flatType == 'bullet') {
                          Application.findOne({ id: e.id }).populate('applicant').exec((err, app) => {
                            if (app && app.cabinet === sails.config.cabinet.id && app.status === 'timeout' && app.applicant) {
                              sails.services.message.local({ topic: 'timeoutalert', value: { info: 'timeout alert', type: e.flatType } });
                              sails.log.error('Overtime Application Id:' + e.id + 'type:Bullet');
                              let log = {
                                object: 'application',
                                objectId: e.id,
                                action: '子弹未按时归还报警',
                                log: `子弹未按时归还\n申请人 : ${app.applicant.alias || app.applicant.username}\n警号 : ${app.applicant.username}  \n申请事由 : ${app.detail}\n起始时间 : ${moment(new Date(app.start)).format('YYYY年MM月DD日 HH时mm分')} \n结束时间 : ${moment(new Date(app.end)).format('YYYY年MM月DD日 HH时mm分')}`,
                                logType: 'warning'
                              };
                              OptLog.create(log).exec(function (err, suc) {
                                if (err) Promise.reject();
                                sails.log.verbose('###Check Application Status:Create Log Success###');
                              });
                              MessageExchange.uploadAlarmMsg({ log: log.log });
                              sails.services.message.alarm('子弹未按时归还报警', 'bulletovertime', 'local');
                              sm('setAlertState', {
                                canId: 253,
                                type: 0,
                                state: 0
                              });
                            }
                          });
                        } else if (e.flatType == 'maintain') {
                          Application.findOne({ id: e.id }).populate('applicant').exec((err, app) => {
                            if (app && app.cabinet === sails.config.cabinet.id && app.status === 'timeout' && app.applicant) {
                              sails.services.message.local({ topic: 'timeoutalert', value: { info: 'timeout alert', type: e.flatType } });
                              sails.log.error('Overtime Application Id:' + e.id + 'type:Maintain');
                              let log = {
                                object: 'application',
                                objectId: e.id,
                                action: '维护取枪未按时归还报警',
                                log: `维护取枪未按时归还\n申请人 : ${app.applicant.alias || app.applicant.username} \n警号 : ${app.applicant.username} \n申请事由 : ${app.detail}\n起始时间 : ${moment(new Date(app.start)).format('YYYY年MM月DD日 HH时mm分')} \n结束时间 : ${moment(new Date(app.end)).format('YYYY年MM月DD日 HH时mm分')}`,
                                logType: 'warning'
                              };
                              OptLog.create(log).exec(function (err, suc) {
                                if (err) Promise.reject();
                                sails.log.verbose('###Check Application Status:Create Log Success###');
                              });
                              MessageExchange.uploadAlarmMsg({ log: log.log });
                              sails.services.message.alarm('维护取枪未按时归还报警', 'maintainovertime', 'local');
                              sm('setAlertState', {
                                canId: 253,
                                type: 0,
                                state: 0
                              });
                            }
                          });
                        }
                      })
                  });
                }
              });;
            setTimeout(function () {
              OverTimeRepeater();
            }, OverTimeRepeaterInterval);
          }
        })
      };

      sails.after(['lifted'], function () {
        // Finish initializing custom hook
        //超时报警
        OverTimeRepeater();
      });
      return cb();
    }
  }
}