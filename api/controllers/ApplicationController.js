/**
 * ApplicationController
 *
 * @description :: Server-side logic for managing Applications
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
'use strict';
var actionUtil = require('sails/lib/hooks/blueprints/actionUtil');
var localProtocol = require('../services/protocols/local');
var Promise = require('bluebird');
var _ = require('lodash');
const moment = require('moment');
const co = require('co');
const MAX_STACK = 20;
const flatTypeList = {
  gun: '取枪',
  bullet: '取弹',
  emergency: '紧急全开',
  storageGun: '存枪',
  storageBullet: '存弹',
  maintain: '维护'
}

var processBulletInfo = function (req, res, app) {
  let userId = app.applicant;
  User.findOne({ id: userId })
    .exec(function (err, user) {
      sails.log.debug('User and bullet infomantion found, going to return');
      return res.ok({ application: app, user: user });
    });
}

var createOptLog = function (data) {
  co(function* () {
    let userId = null;
    if (data.object === 'user' && data.objectId) {
      userId = data.objectId
    } else if (data.object === 'application' && data.createdBy) {
      userId = data.createdBy;
    }
    if (userId) {
      data.fingerPrint = yield sails.services.redis.hgetAsync('finger', userId);
      data.facePic = yield sails.services.redis.hgetAsync('face', userId);

      //使用之后删除REDIS内对应用户的指纹人脸记录
      // yield sails.services.redis.hdelAsync('finger', userId);
      // yield sails.services.redis.hdelAsync('face', userId);
      yield sails.services.face.removeRecord(userId, 'application');
    }
    return yield Promise.resolve(data);
  }).then((data) => {
    OptLog.create(data)
      .exec(function (err) {
        if (err) {
          sails.log.error(' #### ApplicationController:create  adding OptLog fails');
          sails.log.error(err);
        }
      });
  }).catch((err) => {
    sails.log.error(err);
  })
}

var createProcessList = function (user, cb, subordinates, stackCount) {
  if (stackCount == null || typeof stackCount === 'undefined') {
    stackCount = 0;
  }
  if (stackCount > MAX_STACK) {
    sails.log.warn(' #### ApplicationController:createProcessList  Max Stack Overflow ');
    return cb([]);
  }

  if (subordinates == null || typeof subordinates === 'undefined') {
    subordinates = [];
  }

  if (!user.superior) {
    sails.log.warn(' #### ApplicationController:createProcessList  No Superior Found return ');
    return cb([]);
  }

  var superior = user.superior;

  var duplicated = _.some(subordinates, function (sub) {
    return sub.id === superior;
  })

  if (duplicated) {
    sails.log.warn(' #### ApplicationController:createProcessList  Found Dead Loop');
    return cb([]);
  }

  /**
    找到所有的上级领导， 从第一个直接领导开始保存到list中
  */
  User.findOne({ id: user.superior })
    .exec(function (err, user) {
      var list = [];
      if (err) {
        sails.log.error(' #### ApplicationController:createProcessList  fetching user error');
        sails.log.error(err);
        return cb(list);
      }

      if (user) {
        list.push({ id: user.id, alias: user.alias, status: 'new' });
        if (user && user.superior) {
          sails.log.debug(' #### ApplicationController:createProcessList Found superior, keep searching ');
          createProcessList(user, function (superiorList) {
            return cb(list.concat(superiorList));
          }, subordinates.concat(list), ++stackCount);
        }
        else
          return cb(list);
      }
      else {
        sails.log.warn(' #### ApplicationController:createProcessList  No Superior Found in DB return record ');
        return cb(list);
      }
    });
}

var createProcess = function (application, user, approver, index) {
  sails.log.debug(' #### ApplicationController:createProcess Creating Application');
  if (!user || !application || !approver) return;
  index = (typeof index === 'undefined' ? 0 : index);
  return new Promise(
    function (resolve, reject) {
      ApplicationProcess.create({
        applicant: user,
        application: application,
        approver: approver,
        status: 'new',
        createdBy: user.id,
        updatedBy: user.id
      })
        .exec(function (err, process) {
          if (err) {
            sails.log.error(' #### ApplicationController:createAppProcess  adding Application Process for "arbitary" fails');
            sails.log.error(err);
            return reject(err);
          }

          var detail = (user.alias ? user.alias : user.username) + sails.__('is applying for ' + application.flatType);

          Message.create({
            from: user,
            to: approver,
            detail: detail,
            refModel: 'application',
            refId: process.id,
            createdBy: user.id,
            updatedBy: user.id
          })
            .exec(function (err, message) {
              process.message = message;
              process.save();

              //emit send message
              if (approver) {
                sails.log.debug('send To User\'s approver with id = %s', approver.id)
                User.findOne({ id: approver.id }).then((targetUser) => {
                  let content = '有新的授权信息请登录查看';
                  let phone = targetUser.phone;
                  sails.log.debug(' #### ApplicationController:createProcess phone %s', phone);
                  if (phone)
                    sails.services.sms.sendSMS(phone, content);
                  sails.services.message.send2(targetUser, '你有新的申请需要授权', 'user.message', 'both', null, null, '/m/messagemanagement');
                })
              } else {
                sails.log.error('No Target To Send');
              }
            });
          resolve({ index: index, process: process });
        });
    }
  );

}

var updateProcessList = function (user, application, processList) {
  sails.log.debug(' #### ApplicationController:updateProcessList User with ID ' + user.id + ' is updating application with id ' + application.id);
  Application.findOne({ id: application.id })
    .exec(function (err, application) {
      if (err) {
        sails.log.error(' #### ApplicationController:updateProcessList User with ID ' + user.id + ' try to update application failed ' + err);
        sails.services.message.local({
          topic: 'processListCreated',
          value: { status: 'fail' }
        })
        return;
      } else {
        application.processList = processList;
        application.status = 'pending';
        application.save();
        sails.services.message.local({
          topic: 'processListCreated',
          value: { status: 'success' }
        })
      }
    })
}

