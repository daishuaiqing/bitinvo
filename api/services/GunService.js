'use strict'
const request = require('request');
const co = require('co');

const updateBulletLoad = (cabinetModuleId, count, isReturn) => {
  const lockKey = `bl_lock_${cabinetModuleId}`
  const now = new Date().getTime()
  sails.services.redis.setnx(lockKey, now, (err, locked) => {
    if (err) return console.error(err)
    if (locked) {
      console.log(`updateBulletLoad : 成功获取锁`)
      CabinetModule.findOne({ id: cabinetModuleId }).exec((err, cm) => {
        if (err) {
          sails.log.error(`GunService : 获取子弹模块信息失败`)
          sails.log.error(err)
          sails.services.redis.del(lockKey, (err) => { console.error(err) })
        } else if (cm) {
          CabinetModule.update({ id: cabinetModuleId }, { UpdatedFrom: sails.config.cabinet.id, load: isReturn ? Number(cm.load) + Number(count) : Number(cm.load) - Number(count) }).exec((err, rs) => {
            if (err) {
              sails.log.error(`GunService : 更新子弹模块台账信息失败`)
              sails.log.error(err)
            } else {
              console.log(`GunServer : pload ${cm.load} , cload ${isReturn ? Number(cm.load) + Number(count) : Number(cm.load) - Number(count)}`)
              sails.log.debug(`GunService : 更新子弹模块台账信息成功,  ${cabinetModuleId} ${isReturn ? '增加' : '减少'} ${count} `)
              OptLog.create({
                object: 'cabinet',
                action: '更新子弹台账',
                log: `记录子弹台账, 模块 ${cm.name} ${isReturn ? '增加' : '减少'} ${count} 发子弹, 之前${cm.load}, 现在${isReturn ? Number(cm.load) + Number(count) : Number(cm.load) - Number(count)}`,
                logType: 'normal',
                objectId: sails.config.cabinet.id,
                cabinet: sails.config.cabinet.id
              }).exec(function (err) {
                if (err) {
                  sails.log.error(' #### GunService :createOptLog  adding OptLog fails');
                  sails.log.error(err);
                }
              });
            }
            sails.services.redis.del(lockKey, (e) => { console.error(e) })
          })
        }
      })
    } else {
      console.log(`updateBulletLoad : 获取锁失败`)
      sails.services.redis.get(lockKey, (err, oldTime) => {
        if (err) return console.error(err)
        console.log(`updateBulletLoad : 锁时间戳 ${oldTime}`)
        if (now - 2000 > oldTime) {
          console.log(`updateBulletLoad : 锁已过期`)
          //3s过期
          sails.services.redis.getset(lockKey, now, (err, oldValue) => {
            if (err) return console.error(err)
            if (oldValue == oldTime) {
              //成功获取到锁
              console.log(`updateBulletLoad : 重置过期锁`)
              CabinetModule.findOne({ id: cabinetModuleId }).exec((err, cm) => {
                if (err) {
                  sails.log.error(`GunService : 获取子弹模块信息失败`)
                  sails.log.error(err)
                  sails.services.redis.del(lockKey, (err) => { console.error(err) })
                } else if (cm) {
                  CabinetModule.update({ id: cabinetModuleId }, { UpdatedFrom: sails.config.cabinet.id, load: isReturn ? Number(cm.load) + Number(count) : Number(cm.load) - Number(count) }).exec((err, rs) => {
                    if (err) {
                      sails.log.error(`GunService : 更新子弹模块台账信息失败`)
                      sails.log.error(err)
                    } else {
                      console.log(`GunServer : pload ${cm.load} , cload ${isReturn ? Number(cm.load) + Number(count) : Number(cm.load) - Number(count)}`)
                      sails.log.debug(`GunService : 更新子弹模块台账信息成功,  ${cabinetModuleId} ${isReturn ? '增加' : '减少'} ${count} `)
                      OptLog.create({
                        object: 'cabinet',
                        action: '更新子弹台账',
                        log: `记录子弹台账, 模块 ${cm.name} ${isReturn ? '增加' : '减少'} ${count} 发子弹, 之前${cm.load}, 现在${isReturn ? Number(cm.load) + Number(count) : Number(cm.load) - Number(count)}`,
                        logType: 'normal',
                        objectId: sails.config.cabinet.id,
                        cabinet: sails.config.cabinet.id
                      }).exec(function (err) {
                        if (err) {
                          sails.log.error(' #### GunService :createOptLog  adding OptLog fails');
                          sails.log.error(err);
                        }
                      });
                    }
                    sails.services.redis.del(lockKey, (err) => { console.error(err) })
                  })
                }
              })
            } else {
              //获取锁失败, 重试
              console.log(`updateBulletLoad : 获取锁失败, 重试`)
              setTimeout(() => {
                updateBulletLoad(cabinetModuleId, count, isReturn)
              }, 200)
            }
          })
        } else {
          //锁还未过期, 重试
          console.log(`updateBulletLoad : 锁还未过期, 重试`)
          setTimeout(() => {
            updateBulletLoad(cabinetModuleId, count, isReturn)
          }, 200)
        }
      })
    }
  })
}


