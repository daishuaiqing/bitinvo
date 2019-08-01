/*
*
* fifodataPush Hook Start
*/
'use strict';

const checkStartDelayInterval = 60 * 1000;
const Promise = require('bluebird');
const Schedule = require('node-schedule');

module.exports = function applicationTimer(sails) {
  return {
    initialize: function (cb) {
      var sm = sails.services.fifoclient.sendFifoMessage;
      const Redis = sails.services.redis;

      function addTodayApplication() {
        sails.log.debug('#### ApplicationTimer Hook Start');
        Application.find({ status: { '!': ['complete', 'cancelled', 'expire', 'timeout'] } })
          .then((data) => {
            let now = new Date();
            let length = data.length;
            let st = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30); //30天内申请
            let ed = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            if (data.length == 0) {
              sails.log.info('#### ApplicationTimer Hook Start:No Active Application');
              Redis.del('Application', (err, res) => { });
              checkStartDelay();
            } else {
              Redis.delAsync('Application')
                .then((res) => {
                  sails.log.verbose('Clean Application Success');
                  return Promise.resolve();
                })
                .then((res) => {
                  data.map((e, i) => {
                    let itemStart = new Date(e.start);
                    let itemEnd = new Date(e.end);
                    if (itemEnd < now) {
                      if (e.status == 'approved' || e.status == 'pending' || e.status == 'new') {
                        sails.log.verbose('#### ApplicationTimer Hook:Found Expired Application');
                        ApplicationProcess.update({ application: e.id }, { status: 'cancelled' }).exec((err, rs) => {
                          if (err) sails.log.error(`#### Update ApplicationProcess failed : ${err} ####`);
                        })
                        Application.update({ id: e.id }, { status: 'expire' })
                          .then((res) => {
                            let log = {
                              object: 'application',
                              objectId: e.id,
                              log: '申请已经超出规定的取出时间',
                              logType: 'error'
                            };
                            return OptLog.create(log);
                          })
                          .then((data) => {
                            sails.log.info('#### ApplicationTimer Hook:Add Expire Application Log Success');
                          })
                          .catch((err) => {
                            sails.log.error(err);
                          });
                      } else if (e.status == 'processed') {
                        sails.log.verbose('#### ApplicationTimer Hook:Found UnAdded OverTime Application');
                        sails.services.alarm.config('applicationOvertime', (err, config) => {
                          if (err) {
                            sails.log.error(err)
                          } else if (config === 'true') {
                            Application.update({ id: e.id }, { status: 'timeout' })
                              .then((res) => {
                                let key = 'OverTime:' + res.id;
                                return Promise.all([
                                  Redis.sremAsync('Application', 0, 'Application:' + res.id),
                                  Redis.hmsetAsync(key, {
                                    id: res.id,
                                    applicant: res.applicant,
                                    flatType: res.flatType
                                  }),
                                  Redis.saddAsync('OverTime', key)
                                ]);
                              })
                              .then((res) => {
                                sails.log.verbose('#### ApplicationTimer Hook:Add OverTime Application to Redis Success');
                              })
                              .catch((err) => {
                                sails.log.error(err);
                              })
                          }
                        })
                      };
                    } else {
                      if (itemStart > st && itemEnd < ed) { //some selection then sendSMS
                        sails.log.verbose('#### ApplicationTimer Hook: Found Today Active Application');
                        let key = 'Application:' + e.id;
                        let end = parseInt(new Date(e.end).getTime() / 1000);
                        Redis.saddAsync('Application', key)
                          .then((res) => {
                            sails.log.silly('RPUSH Application ID Success');
                            return Redis.hmsetAsync(key, {
                              id: e.id,
                              applicant: e.applicant,
                              flatType: e.flatType,
                              status: e.status,
                              start: e.start,
                              end: e.end
                            });
                          })
                          .then((res) => {
                            sails.log.silly('HMSET Application Success');
                            return Redis.expireatAsync(key, end);
                          })
                          .then((res) => {
                            sails.log.silly('EXPIRE Application Success');
                          })
                          .catch((err) => {
                            sails.log.error(err);
                          });
                      };
                    }

                    if (i == length - 1) {
                      sails.log.info('#### ApplicationTimer Hook: update redis complete, start watching');
                      checkStartDelay();
                    }
                  })
                });

            }
          })
      };

      function checkStartDelay() {
        sails.log.verbose('#### ApplicationTimer Hook: Checking Application');
        Redis.smembersAsync('Application')
          .then((res) => {
            if (res) {
              res.map((e) => {
                Redis.hgetallAsync(e)
                  .then((res) => {
                    if (res === null) {
                      return;
                    }
                    let now = new Date().getTime();
                    let during = new Date(res.end).getTime() - now;
                    if (during < 10000) {
                      if (res.status == 'approved' || res.status == 'new' || res.status == 'pending') {
                        setTimeout(function () {
                          let log = {
                            object: 'application',
                            objectId: e.id,
                            log: '申请已经超出规定的取出时间',
                            logType: 'error'
                          };
                          Promise.all([
                            Application.update({ id: res.id }, { status: 'expire' }),
                            ApplicationProcess.update({ application: res.id }, { status: 'cancelled' }),
                            Redis.sremAsync('Application', 0, 'Application:' + res.id),
                            OptLog.create(log)
                          ])
                            .then((data) => {
                              sails.log.info('New Expire Application');
                            })
                            .catch((err) => {
                              sails.log.error(err);
                            })
                        }, during);
                      } else if (res.status == 'processed') {
                        sails.services.alarm.config('applicationOvertime', (err, config) => {
                          if (err) {
                            sails.log.error(err)
                          } else if (config === 'true') {
                            let key = 'OverTime:' + res.id;
                            setTimeout(function () {
                              Promise.all([
                                Application.update({ id: res.id }, { status: 'timeout' }),
                                Redis.sremAsync('Application', 0, 'Application:' + res.id),
                                Redis.hmsetAsync(key, {
                                  id: res.id,
                                  applicant: res.applicant,
                                  flatType: res.flatType
                                }),
                                Redis.saddAsync('OverTime', key)
                              ])
                                .then((data) => {
                                  sails.log.info('New Timeout Application');
                                })
                                .catch((err) => {
                                  sails.log.error(err);
                                })
                            }, during);
                          }
                        })
                      }
                    } else if (during > 10000 && res.status == 'approved') {
                      let period;
                      if (during < 60 * 60 * 1000) {
                        period = new Date(res.start).getTime() + (new Date(res.end).getTime() - new Date(res.start).getTime()) / 2;
                      } else {
                        period = new Date(res.start).getTime() + 30 * 60 * 1000;
                      }
                      if (now < period && now + 10000 > period) {
                        //sendSMS
                        User.findOne({ id: res.applicant }).then((user) => {
                          if (user) {
                            sails.services.sms.sendSMS(user.phone, '您的申请已到开始时间，请尽快处理');
                          } else {
                            sails.log.error('#### ApplicationTimerHook : sendSMS no user found')
                          }
                        })
                      };
                    } else if (res.status == 'incomplete') {
                      let after = new Date(res.updatedAt.getTime() - 5 * 60 * 1000);
                      if (now > after) {
                        Promise.all([
                          Application.update({ id: res.id }, { status: 'processed' }),
                          Redis.sremAsync('Application', 0, 'Application:' + res.id),
                        ])
                          .then((data) => {
                            sails.log.info('Incomplete Application Back to Processed Application');
                          })
                          .catch((err) => {
                            sails.log.error(err);
                          })
                      }
                    }
                  })
              });
            } else { sails.log.debug('#### ApplicationTimer Hook: No Active Application'); }
          });
        setTimeout(function () {
          checkStartDelay()
        }, 10000);
      };

      var schedule = Schedule.scheduleJob({ hour: 0, minute: 5 }, function () {
        addTodayApplication();
      });
      sails.after(['lifted'], function () {
        // Finish initializing custom hook
        addTodayApplication();
      });
      return cb();
    }
  }
}