var checkGunInfo = function (gunId) {
  return Gun.find({ id: gunId })
    .then((gun) => {
      if (gun) {
        if (gun.gunStatus == 'normal' && gun.storageStatus == 'in') {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    })
}

/**
  这个函数根据用户设置的方式来建立级别树， 然后发送申请请求
*/
var selectAppProcessType = function (appType, application, user) {
  sails.log.debug(' #### ApplicationController:selectAppProcessType Creating Application process');
  if (appType.approverOption === 'none') return sails.log.debug(`#### ApplicationController:selectAppProcessType : no approver needed #####`)

  if (appType.approverOption === 'single') {//直属上级
    createProcessList(user, function (processList) {
      sails.log.debug('Create ProcessList ');
      if (!processList || processList.length === 0) {
        sails.log.warn(' #### ApplicationController:selectAppProcessType User with ID ' + user.id + ' try to create application failed, for not superior found ');
        // return res.badRequest({error : 'No Superior Found, you need a superior to approve this application'});
      }

      sails.log.debug(' #### ApplicationController:selectAppProcessType User with ID %s has processList', user.id);
      sails.log.debug(processList);

      _.merge(application, { processList: processList });

      if (processList && processList.length > 0) {
        var superior = processList[0];
        createProcess(application, user, superior)
          .then(function (process) {
            sails.log.debug(' #### ApplicationController:selectAppProcessType Updating Application for process list');
            processList[0].status = 'requestSent';
            processList[0].process = process.process.id;
            updateProcessList(user, application, processList);
          });
      }
    });
  } else { //任意选的有权限的人员
    var approvers = appType.approvers;
    var processList = _.map(approvers, function (approver, index) {
      return { id: approver.id, alias: approver.alias, status: 'new' };
    });

    var promises = _.map(processList, function (approver, index) {
      return createProcess(application, user, approver, index);
    });

    Promise
      .all(promises)
      .then(function (results) {
        sails.log.debug(' #### ApplicationController:selectAppProcessType Updating Application for process list');
        _.each(processList, function (process, index) {
          process.status = 'requestSent'
          var filtered = _.filter(results, function (r) {
            return r.index === index;
          });
          var result = filtered.pop();
          if (result)
            process.process = result.process.id;
          return process;
        })
        updateProcessList(user, application, processList);
      });
  }
}

Date.prototype.Format = function (fmt) {
  var o = {
    "M+": this.getMonth() + 1, //月份
    "d+": this.getDate(), //日
    "h+": this.getHours(), //小时
    "m+": this.getMinutes(), //分
    "s+": this.getSeconds(), //秒
    "q+": Math.floor((this.getMonth() + 3) / 3), //季度
    "S": this.getMilliseconds() //毫秒
  };
  if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
  for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
  return fmt;
}

module.exports = {
  /**
    管理员审核了ApplicationProcess之后回调这个函数来更新Application的状态， 如果可能，还会发起新的审核
  */
  updateProcess: function (process, user) {
    if (!process) {
      sails.log.error(' #### ApplicationController:updateProcess process is not defined');
      return;
    }

    sails.log.debug(' #### ApplicationController:updateProcess Updating Application for process with id ' + process.id);
    Application
      .findOne({ id: process.application })
      .populate('type')
      .exec(function (err, application) {
        if (err) {
          sails.log.error(' #### ApplicationController:updateProcess Application search error');
          sails.log.error(err);
          return;
        }

        if (!application) {
          sails.log.warn(' #### ApplicationController:updateProcess Application can not be found');
          return;
        }
        sails.log.debug(' #### ApplicationController:updateProcess  Application %s Found ', application.id);

        var save = function (application, user) {
          if (!user) {
            user = { id: null };
          }
          application.updatedBy = user.id;
          application.updatedAt = new Date();
          application.save();
        }

        var shouldImmediatelyReject = function (application, process) {
          if (process.status === 'rejected') {
            sails.log.debug(' #### ApplicationController:updateProcess  set Application %s status to rejected ', application.id);
            application.status = 'rejected';
            save(application, user);
            return true;
          } else {
            return false;
          }
        }



        if (application) {
          sails.log.debug(' #### ApplicationController:updateProcess  Application %s is sending another request ', application.id);

          var processList = application.processList;

          var updated = _.find(processList, function (pItem) {
            return pItem.process === process.id;
          });

          if (updated) {
            updated.status = process.status;
          }

          var type = application.type;
          sails.log.error(' #### ApplicationController:updateProcess  mode', application.id, type.voteType);
          if (type.approverOption == 'single') {
            sails.log.error(' #### ApplicationController:updateProcess single mode', application.id, type.voteType);
            if (shouldImmediatelyReject(application, process)) return;
            var next = _.find(processList, function (pItem) {
              return pItem.status === 'new';
            });
            if (next) {
              // 如果有next说明还有上级需要审核， 所以要往上发
              next.status = 'requestSent';
              var superior = next;
              createProcess(application, process.applicant, superior)
                .then(function (result) {
                  sails.log.debug(' #### ApplicationController:updateProcess Updating Application for process list after new Process had been created');
                  next.process = result.process.id;
                  save(application, user);
                });
            } else {
              sails.log.debug(' #### ApplicationController:updateProcess single mode : No further request needed, mark application %s approved', application.id);
              application.status = 'approved';
              application.processList = processList;
              save(application, user);
            }
          } else if (type.approverOption == 'arbitary') {
            sails.log.error(' #### ApplicationController:updateProcess arbitary mode', application.id, type.voteType);
            if (type.voteType === 'affirmative') { //任意一个通过就行
              sails.log.error('1');
              if (process.status === 'approved') {
                sails.log.debug(' #### ApplicationController:updateProcess arbitary-affirmative mode : No further request needed, mark application %s approved', application.id);
                application.status = 'approved';
              }
              var rejectedProcesses = _.filter(processList, function (pItem) {
                return pItem.status === 'rejected';
              })
              try {
                if (processList && rejectedProcesses && rejectedProcesses.length === processList.length) {
                  application.status = 'rejected';
                }
              } catch (err) {
                sails.log.error(`#### ApplicationController processList error : ${err} ####`);
              }
              application.processList = processList;
              save(application, user);
            } else if (type.voteType === 'unanimous') { // 全部通过
              sails.log.error('2');
              if (shouldImmediatelyReject(application, process)) {
                sails.log.error('3');
                return;
              }
              sails.log.error('4');
              var shouldApprove = _.every(processList, function (pItem) {
                return pItem.status === 'approved';
              });
              if (shouldApprove) {
                sails.log.debug(' #### ApplicationController:updateProcess arbitary-unanimous mode : No further request needed, mark application %s approved', application.id);
                application.status = 'approved';
              }
              application.processList = processList;

              save(application, user);
            } else if (type.voteType === 'consensus') { //多数通过就行
              sails.log.error('5');
              console.log(processList)
              var approvedProcesses = _.filter(processList, function (pItem) {
                return pItem.status === 'approved';
              });
              var rejectedProcesses = _.filter(processList, function (pItem) {
                return pItem.status === 'rejected';
              });
              if (processList && approvedProcesses && approvedProcesses.length > processList.length / 2) {
                sails.log.debug(' #### ApplicationController:updateProcess arbitary-consensus mode : No further request needed, mark application %s approved', application.id);
                application.status = 'approved';
              }
              if (processList && rejectedProcesses && rejectedProcesses.length > processList.length / 2) {
                sails.log.debug(' #### ApplicationController:updateProcess arbitary-consensus mode : Half process been rejected, mark application %s rejected', application.id);
                application.status = 'rejected';
              }
              application.processList = processList;
              save(application, user);
            } else if (type.voteType === 'both') {
              sails.log.error('6');
              var approvedProcesses = _.filter(processList, function (pItem) {
                return pItem.status === 'approved';
              });
              if (approvedProcesses && approvedProcesses.length > 1) {
                sails.log.debug(' #### ApplicationController:updateProcess arbitary-both mode : No further request needed, mark application %s approved', application.id)
                application.status = 'approved';
              }
              var rejectedProcesses = _.filter(processList, function (pItem) {
                sails.log.debug(' #### ApplicationController:updateProcess arbitary-both mode : left process less than 2, mark application %s rejected', application.id)
                return pItem.status === 'rejected';
              })
              if (processList && rejectedProcesses && rejectedProcesses.length > (processList.length - 2)) {
                application.status = 'rejected';
              }
              save(application, user);
            }
          }
        }

      })
  },

  create: function (req, res, next) {
    sails.log.debug(' #### ApplicationController:create Creating Application');
    const quickApplication = req.body.quickApplication;
    var application = req.body;
    var user = req.body && req.body.user ? req.body.user : req.session.user ? req.session.user : req.user ? req.user : undefined;
    if (!user) {
      sails.log.error(' #### ApplicationController:create No User found');
      res.forbidden({ error: 'user can not be found' });
    }
    if (application.SyncFrom) {
      Application.create(application)
        .then((data) => {
          return res.ok(data);
        }).catch((err) => {
          return res.badRequest(err);
        });
    } else {
      var findCreateApplication = function (user, appType) {
        _.merge(application, {
          flatType: appType.type,
          createdBy: user.id,
          updatedBy: user.id,
          applicant: { id: user.id },
          status: appType.approverOption === 'none' ? 'approved' : 'pending'
        });
        if (appType.approverOption === 'none') {
          application = Object.assign(application, { remoteStatus: 'approved' });
          application.start = moment().format('YYYY-MM-DD HH:mm');
          application.end = moment().add(1, 'd').format('YYYY-MM-DD HH:mm');
        }

        var typeCriteria = null;
        if (appType.type == 'both') {
          typeCriteria = ['gun', 'bullet', 'both'];
        } else if (appType.type == 'gun') {
          typeCriteria = ['gun', 'both'];
        } else if (appType.type == 'bullet') {
          typeCriteria = ['bullet', 'both'];
        } else if (appType.type == 'emergency') {
          typeCriteria = ['emergency'];
        } else if (appType.type == 'storageGun') {
          typeCriteria = ['storageGun'];
        } else if (appType.type == 'storageBullet') {
          typeCriteria = ['storageBullet'];
        } else if (appType.type == 'maintain') {
          typeCriteria = ['maintain'];
        }

        var start = new Date(application.start);
        var before = new Date(start.getTime() - 5 * 60 * 1000);
        var end = new Date(application.end);
        var now = new Date();
        if (start >= end) {
          return res.badRequest({ error: '开始时间不能在结束时间之后' });
        }
        if (start < before) {
          return res.badRequest({ error: '开始时间不能选择在过去' });
        }
        if (end < now) {
          return res.badRequest({ error: '结束时间不能选择在过去' });
        }

        //DB-Opt
        Application.find({
          status: { '!': ['complete', 'rejected', 'cancelled', 'expire'] },
          isDeleted: false,
          flatType: typeCriteria,
          or: [
            { start: { '<=': application.start }, end: { '>': application.start } },
            { start: { '>=': application.start, '<': application.end } }
          ],
          applicant: user.id
        })
          .exec(function (err, rs) {
            if (err) {
              sails.log.error(' #### ApplicationController:create find application error');
              sails.log.error(err);
              return res.negotiate({ error: '提交申请出错，请重试' });
            }
            function createApplication() {
              sails.log.debug(' #### ApplicationController:create selected time range is available for create new application');
              if (application.flatType == 'gun') {
                if (application.gun && application.gun.split(',').length > 1) {
                  Application.create(sails.services.utils.replaceNull(application))
                    .exec(
                      function (err, application) {
                        if (err) {
                          sails.log.error(' #### ApplicationController:create User with ID ' + user.id + ' try to create application failed ' + err);
                          return res.serverError(err);
                        } else {
                          selectAppProcessType(appType, application, user);
                          createOptLog({
                            object: 'application',
                            action: '提交申请',
                            log: `${user.alias}因 ${application.detail} 提交 ${flatTypeList[application.flatType]} 工单 \n起始时间: ${moment(application.start).format('YYYY年MM月DD日 HH:mm')} \n结束时间: ${moment(application.end).format('YYYY年MM月DD日 HH:mm')}`,
                            logType: 'normal',
                            objectId: application.id,
                            createdBy: user.id,
                            updatedBy: user.id
                          });
                          const gunIds = application.gun.split(',');
                          Gun.find({ id: gunIds }).populate('associatedBulletModule').exec((err, guns) => {
                            if (err) console.error(err)
                            return res.ok(Object.assign(application, { gun: guns }))
                          })
                        }
                      }
                    );
                } else {
                  let checkResult = checkGunInfo(application.gun);
                  if (!checkResult) {
                    return res.badRequest({ error: '目标枪支状态不可用，无法选择' });
                  }
                  if (application.gun && application.cabinetModule) {
                    //DB-Opt
                    CabinetModule.find({ gun: application.gun })
                      .exec(function (err, data) {
                        if (err) {
                          sails.log.error(err);
                          return res.serverError(err);
                        }
                        if (data && data.length !== 0) {
                          if (data[0].gunLock === 'broken') {
                            return res.badRequest({ error: '枪锁堵转禁止使用，请取消后重新操作' });
                          }
                          if (!application.cabinet) application.cabinet = data[0].cabinet;
                        }
                        Application.create(sails.services.utils.replaceNull(application))
                          .exec(
                            function (err, application) {
                              if (err) {
                                sails.log.error(' #### ApplicationController:create User with ID ' + user.id + ' try to create application failed ' + err);
                                return res.serverError(err);
                              } else {
                                selectAppProcessType(appType, application, user);
                                createOptLog({
                                  object: 'application',
                                  action: '提交申请',
                                  log: `${user.alias}因 ${application.detail} 提交 ${flatTypeList[application.flatType]} 工单 \n起始时间: ${moment(application.start).format('YYYY年MM月DD日 HH:mm')} \n结束时间: ${moment(application.end).format('YYYY年MM月DD日 HH:mm')}`,
                                  logType: 'normal',
                                  objectId: application.id,
                                  createdBy: user.id,
                                  updatedBy: user.id
                                });
                                Gun.find({ id: application.gun }).populate('associatedBulletModule').exec((err, guns) => {
                                  if (err) console.error(err)
                                  return res.ok(Object.assign(application, { gun: guns }))
                                })
                              }
                            }
                          );
                      });
                  } else if (application.gun && !application.cabinetModule) {
                    CabinetModule.findOne({ gun: application.gun }).then((data) => {
                      if (data) {
                        application.cabinetModule = data.id;
                        if (!application.cabinet) application.cabinet = data.cabinet;
                        Application.create(sails.services.utils.replaceNull(application))
                          .exec(
                            function (err, application) {
                              if (err) {
                                sails.log.error(' #### ApplicationController:create User with ID ' + user.id + ' try to create application failed ' + err);
                                return res.serverError(err);
                              } else {
                                selectAppProcessType(appType, application, user);
                                createOptLog({
                                  object: 'application',
                                  action: '提交申请',
                                  log: `${user.alias}因 ${application.detail} 提交 ${flatTypeList[application.flatType]} 工单 \n起始时间: ${moment(application.start).format('YYYY年MM月DD日 HH:mm')} \n结束时间: ${moment(application.end).format('YYYY年MM月DD日 HH:mm')}`,
                                  logType: 'normal',
                                  objectId: application.id,
                                  createdBy: user.id,
                                  updatedBy: user.id
                                });
                                return res.ok(application);
                              }
                            }
                          );
                      } else {
                        return res.badRequest({ error: '用户配枪未同步至主机' });
                      }
                    })
                  } else {
                    return res.badRequest({ error: '填写工单选择枪支情况异常' });
                  }
                }
              } else if (application.flatType == 'bullet') {
                if (!application.bulletType && application.gun) {
                  //用户选择取配枪子弹
                  Gun.findOne({ id: application.gun })
                    .populate('type')
                    .then((data) => {
                      application.bulletType = data.type.bulletType;
                      application.gun = null;
                      return CabinetModule.findOne({ bulletType: data.type.bulletAppType }).populate('cabinet');
                    })
                    .then((localBullet) => {
                      if (localBullet) {
                        application.cabinetModule = localBullet.id;
                        if (!application.cabinet) application.cabinet = localBullet.cabinet;
                        Application.create(sails.services.utils.replaceNull(application))
                          .exec(
                            function (err, application) {
                              if (err) {
                                sails.log.error(' #### ApplicationController:create User with ID ' + user.id + ' try to create application failed ' + err);
                                return res.serverError(err);
                              } else {
                                selectAppProcessType(appType, application, user);
                                createOptLog({
                                  object: 'application',
                                  action: '提交申请',
                                  log: `${user.alias}因 ${application.detail} 提交 ${flatTypeList[application.flatType]} 工单 \n起始时间: ${moment(application.start).format('YYYY年MM月DD日 HH:mm')} \n结束时间: ${moment(application.end).format('YYYY年MM月DD日 HH:mm')}`,
                                  logType: 'normal',
                                  objectId: application.id,
                                  createdBy: user.id,
                                  updatedBy: user.id
                                });
                                return res.ok({ targetModule: localBullet, application: application });
                              }
                            }
                          );
                      } else {
                        return res.badRequest({ error: '该子弹类型没有已经储存的模块' });
                      }
                    })
                } else if (application.cabinetModule) {
                  Application.create(sails.services.utils.replaceNull(application))
                    .exec(
                      function (err, application) {
                        if (err) {
                          sails.log.error(' #### ApplicationController:create User with ID ' + user.id + ' try to create application failed ' + err);
                          return res.serverError(err);
                        } else {
                          selectAppProcessType(appType, application, user);
                          createOptLog({
                            object: 'application',
                            action: '提交申请',
                            log: `${user.alias}因 ${application.detail} 提交 ${flatTypeList[application.flatType]} 工单 \n起始时间: ${moment(application.start).format('YYYY年MM月DD日 HH:mm')} \n结束时间: ${moment(application.end).format('YYYY年MM月DD日 HH:mm')}`,
                            logType: 'normal',
                            objectId: application.id,
                            createdBy: user.id,
                            updatedBy: user.id
                          });
                          const cmIds = application.cabinetModule.split(',')
                          CabinetModule.find({ id: cmIds }).exec((err, cms) => {
                            if (err) console.error(err)
                            return res.ok({ application: Object.assign(application, { cabinetModules: cms }) });
                          })
                        }
                      }
                    );
                } else if (application.bulletType) {
                  //用户选择指定类型子弹
                  CabinetModule.findOne({ bulletType: application.bulletType })
                    .populate('cabinet')
                    .then((targetModule) => {
                      if (!targetModule) {
                        return res.badRequest({ error: '该子弹类型没有已经储存的模块' });
                      }
                      application.cabinetModule = targetModule.id;
                      if (!application.cabinet) application.cabinet = targetModule.cabinet;
                      Application.create(sails.services.utils.replaceNull(application))
                        .exec(
                          function (err, application) {
                            if (err) {
                              sails.log.error(' #### ApplicationController:create User with ID ' + user.id + ' try to create application failed ' + err);
                              return res.serverError(err);
                            } else {
                              selectAppProcessType(appType, application, user);
                              createOptLog({
                                object: 'application',
                                action: '提交申请',
                                log: `${user.alias}因 ${application.detail} 提交 ${flatTypeList[application.flatType]} 工单 \n起始时间: ${moment(application.start).format('YYYY年MM月DD日 HH:mm')} \n结束时间: ${moment(application.end).format('YYYY年MM月DD日 HH:mm')}`,
                                logType: 'normal',
                                objectId: application.id,
                                createdBy: user.id,
                                updatedBy: user.id
                              });

                              return res.ok({ targetModule: targetModule, application: application });
                            }
                          }
                        );
                    })
                } else {
                  return res.badRequest({ error: '工单类型与用户情况有误' });
                }

              } else if (application.flatType == 'emergency') {
                Application.create(sails.services.utils.replaceNull(application))
                  .exec(
                    function (err, application) {
                      if (err) {
                        sails.log.error(' #### ApplicationController:create User with ID ' + user.id + ' try to create application failed ' + err);
                        return res.serverError(err);
                      } else {
                        selectAppProcessType(appType, application, user);
                        createOptLog({
                          object: 'application',
                          action: '提交申请',
                          log: `${user.alias}因 ${application.detail} 提交 ${flatTypeList[application.flatType]} 工单 \n起始时间: ${moment(application.start).format('YYYY年MM月DD日 HH:mm')} \n结束时间: ${moment(application.end).format('YYYY年MM月DD日 HH:mm')}`,
                          logType: 'normal',
                          objectId: application.id,
                          createdBy: user.id,
                          updatedBy: user.id
                        });

                        return res.ok(application);
                      }
                    }
                  );
              } else if (application.flatType == 'maintain') {
                Application.create(sails.services.utils.replaceNull(application))
                  .exec(
                    function (err, application) {
                      if (err) {
                        sails.log.error(' #### ApplicationController:create User with ID ' + user.id + ' try to create application failed ' + err);
                        return res.serverError(err);
                      } else {
                        selectAppProcessType(appType, application, user);
                        createOptLog({
                          object: 'application',
                          action: '提交申请',
                          log: `${user.alias}因 ${application.detail} 提交 ${flatTypeList[application.flatType]} 工单 \n起始时间: ${moment(application.start).format('YYYY年MM月DD日 HH:mm')} \n结束时间: ${moment(application.end).format('YYYY年MM月DD日 HH:mm')}`,
                          logType: 'normal',
                          objectId: application.id,
                          createdBy: user.id,
                          updatedBy: user.id
                        });

                        return res.ok(application);
                      }
                    }
                  );
              } else if (application.flatType == 'storageBullet' || application.flatType == 'storageGun') {
                if (application.cabinet) {
                  Application.create(sails.services.utils.replaceNull(application))
                    .exec(
                      function (err, application) {
                        if (err) {
                          sails.log.error(' #### ApplicationController:create User with ID ' + user.id + ' try to create application failed ' + err);
                          return res.serverError(err);
                        } else {
                          selectAppProcessType(appType, application, user);
                          createOptLog({
                            object: 'application',
                            action: '提交申请',
                            log: `${user.alias}因 ${application.detail} 提交 ${flatTypeList[application.flatType]} 工单 \n起始时间: ${moment(application.start).format('YYYY年MM月DD日 HH:mm')} \n结束时间: ${moment(application.end).format('YYYY年MM月DD日 HH:mm')}`,
                            logType: 'normal',
                            objectId: application.id,
                            createdBy: user.id,
                            updatedBy: user.id
                          });

                          return res.ok(application);
                        }
                      }
                    );
                } else {
                  return res.badRequest({ error: '工单未包含目标柜机' })
                }
              }
            }
            System.findOne({ key: 'onlyFetch' }).exec((err, sys) => {
              if (err) return res.serverError(err);
              if (sys && sys.value === 'true') {
                createApplication();
              } else if (rs.length == 0) {
                createApplication();
              } else {
                return res.badRequest({ error: '在选择的时间段中已经有正在进行的申请，不能重复提交，你可以取消之前的申请后再提交新申请' });
              }

            })
          });
      }

      var perpareApplicationType = function (user) {
        ApplicationType.findOne({ id: application.type })
          .populate('approvers')
          .exec(function (err, applicationType) {
            if (err) {
              sails.log.error(' #### ApplicationController: Find Application Type Error #### ');
              return res.serverError(err);
            }
            if (applicationType) {
              if (applicationType.approverOption == 'single' && !user.superior) {
                return res.badRequest({ error: '当前用户没有直属领导，无法选择直属领导审批的方式' });
              }
              findCreateApplication(user, applicationType);
            } else {
              sails.log.error(' #### ApplicationController:No Application #### ');
              return res.serverError(err);
            }
          });
      }

      User.findOne({ id: user.id })
        .populate('position')
        .exec(function (err, user) {
          if (err) {
            sails.log.debug(' #### ApplicationController:create Can not find user  #### ');
            sails.log.debug(err);
            return res.badRequest({ error: sails.__('No position found') });
          }

          if (!user) {
            sails.log.debug(' #### ApplicationController:create Can not find user  #### ');
            return res.badRequest({ error: sails.__('No User found') });
          }

          perpareApplicationType(user);
        });

    }
  },

  //前台用户完成取枪的流程， 通过完成按钮来标记这个申请的状态变化
  processed: function (req, res) {
    sails.log.debug('### ApplicationController:processed Mark application as processed and record the real gun or bullet ###');
    let isOneMachine = req.headers.onemachine;
    if (req.params && req.params.id) {
      let status = req.body.status;
      let module = req.body.module;
      if (module) { // 获取 gun 或者 bullet的操作
        if (module.id) {
          sails.log.debug('### ApplicationController:processed module is valid and id is %s ###', module.id);

          if (module.type === 'gun') { // 取枪之后的更新申请功能
            sails.log.debug('### ApplicationController:processed module type is gun  ###');
            if (isOneMachine) {
              let gunId = req.body.gunId;
              Application.update({ id: req.params.id }, { status: status }).exec((err, rs) => {
                if (err) {
                  sails.log.error(`#### ApplicationController : processed update app failed ${err} ####`);
                  return res.badRequest(err);
                } else {
                  Gun.update({ id: gunId }, { storageStatus: 'out' }).exec((err, rs) => {
                    if (err) {
                      sails.log.error(`#### ApplicationController : processed update gun failed ${err} ####`);
                      return res.badRequest(err);
                    } else {
                      return res.ok(rs);
                    }
                  })
                }
              })
            } else {
              CabinetModule.findOne({ id: module.id })
                .populate('gun')
                .then((module) => {
                  if (!module) {
                    sails.log.error(' #### ApplicationController:processed Can not find module tha has gun #### ');
                    sails.log.error(err);
                    return Promise.reject('找不到仓位模块');
                  }
                  sails.log.info(module);
                  sails.log.debug('### ApplicationController:processed module info fetched from db ###');

                  let gun = module.gun;

                  //查看是否已经绑定了枪支
                  if (!gun) {
                    sails.log.error(' #### ApplicationController:processed module has no gun #### ');
                    return Promise.reject('对应枪位没有存入枪支');
                  }
                  return Promise.all([
                    Gun.update({ id: gun.id }, { storageStatus: 'out' }),
                    Application.update({ id: req.params.id }, { status: status, actualGun: gun.id, actualNum: 1, cabinetModule: module.id })
                  ])
                })
                .then((data) => {
                  if (!data) {
                    sails.log.error(' #### ApplicationController:processed Can not update Application  #### ');
                    return Promise.reject('更新申请失败');
                  }
                  sails.log.debug('### ApplicationController:processed update application success ###');
                  sails.log.info(data);
                  return res.ok(data);
                })
                .catch((err) => {
                  if (err) {
                    sails.log.error(' #### ApplicationController:processed Can not find CabinetModule #### ');
                    sails.log.error(err);
                    return res.badRequest(err);
                  }
                })
            }
          } else { // 取子弹之后的更新
            sails.log.debug('### ApplicationController:processed module type is bullet  ###');
            if (isOneMachine) {
              Application.update({ id: req.params.id }, { status: status }).exec((err, rs) => {
                if (err) {
                  sails.log.error(`#### ApplicationController : processed update bullet app failed ${err} ####`);
                  return res.badRequest(err);
                } else {
                  return res.ok(rs);
                }
              })
            } else {
              CabinetModule.findOne({ id: module.id })
                .populate('bulletType')
                .then((module) => {
                  if (!module) {
                    sails.log.error(' #### ApplicationController:processed Can not find module tha has bullet #### ');
                    sails.log.error(err);
                    return Promise.reject('找不到仓位模块');
                  }
                  let bulletType = module.bulletType;

                  //查看是否已经绑定了枪支
                  if (!bulletType) {
                    sails.log.error(' #### ApplicationController:processed module has no bulletType #### ');

                    return Promise.reject('对应仓位模块没有指定子弹类型');
                  }

                  sails.log.debug('### ApplicationController:processed module with bulletType id %s ###', bulletType.id);

                  Application.update(
                    { id: req.params.id },
                    { status: status, actualBulletType: bulletType.id, actualNum: 1 /*todo*/, cabinetModule: module.id }
                  )
                    .then((data) => {
                      if (!data) {
                        sails.log.error(' #### ApplicationController:processed Can not update Application  #### ');
                        return Promise.reject('更新申请失败');
                      }
                      sails.log.debug('### ApplicationController:processed Application update success with bullet module info  ###');
                      sails.log.silly(data);
                      return res.ok(data);
                    })
                    .catch((err) => {
                      if (err) {
                        sails.log.error(' #### ApplicationController:processed Can not update Application #### ');
                        sails.log.error(err);
                        return Promise.reject('找不到申请');
                      }
                    })
                })
                .catch((err) => {
                  if (err) {
                    sails.log.error(' #### ApplicationController:processed Find CabinetModule Error#### ');
                    sails.log.error(err);
                    return res.badRequest(err);
                  }
                })
            }
          }
        }
      } else {
        // 应急开启和还枪的操作
        if (typeof req.body.isReturn !== 'undefined') {

        }
        sails.log.debug('### ApplicationController:processed open all module ###');

        Application.update(
          { id: req.params.id },
          { status: status }
        )
          .then((data) => {
            if (!data) {
              sails.log.error(' #### ApplicationController:processed Can not update Application  #### ');
              return res.serverError({ err: '更新申请失败' });
            }
            sails.log.debug('### ApplicationController:processed Application update success for openall action ###');
            sails.log.silly(data);
            return res.ok(data);
          })
          .catch((err) => {
            if (err) {
              sails.log.error(' #### ApplicationController:processed Can not update Application #### ');
              sails.log.error(err);
              return res.badRequest({ error: '更新申请失败' });
            }
          })
      }
    } else {
      return res.badRequest();
    }
  },

  validate: function (req, res) {
    sails.log.debug('get User application');
    var user = req.session.passport;
    if (user) {
      // User.findOne()
      res.ok({ 'info': 'id is' + user.id });
    } else {
      res.ok({ 'error': 'no user provided' });
    }
  },

  check: function (req, res) {
    sails.log.debug('Check User Application');
    var user = req.body && req.body.user ? req.body.user : req.session.user ? req.session.user : req.user ? req.user : undefined;
    let isOneMachine = req.headers.onemachine;
    if (!user) {
      sails.log.debug('No User found, exit');
      res.forbidden(403);
      return;
    } else {
      var now = new Date();
      let end = new Date(now.getTime() + 5 * 60 * 1000);
      Application.findOne({ status: ['approved', 'pending', 'rejected'], flatType: ['gun', 'both'], start: { '<=': end }, end: { '>=': now }, applicant: user.id })
        .populate('cabinet')
        .sort('createdAt DESC')
        .exec(function (err, app) {
          if (err) {
            sails.log.error('Error when to find application');
            res.badRequest({ error: '获取申请时出错' });
            return;
          }
          if (!app) {
            sails.log.debug('Can not find application');
            res.badRequest({ error: '没有找到有效的申请' });
            return;
          } else {
            if (isOneMachine) {
              if (app.status == 'rejected') {
                return res.badRequest({ info: '您的申请已被拒绝', application: app })
              } else if (app.status == 'pending') {
                return res.badRequest({ info: '您的申请正在审核', application: app })
              } else if (app.status == 'approved') {
                try {
                  if (app.gun) {
                    const gunIds = app.gun.split(',');
                    Gun.find({ id: gunIds }).populate('associatedBulletModule').exec((err, guns) => {
                      if (err) throw err;
                      return res.ok({ application: app, user: user, gun: guns });
                    })
                  } else {
                    return res.ok({ application: app, user: user });
                  }
                } catch (e) {
                  sails.log.error(`#### ApplicationController : check get gun failed`);
                  sails.log.error(e);
                  return res.serverError({ msg: '内部错误' });
                }
              }
              return;
            }
            if (app.cabinet !== sails.config.cabinet.id) {
              Cabinet.findOne({ code: app.cabinet }).exec((err, cabinet) => {
                if (!err && cabinet) {
                  return res.badRequest({
                    type: 'notLocalApplication',
                    name: cabinet.name,
                    ip: cabinet.host,
                    error: `请到柜机名: ${cabinet.name}, IP : ${cabinet.host} 柜机操作`
                  });
                } else {
                  return res.badRequest({
                    type: 'notLocalApplication',
                    error: '请到对应柜机操作当前工单'
                  });
                }
              })
            } else {
              if (app.status == 'rejected') {
                return res.badRequest({ info: '您的申请已被拒绝', application: app })
              } else if (app.status == 'pending') {
                return res.badRequest({ info: '您的申请正在审核', application: app })
              } else if (app.status == 'approved') {
                if (app && app.cabinetModule && app.gun) {
                  CabinetModule.findOne({ id: app.cabinetModule })
                    .populate('gun')
                    .then((data) => {
                      if (!data) {
                        return res.badRequest({ error: '当前用户工单对应模块不在本柜机' });
                      }
                      if (!data.gun || data.gun.id != app.gun) {
                        return res.badRequest({ error: '工单记录模块与模块存放枪支不符' });
                      }
                      Gun.findOne({ id: app.gun })
                        .populate('cabinetModule')
                        .exec(function (err, gun) {
                          if (err) {
                            sails.log.error(err);
                            return res.serverError(err);
                          }
                          if (!gun) {
                            return res.badRequest({ error: '用户配枪不在枪位' });
                          }
                          return res.ok({ application: app, user: user, gun: gun })
                        });
                    });
                } else if (app && !app.cabinetModule && !app.gun) {
                  sails.log.debug('Application found, going to get gun infomantion');
                  var userId = app.applicant;
                  User.findOne({ id: userId })
                    .populate('guns')
                    .exec(function (err, user) {
                      sails.log.debug('User and gun infomantion found, going to return');
                      if (user.guns && user.guns.length > 0) {
                        Gun.findOne(_.pick(user.guns[0], 'id'))
                          .populate('cabinetModule')
                          .exec(function (err, gun) {
                            if (err) {
                              sails.log.error(err);
                              return res.serverError(err);
                            }
                            if (gun.cabinetModule && gun.cabinetModule.length == 1) {
                              return res.ok({ application: app, user: user, gun: gun })
                            } else {
                              sails.log.error('targetGun is not in Cabinet');
                              return res.badRequest({ error: '用户配枪不在枪位' });
                            }
                          });
                      } else {
                        sails.log.error('User has no guns')
                        return res.badRequest({ error: '工单无公用枪信息且用户无配枪无法取枪' })
                      }
                    });
                } else {
                  sails.log.debug('Can not find application');
                  res.badRequest({ error: '没有找到有效的申请' });
                  return;
                }
              }
            }
          }
        })
    }
  },

  emergencycheck: function (req, res) {
    sails.log.debug('Check User emergency Application');
    let isOneMachine = req.headers.onemachine;
    var user = req.body && req.body.user ? req.body.user : req.session.user ? req.session.user : req.user ? req.user : undefined;
    if (!user) {
      sails.log.debug('No User found, exit');
      res.forbidden(403);
      return;
    } else {
      var now = new Date();
      let end = new Date(now.getTime() + 5 * 60 * 1000);
      Application.findOne({ status: ['approved', 'pending', 'rejected'], flatType: ['emergency'], start: { '<=': end }, end: { '>=': now }, applicant: user.id })
        .sort('createdAt DESC')
        .populate('cabinet')
        .exec(function (err, app) {
          if (err) {
            sails.log.error('Error when to find application');
            res.badRequest({ error: '获取申请时出错' });
            return;
          }
          if (!app) {
            sails.log.debug('Can not find application');
            res.badRequest({ error: '没有找到有效的申请' });
          } else if (isOneMachine) {
            if (app.status == 'rejected') {
              return res.badRequest({ info: '您的申请已被拒绝', application: app })
            } else if (app.status == 'pending') {
              return res.badRequest({ info: '您的申请正在审核', application: app })
            } else if (app.status == 'approved') {
              return res.ok({ application: app, user: user });
            }
          } else if (app.cabinet !== sails.config.cabinet.id) {
            Cabinet.findOne({ code: app.cabinet }).exec((err, cabinet) => {
              if (!err && cabinet) {
                return res.badRequest({
                  type: 'notLocalApplication',
                  name: cabinet.name,
                  ip: cabinet.host,
                  error: `请到柜机名: ${cabinet.name}, IP : ${cabinet.host} 柜机操作`
                });
              } else {
                return res.badRequest({
                  type: 'notLocalApplication',
                  error: '请到对应柜机操作当前工单'
                });
              }
            })
          } else {
            if (app.status == 'rejected') {
              return res.badRequest({ info: '您的申请已被拒绝', application: app })
            } else if (app.status == 'pending') {
              return res.badRequest({ info: '您的申请正在审核', application: app })
            } else if (app.status == 'approved') {
              if (app) {
                sails.log.debug('Application found, going to get gun infomantion');
                var userId = app.applicant;
                User.findOne({ id: userId })
                  .exec(function (err, user) {
                    if (err) {
                      sails.log.error(' #### ApplicationController:emergencycheck Can not find Application #### ');
                      return res.serverError({ error: '找不到申请' });
                    }
                    sails.log.debug('User and gun infomantion found, going to return');
                    return res.ok({ application: app, user: user })
                  });
              } else {
                sails.log.debug('Can not find application');
                res.badRequest({ error: '没有找到有效的申请' });
                return;
              }
            }
          }
        })
    }
  },

  maintainCheck: function (req, res) {
    sails.log.debug('Check User maintain Application');
    let isOneMachine = req.headers.onemachine;
    var user = req.body && req.body.user ? req.body.user : req.session.user ? req.session.user : req.user ? req.user : undefined;
    if (!user) {
      sails.log.debug('No User found, exit');
      res.forbidden(403);
      return;
    } else {
      var now = new Date();
      let end = new Date(now.getTime() + 5 * 60 * 1000);
      Application.findOne({ status: ['approved', 'pending', 'rejected'], flatType: ['maintain'], start: { '<=': end }, end: { '>=': now }, applicant: user.id })
        .sort('createdAt DESC')
        .populate('cabinet')
        .exec(function (err, app) {
          if (err) {
            sails.log.error('Error when to find application');
            res.badRequest({ error: '获取申请时出错' });
            return;
          }
          if (!app) {
            sails.log.debug('Can not find application');
            res.badRequest({ error: '没有找到有效的申请' });
          } else {
            if (isOneMachine) {
              if (app.status == 'rejected') {
                return res.badRequest({ info: '您的申请已被拒绝', application: app })
              } else if (app.status == 'pending') {
                return res.badRequest({ info: '您的申请正在审核', application: app })
              } else if (app.status == 'approved') {
                return res.ok({ application: app, user: user });
              }
            }
            if (app.status == 'rejected') {
              return res.badRequest({ info: '您的申请已被拒绝', application: app })
            } else if (app.status == 'pending') {
              return res.badRequest({ info: '您的申请正在审核', application: app })
            } else if (app.status == 'approved') {
              if (app) {
                sails.log.debug('Application found, going to get gun infomantion');
                var userId = app.applicant;
                User.findOne({ id: userId })
                  .exec(function (err, user) {
                    if (err) {
                      sails.log.error(' #### ApplicationController:maintaincheck Can not find Application #### ');
                      return res.serverError({ error: '找不到申请' });
                    }
                    sails.log.debug('User and gun infomantion found, going to return');
                    return res.ok({ application: app, user: user })
                  });
              } else {
                sails.log.debug('Can not find application');
                res.badRequest({ error: '没有找到有效的申请' });
                return;
              }
            }
          }
        })
    }
  },

  returnMaintainCheck: function (req, res) {
    sails.log.debug('Check User Application for return maintain');
    var user = req.body && req.body.user ? req.body.user : req.session.user ? req.session.user : req.user ? req.user : undefined;
    let isOneMachine = req.headers.onemachine;
    if (!user) {
      sails.log.debug('No User found, exit');
      res.forbidden(403);
      return;
    } else {
      var now = new Date();
      Application.findOne({ status: ['processed', 'timeout', 'prereturn'], flatType: ['maintain'], applicant: user.id })
        .sort('createdAt DESC')
        .populate('cabinet')
        .exec(function (err, app) {
          if (err) {
            sails.log.debug('Error when to find application');
            res.badRequest({ error: '没有找到有效的申请' });
            return;
          }
          if (app) {
            if (isOneMachine) {
              return res.ok({ application: app, user: user, cabModules: app.cabinetModule });
            }
            if (app.cabinet !== sails.config.cabinet.id) {
              Cabinet.findOne({ code: app.cabinet }).exec((err, cabinet) => {
                if (!err && cabinet) {
                  return res.badRequest({
                    type: 'notLocalApplication',
                    name: cabinet.name,
                    ip: cabinet.host,
                    error: `请到柜机名: ${cabinet.name}, IP : ${cabinet.host} 柜机操作`
                  });
                } else {
                  return res.badRequest({
                    type: 'notLocalApplication',
                    error: '请到对应柜机操作当前工单'
                  });
                }
              })
            } else {
              return res.ok({ application: app, user: user, cabModules: app.cabinetModule });
            }
          } else {
            sails.log.debug('Can not find application');
            return res.badRequest({ error: '没有找到有效的申请' });
          }
        })
    }
  },

  returnguncheck: function (req, res) {
    sails.log.debug('Check User Application for return gun');
    var user = req.body && req.body.user ? req.body.user : req.session.user ? req.session.user : req.user ? req.user : undefined;
    let isOneMachine = req.headers.onemachine;
    if (!user) {
      sails.log.debug('No User found, exit');
      res.forbidden(403);
      return;
    } else {
      var now = new Date();
      Application.findOne({ status: ['processed', 'timeout', 'prereturn'], flatType: ['gun', 'both'], applicant: user.id })
        .populate('cabinet')
        .sort('createdAt DESC')
        .exec(function (err, app) {
          if (err) {
            sails.log.debug('Error when to find application');
            res.badRequest({ error: '没有找到有效的申请' });
            return;
          }
          if (!app) {
            sails.log.debug('Can not find application');
            res.badRequest({ error: '没有找到有效的申请' });
            return;
          }
          if (isOneMachine) {
            try {
              if (app.gun) {
                const gunIds = app.gun.split(',');
                Gun.find({ id: gunIds }).populate('associatedBulletModule').exec((err, guns) => {
                  if (err) throw err;
                  return res.ok({ application: app, user: user, gun: guns });
                })
              } else {
                return res.ok({ application: app, user: user });
              }
            } catch (e) {
              sails.log.error(`#### ApplicationController : check get gun failed`);
              sails.log.error(e);
              return res.serverError({ msg: '内部错误' });
            }
            return;
          } else if (app.cabinet !== sails.config.cabinet.id) {
            Cabinet.findOne({ code: app.cabinet }).exec((err, cabinet) => {
              if (!err && cabinet) {
                return res.badRequest({
                  type: 'notLocalApplication',
                  name: cabinet.name,
                  ip: cabinet.host,
                  error: `请到柜机名: ${cabinet.name}, IP : ${cabinet.host} 柜机操作`
                });
              } else {
                return res.badRequest({
                  type: 'notLocalApplication',
                  error: '请到对应柜机操作当前工单'
                });
              }
            })
          } else {
            if (app && app.cabinetModule && app.gun) {
              CabinetModule.findOne({ id: app.cabinetModule })
                .populate('gun')
                .then((data) => {
                  if (!data) {
                    return res.badRequest({ error: '当前用户工单对应模块不在本柜机' });
                  }
                  if (data.gun.id != app.gun) {
                    return res.badRequest({ error: '工单记录模块与模块存放枪支不符' });
                  }
                  if (data.gunLock === 'broken') {
                    return res.badRequest({ error: '该枪锁堵转禁止操作' });
                  }
                  Gun.findOne({ id: app.gun })
                    .populate('cabinetModule')
                    .exec(function (err, gun) {
                      if (err) {
                        sails.log.error(err);
                        return res.serverError(err);
                      }
                      if (!gun) {
                        return res.badRequest({ error: '用户配枪不在枪位' });
                      }
                      return res.ok({ application: app, user: user, gun: gun })
                    });
                });
            } else if (app && !app.cabinetModule && !app.gun) {
              sails.log.debug('Application found, going to get gun infomantion');
              //使用批量取枪之后, actualGun字段已失效
              if (!app.actualGun) {
                sails.log.error(' #### ApplicationController:returnguncheck Can not find actualGun from Application #### ');
                return res.serverError({ error: '没有枪支信息' })
              }
              Gun.findOne({ id: app.actualGun.id })
                .populate('cabinetModule')
                .exec(function (err, gun) {
                  if (err) {
                    sails.log.error(err);
                    return res.serverError(err);
                  }
                  return res.ok({ application: app, user: user, gun: gun })
                });
            }
          }
        })
    }
  },

  returnbulletcheck: function (req, res) {
    sails.log.debug('Check User Application for return bullet');
    var user = req.body && req.body.user ? req.body.user : req.session.user ? req.session.user : req.user ? req.user : undefined;
    let isOneMachine = req.headers.onemachine;
    if (!user) {
      sails.log.debug('No User found, exit');
      res.forbidden(403);
      return;
    } else {
      var now = new Date();
      Application.findOne({ status: ['processed', 'timeout', 'prereturn'], flatType: ['bullet', 'both'], applicant: user.id })
        // .populate('cabinetModule')
        .populate('cabinet')
        .sort('createdAt DESC')
        .exec(function (err, app) {
          if (err) {
            sails.log.debug('Error when to find application');
            res.badRequest({ error: '没有找到有效的申请' });
            return;
          }
          if (app) {
            if (isOneMachine) {
              const cabinetModuleIds = app.cabinetModule && app.cabinetModule.split(',') || 0
              CabinetModule.find({ id: cabinetModuleIds }).exec((err, cms) => {
                if (err) throw err;
                return res.ok({ application: app, user: user, cabinetModules: cms });
              })
            } else if (app.cabinet !== sails.config.cabinet.id) {
              Cabinet.findOne({ code: app.cabinet }).exec((err, cabinet) => {
                if (!err && cabinet) {
                  return res.badRequest({
                    type: 'notLocalApplication',
                    name: cabinet.name,
                    ip: cabinet.host,
                    error: `请到柜机名: ${cabinet.name}, IP : ${cabinet.host} 柜机操作`
                  });
                } else {
                  return res.badRequest({
                    type: 'notLocalApplication',
                    error: '请到对应柜机操作当前工单'
                  });
                }
              })
            } else {
              return res.ok({ application: app, user: user });
            }
          } else {
            sails.log.debug('Can not find application');
            return res.badRequest({ error: '没有找到有效的申请' });
          }
        })
    }
  },

  checkbullet: function (req, res) {
    sails.log.debug('Check User Application for bullet');
    var user = req.body && req.body.user ? req.body.user : req.session.user ? req.session.user : req.user ? req.user : undefined;
    let isOneMachine = req.headers.onemachine;
    if (!user) {
      sails.log.debug('No User found, exit');
      res.forbidden(403);
      return;
    } else {
      var now = new Date();
      let end = new Date(now.getTime() + 5 * 60 * 1000);
      Application.findOne({ status: ['approved', 'pending', 'rejected'], flatType: ['bullet', 'both'], start: { '<=': end }, end: { '>=': now }, applicant: user.id })
        // .populate('cabinetModule')
        .sort('createdAt DESC')
        .populate('cabinet')
        .exec(function (err, app) {
          if (err) {
            sails.log.debug('Error when to find application');
            res.badRequest({ error: '获取取弹申请时出错' });
            return;
          }
          if (!app) {
            sails.log.debug('Can not find application');
            res.badRequest({ error: '没有找到有效的取弹申请' });
          } else {
            if (isOneMachine) {
              if (app.status == 'rejected') {
                return res.badRequest({ info: '您的申请已被拒绝', application: app })
              } else if (app.status == 'pending') {
                return res.badRequest({ info: '您的申请正在审核', application: app })
              } else if (app.status == 'approved') {
                const cabinetModuleIds = app.cabinetModule && app.cabinetModule.split(',') || 0
                CabinetModule.find({ id: cabinetModuleIds }).exec((err, cms) => {
                  if (err) console.error(err)
                  return res.ok({ application: app, user: user, cabinetModules: cms });
                })
              }
            } else if (app.cabinet !== sails.config.cabinet.id) {
              Cabinet.findOne({ code: app.cabinet }).exec((err, cabinet) => {
                if (!err && cabinet) {
                  return res.badRequest({
                    type: 'notLocalApplication',
                    name: cabinet.name,
                    ip: cabinet.host,
                    error: `请到柜机名: ${cabinet.name}, IP : ${cabinet.host} 柜机操作`
                  });
                } else {
                  return res.badRequest({
                    type: 'notLocalApplication',
                    error: '请到对应柜机操作当前工单'
                  });
                }
              })
            } else {
              if (app.status == 'rejected') {
                return res.badRequest({ info: '您的申请已被拒绝', application: app })
              } else if (app.status == 'pending') {
                return res.badRequest({ info: '您的申请正在审核', application: app })
              } else if (app.status == 'approved') {
                if (app) {
                  if (!app.cabinetModule || app.cabinetModule.length == 0) {
                    sails.log.error('Application Not Include CabinetModule Info');
                    return res.badRequest({ error: '申请的取枪工单未包含正确柜机信息' });
                  }
                  return processBulletInfo(req, res, app);
                } else {
                  sails.log.debug('Can not find application for bullet');
                  res.badRequest({ error: '没有找到有效的取弹申请' });
                  return;
                }
              }
            }
          }
        })
    }
  },

  storageCheck: function (req, res) {
    sails.log.debug('Check User Application for Save');
    let user = req.session.user ? req.session.user : req.user;
    let isOneMachine = req.headers.onemachine;
    let type = req.params.type;
    if (!user) {
      sails.log.debug('No User found, exit');
      return res.forbidden(403);
    } else {
      let now = new Date();
      let end = new Date(now.getTime() + 5 * 60 * 1000);
      let query = {};
      if (!type) {
        sails.log.debug('Can not find application for save');
        return res.badRequest({ error: '没有找到有效的存枪申请' });
      } else if (type == 'gun') {
        query = { status: ['approved', 'pending', 'reject'], flatType: ['storageGun'], start: { '<=': end }, end: { '>=': now }, applicant: user.id };
      } else if (type == 'bullet') {
        query = { status: ['approved', 'pending', 'reject'], flatType: ['storageBullet'], start: { '<=': end }, end: { '>=': now }, applicant: user.id };
      }
      Application.findOne(query)
        .sort('createdAt DESC')
        .populate('cabinet')
        .exec(function (err, app) {
          if (err) {
            sails.log.debug('Error when to find application');
            res.badRequest({ error: '获取存枪申请时出错' });
            return;
          }
          if (!app) {
            sails.log.debug('Can not find application');
            res.badRequest({ error: '没有找到有效的申请' });
          } else {
            if (isOneMachine) {
              if (app.status == 'rejected') {
                return res.badRequest({ info: '您的申请已被拒绝', application: app })
              } else if (app.status == 'pending') {
                return res.badRequest({ info: '您的申请正在审核', application: app })
              } else if (app.status == 'approved') {
                const cabinetModuleIds = app.cabinetModule && app.cabinetModule.split(',') || []
                if (cabinetModuleIds.length) {
                  CabinetModule.find({ id: cabinetModuleIds }).exec((err, cms) => {
                    if (err) console.error(err)
                    return res.ok({ application: app, user: user, cabinetModules: cms });
                  })
                } else {
                  return res.ok({ application: app, user: user, cabinetModules: [] });
                }
              }
            } else if (app.cabinet !== sails.config.cabinet.id) {
              Cabinet.findOne({ code: app.cabinet }).exec((err, cabinet) => {
                if (!err && cabinet) {
                  return res.badRequest({
                    type: 'notLocalApplication',
                    name: cabinet.name,
                    ip: cabinet.host,
                    error: `请到柜机名: ${cabinet.name}, IP : ${cabinet.host} 柜机操作`
                  });
                } else {
                  return res.badRequest({
                    type: 'notLocalApplication',
                    error: '请到对应柜机操作当前工单'
                  });
                }
              })
            } else {
              if (app.status == 'rejected') {
                return res.badRequest({ info: '您的申请已被拒绝', application: app })
              } else if (app.status == 'pending') {
                return res.badRequest({ info: '您的申请正在审核', application: app })
              } else if (app.status == 'approved') {
                if (app) {
                  User.findOne({ id: app.applicant })
                    .then((applicant) => {
                      return res.ok({ application: app, user: applicant })
                    })
                    .catch((err) => {
                      return res.serverError({ error: err });
                    })
                } else {
                  sails.log.debug('Can not find application for save');
                  res.badRequest({ error: '没有找到有效的存枪申请' });
                  return;
                }
              }
            }
          }
        })
    }
  },

  adminauth: function (req, res, next) {
    var application = req.body.application; // {id: }
    var applicationList = req.body.applicationList;
    console.log(`applicationList `, applicationList)
    var adminAuth = req.body.adminAuth; // base 64 string
    var user = req.body && req.body.user ? req.body.user : req.session.user ? req.session.user : req.user ? req.user : undefined;
    if (!user) {
      return res.status(403).json({ error: sails.__('Could not authenticate user because no login user found') });
    }
    var now = new Date();
    let end = new Date(now.getTime() + 5 * 60 * 1000);
    Application.findOne({
      // applicant: user.id,
      id: application.id
    })
      .exec(function (err, app) {
        if (err) {
          sails.log.debug('Error when to find application');
          res.badRequest({ error: '没有找到有效的申请' });
          return;
        }
        if (app) {
          let passed = false;
          if ((app.status == 'approved' || app.status == 'processed' || app.status == 'prereturn') && app.start <= end) {
            passed = true;
          } else if ((app.status == 'timeout' || app.status == 'prereturn') && app.end <= now) {
            passed = true;
          }

          if (passed) {
            var authString = new Buffer(adminAuth, 'base64').toString();
            var username = authString.split(':')[0];
            var password = authString.split(':')[1];

            sails.log.debug('authenticating', username, 'using basic auth:', req.url);

            localProtocol.login(req, username, password, function (error, approver, passport) {
              if (error) {
                OptLog.create({
                  object: 'application',
                  objectId: application.id,
                  action: '管理员密码认证',
                  log: '系统错误失败 申请编号:' + application.id + '程序错误',
                  logType: 'error',
                  createdBy: user.id,
                  updatedBy: user.id
                })
                  .exec(function (err) {
                    if (err) {
                      sails.log.error(' #### ApplicationController:adminauth  adding OptLog fails');
                      sails.log.error(err);
                    }
                    return res.status(500).json({ error: sails.__('系统错误') });
                  });

                return next(error);
              }
              if (!approver) {
                req.session.adminAuthenticated = null;
                return res.status(406).json({ error: sails.__('无该用户或帐号密码错误') });
              }

              if (approver.id === user.id) {
                return res.status(401).json({ error: sails.__('不能自己向自己发起授权') })
              };

              if (approver === 'Limit') {
                return res.status(401).json({ error: sails.__('已经被禁止登录，请1分钟后再尝试') })
              }
              User.findOne({ id: approver.id }).populate('roles').then((data) => {
                let result = false;
                let dataLength = data.roles.length;
                let role = data.roles;
                if (dataLength == 1) {
                  if (_.includes(role['0'].permissions, 'view-app')) {
                    result = true;
                  };
                } else if (dataLength > 1) {
                  for (let i = 0; i < dataLength; i++) {
                    if (_.includes(role[i].permissions, 'view-app')) {
                      result = true;
                      break;
                    }
                  };
                }
                if (result) {

                  req.session.adminAuthenticated = { approver: approver, application: app, applicant: user };
                  sails.services.face.removeRecord(approver.id, 'auth').then(() => {
                  })
                  // req.session.passport = _.omit(passport, 'password');
                  // 这里调用了记录图像记录, 会有3-15s的延迟
                  sails.services.utils.record((err, fn) => {
                    if (err) {
                      sails.log.error(`AuthController : apply utils record failed`);
                      sails.log.error(err);
                    } else {
                      fn(asset => {
                        Signature.find({
                          where: { application: application.id, user: approver.id },
                          sort: 'createdAt asc'
                        }).exec((err, signature) => {
                          if (err) {
                            sails.log.error(`#### ApplicaitonController : adminauth failed`);
                            sails.log.error(err);
                          } else {
                            OptLog.find({
                              object: 'application',
                              objectId: application.id,
                              actionType: ['admin_face_authorize_success', 'admin_fingerprint_authorize_success', 'admin_password_authorize_success']
                            }).exec((err, preLogs) => {
                              if (err) {
                                sails.log.error(`#### ApplicaitonController : get pre logs failed`);
                                sails.log.error(err);
                              } else {
                                // 如果已经存在该工单的管理员授权记录, 而且 之前的授权记录是这个管理员操作的, 则取第二条签名记录
                                if (preLogs.length > 0 && preLogs[0].createdBy === approver.id) {
                                  signature = signature[1];
                                } else {
                                  signature = signature[0];
                                }
                                if (applicationList) {
                                  const applicationArr = applicationList.split(',')
                                  applicationArr.forEach(applicationId => {
                                    OptLog.create({
                                      object: 'application',
                                      objectId: applicationId,
                                      action: '管理员密码认证',
                                      actionType: 'admin_password_authorize_success',
                                      logData: { applicationId: applicationId, applicantId: user.id, approverId: approver.id },
                                      log: '成功 申请编号:' + applicationId + '\n授权人:' + (approver.alias ? approver.alias : approver.username),
                                      logType: 'normal',
                                      createdBy: approver.id,
                                      updatedBy: approver.id,
                                      assets: asset ? [asset.id] : '',
                                      signature: signature ? signature.id : ''
                                    })
                                      .exec(function (err) {
                                        if (err) {
                                          sails.log.error(' #### ApplicationController:adminauth  adding OptLog fails');
                                          sails.log.error(err);
                                        }
                                      });
                                  });
                                } else {
                                  OptLog.create({
                                    object: 'application',
                                    objectId: application.id,
                                    action: '管理员密码认证',
                                    actionType: 'admin_password_authorize_success',
                                    logData: { applicationId: application.id, applicantId: user.id, approverId: approver.id },
                                    log: '成功 申请编号:' + application.id + '\n授权人:' + (approver.alias ? approver.alias : approver.username) + '\n申请人:' + (user.alias ? user.alias : user.username),
                                    logType: 'normal',
                                    createdBy: approver.id,
                                    updatedBy: approver.id,
                                    assets: asset ? [asset.id] : '',
                                    signature: signature ? signature.id : ''
                                  })
                                    .exec(function (err) {
                                      if (err) {
                                        sails.log.error(' #### ApplicationController:adminauth  adding OptLog fails');
                                        sails.log.error(err);
                                      }
                                    });
                                }
                              }
                            })
                          }
                        })
                      }, err => {
                        sails.log.error(`Auth : record error ${err}`);
                      }, true)
                    }
                  })
                  res.ok({ info: 'admin authenticated', userId: approver.id });
                } else {
                  OptLog.create({
                    object: 'application',
                    objectId: application.id,
                    actionType: 'admin_password_authorize_fail_not_admin',
                    action: '管理员密码认证',
                    logData: { applicationId: application.id, applicantId: user.id, approverId: approver.id },
                    log: '非管理员认证失败 \n申请编号:' + application.id + '\n授权人:' + (approver.alias ? approver.alias : approver.username) + '\n授权人id:' + approver.id,
                    logType: 'error',
                    createdBy: user.id,
                    updatedBy: user.id
                  })
                    .exec(function (err) {
                      if (err) {
                        sails.log.error(' #### ApplicationController:adminauth  adding OptLog fails');
                        sails.log.error(err);
                      }
                    });
                  return res.status(401).json({ error: sails.__('非管理员无法审核申请') });
                }
              })
            });
          } else {
            sails.log.debug('Invalid Status application to auth');
            res.badRequest({ error: '申请状态与申请时间冲突' });
            return;
          }
        }
      });
  },
  adminauthbyfingerprint: function (req, res, next) {
    var application = req.body.application; // {id: }
    const applicationList = req.body.applicationList;
    var user = req.body && req.body.user ? req.body.user : req.session.user ? req.session.user : req.user ? req.user : undefined;
    var me = this;
    if (!user) {
      return res.status(403).json({ error: sails.__('Could not authenticate user because no login user found') });
    }

    var now = new Date();
    let end = new Date(now.getTime() + 5 * 60 * 1000);
    Application.findOne({
      // applicant: user.id,
      id: application.id
    })
      .exec(function (err, app) {
        if (err || !app) {
          sails.log.debug('Error when to find application');
          sails.log.error(`#### ApplicationController : adminauthbyfingerprint find application failed  current applicant : ${user.id}, applicationId: ${application.id} ####`);
          res.badRequest({ error: '没有找到有效的申请' });
          return;
        }
        if (app) {
          let passed = false;
          if ((app.status == 'approved' || app.status == 'processed' || app.status == 'prereturn') && app.start <= end) {
            passed = true;
          } else if ((app.status == 'timeout' || app.status == 'prereturn') && app.end <= now) {
            passed = true;
          }
          if (passed) {
            sails.log.debug('authenticating user ', user.id, 'using fingerprint');

            sails.services.fingerprint.verifyUserFingerprint(
              function (approver, message) {
                sails.log.debug(' ##### ApplicationController:onComplete #### ');
                const preFinger = message.preFinger;
                User.findOne({ id: approver.id }).populate('roles').then((data) => {
                  let result = false;
                  let dataLength = data.roles.length;
                  let role = data.roles;
                  if (dataLength == 1) {
                    if (_.includes(role['0'].permissions, 'view-app')) {
                      result = true;
                    };
                  } else if (dataLength > 1) {
                    for (let i = 0; i < dataLength; i++) {
                      if (_.includes(role[i].permissions, 'view-app')) {
                        result = true;
                        break;
                      }
                    };
                  }
                  if (result) {
                    if (approver.id == user.id) {
                      //指纹认证失败, 重新设置正确的指纹ID
                      if (!preFinger) {
                        sails.services.redis.hdel('finger', approver.id, (err, rs) => {
                          sails.log.debug(`----- 移除错误指纹记录`)
                        })
                      } else {
                        sails.services.redis.hset('finger', approver.id, preFinger, (err, rs) => {
                          if (err) {
                            sails.log.error(err);
                          } else {
                            sails.log.debug(`----- 重设指纹  user : ${approver.id} finger : ${preFinger}`);
                          }
                        })
                      }
                      sails.log.error('You are authorize yourself');
                      OptLog.create({
                        object: 'application',
                        objectId: application.id,
                        actionType: 'admin_fingerprint_authorize_fail_same_user',
                        action: '管理员指纹认证',
                        logData: { applicationId: application.id, applicantId: user.id, approverId: approver.id },
                        log: '失败，用户不能给自己授权 \n申请编号:' + application.id + ' \n授权人:' + (approver.alias ? approver.alias : approver.username) + ' \n授权人id:' + approver.id,
                        logType: 'error',
                        createdBy: user.id,
                        updatedBy: user.id
                      })
                        .exec(function (err) {
                          if (err) {
                            sails.log.error(' #### ApplicationController:adminauthbyfingerprint  adding OptLog fails');
                            sails.log.error(err);
                          }
                        });
                      sails.services.message.local({
                        topic: 'adminauthbyfingerprint',
                        value: { info: '管理员授权失败, 不能授权自己的申请', status: 'fail' }
                      });
                    } else {
                      req.session.adminAuthenticated = { approver: approver, application: app, applicant: user };
                      sails.services.redis.hget('finger', approver.id, (err, fingerPrint) => {
                        if (err) {
                          sails.log.error(err);
                        } else {
                          sails.log.debug(`----- 获取指纹记录 user : ${approver.id} fingerprint : ${fingerPrint} -----`);
                          sails.services.utils.record((err, fn) => {
                            if (err) {
                              sails.log.error(`AuthController : apply utils record failed`);
                              sails.log.error(err);
                            } else {
                              fn(asset => {
                                Signature.find({
                                  where: { application: application.id, user: approver.id },
                                  sort: 'createdAt asc'
                                }).exec((err, signature) => {
                                  if (err) {
                                    sails.log.error(`#### ApplicaitonController : adminauthbyface failed`);
                                    sails.log.error(err);
                                  } else {
                                    OptLog.find({
                                      object: 'application',
                                      objectId: application.id,
                                      actionType: ['admin_face_authorize_success', 'admin_fingerprint_authorize_success', 'admin_password_authorize_success']
                                    }).exec((err, preLogs) => {
                                      if (err) {
                                        sails.log.error(`#### ApplicaitonController : get pre logs failed`);
                                        sails.log.error(err);
                                      } else {
                                        // 如果已经存在该工单的管理员授权记录, 而且 之前的授权记录是这个管理员操作的, 则取第二条签名记录
                                        if (preLogs.length > 0 && preLogs[0].createdBy === approver.id) {
                                          signature = signature[1];
                                        } else {
                                          signature = signature[0];
                                        }

                                        if (applicationList) {
                                          const applicationArr = applicationList.split(',')
                                          applicationArr.forEach(applicationId => {
                                            OptLog.create({
                                              object: 'application',
                                              objectId: applicationId,
                                              actionType: 'admin_fingerprint_authorize_success',
                                              action: '管理员指纹认证',
                                              logData: { applicationId: applicationId, applicantId: user.id, approverId: approver.id },
                                              log: '指纹授权成功 \n申请编号: ' + applicationId + '\n授权人:' + (approver.alias ? approver.alias : approver.username),
                                              logType: 'normal',
                                              fingerPrint: fingerPrint,
                                              createdBy: approver.id,
                                              updatedBy: approver.id,
                                              assets: asset ? [asset.id] : '',
                                              signature: signature ? signature.id : ''
                                            })
                                              .exec(function (err) {
                                                if (err) {
                                                  sails.log.error(' #### ApplicationController:adminauthbyfingerprint  adding OptLog fails');
                                                  sails.log.error(err);
                                                }
                                                //删除指纹
                                                sails.services.redis.hdel('finger', approver.id, (err, rs) => {
                                                  if (err) sails.log.error(err);
                                                  sails.log.debug(`------------ 管理员指纹认证删除指纹记录 ${approver.username} -----`)
                                                })
                                              });
                                          })
                                        } else {
                                          OptLog.create({
                                            object: 'application',
                                            objectId: application.id,
                                            actionType: 'admin_fingerprint_authorize_success',
                                            action: '管理员指纹认证',
                                            logData: { applicationId: application.id, applicantId: user.id, approverId: approver.id },
                                            log: '指纹授权成功 \n申请编号: ' + application.id + '\n授权人:' + (approver.alias ? approver.alias : approver.username) + '\n申请人:' + (user.alias ? user.alias : user.username),
                                            logType: 'normal',
                                            fingerPrint: fingerPrint,
                                            createdBy: approver.id,
                                            updatedBy: approver.id,
                                            assets: asset ? [asset.id] : '',
                                            signature: signature ? signature.id : ''
                                          })
                                            .exec(function (err) {
                                              if (err) {
                                                sails.log.error(' #### ApplicationController:adminauthbyfingerprint  adding OptLog fails');
                                                sails.log.error(err);
                                              }
                                              //删除指纹
                                              sails.services.redis.hdel('finger', approver.id, (err, rs) => {
                                                if (err) sails.log.error(err);
                                                sails.log.debug(`------------ 管理员指纹认证删除指纹记录 ${approver.username} -----`)
                                              })
                                            });
                                        }
                                      }
                                    })
                                  }
                                })
                              }, err => {
                                sails.log.error(`adminFingerprintAuth : record error ${err}`);
                              }, true)
                            }
                          })
                        }
                      })
                      sails.services.message.local({
                        topic: 'adminauthbyfingerprint',
                        value: { info: '管理员指纹认证成功', status: 'success', userId: approver.id }
                      });
                    }
                  } else {
                    //指纹认证失败, 重新设置正确的指纹ID
                    if (!preFinger) {
                      sails.services.redis.hdel('finger', approver.id, (err, rs) => {
                        sails.log.debug(`----- 移除错误指纹记录`)
                      })
                    } else {
                      sails.services.redis.hset('finger', approver.id, preFinger, (err, rs) => {
                        if (err) {
                          sails.log.error(err);
                        } else {
                          sails.log.debug(`----- 重设指纹  user : ${approver.id} finger : ${preFinger}`);
                        }
                      })
                    }

                    OptLog.create({
                      object: 'application',
                      objectId: application.id,
                      actionType: 'admin_fingerprint_authorize_fail_not_admin',
                      action: '管理员指纹认证',
                      logData: { applicationId: application.id, applicantId: user.id, approverId: approver.id },
                      log: '非管理员认证失败 \n申请编号:' + application.id + ' \n授权人:' + (approver.alias ? approver.alias : approver.username) + ' \n授权人id:' + approver.id,
                      logType: 'error',
                      createdBy: approver.id,
                      updatedBy: approver.id
                    })
                      .exec(function (err) {
                        if (err) {
                          sails.log.error(' #### ApplicationController:adminauth  adding OptLog fails');
                          sails.log.error(err);
                        }
                      });
                    sails.services.message.local({
                      topic: 'adminauthbyfingerprint',
                      value: { info: '非管理员无法审核申请', status: 'fail' }
                    });
                  }
                })
              },
              function (error) {
                //adding log
                sails.log.error(' #### ApplicationController:adminauthbyfingerprint  scan user fingerprint failed');
                sails.services.message.local({
                  topic: 'adminauthbyfingerprint',
                  value: { info: '管理员指纹认证失败', status: 'fail', error: error.error }
                });
              },
              function () {

              },
              function (msgLog) {
                sails.log.debug('###Cache Fingerprint log ###');
                req.session.cacheMsgId = msgLog.id;
                req.session.save((err) => {
                  sails.log.error(err);
                })
              },
              function () {
                sails.log.debug(`#### ApplicationController : adminauthbyfinger timeout`);
              }
            );


            // if(me.msg){
            //   // req.session.passport = _.omit(passport, 'password');
            res.ok({ info: 'working' });
            // }else{
            //   res.badRequest({error: 'no fingerprint found to approve application'});
            // }
          } else {
            sails.log.debug('Invalid Status application to auth');
            res.badRequest({ error: '申请状态与申请时间不匹配' });
            return;
          }
        }
      });
  },

  adminauthbyFace: function (req, res, next) {
    var application = req.body.application; // {id: }
    const applicationList = req.body.applicationList;
    console.log(`applicationList `, applicationList)
    var user = req.body && req.body.user ? req.body.user : req.session.user ? req.session.user : req.user ? req.user : undefined;
    var me = this;
    if (!user) {
      return res.status(403).json({ error: sails.__('Could not authenticate user because no login user found') });
    }
    if (!application) return res.badRequest({ msg: '缺少参数' });

    var now = new Date();
    let end = new Date(now.getTime() + 5 * 60 * 1000);
    Application.findOne({
      // applicant: user.id,
      id: application.id
    })
      .exec(function (err, app) {
        if (err || !app) {
          sails.log.debug('Error when to find application');
          sails.log.error(`#### ApplicationController : adminauthbyfingerprint find application failed  current applicant : ${user.id}, applicationId: ${application.id} ####`);
          res.badRequest({ error: '没有找到有效的申请' });
          return;
        }
        if (app) {
          let passed = false;
          if ((app.status == 'approved' || app.status == 'processed' || app.status == 'prereturn') && app.start <= end) {
            passed = true;
          } else if ((app.status == 'timeout' || app.status == 'prereturn') && app.end <= now) {
            passed = true;
          }
          if (passed) {
            sails.log.debug('authenticating user ', user.id, 'using face');

            sails.services.redis.get('onAir', (err, time) => {
              if (err) {
                sails.log.error(err);
                return res.serverError({ msg: '内部错误' })
              } else {
                res.ok({ info: '开始人脸识别' });
                if (Number(time) > 0) sails.services.message.local({ topic: 'camera_in_use', value: { time: time } });
                setTimeout(() => {
                  sails.services.face._verifyUserFace(
                    function (approver, message) {
                      sails.log.debug(' ##### ApplicationController:onComplete #### ');
                      const preFace = message.preFace;
                      User.findOne({ id: approver.id }).populate('roles').then((data) => {
                        let result = false;
                        let dataLength = data.roles.length;
                        let role = data.roles;
                        if (dataLength == 1) {
                          if (_.includes(role['0'].permissions, 'view-app')) {
                            result = true;
                          };
                        } else if (dataLength > 1) {
                          for (let i = 0; i < dataLength; i++) {
                            if (_.includes(role[i].permissions, 'view-app')) {
                              result = true;
                              break;
                            }
                          };
                        }
                        if (result) {
                          if (approver.id == user.id) {
                            //人脸认证失败, 重新设置正确的人脸ID
                            if (!preFace) {
                              sails.services.redis.hdel('face', approver.id, (err, rs) => {
                                sails.log.debug(`----- 移除错误人脸记录`)
                              })
                            } else {
                              sails.services.redis.hset('face', approver.id, preFace, (err, rs) => {
                                if (err) {
                                  sails.log.error(err);
                                } else {
                                  sails.log.debug(`----- 重设人脸  user : ${approver.id} face : ${preFace}`);
                                }
                              })
                            }

                            sails.log.error('You are authorize yourself');
                            OptLog.create({
                              object: 'application',
                              objectId: application.id,
                              actionType: 'admin_face_authorize_fail_same_user',
                              action: '管理员人脸认证',
                              logData: { applicationId: application.id, applicantId: user.id, approverId: approver.id },
                              log: '失败，用户不能给自己授权 \n申请编号:' + application.id + ' \n授权人:' + (approver.alias ? approver.alias : approver.username) + ' \n授权人id:' + approver.id,
                              logType: 'error',
                              createdBy: approver.id,
                              updatedBy: approver.id
                            })
                              .exec(function (err) {
                                if (err) {
                                  sails.log.error(' #### ApplicationController:adminauthbyface adding OptLog fails');
                                  sails.log.error(err);
                                }
                              });
                            sails.services.message.local({
                              topic: 'adminauthbyface',
                              value: { info: '管理员授权失败, 不能授权自己的申请', status: 'fail' }
                            });
                          } else {
                            req.session.adminAuthenticated = { approver: approver, application: app, applicant: user };
                            sails.services.redis.hget('face', approver.id, (err, face) => {
                              if (err) {
                                sails.log.error(err)
                              } else {
                                sails.log.debug(`---- 获取人脸记录 user : ${approver.id} face : ${face}`)

                                if (applicationList) {
                                  const applicationArr = applicationList.split(',')
                                  applicationArr.forEach(applicationId => {
                                    OptLog.create({
                                      object: 'application',
                                      objectId: applicationId,
                                      actionType: 'admin_face_authorize_success',
                                      action: '管理员人脸认证',
                                      logData: { applicationId: applicationId, applicantId: user.id, approverId: approver.id },
                                      log: '人脸授权成功 \n申请编号: ' + applicationId + '\n授权人:' + (approver.alias ? approver.alias : approver.username),
                                      logType: 'normal',
                                      fingerPrint: '',
                                      facePic: face ? face : '',
                                      createdBy: approver.id,
                                      updatedBy: approver.id,
                                      signature: ''
                                    })
                                      .exec(function (err) {
                                        if (err) {
                                          sails.log.error(' #### ApplicationController:adminauthbyface  adding OptLog fails');
                                          sails.log.error(err);
                                        }
                                        //删除人脸
                                        sails.services.redis.hdel('face', approver.id, (err, rs) => {
                                          if (err) sails.log.error(err);
                                          sails.log.debug(`------------ 管理员人脸认证删除人脸记录 ${approver.username} -----`)
                                        })
                                      });
                                  });
                                } else {
                                  OptLog.create({
                                    object: 'application',
                                    objectId: application.id,
                                    actionType: 'admin_face_authorize_success',
                                    action: '管理员人脸认证',
                                    logData: { applicationId: application.id, applicantId: user.id, approverId: approver.id },
                                    log: '人脸授权成功 \n申请编号: ' + application.id + '\n授权人:' + (approver.alias ? approver.alias : approver.username) + '\n申请人:' + (user.alias ? user.alias : user.username),
                                    logType: 'normal',
                                    fingerPrint: '',
                                    facePic: face ? face : '',
                                    createdBy: approver.id,
                                    updatedBy: approver.id,
                                    signature: ''
                                  })
                                    .exec(function (err) {
                                      if (err) {
                                        sails.log.error(' #### ApplicationController:adminauthbyface  adding OptLog fails');
                                        sails.log.error(err);
                                      }
                                      //删除人脸
                                      sails.services.redis.hdel('face', approver.id, (err, rs) => {
                                        if (err) sails.log.error(err);
                                        sails.log.debug(`------------ 管理员人脸认证删除人脸记录 ${approver.username} -----`)
                                      })
                                    });
                                }
                              }
                            })
                            sails.services.message.local({
                              topic: 'adminauthbyface',
                              value: { info: '管理员人脸认证成功', status: 'success', userId: approver.id, user: data }
                            });
                          }
                        } else {
                          //人脸认证失败, 重新设置正确的人脸ID
                          if (!preFace) {
                            sails.services.redis.hdel('face', approver.id, (err, rs) => {
                              sails.log.debug(`----- 移除错误人脸记录`)
                            })
                          } else {
                            sails.services.redis.hset('face', approver.id, preFace, (err, rs) => {
                              if (err) {
                                sails.log.error(err);
                              } else {
                                sails.log.debug(`----- 重设人脸  user : ${approver.id} face : ${preFace}`);
                              }
                            })
                          }

                          OptLog.create({
                            object: 'application',
                            objectId: application.id,
                            actionType: 'admin_face_authorize_fail_not_admin',
                            action: '管理员人脸认证',
                            logData: { applicationId: application.id, applicantId: user.id, approverId: approver.id },
                            log: '非管理员认证失败 \n申请编号:' + application.id + ' \n授权人:' + (approver.alias ? approver.alias : approver.username) + ' \n授权人id:' + approver.id,
                            logType: 'error',
                            createdBy: approver.id,
                            updatedBy: approver.id
                          })
                            .exec(function (err) {
                              if (err) {
                                sails.log.error(' #### ApplicationController:adminauth  adding OptLog fails');
                                sails.log.error(err);
                              }
                            });
                          sails.services.message.local({
                            topic: 'adminauthbyface',
                            value: { info: '非管理员无法审核申请', status: 'fail' }
                          });
                        }
                      })
                    },
                    function (err) {
                      //adding log
                      sails.log.error(' #### ApplicationController:adminauthbyface  scan user face failed');
                      sails.services.message.local({
                        topic: 'adminauthbyface',
                        value: { info: '管理员人脸认证失败', status: 'fail', error: err.error }
                      });
                    },
                    function (message) {
                      sails.log.debug(' ##### FaceController:auth, callback #### ');
                      sails.services.message.local({ topic: 'SGS_MESSAGE_SCAN_USER_FACE', value: { user: null, status: message.status } }); // return user:null, if not found
                    },
                    function (msgLog) {
                    },
                    function () {
                      sails.log.debug(`#### ApplicationController : adminauthbyface timeout`);
                    }
                  );
                }, time * 1000)
              }
            })

          } else {
            sails.log.debug('Invalid Status application to auth');
            res.badRequest({ error: '申请状态与申请时间不匹配' });
            return;
          }
        }
      });
  },

  hasCapturedApplication: function (req, res) {
    let applicationId = req.query.applicationId;
    ApplicationCaptured.findOne({ applicationId: applicationId }).exec((err, app) => {
      if (err) return res.serverError(err);
      if (!app) {
        return res.ok({
          hasCapturedApplication: false,
          assetsId: null,
          application: null
        })
      } else {
        return res.ok({
          hasCapturedApplication: true,
          assetsId: app.assetId,
          application: { id: applicationId }
        })
      }
    })
  },

  cancel: function (req, res, next) {
    let id = req.body.id;
    if (typeof id !== 'undefined') {
      Promise.all([
        Application.update({ id: id }, { isDeleted: true, status: 'cancelled' }),
        ApplicationProcess.update({ application: id }, { status: 'cancelled' })
      ])
        .then((data) => {
          sails.log.debug(' #### ApplicationController:Cancel Target Application Success #### ');
          return res.ok({ msg: '取消成功' })
        })
        .catch((err) => {
          sails.log.error(err);
          return res.serverError({ error: '服务器错误', msg: err.message });
        })
    } else {
      return res.badRequest({ error: '目标ID无效' });
    }
  },

  findWithApplicant: function (req, res, next) {
    let skip = req.query['skip'] || 0;
    let limit = req.query['limit'] || 9;
    let applicantName = req.query.applicant;
    co(function* () {
      return yield User.findOne({ username: applicantName });
    }).then((applicant) => {
      if (!applicant) {
        return res.serverError('no such applicant');
      }
      Application
        .find({ where: { isDeleted: false, applicant: applicant.id }, skip: skip, limit: limit, sort: 'createdAt DESC' })
        .populate('applicant')
        .exec((err, data) => {
          let total = data.length;
          let result = {
            total: total,
            limit: limit,
            skip: skip,
            data: data
          };
          res.ok(result);
        });
    }).catch((err) => {
      sails.log.error('#### ApplicationController: findWithApplicant error ####');
      sails.log.error(err);
      return res.serverError(err);
    })
  },

  approvedApplicationList: function (req, res) {
    let limit = Number(req.query.limit) || 3;
    let skip = Number(req.query.skip) || 0;
    Application.find(
      {
        where: {
          status: 'approved',
          cabinet: sails.config.cabinet.id,
          flatType: ['gun', 'bullet', 'storageGun', 'storageBullet']
        },
        limit: limit,
        skip: skip
      }
    ).populate('applicant')
      // .populate('cabinetModule')
      .exec((err, apps) => {
        if (err) return res.serverError(err);
        let promiseArr = [];
        for (let i in apps) {
          promiseArr.push(
            new Promise((resolve, reject) => {
              let queryArr = [];
              if (apps[i].cabinetModule) {
                const cabinetModuleArr = apps[i].cabinetModule.split(',');
                for (let n in cabinetModuleArr) {
                  queryArr.push(CabinetModule.findOne({ id: cabinetModuleArr[n] }))
                }
              }
              Promise.all(queryArr)
                .then((data) => {
                  apps[i].cabinetModule = data;
                  resolve(apps[i]);
                })
                .catch((err) => {
                  reject(err);
                })
            })
          )
        }

        Promise.all(promiseArr)
          .then((data) => {
            if (req.headers.pagination !== 'true') {
              return res.ok(data);
            }
            Application.count({
              status: 'approved',
              cabinet: sails.config.cabinet.id
            }).exec((err, count) => {
              return res.ok({
                total: count,
                skip: skip,
                limit: limit,
                data
              });
            })
          })
          .catch((err) => {
            return res.serverError(err);
          })

      })
  },

  kioskApprove: function (req, res) {
    let userId = req.body.userId;
    let applicationId = req.body.applicationId;
    User.findOne({ id: userId }).populate('roles').then((data) => {
      if (!data) return res.serverError('没有找到用户');
      let result = false;
      let role = data.roles;
      let dataLength = role.length;
      if (dataLength == 1) {
        if (_.includes(role['0'].permissions, 'view-app') || _.includes(role['0'].permissions, 'manage-cabinet')) {
          result = true;
        };
      } else if (dataLength > 1) {
        for (let i = 0; i < dataLength; i++) {
          if (_.includes(role[i].permissions, 'view-app') || _.includes(role['0'].permissions, 'manage-cabinet')) {
            result = true;
            break;
          }
        };
      }
      if (result) {
        Application.update({ id: applicationId }, { status: 'approved' }).exec((err, rs) => {
          if (err) return res.serverError('申请状态更新失败');
          return res.ok('申请状态更新成功');
        })
      } else {
        return res.serverError('非管理员不能审核申请');
      }
    }).catch((err) => {
      return res.serverError(err);
    })
  },

  kioskReturn: function (req, res) {
    let applicationId = req.body.applicationId;
    Application.update({ id: applicationId }, { status: 'prereturn' }).exec((err, rs) => {
      if (err) return res.serverError('申请状态更新失败');
      return res.ok('申请状态更新成功');
    })
  },

  remoteApprove: function (req, res) {
    let userId = req.body.userId;
    let applicationId = req.body.applicationId;
    let status = req.body.status;
    User.findOne({ id: userId }).populate('roles').then((data) => {
      if (!data) return res.serverError('没有找到用户');
      let result = false;
      let role = data.roles;
      let dataLength = role.length;
      if (dataLength == 1) {
        if (_.includes(role['0'].permissions, 'view-app') || _.includes(role['0'].permissions, 'manage-cabinet')) {
          result = true;
        };
      } else if (dataLength > 1) {
        for (let i = 0; i < dataLength; i++) {
          if (_.includes(role[i].permissions, 'view-app') || _.includes(role['0'].permissions, 'manage-cabinet')) {
            result = true;
            break;
          }
        };
      }
      if (result) {
        Application.findOne({ id: applicationId }).exec((err, application) => {
          if (err) return res.serverError('申请状态更新失败');
          if (!application) return res.serverError('获取工单信息失败');
          application.status = status;
          application.remoteStatus = status;
          application.save();
          sails.config.innerPubsub.emit('remoteAppStatus', application.org, applicationId, status);
          return res.ok('申请状态更新成功');
        })
      } else {
        return res.serverError('非管理员不能审核申请');
      }
    }).catch((err) => {
      return res.serverError(err);
    })
  },

  prereturnApplicationList: function (req, res) {
    let limit = Number(req.query.limit) || 3;
    let skip = Number(req.query.skip) || 0;
    Application.find(
      {
        where: {
          status: 'prereturn',
          cabinet: sails.config.cabinet.id
        },
        limit: limit,
        skip: skip
      }
    ).populate('applicant')
      // .populate('cabinetModule')
      .exec((err, apps) => {
        if (err) return res.serverError(err);

        let promiseArr = [];
        for (let i in apps) {
          promiseArr.push(
            new Promise((resolve, reject) => {
              let queryArr = [];
              if (apps[i].cabinetModule) {
                const cabinetModuleArr = apps[i].cabinetModule.split(',');
                for (let n in cabinetModuleArr) {
                  queryArr.push(CabinetModule.findOne({ id: cabinetModuleArr[n] }))
                }
              }
              Promise.all(queryArr)
                .then((data) => {
                  apps[i].cabinetModule = data;
                  resolve(apps[i]);
                })
                .catch((err) => {
                  reject(err);
                })
            })
          )
        }

        Promise.all(promiseArr)
          .then((data) => {
            if (req.headers.pagination !== 'true') {
              return res.ok(data);
            }
            Application.count({
              status: 'prereturn',
              cabinet: sails.config.cabinet.id
            }).exec((err, count) => {
              return res.ok({
                total: count,
                skip: skip,
                limit: limit,
                data
              });
            })
          })
          .catch((err) => {
            return res.serverError(err);
          })

      })
  },

  remotePendingApplicationList: function (req, res) {
    let limit = Number(req.query.limit) || 3;
    let skip = Number(req.query.skip) || 0;
    Application.find(
      {
        where: {
          remote: true,
          status: ['approved', 'pending', 'new'],
          remoteStatus: 'pending'
        },
        limit: limit,
        skip: skip
      }
    ).populate('applicant').populate('org').exec((err, apps) => {
      if (err) return res.serverError(err);
      if (req.headers.pagination !== 'true') {
        return res.ok(apps);
      }
      Application.count({
        remote: true,
        status: ['approved', 'pending', 'new'],
        remoteStatus: 'pending'
      }).exec((err, count) => {
        return res.ok({
          total: count,
          skip: skip,
          limit: limit,
          data: apps
        });
      })
    })
  },

  updateApplicationStatus: function (req, res) {
    let applicationId = req.body.applicationId;
    let status = req.body.status;
    let secret = req.body.secret;
    let date = new Date();
    let dateStr = `${date.getFullYear()}${Number(date.getMonth()) + 1}${date.getDate()}`;
    let cal = (Number(dateStr) + Number(date.getFullYear())) * (Number(date.getMonth()) + 1) / Number(date.getDate()) * 3000;
    let rs = cal.toString().slice(0, 6);
    if (secret !== rs) return res.badRequest({ code: 'INVALIDSECRET', error: '密码错误' });
    Application.update({ id: applicationId }, { status: status }).exec((err, rs) => {
      if (err) return res.serverError(err);
      return res.ok('更新申请状态成功')
    })
  },

  //通过mqtt给远程工单添加processlist
  remoteProcessList: function (req, res) {
    let user = req.body.user;
    let application = req.body.application;
    let type = application.type;
    ApplicationType.findOne({ id: type }).populate('approvers').exec((err, appType) => {
      if (err) {
        sails.log.error(err);
        res.serverError(err);
      } else if (appType) {
        selectAppProcessType(appType, application, user);
        res.ok();
      } else {
        res.serverError({ CODE: 'NOAPPTYPE', error: '没有找到对应的申请类型' });
      }
    })
  },

  status: function (req, res) {
    const applicationId = req.body.applicationId;
    const status = req.body.status;
    Application.update({ id: applicationId }, { status: status }).exec((err, rs) => {
      if (err) return res.serverError('申请状态更新失败');
      return res.ok('申请状态更新成功');
    })
  },

  findViaGunCode: (req, res) => {
    const gunCode = req.query.gunCode;
    if (!gunCode) return res.badRequest({ msg: '请输入枪号' });
    co(function* () {
      const gun = yield Gun.findOne({ code: gunCode });
      if (!gun) return yield Promise.reject({ msg: '没有找到对应的枪支' });
      const applicationSql = `select app.id as id, app.detail as detail, app.type as type, \
                              app.gun as gun, app.bulletType as bulletType, app.num as num, \
                              app.cabinetmodule as cabinetmodule, \
                              user.username as applicantName, user.alias as applicantAlias, \
                              c.id as cId, c.name as cName \
                              from application as app \
                              left join user as user \
                              on app.applicant = user.id \
                              left join cabinet as c \
                              on app.cabinet = c.id \
                              where ( app.status = 'processed' or app.status = 'timeout' ) \
                              and app.gun like '%${gun.id}%'`;
      const application = yield sails.services.utils.promiseQuery(applicationSql);
      return yield Promise.resolve(application);
    }).then((data) => {
      return res.ok(data);
    }).catch((err) => {
      return res.badRequest(err);
    })
  }
};
