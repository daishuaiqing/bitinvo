/**
* Application.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/
'use strict';
const redis = sails.services.redis;

module.exports = {

  attributes: {
    detail: {
      type: 'string',
      required: true
    },

    status: {
      type: 'string',
      /*
      new = just created
      wip = approved by at least one if multiple approver required
      approved = all approved
      rejected = rejected by apprver
      */
      enum: [
        'new',  //用户刚刚建立
        'pending', // 审核正在进行中
        'approved',  // 审核完成可以取枪
        'rejected', //审核完成，不可以取枪
        'processed', //审核完成,取枪完成
        'prereturn', //用户确认还枪, 等待管理员操作
        'incomplete',//页面还枪操作完成，等待硬件验证
        'complete', // 已经还枪
        'cancelled', // 用户取消
        'expire', // 用户未取枪过期
        'partial', //对于取枪数量未达到的application 会标记为这个
        'timeout', //已经超时没有还枪的申请
      ],
      defaultsTo: 'pending'
    },

    remote: {
      type: 'boolean',
      defaultsTo: false
    },

    remoteStatus: {
      type: 'string',
      /*
      new = just created
      wip = approved by at least one if multiple approver required
      approved = all approved
      rejected = rejected by apprver
      */
      enum: [
        'new',  //用户刚刚建立
        'pending', // 审核正在进行中
        'approved',  // 审核完成可以取枪
        'rejected', //审核完成，不可以取枪
        'processed', //审核完成,取枪完成
        'prereturn', //用户确认还枪, 等待管理员操作
        'incomplete',//页面还枪操作完成，等待硬件验证
        'complete', // 已经还枪
        'cancelled', // 用户取消
        'expire', // 用户未取枪过期
        'partial', //对于取枪数量未达到的application 会标记为这个
        'timeout', //已经超时没有还枪的申请
      ],
      defaultsTo: 'pending'
    },

    processList: {
      type: 'json'
    },

    applicationProcesses: {
      collection: 'applicationprocess',
      via: 'application'
    },

    start: {
      type: 'datetime'
    },

    end: {
      type: 'datetime'
    },

    applicant: {
      model: 'user'
    },

    type: {
      model: 'applicationtype'
    },

    flatType: { // materialize it for search
      type: 'string',
      enum: [
        'gun',
        'bullet',
        'emergency',
        'storageGun',
        'storageBullet',
        'maintain'
      ]
    },

    // 记录申请的子弹的类型，如果是指定话， 使用指定的类型
    bulletAppType: {
      type: 'string',
      enum: [
        'privategun',
        'specific'
      ],
      defaultsTo: 'privategun'
    },

    // 记录申请取出的枪支
    gun: {
      type: 'text'
    },

    // 记录申请取出的子弹的类型
    bulletType: {
      model: 'bullettype'
    },

    // 记录申请取出的枪支或者是子弹数量
    num: {
      type: 'integer'
    },

    // 记录实际取出的枪支
    actualGun: {
      type: 'text'
    },

    // 记录实际取出的枪支
    actualBulletType: {
      model: 'bullettype'
    },

    // 记录实际取出的枪支或者子弹数量
    actualNum: {
      type: 'integer'
    },

    // 记录实际打开的仓位， 用来在归还的时候打开这个位置
    cabinetModule: {
      type: 'text'
    },
    // 存枪时用来记录目标柜机
    cabinet: {
      model: 'cabinet'
    },
    org: {
      model: 'org'
    },

    //现场授权的第一个管理员
    firstAuthAdmin: {
      model: 'user'
    },

    //现场授权的第二管理员
    secondAuthAdmin: {
      model: 'user'
    },

    assets: {
      collection: 'asset'
    }
  },

  afterCreate: function (values, cb) {
    let key = 'Application:' + values.id;
    let end = parseInt(new Date(values.end).getTime() / 1000);
    let dayEnd = new Date().setHours(23, 59, 59, 999);
    if (values.end < dayEnd) {
      redis.sadd('Application', key, (err, data) => {
        if (err) return sails.log.error(err);
        sails.log.verbose('RPUSH Application ID Success');
        redis.hmset(key, {
          id: values.id,
          applicant: values.applicant,
          flatType: values.flatType,
          status: values.status,
          start: values.start,
          end: values.end
        }, (err, res) => {
          if (err) return sails.log.error(err);

          sails.log.verbose('HMSET Application Success');
          redis.expireat(key, end, (err, res) => {
            if (err) return sails.log.error(err);

            sails.log.verbose('EXPIRE Application Success');
          });
        });
      })
    };
    sails.services.syncrole.Sync(values, 'application');
    //如果是远程授权工单, 通过mqtt发送到看板机
    ApplicationType.findOne({ id: values.type }).exec((err, type) => {
      if (!err && type && type.remote) {
        //判断是否mqtt主机
        System.findOrCreate({ key: 'isMqttServer' }).exec((err, sys) => {
          if (!err && sys && sys.value !== 'true') {
            Application.update({ id: values.id }, { remote: true }).exec((err, rs) => {
              if (err) {
                sails.log.error(`####Application Model : update application remote failed ####`)
              } else {
                sails.log.debug(`#### Application Model : update application set remote true #####`);
              }
            })
            let app = null;
            try {
              app = JSON.stringify({
                id: values.id,
                applicant: values.applicant,
                detail: values.detail,
                type: values.type,
                flatType: values.flatType,
                status: values.status,
                cabinet: values.cabinet,
                remote: true,
                org: values.org,
                start: values.start,
                end: values.end
              })
            } catch (err) {
              sails.log.error(err);
            }
            if (app) sails.config.innerPubsub.emit('createApp', app);
          }
        })
      }
    })
    cb();
  },

  afterUpdate: function (values, cb) {
    let key = 'Application:' + values.id;
    let otKey = 'OverTime:' + values.id;
    let end = parseInt(new Date(values.end).getTime() / 1000);

    if (values.status == 'processed' || values.status == 'complete') {
      //重新发送工单列表
      sails.services.application.publishList();
    }

    if (values.isDeleted || values.status == 'rejected' || values.status == 'expire') {
      redis.srem('Application', 0, key, (err, data) => {
        if (err) return sails.log.error(err);
        sails.log.verbose('SREM Application ID Success');
        redis.del(key, (err, res) => {
          if (err) return sails.log.error(err);
          sails.log.verbose('DEL Application Success');
        });
      })
    } else if (values.status == 'complete') {
      redis.srem('Application', 0, key, (err, data) => {
        if (err) return sails.log.error(err);
        sails.log.verbose('SREM Application ID Success');
        redis.del(key, (err, res) => {
          if (err) return sails.log.error(err);
          sails.log.verbose('DEL Application Success');
        });
      });
      redis.srem('OverTime', 0, otKey, (err, data) => {
        if (err) return sails.log.error(err);
        sails.log.verbose('SREM OverTime Application ID Success');
        redis.del(otKey, (err, res) => {
          if (err) return sails.log.error(err);
          sails.log.verbose('DEL OverTime Application Success');
        });
      });
    } else {
      redis.hmset(key, {
        id: values.id,
        applicant: values.applicant,
        flatType: values.flatType,
        status: values.status,
        start: values.start,
        end: values.end
      }, (err, res) => {
        if (err) return sails.log.error(err);
        sails.log.verbose('Update Redis Application Success');
        redis.expireat(key, end, (err, res) => {
          if (err) return sails.log.error(err);

          sails.log.verbose('EXPIRE Application Success');
        });
      });
    };
    sails.services.syncrole.Sync(values, 'application', 'update');
    //如果是远程授权工单, 通过mqtt发送到看板机
    //不同步approved状态, 防止看板审核状态错误
    if (values.status !== 'approved') {
      ApplicationType.findOne({ id: values.type }).exec((err, type) => {
        if (!err && type && type.remote) {
          //判断是否mqtt主机
          System.findOrCreate({ key: 'isMqttServer' }).exec((err, sys) => {
            if (!err && sys && sys.value !== 'true') {
              sails.config.innerPubsub.emit('updateApp', values.id, values.status);
            }
          })
        }
      })
    }
    cb();
  },

  afterDestroy: function (deleted, cb) {
    if (deleted.length === 0 || !deleted) return cb();
    let values = deleted[0];
    let key = 'Application:' + values.id;
    let otKey = 'OverTime:' + values.id;
    redis.srem('Application', 0, key, (err, data) => {
      if (err) return sails.log.error(err);
      sails.log.verbose('LREM Application ID Success');
      redis.del(key, (err, res) => {
        if (err) return sails.log.error(err);
        sails.log.verbose('DEL Application Success');
      });
    });

    redis.srem('OverTime', 0, otKey, (err, data) => {
      if (err) return sails.log.error(err);
      sails.log.verbose('LREM OverTime Application ID Success');
      redis.del(otKey, (err, res) => {
        if (err) return sails.log.error(err);
        sails.log.verbose('DEL OverTime Application Success');
      });
    });
    sails.services.syncrole.Sync(values, 'application', 'destroy');
    //判断是否mqtt主机
    System.findOrCreate({ key: 'isMqttServer' }).exec((err, sys) => {
      if (!err && sys && sys.value !== 'true') {
        sails.config.innerPubsub.emit('deleteApp', values.id);
      }
    })
    cb();
  }
};
