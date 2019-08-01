/**
 * OptLogController
 *
 * @description :: Server-side logic for managing Optlogs
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
'use strict';
const uuid = require('node-uuid');
const prependFile = require('prepend-file');
const pdf = require('pdfkit');
const fs = require('fs');
const moment = require('moment');
const co = require('co');
const _ = require('lodash');
const html2pdf = require('html-pdf');
moment.locale('zh-cn');
const BOM = new Buffer([0xEF, 0xBB, 0xBF]);
const Header = new Buffer(['编号', '操作人账户', '操作人名字', '操作类型', '操作日志', '操作时间', '柜机编号'].join() + '\n');
const dayRange = 30;
const actionList = {
  storageBullet: '存弹',
  storageGun: '存枪',
  emergency: '紧急全开'
}
const createOptLog = function (data) {
  co(function* () {
    if (data.object === 'user' && data.objectId) {
      data.fingerPrint = yield sails.services.redis.hgetAsync('finger', data.objectId);
      data.facePic = yield sails.services.redis.hgetAsync('face', data.objectId);
      //使用之后删除REDIS内对应用户的指纹人脸记录
      // yield sails.services.redis.hdelAsync('finger', data.objectId);
      // yield sails.services.redis.hdelAsync('face', data.objectId);
      yield sails.services.face.removeRecord(data.objectId, 'optLog');

      let application = yield Application.findOne({ id: data.applicationId });
      if (application) {
        let applicationType = yield ApplicationType.findOne({ id: application.type });
        data.logData = { applicationType: JSON.stringify(applicationType) };
      }
      if (data.actionType === 'approve') {
        let signature = yield Signature.findOne({ application: data.applicationId, user: data.objectId });
        if (signature) data.signature = signature.id;
      }
    }
    yield OptLog.create(data);
    return yield Promise.resolve(data);
  }).catch((err) => {
    sails.log.error(err);
  })
}

function generateTR(obj) {
  let tds = '';
  for (let i in obj) {
    switch (obj[i].type) {
      case 'text':
        tds += `<td align="center"><font size="2">${obj[i].value}</td>`
        break;
      case 'image':
        tds += `<td align="center"><font size="2"><img src="file://${obj[i].value}" height=50 width=50></img></td>`
        break;
      case 'image/URI':
        tds += `<td align="center"><font size="2"><img src="${obj[i].value}" height=50 width=100></img></td>`
        break;
      case 'longtext':
        tds += `<td align="center"><font size="2">${obj[i].value.join('<br>')}</td>`
        break;
      case 'th':
        tds += `<th align="center"><font size="2">${obj[i].value}</th>`
    }
  }
  return `<tr>${tds}</tr>`
}
module.exports = {
  download: function (req, res) {
    var user = req.session.user ? req.session.user : req.user;
    let start = req.query.start;
    let end = req.query.end;
    User.findOne({ id: user.id })
      .populate('roles')
      .exec(function (err, user) {
        if (err) {
          return res.serverError(err);
        }
        if (!user) return res.forbidden({ error: 'no user found' });

        if (!user.isAdmin()) {
          let logs = {
            object: 'log',
            log: '拦截非管理员用户尝试下载日志， 用户id为' + user.id,
            logType: 'error',
            action: '非法下载日志',
            createdBy: user.id,
            updatedBy: user.id
          };

          OptLog.create(logs)
            .exec(function (err, data) {
              if (err) sails.log.error(err);
            });

          return res.forbidden({ error: 'Only Admin allowed to download log' });
        }

        let fileUrl = '/tmp/' + uuid.v1() + '.csv';
        let query = "SELECT \
					o.id, \
				    IFNULL( u.username, '' ) as account, \
				    CASE \
						WHEN u.alias is Null \
				        THEN IFNULL( u.username, '' ) \
					ELSE u.alias \
				    END AS username, \
				    IFNULL( o.action, '' ) as action, \
					IFNULL( o.log, '' ) as log, \
				    IFNULL( o.createdAt , '') as createdAt, \
				    cabinet \
				FROM \
					optlog as o \
				LEFT JOIN \
					user as u \
				ON \
					u.id = o.createdBy \
				WHERE \
					o.createdAt >= '" + start + "' AND o.createdAt <= '" + end + "' \
				INTO OUTFILE '" + fileUrl + "' \
				FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '\"' \
				LINES TERMINATED BY '\n' \
			";
        OptLog.query(query, function (err, data) {
          if (err) {
            sails.log.error('Fails to create logs');
            return res.serverError(err);
          }

          sails.log.verbose('To create fild with BOM ahead');
          prependFile(fileUrl, BOM + Header, function (err) {
            if (err) {
              sails.log.error('Fails to create BOM');
              return res.serverError(err);
            }

            sails.log.verbose('BOM is created, send file for download');

            res.download(fileUrl);
          });

          let logs = {
            object: 'log',
            log: '用户' + user.username + '(id' + user.id + ')下载日志',
            logType: 'normal',
            action: '下载日志',
            createdBy: user.id,
            updatedBy: user.id
          };

          OptLog.create(logs)
            .exec(function (err, data) {
              if (err) sails.log.error(err);
            });
        });
      });
  },
  pdfdownload: function (req, res) {
    var user = req.session.user ? req.session.user : req.user;
    let start = req.query.start;
    let end = req.query.end;
    let username = req.query.username ? `"${req.query.username}"` : null;
    let alias = req.query.alias ? `"${req.query.alias}"` : null;
    User.findOne({ id: user.id })
      .populate('roles')
      .exec(function (err, user) {
        if (err) {
          return res.serverError(err);
        }
        if (!user) return res.forbidden({ error: 'no user found' });

        if (!user.isAdmin()) {
          let logs = {
            object: 'log',
            log: '拦截非管理员用户尝试下载日志， 用户id为' + user.id,
            logType: 'error',
            action: '非法下载日志',
            createdBy: user.id,
            updatedBy: user.id
          };

          OptLog.create(logs)
            .exec(function (err, data) {
              if (err) sails.log.error(err);
            });

          return res.forbidden({ error: 'Only Admin allowed to download log' });
        }
        let fileUrl = '/tmp/' + uuid.v1() + '.txt';
        let query = `SELECT \
				    IFNULL( u.username, '' ) as account, \
				    CASE \
						WHEN u.alias is Null \
				        THEN IFNULL( u.username, '' ) \
					ELSE u.alias \
				    END AS username, \
					IFNULL( o.log, '' ) as log, \
				    IFNULL( o.createdAt , '') as createdAt, \
				    cabinet \
				FROM \
					optlog as o \
				LEFT JOIN \
					user as u \
				ON \
					u.id = o.createdBy \
				WHERE \
          o.createdAt >= '${start}' AND o.createdAt <= '${end}' ${username ? 'and u.username = ' + username : alias ? 'and u.alias = ' + alias : ''}\
        order by createdAt \ 
				INTO OUTFILE '${fileUrl}' \
				FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '\"' \
				LINES TERMINATED BY '\n' \
      `;
        sails.log.debug(query);
        OptLog.query(query, function (err, data) {
          if (err) {
            sails.log.error('Fails to create logs');
            return res.serverError(err);
          }
          /**需要读取txt文件内容生成pdf日志，所以会在tmp目录下生成一个txt文件和pdf文件*/
          var doc = new pdf();
          let pdfdoc = '/tmp/' + uuid.v1() + '.pdf';
          var pdfstream = doc.pipe(fs.createWriteStream(pdfdoc));
          doc.font('./assets/song.ttf')
            .fontSize(5)
            .text(fs.readFileSync(fileUrl), { align: 'justify', lineGap: 5, ellipsis: true }, 0, 0);
          doc.end();
          pdfstream.on('error', (err) => {
            sails.log.error(err);
          })
          pdfstream.on('finish', () => {
            res.download(pdfdoc);
          })


          let logs = {
            object: 'log',
            log: '用户' + user.username + '(id' + user.id + ')下载日志',
            logType: 'normal',
            action: '下载pdf日志',
            createdBy: user.id,
            updatedBy: user.id
          };

          OptLog.create(logs)
            .exec(function (err, data) {
              if (err) sails.log.error(err);
            });
        });
      });
  },

  kioskLog: function (req, res) {
    let applicationId = req.body.applicationId;
    let username = req.body.username || '未知用户';
    let adminname = req.body.adminname || '未知用户';
    let adminId = req.body.adminId || null;
    ApplicationCaptured.findOne({ applicationId: applicationId }).exec((err, app) => {
      if (err || !app) return res.serverError('没有找到申请图像记录')
      OptLog.create({
        object: 'asset',
        action: '审核申请',
        log: `${adminname} 授权通过 ${username} 申请的图像记录`,
        logType: 'normal',
        objectId: app.assetId,
        assets: [app.assetId],
        createdBy: adminId,
        updatedBy: adminId
      })
        .exec(function (err) {
          if (err) {
            sails.log.error(' #### ApplicationController :createOptLog  adding OptLog fails');
            sails.log.error(err);
            return res.serverError(err);
          }
          return res.ok('日志创建成功');
        });
    })
  },

  fetchLog: function (req, res) {
    const skip = Number(req.query.skip) || 0;
    const limit = Number(req.query.limit) || 0;
    const start = req.query.start;
    const end = req.query.end;
    const orgId = req.query.org;
    const logType = req.query.logType;
    //logType: warning / normal /all
    let where = {}
    if (orgId) where = Object.assign(where, { org: orgId });
    if (logType && logType !== 'all') where = Object.assign(where, { logType });
    if (start && end) {
      where = Object.assign(where, { createdAt: { '>': new Date(start), '<': new Date(end) } });
    }
    OptLog.find({
      where: where,
      sort: 'createdAt desc',
      skip: skip,
      limit: limit
    }).populate('createdBy').populate('assets').exec((err, log) => {
      if (err) return res.serverError(err);
      OptLog.count(where).exec((err, count) => {
        if (err) return res.serverError(err);
        return res.ok({
          limit: limit,
          skip: skip,
          filteredTotal: count,
          total: count,
          data: log
        })
      })
    })
  },

  sysLog: function (req, res) {
    co(function* () {
      let skip = Number(req.query.skip) || 0;
      let limit = Number(req.query.limit) || 10;
      let type = req.query.type;
      let username = req.query.username;
      let alias = req.query.alias;
      let start = req.query.start;
      let end = req.query.end;
      let download = req.query.download;
      let userQuery = username ? {
        username: username
      } : alias ? {
        alias: alias
      } : { username: 'null' };
      let queryObj = {
        where: {}
      };
      let user = yield User.findOne(userQuery);
      if (user) {
        username = user.id;
      } else {
        username = null;
      }
      if (!type && username) {
        queryObj = {
          where: {
            objectId: [username],
            log: { '!': '登出成功' }
          }
        }
      } else if (type && !username) {
        queryObj = type === 'warning' ? {
          where: {
            logType: [type],
            log: { '!': '登出成功' }
          }
        } : {
            where: {
              gunAction: [type],
              log: { '!': '登出成功' }
            }
          }
      } else if (type && username) {
        queryObj = {
          where: {
            objectId: [username],
            gunAction: [type],
            log: { '!': '登出成功' }
          }
        }
      }

      if (!username && queryObj && queryObj.where) delete queryObj.where.objectId;

      if (start && end) {
        queryObj.where = Object.assign(queryObj.where, { createdAt: { '>=': new Date(start), '<=': new Date(end) } });
      }
      if (download) {
        let log = yield OptLog.find(Object.assign(queryObj, { sort: 'createdAt ASC' }));
        const _Header = [
          {
            value: '时间',
            type: 'th'
          },
          {
            value: '类型',
            type: 'th'
          },
          {
            value: '日志',
            type: 'th'
          }
        ]
        let html = '';
        for (let i in log) {
          if (log[i].action) {
            html += generateTR([
              {
                value: moment(log[i].createdAt).format('MM月DD日HH:mm'),
                type: 'text'
              },
              {
                value: log[i].action,
                type: 'text'
              },
              {
                value: log[i].log,
                type: 'text'
              }
            ])
          }
        }
        html = '<html><body><table border="1" cellspacing = "0">' + generateTR(_Header) + html + '</table></body></html>'
        const options = {
          format: 'A4',
          orientation: "landscape"
        };
        const path = `/tmp/sysLogs_${moment(start).format('YYYYMMDD')}-${moment(end).format('YYYYMMDD')}.pdf`
        html2pdf.create(html, options).toFile(path, function (err, rs) {
          if (err) {
            sails.log.error(err);
          } else {
            return res.download(path)
          }
        });
      } else {
        let count = yield OptLog.count(queryObj);
        let log = yield OptLog.find(Object.assign(queryObj, { skip, limit, sort: 'createdAt DESC' })).populate('createdBy').populate('org');
        return res.ok({
          data: log,
          skip,
          limit,
          total: count,
          filteredTotal: count
        })
      }
    }).then((data) => {
      sails.log.debug(`#### OptlogController : syslog processed success ####`);
    }).catch((err) => {
      sails.log.error(err);
      return res.serverError(err);
    })
  },

  openLog: function (req, res) {
    let user = { alias: 'unknownuser' }
    let log = '';
    let openType = req.body.openType;
    let cabinetName = req.body.cabinetName;
    let applicationId = req.body.applicationId || 0;
    let maintain = req.body.maintain;
    let gunAction = req.body.action;
    let bulletCounts = req.body.bulletCounts;
    if (typeof bulletCounts === 'string') {
      try {
        bulletCounts = JSON.parse(bulletCounts)
      } catch (e) {
        console.error(e)
        return res.badRequest({ msg: 'bulletCounts解析失败' })
      }
    }
    let gunNameList = [];
    let gunCodeList = [];
    let cabinetModuleList = [];
    let cmDic = {};
    const assistReturn = req.body.assistReturn;
    const assistUserName = req.body.assistUserAlias ? req.body.assistUserAlias : req.body.assistUserName;
    const assistLog = assistReturn == 'true' ? `${assistUserName ? assistUserName : '其他用户'} 代替 ` : '';
    co(function* () {
      let application = yield Application.findOne({ id: applicationId });
      let assistor;
      if (assistReturn) {
        assistor = yield User.findOne({ username: req.body.assistUserName });
        if (!assistor) sails.log.debug(`#### OptlogController : ger assostor info failed`);
      }
      if (application) {


        //归还工单时会提交num
        let num = req.body.num;
        if (typeof num !== 'undefined') {
          yield Application.update({ id: applicationId }, { actualNum: num });
          application.actualNum = num;
        }

        let gunArr = application.gun ? application.gun.split(',') : [];
        let cabinetModuleArr = application.cabinetModule ? application.cabinetModule.split(',') : [];

        let sql = '';
        if (cabinetModuleArr.length > 0) {
          let cabinetModuleIds = `'${cabinetModuleArr.shift()}'`;
          for (let i = 0; i < cabinetModuleArr.length; i++) {
            cabinetModuleIds += `,'${cabinetModuleArr[i]}'`
          }
          cabinetModuleIds = `(${cabinetModuleIds})`;
          if (gunArr.length > 0) {
            sql = `select cm.id as cmId, cm.name as cmName, g.name as gName, g.code as gCode, cm.cabinet as cabinet, g.id as gId from cabinetmodule as cm \
            left join gun as g on g.id = cm.gun where cm.id in ${cabinetModuleIds} \
            order by cm.name*1 asc;`
          } else {
            sql = `select id as cmId, name as cmName from cabinetmodule where id in ${cabinetModuleIds}\
            order by name*1 asc`;
          }
          const cabinetModulesInfo = yield sails.services.utils.promiseQuery(sql);

          //在提交工单和取枪不在同一柜机情况下, 记录AB枪使用情况
          //现在在提交工单时前端记录了ABGun, 不再记录
          // if (cabinetModulesInfo[0].cabinet !== sails.config.cabinet.id && gunAction === 'getGun') {
          //   const ABGunEnabled = yield GunService.ABGunEnabled();
          //   if (ABGunEnabled) yield GunService.recordABGun(cabinetModulesInfo[0].cabinet, cabinetModulesInfo[0].gId);
          // }

          for (let i in cabinetModulesInfo) {
            cabinetModuleList.push(cabinetModulesInfo[i].cmName);
            cmDic[cabinetModulesInfo[i].cmId] = cabinetModulesInfo[i].cmName
            if (cabinetModulesInfo[i].gName) {
              gunNameList.push(cabinetModulesInfo[i].gName);
              gunCodeList.push(cabinetModulesInfo[i].gCode);
            }
          }
        }

        if (gunNameList.length > 0 && cabinetModuleList.length > 0) {
          log = `, 共 ${gunNameList.length} 支枪 \n枪位: ${cabinetModuleList.join(',')} \n枪名: ${gunNameList.join(',')} \n枪号: ${gunCodeList.join(',')}`;
        } else if (gunNameList.length === 0 && cabinetModuleList.length > 0) {
          log = ` \n模块名称: ${cabinetModuleList.join(',')}`;
        }

        user = yield User.findOne({ id: application.applicant });
        //根据工单和操作类型记录授权日志
        const processList = application.processList;
        if (processList && processList.length > 0) {
          if (maintain === 'get' || gunAction === 'getGun' || gunAction === 'getBullet' || gunAction === 'storageGun' || gunAction === 'storageBullet' || gunAction === 'emergency') {
            for (let i in processList) {
              if (processList[i].status === 'approved') {
                createOptLog({
                  object: 'user',
                  action: '工单授权',
                  actionType: 'approve',
                  log: `${processList[i].alias}授权${user.alias}柜机操作`,
                  logType: 'normal',
                  objectId: processList[i].id,
                  createdBy: processList[i].id,
                  updatedBy: processList[i].id,
                  applicationId: applicationId
                })
              }
            }
          }
        } else {
          //无需审核工单, 管理员是授权人
          const approveLog = yield OptLog.find({
            where: {
              objectId: applicationId,
              actionType: ['admin_fingerprint_authorize_success', 'admin_password_authorize_success', 'admin_face_authorize_success']
            },
            sort: 'createdAt desc',
            limit: 1
          })
          if (approveLog && approveLog.length > 0) {
            const approver = yield User.findOne({ id: approveLog[0].createdBy })
            if (approver) {
              createOptLog({
                object: 'user',
                action: '工单授权',
                actionType: 'approve',
                log: `管理员 ${approver.alias} 授权 ${user.alias} 进行柜机操作`,
                logType: 'normal',
                objectId: approver.id,
                createdBy: approver.id,
                updatedBy: approver.id,
                applicationId: applicationId
              })
            }
          }
        }
      }
      if (openType === 'open') {
        let moduleType = req.body.moduleType;
        let isReturn = false;

        if (moduleType === 'gun') {
          if (gunAction === 'getGun') {
            log = '取枪操作' + log;
          } else if (gunAction === 'returnGun') {
            log = '还枪操作' + log;
            isReturn = true;

            //还枪时设置AB枪状态
            if (application && application.gun) {
              sails.services.abgun.set(gun, 'in')
            }
          }

          //没有指定模块存取弹数时, 按工单内容更新
          if (!bulletCounts) {
            //获取工单中枪支的管理子弹模块信息, 如果有则记录台账
            const _gun = yield Gun.findOne({ id: application.gun })

            if (_gun) {
              const _bulletModule = _gun.associatedBulletModule
              if (_bulletModule) GunService.updateBulletLoad(_bulletModule, isReturn ? application.actualNum : application.num, isReturn)
            }
          }

        } else if (moduleType === 'bullet') {
          if (gunAction === 'getBullet') {
            log = '取子弹操作' + log;
          } else if (gunAction === 'returnBullet') {
            log = '还子弹操作' + log;
            isReturn = true;
          }
        }
        if (user.alias !== 'unknownuser') {
          let signature = null;
          if (isReturn) {
            signature = yield Signature.find({
              where: { user: assistReturn ? assistor.id : user.id, application: applicationId },
              sort: 'createdAt asc'
            });
            if (assistReturn) {
              //代替还枪时取该用户该工单最新一个签名
              signature = signature[signature.length - 1];
            } else {
              //正常流程中会有两次签名, 第一次提交申请, 第二次还枪
              signature = signature[1];
            }
          }
          // let _bulletNum = isReturn ? application.actualNum : application.num;
          // log += `\n子弹数量: ${_bulletNum || '未填写'}`
          if (bulletCounts) {
            for (let k in bulletCounts) {
              //更新子弹数量
              GunService.updateBulletLoad(k, bulletCounts[k], isReturn)
              log += `, 在模块 ${cmDic[k]} ${isReturn ? '还' : '取'}子弹 ${bulletCounts[k]} 发`
            }
          }
          createOptLog({
            object: 'user',
            action: '开门操作',
            actionType: assistReturn ? 'assistReturn' : gunAction,
            log: assistLog + user.alias + '在柜机' + cabinetName + log,
            logType: 'normal',
            objectId: assistor ? assistor.id : user.id,
            createdBy: assistor ? assistor.id : user.id,
            updatedBy: assistor ? assistor.id : user.id,
            gunAction: gunAction,
            applicationId: applicationId,
            signature: signature ? signature.id : ''
          });
        }
      } else if (openType === 'openBatch') {
        let moduleType = req.body.moduleType;
        let isReturn = false;
        if (moduleType === 'gun') {
          if (gunAction === 'getGun') {
            log = '批量取枪操作' + log;
          } else if (gunAction === 'returnGun') {
            isReturn = true;
            log = '批量还枪操作' + log;

            //批量还枪时设置AB枪状态
            if (application && application.gun) {
              const gunArr = application.gun.split(',')
              for (let gun of gunArr) {
                sails.services.abgun.set(gun, 'in')
              }
            }
          } else if (gunAction === 'storageGun') {
            log = '存枪操作' + log;
          }
        } else if (moduleType === 'bullet') {
          if (gunAction === 'getBullet') {
            log = '批量取子弹操作' + log;
          } else if (gunAction === 'returnBullet') {
            isReturn = true;
            log = '批量还子弹操作' + log;
          } else if (gunAction === 'storageBullet') {
            log = '存弹操作' + log;
          }
        }
        if (user.alias !== 'unknownuser') {
          let signature = null;
          if (isReturn) {
            signature = yield Signature.find({
              where: { user: user.id, application: applicationId },
              sort: 'createdAt asc'
            });
            //流程中会有两次签名, 第一次提交申请, 第二次还枪
            signature = signature[1];
          }
          // let _bulletNum = isReturn ? application.actualNum : application.num;
          // log += `\n子弹数量: ${_bulletNum || '未填写'}`;
          if (bulletCounts) {
            for (let k in bulletCounts) {
              GunService.updateBulletLoad(k, bulletCounts[k], isReturn)
              log += `, 在模块 ${cmDic[k]} ${isReturn ? '还' : '取'}子弹 ${bulletCounts[k]} 发`
            }
          } else {
            //没有传入bulletCounts, 尝试查找枪绑定的关联子弹模块
            //获取工单中枪支的管理子弹模块信息, 如果有则记录台账
            let _gun = application.gun
            if (_gun) {
              _gun = _gun.split(',')
              if (_gun.length === 1) {
                console.log(`OptlogController : openlog 批量操作单把枪`)
                _gun = yield Gun.findOne({ id: _gun[0] })

                if (_gun) {
                  const _bulletModule = _gun.associatedBulletModule
                  if (_bulletModule) GunService.updateBulletLoad(_bulletModule, isReturn ? application.actualNum : application.num, isReturn)
                }
              }
            }

          }
          createOptLog({
            object: 'user',
            action: '开门操作',
            log: assistLog + user.alias + '在柜机' + cabinetName + log,
            logType: 'normal',
            objectId: user.id,
            createdBy: user.id,
            updatedBy: user.id,
            gunAction: gunAction,
            applicationId: applicationId,
            signature: signature ? signature.id : ''
          });
        }
      } else {
        let num = req.body.num;
        let action = '';
        let log = '';
        if (maintain) {
          action = maintain === 'get' ? `维护取枪操作` : `维护还枪操作`;
          log = maintain === 'get' ? ('维护取枪操作' + (num > 0 ? `, 共取出${num}支枪` : '')) : (`维护还枪操作` + (num > 0 ? `, 共存入${num}支枪` : ''));
        } else {
          action = actionList[gunAction];
          log = actionList[gunAction] + '操作';
        }
        if (user.alias !== 'unknownuser') {
          let signature = null;
          if (maintain == 'save') {
            signature = yield Signature.find({
              where: { user: user.id, application: applicationId },
              sort: 'createdAt asc'
            });
            //流程中会有两次签名, 第一次提交申请, 第二次还枪
            signature = signature[1];
          }
          createOptLog({
            object: 'user',
            action: action,
            actionType: maintain === 'get' ? 'maintain' : 'returnMaintian',
            log: user.alias + '在柜机' + cabinetName + log,
            logType: 'normal',
            logData: {
              num: num
            },
            objectId: user.id,
            createdBy: user.id,
            updatedBy: user.id,
            applicationId: applicationId,
            signature: signature ? signature.id : ''
          });
        }
      }
    }).then((data) => {
      return res.ok();
    }).catch((e) => {
      return res.serverError(e);
    })

  },
  _logs: (req, res) => {
    co(function* () {
      const start = req.query.start;
      const end = req.query.end;
      const getGunLogs = yield OptLog.find({
        where: {
          createdAt: { '>=': new Date(start), '<=': new Date(end) },
          gunAction: 'getGun',
          applicationId: { '!': '0' },
        },
        sort: 'createdAt ASC'
      })
      const org = yield Org.findOne({ isLocal: true });
      const orgName = org ? org.name || '本地机构' : '本地机构';
      let logs = [];
      let recordCount = 0;
      for (let i in getGunLogs) {
        let application = yield Application.findOne({ id: getGunLogs[i].applicationId });
        if (application) {
          let user = yield User.findOne({ id: application.applicant });
          let gun = '';
          let guns = application.gun.split(',');
          if (guns.length === 1) {
            let tmp = yield Gun.findOne({ id: application.gun });
            if (tmp) {
              gun = tmp.code;
              recordCount += 1;
            }
          } else if (guns.length > 1) {
            for (let n = 0; n < guns.length; n++) {
              let tmp = yield Gun.findOne({ id: guns[n] });
              if (tmp) {
                if (n === guns.length - 1) {
                  gun += tmp.code
                } else {
                  gun += (tmp.code + '\n')
                }
              }
            }
            recordCount += guns.length;
          }
          let getDate = moment(getGunLogs[i].createdAt).format('MM月DD日HH时');
          let returnGunLog = yield OptLog.findOne({ gunAction: 'returnGun', applicationId: getGunLogs[i].applicationId });
          let log = [
            {
              text: getDate,
              border: {
                color: '#000000',
                style: 'normal',
                position: ['bottom', 'top', 'left', 'right'],
                linemode: true
              }
            }, orgName, application.detail, gun, '', user.alias, application.processList ? application.processList[0].alias : '',
            returnGunLog ? moment(returnGunLog.createdAt).format('MM月DD日HH时') : '', returnGunLog ? user.alias : '',
            returnGunLog ? application.processList ? application.processList[0].alias : '' : ''
          ]
          let logIndex = parseInt(recordCount / 28);
          if (!logs[logIndex]) logs[logIndex] = new Array;
          logs[logIndex].push(log);
        }
      }
      return yield Promise.resolve(logs);
    }).then((logs) => {
      const tableHeader = [
        {
          text: '',
          align: 'center',
          width: 80
        },
        {
          text: '',
          width: 124,
          align: 'center'
        },
        {
          text: '',
          width: 96,
          align: 'center'
        },
        {
          text: '',
          width: 118,
          align: 'center'
        },
        {
          text: '',
          width: 38,
          align: 'center'
        },
        {
          text: '',
          width: 68,
          align: 'center'
        },
        {
          text: '',
          width: 68,
          align: 'center'
        },
        {
          text: '',
          width: 80,
          align: 'center'
        },
        {
          text: '',
          width: 68,
          align: 'center'
        },
        {
          text: '',
          width: 68,
          align: 'center'
        },
      ];
      //TODO 表头可设置
      // The table content
      const title = '公务用枪使用登记 ' + moment().format("YYYY年MM月DD日HH时mm分ss秒");
      let promiseArr = new Array;
      for (let i in logs) {
        promiseArr.push(
          new Promise(function (resolve, reject) {
            let tableData = [
              [{
                text: '公务用枪使用登记表',
                colspan: 9,
                width: 500,
                // align: 'center',
                font: {
                  name: './assets/song.ttf',
                  size: 20,
                  color: '#000000',
                }
              }
              ],
              [
                {
                  text: '领用时间',
                  border: {
                    color: '#000000',
                    style: 'normal',
                    position: ['bottom', 'top', 'left', 'right'],
                    linemode: true
                  }
                },
                '使用单位',
                '用途',
                '枪支号码',
                '子弹数',
                '使用人',
                '发枪人',
                '交还时间',
                '使用人',
                '验收人',
              ]
            ];
            tableData = tableData.concat(logs[i]);
            // Add table to document
            let lxDocument = require('lx-pdf')('./config/shse_template.json');
            lxDocument.addTable('content', tableData, tableHeader);
            lxDocument.save(`/tmp/${title}_part${Number(i) + 1}.pdf`, (err) => {
              if (err) return reject(err);
              return resolve(`/tmp/${title}_part${Number(i) + 1}.pdf`);
            })
          })
        )
      }
      Promise.all(promiseArr).then((data) => {
        return res.ok(data);
      }).catch((err) => {
        return res.serverError(err);
      })
    }).catch((e) => {
      sails.log.error(e);
      return res.serverError(e);
    })
  },

  logsWithFaceAndFinger: (req, res) => {
    const start = req.query.start;
    const end = req.query.end;
    co(function* () {
      const gunLogs = yield OptLog.find({
        where: {
          createdAt: { '>=': new Date(start), '<=': new Date(end) },
          gunAction: ['getGun', 'returnGun'],
          applicationId: { '!': '0' },
        },
        sort: 'createdAt ASC'
      });
      //减少io
      //没有SET, 使用Object Key代替
      //工单信息
      let applicationList = new Object();
      for (let i in gunLogs) {
        applicationList[gunLogs[i].applicationId] = null;
      }
      const applicationListArr = Object.keys(applicationList);
      const applications = yield Application.find({ id: applicationListArr });
      let userList = new Object();
      let gunList = new Object();
      let applicationGunsList = new Object();
      for (let i in applications) {
        applicationList[applications[i].id] = applications[i];
        userList[applications[i].applicant] = null;
        let _gun = applications[i].gun.split(',');
        applicationGunsList[applications[i].id] = _gun;
        for (let i in _gun) {
          gunList[_gun[i]] = null;
        }
      }
      //枪支信息

      const guns = yield Gun.find({ id: Object.keys(gunList) });
      for (let i in guns) {
        gunList[guns[i].id] = guns[i].code
      }

      //授权信息
      let approverList = new Object();
      let approvers = new Object();
      const approveLogs = yield OptLog.find({ actionType: 'approve', applicationId: applicationListArr });
      for (let i in approveLogs) {
        approverList[approveLogs[i].applicationId] = approveLogs[i];
        approvers[approveLogs[i].objectId] = null;
      }
      //用户信息
      let _usersArr = Object.keys(approvers).concat(Object.keys(userList));
      const users = yield User.find({ id: _usersArr });
      for (let i in users) {
        userList[users[i].id] = users[i];
      }
      //签名信息
      const signatures = yield Signature.find({ application: applicationListArr });
      let signatureList = new Object();
      for (let i in signatures) {
        signatureList[signatures[i].id] = signatures[i].signature;
      }

      //整合信息
      let logsArr = new Array();
      for (let i in gunLogs) {
        if (!_.includes(_usersArr, gunLogs[i].objectId)) continue;
        let _application = applicationList[gunLogs[i].applicationId];
        if (!_application) continue;
        let _applicant = userList[_application.applicant];
        if (!_applicant) continue;
        let approveLog = approverList[gunLogs[i].applicationId];
        if (!approveLog) continue;
        let _approver = userList[approveLog.objectId];
        if (!_approver) continue;
        let _action = gunLogs[i].gunAction === 'getGun' ? '取枪' : '还枪';
        let _gunCodes = new Array();
        for (let n in applicationGunsList[_application.id]) {
          if (gunList[applicationGunsList[_application.id][n]])
            _gunCodes.push(gunList[applicationGunsList[_application.id][n]])
        }
        let gunLogFingerPrintTr = {
          value: '',
          type: 'text'
        };
        let gunLogFacePicTr = {
          value: '',
          type: 'text'
        };
        let approveLogFingerPrintTr = {
          value: '',
          type: 'text'
        };
        let approveLogFacePicTr = {
          value: '',
          type: 'text'
        };

        if (gunLogs[i].facePic) {
          try {
            fs.statSync(`/home/ssd/fingerAndFace/${gunLogs[i].facePic}.bmp`);
            gunLogFacePicTr = {
              value: `/home/ssd/fingerAndFace/${gunLogs[i].facePic}.bmp`,
              type: 'image'
            }
          } catch (e) {
            try {
              fs.statSync(`/home/ssd/fingerAndFace/${gunLogs[i].facePic}.jpg`);
              gunLogFacePicTr = {
                value: `/home/ssd/fingerAndFace/${gunLogs[i].facePic}.jpg`,
                type: 'image'
              }
            } catch (e) {
              sails.log.error('OptLogController: generate log with face failed, no facepic')
            }
          }
        }
        if (gunLogs[i].fingerPrint) {
          try {
            fs.statSync(`/home/ssd/fingerAndFace/${gunLogs[i].fingerPrint}.bmp`);
            gunLogFingerPrintTr = {
              value: `/home/ssd/fingerAndFace/${gunLogs[i].fingerPrint}.bmp`,
              type: 'image'
            }
          } catch (e) {
            try {
              fs.statSync(`/home/ssd/fingerAndFace/${gunLogs[i].fingerPrint}.jpg`);
              gunLogFingerPrintTr = {
                value: `/home/ssd/fingerAndFace/${gunLogs[i].fingerPrint}.jpg`,
                type: 'image'
              }
            } catch (e) {
              sails.log.error('OptLogController: generate log with fingerprint failed, no fingerprint')
            }
          }
        }
        if (approveLog.facePic) {
          try {
            fs.statSync(`/home/ssd/fingerAndFace/${approveLog.facePic}.bmp`);
            approveLogFacePicTr = {
              value: `/home/ssd/fingerAndFace/${approveLog.facePic}.bmp`,
              type: 'image'
            }
          } catch (e) {
            try {
              fs.statSync(`/home/ssd/fingerAndFace/${approveLog.facePic}.jpg`);
              approveLogFacePicTr = {
                value: `/home/ssd/fingerAndFace/${approveLog.facePic}.jpg`,
                type: 'image'
              }
            } catch (e) {
              sails.log.error('OptLogController: generate log with face failed, no facepic')
            }
          }
        }

        if (approveLog.fingerPrint) {
          try {
            fs.statSync(`/home/ssd/fingerAndFace/${approveLog.fingerPrint}.bmp`);
            approveLogFingerPrintTr = {
              value: `/home/ssd/fingerAndFace/${approveLog.fingerPrint}.bmp`,
              type: 'image'
            }
          } catch (e) {
            try {
              fs.statSync(`/home/ssd/fingerAndFace/${approveLog.fingerPrint}.jpg`);
              approveLogFingerPrintTr = {
                value: `/home/ssd/fingerAndFace/${approveLog.fingerPrint}.jpg`,
                type: 'image'
              }
            } catch (e) {
              sails.log.error('OptLogController: generate log with fingerprint failed, no fingerprint')
            }
          }
        }

        logsArr.push([
          {
            value: _applicant.alias || _applicant.username,
            type: 'text'
          },
          {
            value: moment(gunLogs[i].createdAt).format('MM月DD日HH:mm'),
            type: 'text'
          },
          { value: _action, type: 'text' },
          {
            value: _gunCodes,
            type: 'longtext'
          },
          gunLogFacePicTr,
          gunLogFingerPrintTr,
          {
            value: _approver.alias || _approver.username,
            type: 'text'
          },
          approveLogFacePicTr,
          approveLogFingerPrintTr, ,
          {
            value: approveLog.signature ? signatureList[approveLog.signature] : null,
            type: 'image/URI'
          }
        ])
      }
      return yield Promise.resolve(logsArr)
    }).then((data) => {
      const _Header = [
        {
          value: '申请人',
          type: 'th'
        },
        {
          value: '申请时间',
          type: 'th'
        },
        {
          value: '申请类型',
          type: 'th'
        },
        {
          value: '枪号',
          type: 'th'
        },
        {
          value: '申请人头像',
          type: 'th'
        },
        {
          value: '申请人指纹',
          type: 'th'
        },
        {
          value: '授权人',
          type: 'th'
        },
        {
          value: '授权人头像',
          type: 'th'
        },
        {
          value: '授权人指纹',
          type: 'th'
        },
        {
          value: '授权人签名',
          type: 'th'
        }
      ]
      let html = '';
      for (let i in data) {
        html += generateTR(data[i])
      }
      html = '<html><body><table border="1" cellspacing = "0">' + generateTR(_Header) + html + '</table></body></html>'
      const options = {
        format: 'A4',
        orientation: "landscape"
      };
      const path = `/tmp/GunLogs_${moment(start).format('YYYYMMDD')}-${moment(end).format('YYYYMMDD')}.pdf`
      html2pdf.create(html, options).toFile(path, function (err, rs) {
        if (err) {
          sails.log.error(err);
        } else {
          return res.ok([path])
        }
      });
    }).catch((e) => {
      return res.serverError(e);
    })
  },

  _logWithFaceAndFinger: (req, res) => {
    const start = req.query.start;
    const end = req.query.end;
    const type = req.query.type;
    if (!start || !end || !type) return res.badRequest({ msg: '缺少参数' });
    co(function* () {
      let appQuery = null, isReturn = false, returnAppQuery = null;
      function appType(type) {
        switch (type) {
          case 'gun': return isReturn ? '还枪' : '取枪';
          case 'bullet': return isReturn ? '还子弹' : '取子弹';
          case 'maintain': return isReturn ? '维护还枪' : '维护取枪';
          case 'storageGun': return '存枪';
          case 'storageBullet': return '存子弹';
          case 'emergency': return '紧急全开';
        }
      }
      switch (type) {
        case 'gun':
        case 'bullet':
        case 'maintain':
          appQuery = Application.find({
            where: {
              flatType: type,
              status: { '!': ['new', 'pending', 'approved'] },
              createdAt: { '>=': new Date(start), '<=': new Date(end) }
            },
            sort: 'createdAt asc'
          }).populate('applicant');
          break;
        case 'storeGun':
          appQuery = Application.find({
            where: {
              flatType: 'storageGun',
              status: { '!': ['new', 'pending', 'approved'] },
              createdAt: { '>=': new Date(start), '<=': new Date(end) }
            },
            sort: 'createdAt asc'
          }).populate('applicant');
          break;
        case 'storeBullet':
          appQuery = Application.find({
            where: {
              flatType: 'storageBullet',
              status: { '!': ['new', 'pending', 'approved'] },
              createdAt: { '>=': new Date(start), '<=': new Date(end) }
            },
            sort: 'createdAt asc'
          }).populate('applicant');
          break;
        case 'returnGun':
          isReturn = true;
          appQuery = Application.find({
            where: {
              flatType: 'gun',
              status: 'complete',
              updatedAt: { '>=': new Date(start), '<=': new Date(end) }
            },
            sort: 'updatedAt asc'
          }).populate('applicant');
          break;
        case 'returnBullet':
          isReturn = true;
          appQuery = Application.find({
            where: {
              flatType: 'bullet',
              status: 'complete',
              updatedAt: { '>=': new Date(start), '<=': new Date(end) }
            },
            sort: 'updatedAt asc'
          }).populate('applicant');
          break;
        case 'returnMaintain':
          isReturn = true;
          appQuery = Application.find({
            where: {
              flatType: 'maintain',
              status: 'complete',
              updatedAt: { '>=': new Date(start), '<=': new Date(end) }
            },
            sort: 'updatedAt asc'
          }).populate('applicant');
          break;
        case 'all':
          appQuery = Application.find({
            where: {
              status: { '!': ['new', 'pending', 'approved'] },
              createdAt: { '>=': new Date(start), '<=': new Date(end) }
            },
            sort: 'createdAt asc'
          }).populate('applicant');
          returnAppQuery = Application.find({
            where: {
              flatType: { '!': ['storageGun', 'storageBullet', 'emergency'] },
              status: 'complete',
              updatedAt: { '>=': new Date(start), '<=': new Date(end) }
            },
            sort: 'updatedAt asc'
          }).populate('applicant');
          break;
      }
      if (!appQuery) return yield Promise.reject({ msg: '请传入正确的类型' });
      let apps = yield appQuery;
      if (apps.length === 0) return yield Promise.resolve([]);
      if (type === 'all') {
        //获取所有类型报表
        let logsArr = [];
        //------------------------- 取
        let applicationIds = [];
        let gunsObj = {};
        for (let i in apps) {
          applicationIds.push(apps[i].id);
          const _guns = apps[i].gun;
          if (_guns && _guns.length > 0) {
            const _gunArr = _guns.split(',');
            for (let n in _gunArr) {
              gunsObj[_gunArr[n]] = true;
            }
          }
        }
        //获取唯一枪支ID
        const gunIds = Object.keys(gunsObj);

        //一次获取所有相关日志, 相关枪支 和 相关指纹
        const appLogs = yield OptLog.find({ where: { action: '提交申请', objectId: applicationIds } });
        const approverLogs = yield OptLog.find(
          {
            where: {
              actionType: ['admin_face_authorize_success', 'admin_fingerprint_authorize_success', 'admin_password_authorize_success'],
              objectId: applicationIds
            },
            sort: 'createdAt asc'
          })
        const guns = yield Gun.find({ id: gunIds });
        const signatures = yield Signature.find({ application: applicationIds });
        //生成工单-申请日志键值对
        let appApplicantLogsObj = {};
        for (let i in appLogs) {
          appApplicantLogsObj[appLogs[i].objectId] = appLogs[i];
        }
        //生成工单-授权日志键值对, 以及授权人ID列表
        let appApproverLogsObj = {};
        let approvers = {};
        for (let i in approverLogs) {
          //只取第一条授权记录
          if (!appApproverLogsObj[approverLogs[i].objectId]) appApproverLogsObj[approverLogs[i].objectId] = approverLogs[i];
          approvers[approverLogs[i].createdBy] = true;
        }
        const approversIds = Object.keys(approvers);

        //生成授权人键值对
        const approversInfo = yield User.find({ id: approversIds });
        let approverObj = {};
        for (let i in approversInfo) {
          approverObj[approversInfo[i].id] = approversInfo[i];
        }

        //生成枪支ID-内容键值对
        let gunObj = {};
        for (let i in guns) {
          gunObj[guns[i].id] = guns[i];
        }
        //生成签名键值对
        let signObj = {};
        for (let i in signatures) {
          signObj[signatures[i].id] = signatures[i];
        }

        //显示进度
        let current = 1;
        let total = apps.length || 1;
        //组合日志 
        for (let i in apps) {
          let progress = current / total * 50;
          sails.services.message.all({ value: progress.toFixed(1) }, 'generate_logs_progress', 'both');
          current++;

          const app = apps[i];
          const applicantLog = appApplicantLogsObj[app.id];
          const approveLog = appApproverLogsObj[app.id];
          let log = [];

          //没有找到申请人, 跳过
          if (!app.applicant || !applicantLog || !approveLog) continue;
          //申请人, 申请时间, 申请类型
          log = log.concat([
            {
              value: app.applicant.username || '',
              type: 'text'
            },
            {
              value: app.applicant.alias || '',
              type: 'text'
            },
            {
              value: moment(app.createdAt).format('MM月DD日HH:mm'),
              type: 'text',
              original: app.createdAt
            },
            {
              value: appType(app.flatType),
              type: 'text'
            }
          ]);
          //获取枪号
          let _gunCodes = [];
          if (app.gun && app.gun.length > 0) {
            const _guns = app.gun.split(',');
            for (let n in _guns) {
              if (gunObj[_guns[n]] && gunObj[_guns[n]].code)
                _gunCodes.push(gunObj[_guns[n]].code);
            }
          }
          //枪号和弹药数量
          log = log.concat([
            {
              value: _gunCodes,
              type: 'longtext'
            },
            {
              value: app.num || '',
              type: 'text'
            }]
          );
          //获取申请人和授权人的签名, 指纹和人脸
          let applicantFingerPrintTr = {
            value: '',
            type: 'text'
          };
          let applicantFacePicTr = {
            value: '',
            type: 'text'
          };
          let applicantSignTr = {
            value: applicantLog.signature ? signObj[applicantLog.signature] ? signObj[applicantLog.signature].signature : null : null,
            type: 'image/URI'
          }
          let approveLogFingerPrintTr = {
            value: '',
            type: 'text'
          };
          let approveLogFacePicTr = {
            value: '',
            type: 'text'
          };
          let approveSignTr = {
            value: approveLog.signature ? signObj[approveLog.signature] ? signObj[approveLog.signature].signature : null : null,
            type: 'image/URI'
          }
          if (applicantLog.facePic) {
            try {
              fs.statSync(`/home/ssd/fingerAndFace/${applicantLog.facePic}.bmp`);
              applicantFacePicTr = {
                value: `/home/ssd/fingerAndFace/${applicantLog.facePic}.bmp`,
                type: 'image'
              }
            } catch (e) {
              try {
                fs.statSync(`/home/ssd/fingerAndFace/${applicantLog.facePic}.jpg`);
                applicantFacePicTr = {
                  value: `/home/ssd/fingerAndFace/${applicantLog.facePic}.jpg`,
                  type: 'image'
                }
              } catch (e) {
                sails.log.error('OptLogController: generate log with face failed, no facepic')
              }
            }
          }
          if (applicantLog.fingerPrint) {
            try {
              fs.statSync(`/home/ssd/fingerAndFace/${applicantLog.fingerPrint}.bmp`);
              applicantFingerPrintTr = {
                value: `/home/ssd/fingerAndFace/${applicantLog.fingerPrint}.bmp`,
                type: 'image'
              }
            } catch (e) {
              try {
                fs.statSync(`/home/ssd/fingerAndFace/${applicantLog.fingerPrint}.jpg`);
                applicantFingerPrintTr = {
                  value: `/home/ssd/fingerAndFace/${applicantLog.fingerPrint}.jpg`,
                  type: 'image'
                }
              } catch (e) {
                sails.log.error('OptLogController: generate log with fingerprint failed, no fingerprint')
              }
            }
          }
          if (approveLog.facePic) {
            try {
              fs.statSync(`/home/ssd/fingerAndFace/${approveLog.facePic}.bmp`);
              approveLogFacePicTr = {
                value: `/home/ssd/fingerAndFace/${approveLog.facePic}.bmp`,
                type: 'image'
              }
            } catch (e) {
              try {
                fs.statSync(`/home/ssd/fingerAndFace/${approveLog.facePic}.jpg`);
                approveLogFacePicTr = {
                  value: `/home/ssd/fingerAndFace/${approveLog.facePic}.jpg`,
                  type: 'image'
                }
              } catch (e) {
                sails.log.error('OptLogController: generate log with face failed, no facepic')
              }
            }
          }
          if (approveLog.fingerPrint) {
            try {
              fs.statSync(`/home/ssd/fingerAndFace/${approveLog.fingerPrint}.bmp`);
              approveLogFingerPrintTr = {
                value: `/home/ssd/fingerAndFace/${approveLog.fingerPrint}.bmp`,
                type: 'image'
              }
            } catch (e) {
              try {
                fs.statSync(`/home/ssd/fingerAndFace/${approveLog.fingerPrint}.jpg`);
                approveLogFingerPrintTr = {
                  value: `/home/ssd/fingerAndFace/${approveLog.fingerPrint}.jpg`,
                  type: 'image'
                }
              } catch (e) {
                sails.log.error('OptLogController: generate log with fingerprint failed, no fingerprint')
              }
            }
          }

          log = log.concat([
            applicantFacePicTr,
            applicantFingerPrintTr,
            applicantSignTr,
            {
              value: approverObj[approveLog.createdBy].username || '',
              type: 'text'
            },
            {
              value: approverObj[approveLog.createdBy].alias || '',
              type: 'text'
            },
            approveLogFacePicTr,
            approveLogFingerPrintTr,
            approveSignTr
          ])

          logsArr.push(log);

        }

        //------------------------- 取
        //------------------------- 还

        apps = yield returnAppQuery;
        if (apps.length > 0) {
          isReturn = true;
          let __applicationIds = [];
          let applicationIds4approver = [];
          let __gunsObj = {};
          for (let i in apps) {
            __applicationIds.push(`"${apps[i].id}"`);
            applicationIds4approver.push(apps[i].id);
            const _guns = apps[i].gun;
            if (_guns && _guns.length > 0) {
              const _gunArr = _guns.split(',');
              for (let n in _gunArr) {
                __gunsObj[_gunArr[n]] = true;
              }
            }
          }
          //获取唯一枪支ID
          const __gunIds = Object.keys(__gunsObj);

          //一次获取所有相关日志, 相关枪支 和 相关指纹
          const returnSql = `select * from optlog where action = '开门操作' and log like '%还%' and applicationId in (${__applicationIds.join(',')})`;
          let _appLogs = yield sails.services.utils.promiseQuery(returnSql);
          const _returnMaintainLogs = yield OptLog.find({
            actionType: 'returnMaintian',
            applicationId: applicationIds4approver
          })

          _appLogs = _appLogs.concat(_returnMaintainLogs);

          const __approverLogs = yield OptLog.find(
            {
              where: {
                actionType: ['admin_face_authorize_success', 'admin_fingerprint_authorize_success', 'admin_password_authorize_success'],
                objectId: applicationIds4approver
              },
              sort: 'createdAt asc'
            })
          const ___guns = yield Gun.find({ id: __gunIds });
          const __signatures = yield Signature.find({ application: applicationIds4approver });
          //生成工单-申请日志键值对
          let __appApplicantLogsObj = {};
          for (let i in _appLogs) {
            __appApplicantLogsObj[_appLogs[i].applicationId] = _appLogs[i];
          }
          //生成工单-授权日志键值对, 以及授权人ID列表
          let __appApproverLogsObj = {};
          let __approvers = {};
          for (let i in __approverLogs) {
            //获取最后一条授权记录
            __appApproverLogsObj[__approverLogs[i].objectId] = __approverLogs[i];
            __approvers[__approverLogs[i].createdBy] = true;
          }
          const __approversIds = Object.keys(__approvers);

          //生成授权人键值对
          const __approversInfo = yield User.find({ id: __approversIds });
          let __approverObj = {};
          for (let i in __approversInfo) {
            __approverObj[__approversInfo[i].id] = __approversInfo[i];
          }

          //生成枪支ID-内容键值对
          let __gunObj = {};
          for (let i in ___guns) {
            __gunObj[___guns[i].id] = ___guns[i];
          }
          //生成签名键值对
          let __signObj = {};
          for (let i in __signatures) {
            __signObj[__signatures[i].id] = __signatures[i];
          }
          //组合日志 
          current = 1;
          total = apps.length || 1;
          for (let i in apps) {
            let progress = current / total * 50 + 50;
            sails.services.message.all({ value: progress.toFixed(1) }, 'generate_logs_progress', 'both');
            current++;

            const app = apps[i];
            const applicantLog = __appApplicantLogsObj[app.id];
            const approveLog = __appApproverLogsObj[app.id];
            let log = [];

            //没有找到申请人, 跳过
            if (!app.applicant || !applicantLog || !approveLog) continue;
            //代还日志重新获取申请人
            if (applicantLog.actionType === 'assistReturn') app.applicant = yield User.findOne({ id: applicantLog.createdBy });
            //申请人, 申请时间, 申请类型
            log = log.concat([
              {
                value: app.applicant.username || '',
                type: 'text'
              },
              {
                value: app.applicant.alias || '',
                type: 'text'
              },
              {
                value: moment(app.updatedAt).format('MM月DD日HH:mm'),
                type: 'text',
                original: app.updatedAt
              },
              {
                value: appType(app.flatType),
                type: 'text'
              }
            ]);
            //获取枪号
            let _gunCodes = [];
            if (app.gun && app.gun.length > 0) {
              const _guns = app.gun.split(',');
              for (let n in _guns) {
                if (__gunObj[_guns[n]] && __gunObj[_guns[n]].code)
                  _gunCodes.push(__gunObj[_guns[n]].code);
              }
            }
            //枪号和弹药数量
            log = log.concat([
              {
                value: _gunCodes,
                type: 'longtext'
              },
              {
                value: app.actualNum || '',
                type: 'text'
              }]
            );
            //获取申请人和授权人的签名, 指纹和人脸
            let applicantFingerPrintTr = {
              value: '',
              type: 'text'
            };
            let applicantFacePicTr = {
              value: '',
              type: 'text'
            };
            let applicantSignTr = {
              value: applicantLog.signature ? __signObj[applicantLog.signature] ? __signObj[applicantLog.signature].signature : null : null,
              type: 'image/URI'
            }
            let approveLogFingerPrintTr = {
              value: '',
              type: 'text'
            };
            let approveLogFacePicTr = {
              value: '',
              type: 'text'
            };
            let approveSignTr = {
              value: approveLog.signature ? __signObj[approveLog.signature] ? __signObj[approveLog.signature].signature : null : null,
              type: 'image/URI'
            }
            if (applicantLog.facePic) {
              try {
                fs.statSync(`/home/ssd/fingerAndFace/${applicantLog.facePic}.bmp`);
                applicantFacePicTr = {
                  value: `/home/ssd/fingerAndFace/${applicantLog.facePic}.bmp`,
                  type: 'image'
                }
              } catch (e) {
                try {
                  fs.statSync(`/home/ssd/fingerAndFace/${applicantLog.facePic}.jpg`);
                  applicantFacePicTr = {
                    value: `/home/ssd/fingerAndFace/${applicantLog.facePic}.jpg`,
                    type: 'image'
                  }
                } catch (e) {
                  sails.log.error('OptLogController: generate log with face failed, no facepic')
                }
              }
            }
            if (applicantLog.fingerPrint) {
              try {
                fs.statSync(`/home/ssd/fingerAndFace/${applicantLog.fingerPrint}.bmp`);
                applicantFingerPrintTr = {
                  value: `/home/ssd/fingerAndFace/${applicantLog.fingerPrint}.bmp`,
                  type: 'image'
                }
              } catch (e) {
                try {
                  fs.statSync(`/home/ssd/fingerAndFace/${applicantLog.fingerPrint}.jpg`);
                  applicantFingerPrintTr = {
                    value: `/home/ssd/fingerAndFace/${applicantLog.fingerPrint}.jpg`,
                    type: 'image'
                  }
                } catch (e) {
                  sails.log.error('OptLogController: generate log with fingerprint failed, no fingerprint')
                }
              }
            }
            if (approveLog.facePic) {
              try {
                fs.statSync(`/home/ssd/fingerAndFace/${approveLog.facePic}.bmp`);
                approveLogFacePicTr = {
                  value: `/home/ssd/fingerAndFace/${approveLog.facePic}.bmp`,
                  type: 'image'
                }
              } catch (e) {
                try {
                  fs.statSync(`/home/ssd/fingerAndFace/${approveLog.facePic}.jpg`);
                  approveLogFacePicTr = {
                    value: `/home/ssd/fingerAndFace/${approveLog.facePic}.jpg`,
                    type: 'image'
                  }
                } catch (e) {
                  sails.log.error('OptLogController: generate log with face failed, no facepic')
                }
              }
            }
            if (approveLog.fingerPrint) {
              try {
                fs.statSync(`/home/ssd/fingerAndFace/${approveLog.fingerPrint}.bmp`);
                approveLogFingerPrintTr = {
                  value: `/home/ssd/fingerAndFace/${approveLog.fingerPrint}.bmp`,
                  type: 'image'
                }
              } catch (e) {
                try {
                  fs.statSync(`/home/ssd/fingerAndFace/${approveLog.fingerPrint}.jpg`);
                  approveLogFingerPrintTr = {
                    value: `/home/ssd/fingerAndFace/${approveLog.fingerPrint}.jpg`,
                    type: 'image'
                  }
                } catch (e) {
                  sails.log.error('OptLogController: generate log with fingerprint failed, no fingerprint')
                }
              }
            }

            log = log.concat([
              applicantFacePicTr,
              applicantFingerPrintTr,
              applicantSignTr,
              {
                value: __approverObj[approveLog.createdBy].username || '',
                type: 'text'
              },
              {
                value: __approverObj[approveLog.createdBy].alias || '',
                type: 'text'
              },
              approveLogFacePicTr,
              approveLogFingerPrintTr,
              approveSignTr
            ])

            logsArr.push(log);

          }
        } else {
          sails.services.message.all({ value: 100.0 }, 'generate_logs_progress', 'both');
        }

        //------------------------- 还

        logsArr = logsArr.sort((p, n) => {
          return new Date(p[2].original).getTime() - new Date(n[2].original).getTime()
        })

        return yield Promise.resolve(logsArr);

      } else if (isReturn) {
        //获取归还类型报表
        //获取所有的工单ID 和 所有的枪支ID
        let applicationIds = [];
        let applicationIds4approver = [];
        let gunsObj = {};
        for (let i in apps) {
          applicationIds.push(`"${apps[i].id}"`);
          applicationIds4approver.push(apps[i].id);
          const _guns = apps[i].gun;
          if (_guns && _guns.length > 0) {
            const _gunArr = _guns.split(',');
            for (let n in _gunArr) {
              gunsObj[_gunArr[n]] = true;
            }
          }
        }
        //获取唯一枪支ID
        const gunIds = Object.keys(gunsObj);

        //一次获取所有相关日志, 相关枪支 和 相关指纹
        let appLogs;
        if (type == 'returnMaintain') {
          appLogs = yield OptLog.find({
            actionType: 'returnMaintian',
            applicationId: applicationIds4approver
          })
        } else {
          if (applicationIds.length > 0) {
            const returnSql = `select * from optlog where action = '开门操作' and log like '%还%' and applicationId in (${applicationIds.join(',')})`;
            appLogs = yield sails.services.utils.promiseQuery(returnSql);
          } else {
            appLogs = [];
          }
        }

        const approverLogs = yield OptLog.find(
          {
            where: {
              actionType: ['admin_face_authorize_success', 'admin_fingerprint_authorize_success', 'admin_password_authorize_success'],
              objectId: applicationIds4approver
            },
            sort: 'createdAt asc'
          })
        const guns = yield Gun.find({ id: gunIds });
        const signatures = yield Signature.find({ application: applicationIds4approver });
        //生成工单-申请日志键值对
        let appApplicantLogsObj = {};
        for (let i in appLogs) {
          appApplicantLogsObj[appLogs[i].applicationId] = appLogs[i];
        }
        //生成工单-授权日志键值对, 以及授权人ID列表
        let appApproverLogsObj = {};
        let approvers = {};
        for (let i in approverLogs) {
          //获取最后一条授权记录
          appApproverLogsObj[approverLogs[i].objectId] = approverLogs[i];
          approvers[approverLogs[i].createdBy] = true;
        }
        const approversIds = Object.keys(approvers);

        //生成授权人键值对
        const approversInfo = yield User.find({ id: approversIds });
        let approverObj = {};
        for (let i in approversInfo) {
          approverObj[approversInfo[i].id] = approversInfo[i];
        }

        //生成枪支ID-内容键值对
        let gunObj = {};
        for (let i in guns) {
          gunObj[guns[i].id] = guns[i];
        }
        //生成签名键值对
        let signObj = {};
        for (let i in signatures) {
          signObj[signatures[i].id] = signatures[i];
        }

        let logsArr = [];
        //组合日志 
        let current = 1;
        let total = apps.length || 1;
        for (let i in apps) {
          let progress = current / total * 100;
          sails.services.message.all({ value: progress.toFixed(1) }, 'generate_logs_progress', 'both');
          current++;

          const app = apps[i];
          const applicantLog = appApplicantLogsObj[app.id];
          const approveLog = appApproverLogsObj[app.id];
          let log = [];

          //没有找到申请人, 跳过
          if (!app.applicant || !applicantLog || !approveLog) continue;
          if (applicantLog.actionType === 'assistReturn') app.applicant = yield User.findOne({ id: applicantLog.createdBy });
          //申请人, 申请时间, 申请类型
          log = log.concat([
            {
              value: app.applicant.username || '',
              type: 'text'
            },
            {
              value: app.applicant.alias || '',
              type: 'text'
            },
            {
              value: moment(app.updatedAt).format('MM月DD日HH:mm'),
              type: 'text'
            },
            {
              value: appType(app.flatType),
              type: 'text'
            }
          ]);
          //获取枪号
          let _gunCodes = [];
          if (app.gun && app.gun.length > 0) {
            const _guns = app.gun.split(',');
            for (let n in _guns) {
              if (gunObj[_guns[n]] && gunObj[_guns[n]].code)
                _gunCodes.push(gunObj[_guns[n]].code);
            }
          }
          //枪号和弹药数量
          log = log.concat([
            {
              value: _gunCodes,
              type: 'longtext'
            },
            {
              value: app.actualNum || '',
              type: 'text'
            }]
          );
          //获取申请人和授权人的签名, 指纹和人脸
          let applicantFingerPrintTr = {
            value: '',
            type: 'text'
          };
          let applicantFacePicTr = {
            value: '',
            type: 'text'
          };
          let applicantSignTr = {
            value: applicantLog.signature ? signObj[applicantLog.signature] ? signObj[applicantLog.signature].signature : null : null,
            type: 'image/URI'
          }
          let approveLogFingerPrintTr = {
            value: '',
            type: 'text'
          };
          let approveLogFacePicTr = {
            value: '',
            type: 'text'
          };
          let approveSignTr = {
            value: approveLog.signature ? signObj[approveLog.signature] ? signObj[approveLog.signature].signature : null : null,
            type: 'image/URI'
          }
          if (applicantLog.facePic) {
            try {
              fs.statSync(`/home/ssd/fingerAndFace/${applicantLog.facePic}.bmp`);
              applicantFacePicTr = {
                value: `/home/ssd/fingerAndFace/${applicantLog.facePic}.bmp`,
                type: 'image'
              }
            } catch (e) {
              try {
                fs.statSync(`/home/ssd/fingerAndFace/${applicantLog.facePic}.jpg`);
                applicantFacePicTr = {
                  value: `/home/ssd/fingerAndFace/${applicantLog.facePic}.jpg`,
                  type: 'image'
                }
              } catch (e) {
                sails.log.error('OptLogController: generate log with face failed, no facepic')
              }
            }
          }
          if (applicantLog.fingerPrint) {
            try {
              fs.statSync(`/home/ssd/fingerAndFace/${applicantLog.fingerPrint}.bmp`);
              applicantFingerPrintTr = {
                value: `/home/ssd/fingerAndFace/${applicantLog.fingerPrint}.bmp`,
                type: 'image'
              }
            } catch (e) {
              try {
                fs.statSync(`/home/ssd/fingerAndFace/${applicantLog.fingerPrint}.jpg`);
                applicantFingerPrintTr = {
                  value: `/home/ssd/fingerAndFace/${applicantLog.fingerPrint}.jpg`,
                  type: 'image'
                }
              } catch (e) {
                sails.log.error('OptLogController: generate log with fingerprint failed, no fingerprint')
              }
            }
          }
          if (approveLog.facePic) {
            try {
              fs.statSync(`/home/ssd/fingerAndFace/${approveLog.facePic}.bmp`);
              approveLogFacePicTr = {
                value: `/home/ssd/fingerAndFace/${approveLog.facePic}.bmp`,
                type: 'image'
              }
            } catch (e) {
              try {
                fs.statSync(`/home/ssd/fingerAndFace/${approveLog.facePic}.jpg`);
                approveLogFacePicTr = {
                  value: `/home/ssd/fingerAndFace/${approveLog.facePic}.jpg`,
                  type: 'image'
                }
              } catch (e) {
                sails.log.error('OptLogController: generate log with face failed, no facepic')
              }
            }
          }
          if (approveLog.fingerPrint) {
            try {
              fs.statSync(`/home/ssd/fingerAndFace/${approveLog.fingerPrint}.bmp`);
              approveLogFingerPrintTr = {
                value: `/home/ssd/fingerAndFace/${approveLog.fingerPrint}.bmp`,
                type: 'image'
              }
            } catch (e) {
              try {
                fs.statSync(`/home/ssd/fingerAndFace/${approveLog.fingerPrint}.jpg`);
                approveLogFingerPrintTr = {
                  value: `/home/ssd/fingerAndFace/${approveLog.fingerPrint}.jpg`,
                  type: 'image'
                }
              } catch (e) {
                sails.log.error('OptLogController: generate log with fingerprint failed, no fingerprint')
              }
            }
          }

          log = log.concat([
            applicantFacePicTr,
            applicantFingerPrintTr,
            applicantSignTr,
            {
              value: approverObj[approveLog.createdBy].username || '',
              type: 'text'
            },
            {
              value: approverObj[approveLog.createdBy].alias || '',
              type: 'text'
            },
            approveLogFacePicTr,
            approveLogFingerPrintTr,
            approveSignTr
          ])

          logsArr.push(log);

        }

        return yield Promise.resolve(logsArr);
      } else {
        //获取取类型报表
        //获取所有的工单ID 和 所有的枪支ID
        let applicationIds = [];
        let gunsObj = {};
        for (let i in apps) {
          applicationIds.push(apps[i].id);
          const _guns = apps[i].gun;
          if (_guns && _guns.length > 0) {
            const _gunArr = _guns.split(',');
            for (let n in _gunArr) {
              gunsObj[_gunArr[n]] = true;
            }
          }
        }
        //获取唯一枪支ID
        const gunIds = Object.keys(gunsObj);

        //一次获取所有相关日志, 相关枪支 和 相关指纹
        const appLogs = yield OptLog.find({ where: { action: '提交申请', objectId: applicationIds } });
        const approverLogs = yield OptLog.find(
          {
            where: {
              actionType: ['admin_face_authorize_success', 'admin_fingerprint_authorize_success', 'admin_password_authorize_success'],
              objectId: applicationIds
            },
            sort: 'createdAt asc'
          })
        const guns = yield Gun.find({ id: gunIds });
        const signatures = yield Signature.find({ application: applicationIds });
        //生成工单-申请日志键值对
        let appApplicantLogsObj = {};
        for (let i in appLogs) {
          appApplicantLogsObj[appLogs[i].objectId] = appLogs[i];
        }
        //生成工单-授权日志键值对, 以及授权人ID列表
        let appApproverLogsObj = {};
        let approvers = {};
        for (let i in approverLogs) {
          //只取第一条授权记录
          if (!appApproverLogsObj[approverLogs[i].objectId]) appApproverLogsObj[approverLogs[i].objectId] = approverLogs[i];
          approvers[approverLogs[i].createdBy] = true;
        }
        const approversIds = Object.keys(approvers);

        //生成授权人键值对
        const approversInfo = yield User.find({ id: approversIds });
        let approverObj = {};
        for (let i in approversInfo) {
          approverObj[approversInfo[i].id] = approversInfo[i];
        }

        //生成枪支ID-内容键值对
        let gunObj = {};
        for (let i in guns) {
          gunObj[guns[i].id] = guns[i];
        }
        //生成签名键值对
        let signObj = {};
        for (let i in signatures) {
          signObj[signatures[i].id] = signatures[i];
        }

        let logsArr = [];
        //组合日志 
        let current = 1;
        let total = apps.length || 1;
        for (let i in apps) {

          let progress = current / total * 100;
          sails.services.message.all({ value: progress.toFixed(1) }, 'generate_logs_progress', 'both');
          current++;

          const app = apps[i];
          const applicantLog = appApplicantLogsObj[app.id];
          const approveLog = appApproverLogsObj[app.id];
          let log = [];

          //没有找到申请人, 跳过
          if (!app.applicant || !applicantLog || !approveLog) continue;
          //申请人, 申请时间, 申请类型
          log = log.concat([
            {
              value: app.applicant.username || '',
              type: 'text'
            },
            {
              value: app.applicant.alias || '',
              type: 'text'
            },
            {
              value: moment(app.createdAt).format('MM月DD日HH:mm'),
              type: 'text'
            },
            {
              value: appType(app.flatType),
              type: 'text'
            }
          ]);
          //获取枪号
          let _gunCodes = [];
          if (app.gun && app.gun.length > 0) {
            const _guns = app.gun.split(',');
            for (let n in _guns) {
              if (gunObj[_guns[n]] && gunObj[_guns[n]].code)
                _gunCodes.push(gunObj[_guns[n]].code);
            }
          }
          //枪号和弹药数量
          log = log.concat([
            {
              value: _gunCodes,
              type: 'longtext'
            },
            {
              value: app.num || '',
              type: 'text'
            }]
          );
          //获取申请人和授权人的签名, 指纹和人脸
          let applicantFingerPrintTr = {
            value: '',
            type: 'text'
          };
          let applicantFacePicTr = {
            value: '',
            type: 'text'
          };
          let applicantSignTr = {
            value: applicantLog.signature ? signObj[applicantLog.signature] ? signObj[applicantLog.signature].signature : null : null,
            type: 'image/URI'
          }
          let approveLogFingerPrintTr = {
            value: '',
            type: 'text'
          };
          let approveLogFacePicTr = {
            value: '',
            type: 'text'
          };
          let approveSignTr = {
            value: approveLog.signature ? signObj[approveLog.signature] ? signObj[approveLog.signature].signature : null : null,
            type: 'image/URI'
          }
          if (applicantLog.facePic) {
            try {
              fs.statSync(`/home/ssd/fingerAndFace/${applicantLog.facePic}.bmp`);
              applicantFacePicTr = {
                value: `/home/ssd/fingerAndFace/${applicantLog.facePic}.bmp`,
                type: 'image'
              }
            } catch (e) {
              try {
                fs.statSync(`/home/ssd/fingerAndFace/${applicantLog.facePic}.jpg`);
                applicantFacePicTr = {
                  value: `/home/ssd/fingerAndFace/${applicantLog.facePic}.jpg`,
                  type: 'image'
                }
              } catch (e) {
                sails.log.error('OptLogController: generate log with face failed, no facepic')
              }
            }
          }
          if (applicantLog.fingerPrint) {
            try {
              fs.statSync(`/home/ssd/fingerAndFace/${applicantLog.fingerPrint}.bmp`);
              applicantFingerPrintTr = {
                value: `/home/ssd/fingerAndFace/${applicantLog.fingerPrint}.bmp`,
                type: 'image'
              }
            } catch (e) {
              try {
                fs.statSync(`/home/ssd/fingerAndFace/${applicantLog.fingerPrint}.jpg`);
                applicantFingerPrintTr = {
                  value: `/home/ssd/fingerAndFace/${applicantLog.fingerPrint}.jpg`,
                  type: 'image'
                }
              } catch (e) {
                sails.log.error('OptLogController: generate log with fingerprint failed, no fingerprint')
              }
            }
          }
          if (approveLog.facePic) {
            try {
              fs.statSync(`/home/ssd/fingerAndFace/${approveLog.facePic}.bmp`);
              approveLogFacePicTr = {
                value: `/home/ssd/fingerAndFace/${approveLog.facePic}.bmp`,
                type: 'image'
              }
            } catch (e) {
              try {
                fs.statSync(`/home/ssd/fingerAndFace/${approveLog.facePic}.jpg`);
                approveLogFacePicTr = {
                  value: `/home/ssd/fingerAndFace/${approveLog.facePic}.jpg`,
                  type: 'image'
                }
              } catch (e) {
                sails.log.error('OptLogController: generate log with face failed, no facepic')
              }
            }
          }
          if (approveLog.fingerPrint) {
            try {
              fs.statSync(`/home/ssd/fingerAndFace/${approveLog.fingerPrint}.bmp`);
              approveLogFingerPrintTr = {
                value: `/home/ssd/fingerAndFace/${approveLog.fingerPrint}.bmp`,
                type: 'image'
              }
            } catch (e) {
              try {
                fs.statSync(`/home/ssd/fingerAndFace/${approveLog.fingerPrint}.jpg`);
                approveLogFingerPrintTr = {
                  value: `/home/ssd/fingerAndFace/${approveLog.fingerPrint}.jpg`,
                  type: 'image'
                }
              } catch (e) {
                sails.log.error('OptLogController: generate log with fingerprint failed, no fingerprint')
              }
            }
          }

          log = log.concat([
            applicantFacePicTr,
            applicantFingerPrintTr,
            applicantSignTr,
            {
              value: approverObj[approveLog.createdBy].username || '',
              type: 'text'
            },
            {
              value: approverObj[approveLog.createdBy].alias || '',
              type: 'text'
            },
            approveLogFacePicTr,
            approveLogFingerPrintTr,
            approveSignTr
          ])

          logsArr.push(log);

        }

        return yield Promise.resolve(logsArr);
      }

    }).then((data) => {
      const _Header = [
        {
          value: '申请人工号',
          type: 'th'
        },
        {
          value: '申请人姓名',
          type: 'th'
        },
        {
          value: '申请时间',
          type: 'th'
        },
        {
          value: '申请类型',
          type: 'th'
        },
        {
          value: '枪号',
          type: 'th'
        },
        {
          value: '弹药数',
          type: 'th'
        },
        {
          value: '申请人头像',
          type: 'th'
        },
        {
          value: '申请人指纹',
          type: 'th'
        },
        {
          value: '申请人签名',
          type: 'th'
        },
        {
          value: '授权人工号',
          type: 'th'
        },
        {
          value: '授权人姓名',
          type: 'th'
        },
        {
          value: '授权人头像',
          type: 'th'
        },
        {
          value: '授权人指纹',
          type: 'th'
        },
        {
          value: '授权人签名',
          type: 'th'
        }
      ]
      let html = '';
      for (let i in data) {
        html += generateTR(data[i])
      }
      System.findOne({ key: 'reportLogTitle' }).exec((err, sys) => {
        if (err) {
          sails.log.error(`#### OptlogController : _logWithFaceAndFinger get title failed`);
          sails.log.error(err);
          return res.serverError({ msg: '内部错误' });
        } else {
          let title = '智能枪弹柜日志报表'
          if (sys && sys.value) {
            title = sys.value
          }
          html = `<html><h2 align="center">${title}</h2><body><table border="1" cellspacing = "0">` + generateTR(_Header) + html + '</table></body></html>'
          const options = {
            format: 'A4',
            orientation: "landscape"
          };
          const path = `/tmp/Logs_${moment(start).format('YYYYMMDD')}_${moment(end).format('YYYYMMDD')}_${type}.pdf`
          html2pdf.create(html, options).toFile(path, function (err, rs) {
            if (err) {
              sails.log.error(err);
            } else {
              return res.ok([path])
            }
          });
        }
      })

    })
  }
}
