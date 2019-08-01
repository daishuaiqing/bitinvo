'use strict'
const mqtt = require('mqtt');
module.exports = function mqttClient(sails) {
  return {
    initialize: function (cb) {
      let me = this;
      function setUpClient() {
        const pubsub = sails.config.innerPubsub;
        System.findOne({ key: 'isMqttServer' }).exec((err, sys) => {
          if (!err && sys && sys.value !== 'true') {
            System.findOne({ key: 'mqttUrl' }).exec((err, sys) => {
              if (err) {
                sails.log.error(err);
              } else if (sys && sys.value && sys.value.indexOf('http://') === 0) {
                sails.log.debug(`MqttClient Hook : this is mqtt client, url is ${sys.value}`);
                System.findOne({ key: 'enableRemotePanel' }).exec((err, enableRemotePanel) => {
                  if (err) return sails.log.error(err);
                  if (enableRemotePanel && enableRemotePanel.value === 'true') {
                    me.subscribeQuery = Org.findOne({ isLocal: true });
                  } else {
                    me.subscribeQuery = Cabinet.findOne({ isLocal: true });
                  }
                  me.subscribeQuery.exec((err, org) => {
                    if (!err && org) {
                      sails.log.debug(`MqttClient Hook : local org is ${org.name}`);
                      me.org = org;
                      let client = mqtt.connect(sys.value, {
                        keepalive: 30,
                        clientId: org.id,
                        username: 'bitinvo',
                        password: 'bitinvo@2017',
                        port: 1883,
                        connectTimeout: 3000,
                      })
                      //连接成功
                      client.on('connect', () => {
                        //连接之后发布机构名称
                        client.publish('orgname', `${me.org.id}|${me.org.name}`);
                        //订阅控制信息
                        client.subscribe(org.id, { qos: 2 });
                      })
                      //处理消息
                      client.on('message', (topic, message) => {
                        let msgArr = message.toString().split('|')
                        switch (msgArr[0]) {
                          case 'remoteAppStatus':
                            sails.log.debug(`#### Mqttclient Hook : remoteAppStatus paylod is ${message} ####`);
                            //${applicationId}|${status}
                            Application.update({ id: msgArr[1] }, { remoteStatus: msgArr[2] }).exec((err, rs) => {
                              if (err) {
                                sails.log.error(`#### Mqttclient Hook : update application remote status failed`);
                                sails.log.error(err);
                              } else {
                                sails.log.debug(`#### Mqttclient Hook : update application ${msgArr[1]} set remotestatus ${msgArr[2]} ####`);
                              }
                            })
                            break;
                          case 'reportGunBullet':
                            sails.log.debug(`#### MqttClient Hook : report gun and bullet count ####`);
                            sails.services.cabinet.count('gun', (err, gun) => {
                              if (!err && gun.length > 0) {
                                client.publish('gunCount', `${me.org.id}|${gun[0].load}`, { qos: 2 });
                              } else {
                                sails.log.error(err);
                              }
                            });
                            sails.services.cabinet.count('bullet', (err, bullet) => {
                              if (!err && bullet.length > 0) {
                                client.publish('bulletCount', `${me.org.id}|${bullet[0].load}`, { qos: 2 });
                              } else {
                                sails.log.error(err);
                              }
                            });
                            break;
                          case 'uploadUser':
                            sails.log.debug(`#### MqttClient Hook : report user info`);
                            User.findOne({ id: msgArr[1] }).exec((err, rs) => {
                              let user = null;
                              if (err) {
                                sails.log.error(error);
                              } else if (rs) {
                                user = rs;
                              }
                              client.publish('userForProcessList', JSON.stringify({
                                applicationId: msgArr[2],
                                user: user
                              }), { qos: 2 })
                            })
                            break;
                          //接收到上传资源文件
                          case 'uploadAssets': {
                            sails.log.debug(`#### MqttClient Hook : upload assets`);
                            const date = msgArr[1];
                            Cabinet.find({}).exec((err, cabinets) => {
                              if (err) {
                                sails.log.error(`#### MqttClient : uploadAssets query failed`);
                                sails.log.error(err)
                              } else {
                                for (let i in cabinets) {
                                  sails.services.network.proxy(`http://${cabinets[i].host}:${cabinets[i].port}/sync/sendUpdate?date=${date}`, 'GET').then((data) => {
                                    sails.log.info('MqttClient: send update signal success');
                                  }).catch((e) => {
                                    sails.log.error(`MqttClient : send update signal to ${cabinets[i].name} -> ${cabinets[i].host} failed`);
                                    sails.log.error(e);
                                  })
                                }
                              }
                            })
                            break;
                          }
                          // 接收到锁定机构信号, 广播消息给所有从机
                          case 'lockOrg':
                            {
                              sails.log.debug(`#### MqttClient Hook : receive lock org msg`);
                              const status = msgArr[1];
                              Cabinet.find({}).exec((err, cabinets) => {
                                if (err) {
                                  sails.log.error('#### MQTT CLIENT : LOCK ORG query cabinets failed');
                                  sails.log.error(err)
                                } else {
                                  for (let i in cabinets) {
                                    sails.services.network.proxy(`http://${cabinets[i].host}:${cabinets[i].port}/system/lockCabinet?status=${status}`, 'GET').then((data) => {
                                      sails.log.info('MqttClient: send lock signal success');
                                    }).catch((e) => {
                                      sails.log.error(`MqttClient : send lock signal to ${cabinets[i].name} -> ${cabinets[i].host} failed`);
                                      sails.log.error(e);
                                    })
                                  }
                                }
                              })
                              break;
                            }
                        }
                      })
                      if (enableRemotePanel && enableRemotePanel.value === 'true') {
                        // 触发推送
                        pubsub.on('count', (type, count) => {
                          client.publish(type === 'gun' ? 'gunCount' : 'bulletCount', `${me.org.id}|${count}`, { qos: 2 });
                        })
                        pubsub.on('log', (item) => {
                          sails.log.debug(item)
                          let logData = {
                            object: item.object,
                            action: item.action,
                            actionType: item.actionType,
                            log: item.log,
                            logData: item.logData,
                            signature: item.signature,
                            logType: item.logType,
                            userIp: item.userIp,
                            objectId: item.objectId,
                            cabinet: item.cabinet,
                            facePic: item.facePic,
                            fingerPrint: item.fingerPrint,
                            applicationId: item.applicationId,
                            gunAction: item.gunAction,
                            createdBy: item.createdBy,
                            updatedBy: item.updatedBy,
                            createdAt: item.createdAt,
                            org: me.org.id,
                          }
                          client.publish('log', JSON.stringify(logData), { qos: 2 });
                        })
                        pubsub.on('createApp', (item) => {
                          sails.log.debug(`receive createApp : ${item}`);
                          client.publish('createApp', item, { qos: 2 });
                        })
                        pubsub.on('updateApp', (applicationId, status) => {
                          sails.log.debug(`receive updateApp : set ${applicationId} status ${status}`);
                          client.publish('updateApp', `${applicationId}|${status}`, { qos: 2 });
                        })
                        pubsub.on('deleteApp', (applicationId) => {
                          sails.log.debug(`receive deleteApp : delete ${applicationId}`);
                          client.publish('deleteApp', applicationId, { qos: 2 });
                        })
                        pubsub.on('createUser', (user) => {
                          sails.log.debug(`receive createUser : user info ${user}`);
                          client.publish('createUser', JSON.stringify(user), { qos: 2 });
                        })
                        pubsub.on('updateUser', (user) => {
                          sails.log.debug(`receive updateUser : user info ${user}`);
                          client.publish('updateUser', JSON.stringify(user), { qos: 2 });
                        })
                        pubsub.on('deleteUser', (user) => {
                          sails.log.debug(`receive deleteUser : user info ${user}`);
                          client.publish('deleteUser', user, { qos: 2 });
                        })
                        pubsub.on('createApptype', (appType) => {
                          sails.log.debug(`receive createApptype : appType info ${appType}`);
                          client.publish('createApptype', JSON.stringify(appType), { qos: 2 });
                        })
                        pubsub.on('updateApptype', (appType) => {
                          sails.log.debug(`receive updateApptype : appType info ${appType}`);
                          client.publish('updateApptype', JSON.stringify(appType), { qos: 2 });
                        })
                        pubsub.on('deleteApptype', (appType) => {
                          sails.log.debug(`receive deleteApptype : appType info ${appType}`);
                          client.publish('deleteApptype', appType, { qos: 2 });
                        })
                        pubsub.on('reportGunCountNow', () => {
                          sails.log.debug(`#### MqttClient Hook : receive report gun count ####`);
                          sails.services.cabinet.count('gun', (err, gun) => {
                            if (!err && gun.length > 0) {
                              client.publish('gunCount', `${me.org.id}|${gun[0].load}`, { qos: 2 });
                            } else {
                              sails.log.error(err);
                            }
                          });
                        })
                        pubsub.on('reportBulletCountNow', () => {
                          sails.log.debug(`#### MqttClient Hook : receive report  bullet count ####`);
                          sails.services.cabinet.count('bullet', (err, bullet) => {
                            if (!err && bullet.length > 0) {
                              client.publish('bulletCount', `${me.org.id}|${bullet[0].load}`, { qos: 2 });
                            } else {
                              sails.log.error(err);
                            }
                          });
                        })
                        pubsub.on('reportAllCountNow', () => {
                          sails.log.debug(`#### MqttClient Hook : report gun and bullet count ####`);
                          sails.services.cabinet.count('gun', (err, gun) => {
                            if (!err && gun && gun.length > 0) {
                              client.publish('gunCount', `${me.org.id}|${gun[0].load}`, { qos: 2 });
                            } else {
                              sails.log.error(err);
                            }
                          });
                          sails.services.cabinet.count('bullet', (err, bullet) => {
                            if (!err && bullet && bullet.length > 0) {
                              client.publish('bulletCount', `${me.org.id}|${bullet[0].load}`, { qos: 2 });
                            } else {
                              sails.log.error(err);
                            }
                          });
                        })
                        pubsub.on('temp', (temp) => {
                          sails.log.debug(`receive temp : temp info ${temp}`);
                          client.publish('temp', temp.toString(), { qos: 0 });
                        })
                        pubsub.on('humi', (humi) => {
                          sails.log.debug(`receive humi : humi info ${humi}`);
                          client.publish('humi', humi.toString(), { qos: 0 });
                        })
                        pubsub.on('power', (power) => {
                          sails.log.debug(`receive power : power info ${power}`);
                          client.publish('power', power.toString(), { qos: 0 });
                        })
                        pubsub.on('powerType', (powerType) => {
                          sails.log.debug(`receive powerType : powerType info ${powerType}`);
                          client.publish('powerType', powerType.toString(), { qos: 0 });
                        })
                      } else {
                        pubsub.on('temp', (temp) => {
                          sails.log.debug(`receive temp : temp info ${temp}`);
                          client.publish('temp', temp.toString(), { qos: 0 });
                        })
                        pubsub.on('humi', (humi) => {
                          sails.log.debug(`receive humi : humi info ${humi}`);
                          client.publish('humi', humi.toString(), { qos: 0 });
                        })
                        pubsub.on('power', (power) => {
                          sails.log.debug(`receive power : power info ${power}`);
                          client.publish('power', power.toString(), { qos: 0 });
                        })
                        pubsub.on('powerType', (powerType) => {
                          sails.log.debug(`receive powerType : powerType info ${powerType}`);
                          client.publish('powerType', powerType.toString(), { qos: 0 });
                        })
                        pubsub.on('alarm', (msg, topic, cabinetName, cabinetCode) => {
                          sails.log.debug(`receive alarm : alarm info ${msg}, ${topic}, ${cabinetName}, ${cabinetCode}`);
                          client.publish('alarm', [msg.toString(), topic.toString(), cabinetName.toString(), cabinetCode.toString()].join('|'), { qos: 0 });
                        })
                      }
                    } else {
                      sails.log.debug(`Mqttclient Hook : no org found, pls set one before connect to server`);
                    }
                  })
                })
              } else {
                sails.log.debug(`MqttClient Hook : pls set mqtt url first`);
              }
            })
          } else {
            sails.log.debug(`This is not Mqtt Client`);
          }
        })
      }
      sails.after(['lifted'], function () {
        setUpClient();
      });
      return cb();
    }
  }
}