module.exports = {

  matchCabinetName: function (guns, cabients, localCabinet) {
    for (let i in guns) {
      let UpdatedFrom = guns[i].UpdatedFrom;
      if (!UpdatedFrom) {
        guns[i].cabinetName = localCabinet.name;
        guns[i].cabinetIp = localCabinet.host;
      } else {
        for (let n in cabients) {
          if (UpdatedFrom === cabients[n].id) {
            guns[i].cabinetName = cabients[n].name;
            guns[i].cabinetIp = cabients[n].host;
            break;
          }
        }
      }
    }
    return guns;
  },

  masterCabinetInfo: function (user) {
    return new Promise((resolve, reject) => {
      let option = {
        url: 'http://localhost:1337/master/cabinet',
        headers: {
          'userId': user.id
        }
      }
      request(option, (err, response, body) => {
        if (!err && response.statusCode == 200) {
          let cabinets = null;
          try {
            cabinets = JSON.parse(body);
          } catch (err) {
            sails.log.error(`#### GunService masterCabinetInfo error : ${err} ####`);
            resolve([]);
          }
          resolve(cabinets);
        } else {
          resolve([]);
        }
      })
    })
  },

  masterGunInfo: function (user, limit, skip) {
    return new Promise((resolve, reject) => {
      let option = {
        url: `http://localhost:1337/master/gun?limit=${limit}&skip=${skip}&isPublic=1&storageStatus=in&isDisabled=0&gunStatus=normal&isDeleted=0&populate=cabinetModule&sort=updatedAt%20DESC`,
        headers: {
          'userId': user.id,
          'pagination': true
        }
      }
      request(option, (err, response, body) => {
        if (!err && response.statusCode == 200) {
          let guns = null;
          try {
            guns = JSON.parse(body);
          } catch (err) {
            sails.log.error(`#### GunService masterGunInfo error : ${err} ####`);
            resolve([]);
          }
          resolve(guns);
        } else {
          resolve([]);
        }
      })
    })
  },

  peerCabinetModuleInfo: function (peer, gun) {
    return new Promise((resolve, reject) => {
      let option = {
        url: `http://localhost:1337/peer/${peer}/cabinetmodules?gun=${gun}`
      }
      request(option, (err, response, body) => {
        if (!err && response.statusCode == 200) {
          let cabinetModule = null;
          try {
            cabinetModule = JSON.parse(body);
          } catch (err) {
            sails.log.error(`#### GunService peerCabinetModuleInfo error : ${err} ####`);
            resolve([]);
          }
          resolve(cabinetModule);
        } else {
          resolve([]);
        }
      })
    })
  },
  gunQueryPromise: function (query) {
    return new Promise((resolve, reject) => {
      Gun.query(query, (err, rs) => {
        if (err) return reject(err);
        return resolve(rs);
      })
    })
  },

  //检查AB枪开启状态
  ABGunEnabled: () => {
    return new Promise((resolve, reject) => {
      co(function* () {
        const enabled = yield sails.services.redis.getAsync('ABGunEnabled');
        if (!enabled) {
          const sys = yield System.findOne({ key: 'enableABGun' });
          if (sys && sys.value === 'true') {
            yield sails.services.redis.setAsync('ABGunEnabled', 'true');
            return yield Promise.resolve(true);
          } else {
            yield sails.services.redis.setAsync('ABGunEnabled', 'false');
            return yield Promise.resolve(false);
          }
        } else {
          return yield Promise.resolve(enabled === 'true' ? true : false);
        }
      }).then((data) => {
        resolve(data);
      }).catch((err) => {
        reject(err);
      })
    })
  },

  //记录AB枪使用情况
  recordABGun: (cabinetId, currentGunId) => {
    return new Promise((resolve, reject) => {
      co(function* () {
        const lastFetchGunId = yield sails.services.redis.hgetAsync('ABGun', cabinetId);
        if (!lastFetchGunId || lastFetchGunId == 'null') {
          sails.log.debug(`#### GunService : recordABGun ${cabinetId} ${currentGunId}`);
          yield sails.services.redis.hsetAsync('ABGun', cabinetId, currentGunId);
        } else {
          const lastFetchGun = yield Gun.findOne({ id: lastFetchGunId });
          if (lastFetchGun && lastFetchGun.associatedGun === currentGunId) {
            sails.log.debug(`#### GunService : recordABGun ${cabinetId} null`);
            yield sails.services.redis.hsetAsync('ABGun', cabinetId, 'null');
          } else {
            yield sails.services.redis.hsetAsync('ABGun', cabinetId, currentGunId);
          }
        }
      }).then((data) => {
        resolve();
      }).catch((err) => {
        reject(err);
      })
    })
  },

  //更新子弹台账
  updateBulletLoad: updateBulletLoad
}