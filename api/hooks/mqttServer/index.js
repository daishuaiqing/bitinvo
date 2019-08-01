'use strict'
const mosca = require('mosca');
module.exports = function MqttServer(sails) {
  return {
    initialize: function (cb) {
      function setUpServer() {
        const pubsub = sails.config.innerPubsub;
        System.findOne({ key: 'isMqttServer' }).exec((err, sys) => {
          if (err) {
            sails.log.error(err)
          } else if (sys && sys.value == 'true') {
            sails.log.debug('Mqtt Server Hook Loaded');
            // let mqttServer = function(){
            let ascoltatore = {
              type: 'redis',
              redis: require('redis'),
              db: 12,
              port: 6379,
              return_buffers: true, // to handle binary payloads
              host: "localhost"
            };

            let moscaSettings = {
              port: 1883,
              backend: ascoltatore,
              persistence: {
                factory: mosca.persistence.Redis
              }
            };

            let authenticate = function (client, username, password, callback) {
              let authorized = (username === 'bitinvo' && password.toString() === 'bitinvo@2017');
              if (authorized) client.user = username;
              callback(null, authorized);
            }

            let server = new mosca.Server(moscaSettings);
            server.on('ready', setup);

            server.on('clientConnected', function (client) {
              // online(client.id);
              sails.log.debug('client connected', client.id);
            });

            server.on('clientDisconnected', function (client) {
              // offline(client.id);
              sails.log.debug('client disconnected', client.id);
            });

            System.findOne({ key: 'enableRemotePanel' }).exec((err, enableRemotePanel) => {
              if (err) sails.log.error(err);

              server.on('published', function (packet, client) {
                //sails.log.debug('Published', packet.topic, packet.payload);
                let payload = new Array;
                try {
                  payload = packet.payload.toString().split('|');
                } catch (e) {
                  sails.log.error(e);
                }
                if (enableRemotePanel && enableRemotePanel.value === 'true') {
                  switch (packet.topic) {
                    case 'gunCount':
                      sails.log.debug(`MQTT : receive guncount msg -> ${payload}`);
                      payload[1] = payload[1] === 'null' ? 0 : payload[1];
                      Mqtt.update({ orgId: payload[0] }, { gunCount: Number(payload[1]) }).exec((err, rs) => {
                        if (err) sails.log.error(err);
                        sails.services.message.local({
                          topic: 'gunCount',
                          value: {
                            orgId: payload[0],
                            count: payload[1]
                          }
                        })
                        sails.services.org.sendTotalCount();
                      })
                      break;

                    case 'bulletCount':
                      sails.log.debug(`MQTT : receive bulletcount msg -> ${payload}`);
                      payload[1] = payload[1] === 'null' ? 0 : payload[1];
                      Mqtt.update({ orgId: payload[0] }, { bulletCount: Number(payload[1]) }).exec((err, rs) => {
                        if (err) sails.log.error(err);
                        sails.services.message.local({
                          topic: 'bulletCount',
                          value: {
                            orgId: payload[0],
                            count: payload[1]
                          }
                        })
                        sails.services.org.sendTotalCount();
                      })
                      break;

                    case 'orgname':
                      sails.log.debug(`MQTT : receive orgname msg -> ${payload}`);
                      Mqtt.findOne({ id: payload[0] }).exec((err, mqtt) => {
                        if (err) {
                          sails.log.error(err)
                        } else if (mqtt) {
                          if (mqtt.orgName !== payload[1]) {
                            mqtt.orgName = payload[1]
                            mqtt.save();
                          }
                          //接收到机构上线之后要求汇报枪弹信息
                          pubsub.emit('reportGunBullet', payload[0]);
                        } else if (!mqtt) {
                          Mqtt.create({ id: payload[0], orgId: payload[0], orgName: payload[1], online: true }).exec((err, rs) => {
                            if (err) {
                              sails.log.error(err);
                            } else {
                              sails.log.debug(`#### MqttServer Hook : create new org record`);
                              pubsub.emit('reportGunBullet', payload[0]);
                              sails.services.message.local({
                                topic: 'newOrg'
                              })
                            }
                          })
                        }
                      })
                      Org.findOrCreate({ id: payload[0] }).exec((err, org) => {
                        if (err) {
                          sails.log.error(err);
                        } else if (org && org.name !== payload[1]) {
                          org.name = payload[1];
                          org.save();
                        }
                      })
                      break;

                    case 'log':
                      sails.log.debug(`MQTT : receive log msg -> ${packet.payload}`);
                      let logData = null;
                      try {
                        logData = JSON.parse(packet.payload);
                      } catch (err) {
                        sails.log.error(err);
                      }
                      if (logData) {
                        delete logData.localId;
                        OptLog.create(logData).exec(function (err, optlog) {
                          if (err) {
                            sails.log.error(' #### Mqtt : create  OptLog failed');
                            sails.log.error(err);
                          } else {
                            sails.log.verbose(`Mqtt : create optlog success`);
                            if (logData.object === 'asset') {
                              const insertAOSql = `INSERT INTO asset_assets_asset__optlog_assets (optlog_assets, asset_assets_asset) VALUES ('${optlog.id}', '${optlog.objectId}');`
                              OptLog.query(insertAOSql, (err, rs) => {
                                if (err) {
                                  sails.log.error('MqttServer : update asset_optlog failed');
                                  sails.log.error(err);
                                } else {
                                  sails.log.verbose('#### MqttServer : update asset_optlog success');
                                }
                              })
                            }
                          }
                        });
                        Mqtt.findOne({ id: logData.org }).exec((err, mqtt) => {
                          if (err) {
                            sails.log.error('#### MQTT : query mqtt failed');
                            sails.log.error(err);
                          } else if (mqtt) {
                            if (!mqtt.online) {
                              mqtt.online = true;
                              mqtt.save();
                            }
                            if (logData.action === '开门操作') {
                              sails.services.message.local({
                                topic: 'newOpenDoorEvent',
                                value: {
                                  orgName: mqtt.orgName,
                                  log: logData.log
                                }
                              })
                            }
                          }
                        })
                      }
                      break;
                    case 'createApp':
                      sails.log.debug(`MQTT : receive application msg -> ${packet.payload}`);
                      let app = null;
                      try {
                        app = JSON.parse(packet.payload);
                      } catch (err) {
                        sails.log.error(err);
                      }
                      if (app) {
                        if (rs === 'true') {
                          sails.log.error(`#### Mqtt : create  app 该机构已锁定`);
                          pubsub.emit('remoteAppStatus', app.org, app.id, 'rejected');
                        } else {
                          Application.create(app).exec(function (err, rs) {
                            if (err) {
                              sails.log.error(' #### Mqtt : create  application failed');
                              sails.log.error(err);
                            } else {
                              sails.log.debug(`Mqtt : create application success`)
                              //新创建的申请添加processlist
                              User.findOne({ id: rs.applicant }).exec((err, user) => {
                                if (err) {
                                  sails.log.error(err);
                                } else if (!user) {
                                  //没有在本机找到用户, 请求对应主机发送用户数据
                                  if (rs.org) {
                                    pubsub.emit('uploadUser', rs.org, rs.applicant, rs.id);
                                  } else {
                                    sails.log.error(`#### MqttServer Hook : request user failed due to no org ####`);
                                  }
                                } else {
                                  //存在对应用户, 开始添加processlist
                                  sails.services.network.proxy('http://localhost:1337/application/remoteProcessList', 'POST', {
                                    user: user,
                                    application: rs
                                  }).then((rs) => {
                                    sails.log.debug(`#### MqttServer Hook : proxy remoteProcessList success`);
                                  }).catch((err) => {
                                    sails.log.debug(`#### MqttServer Hook : proxy remoteProcessList failed`);
                                    sails.log.error(err);
                                  })
                                }
                              })
                            }
                          });
                        }
                      }
                      break;
                    case 'updateApp':
                      sails.log.debug(`MQTT : receive update application msg -> ${payload}`);
                      Application.update({ id: payload[0] }, { status: payload[1] }).exec((err, rs) => {
                        if (err) {
                          sails.log.error(err)
                        } else {
                          sails.log.debug(`#### MqttServer Hook : update application success ####`);
                        }
                      })
                      break;
                    case 'deleteApp':
                      sails.log.debug(`MQTT : receive delete application msg -> ${packet.payload}`);
                      Application.destroy({ id: payload[0] }).exec((err, rs) => {
                        if (err) {
                          sails.log.error(err)
                        } else {
                          sails.log.debug(`#### MqttServer Hook : delete application success ####`);
                        }
                      })
                      break;
                    case 'createUser':
                      sails.log.debug(`MQTT : receive createUser  msg -> ${packet.payload}`);
                      let user = null;
                      try {
                        user = JSON.parse(packet.payload);
                      } catch (err) {
                        sails.log.error(err);
                      }
                      if (user) {
                        User.findOne({ id: user.id }).exec((err, rs) => {
                          if (!err && !rs) {
                            User.create(user).exec((err, rs) => {
                              if (err) {
                                sails.log.error(`#### Mqttserver Hook : create user failed #####`);
                                sails.log.error(err);
                              } else {
                                sails.log.debug(`#### Mqttserver Hook : create user ${user.alias} success #####`);
                              }
                            })
                          }
                        })
                      }
                      break;
                    case 'updateUser':
                      sails.log.debug(`MQTT : receive updateUser  msg -> ${packet.payload}`);
                      let userUpdated = null;
                      try {
                        userUpdated = JSON.parse(packet.payload);
                      } catch (err) {
                        sails.log.error(err);
                      }
                      if (userUpdated) {
                        User.findOne({ id: userUpdated.id }).exec((err, hasUser) => {
                          if (err) {
                            sails.log.error(`#### Mqttserver Hook : update user failed #####`);
                            sails.log.error(err);
                          } else if (!hasUser) {
                            User.create(userUpdated).exec((err, rs) => {
                              if (err) {
                                sails.log.error(`#### Mqttserver Hook : create user failed #####`);
                                sails.log.error(err);
                              } else {
                                sails.log.debug(`#### Mqttserver Hook : create user ${userUpdated.alias} success #####`);
                              }
                            })
                          } else {
                            const userId = userUpdated.id;
                            delete userUpdated.id;
                            User.update({ id: userId }, userUpdated).exec((err, rs) => {
                              if (err) {
                                sails.log.error(`#### Mqttserver Hook : update user failed #####`);
                                sails.log.error(err);
                              } else {
                                sails.log.debug(`#### Mqttserver Hook : update user ${userUpdated.alias} success #####`);
                              }
                            })
                          }
                        })
                      }
                      break;
                    case 'deleteUser':
                      sails.log.debug(`MQTT : receive deleteUser  msg -> ${packet.payload}`);
                      if (packet.payload) {
                        User.destroy({ id: packet.payload }).exec((err, rs) => {
                          if (err) {
                            sails.log.error(`#### Mqttserver Hook : update user failed #####`);
                            sails.log.error(err);
                          } else {
                            sails.log.debug(`#### Mqttserver Hook : update user ${packet.payload} success #####`);
                          }
                        })
                      }
                      break;

                    case 'uploadUser':
                      sails.log.debug(`MQTT  : receive uploadUser  msg -> ${packet.payload}`);
                      let uploadedUser = null;
                      try {
                        uploadedUser = JSON.parse(packet.payload);
                      } catch (err) {
                        sails.log.error(err);
                      }
                      let uploadeduser = uploadedUser.user;
                      if (!uploadeduser) {
                        sails.log.error('#### Mqtt server : no user in uploadUser ####');
                        break;
                      }
                      User.findOrCreate({ id: uploadedUser.user.id }, { uploadeduser }).exec((err, rs) => {
                        if (!err && rs) {
                          Application.findOne({ id: uploadedUser.applicationId }).exec((err, application) => {
                            if (!err && application) {
                              //创建processlist
                              sails.services.network.proxy('http://localhost:1337/application/remoteProcessList', 'POST', {
                                user: rs.length > 0 ? rs[0] : rs,
                                application: application
                              }).then((rs) => {
                                sails.log.debug(`#### MqttServer Hook : proxy remoteProcessList success`);
                              }).catch((err) => {
                                sails.log.debug(`#### MqttServer Hook : proxy remoteProcessList failed`);
                                sails.log.error(err);
                              })
                            }
                          })
                        }
                      })
                      break;
                    case 'createApptype':
                      sails.log.debug(`MQTT : receive createApptype  msg -> ${packet.payload}`);
                      let appType = null;
                      try {
                        appType = JSON.parse(packet.payload);
                      } catch (err) {
                        sails.log.error(err);
                      }
                      if (appType) {
                        ApplicationType.findOne({ id: appType.id }).exec((err, rs) => {
                          if (!err && !rs) {
                            ApplicationType.create(appType).exec((err, rs) => {
                              if (err) {
                                sails.log.error(`#### Mqttserver Hook : create applicationType failed #####`);
                                sails.log.error(err);
                              } else {
                                sails.log.debug(`#### Mqttserver Hook : create applicationType ${appType.name} success #####`);
                              }
                            })
                          }
                        })
                      }
                      break;
                    case 'updateApptype':
                      sails.log.debug(`MQTT : receive updateApptype  msg -> ${packet.payload}`);
                      let updateAppType = null;
                      try {
                        updateAppType = JSON.parse(packet.payload);
                      } catch (err) {
                        sails.log.error(err);
                      }
                      if (updateAppType) {
                        ApplicationType.findOne({ id: updateAppType.id }).exec((err, hasAppType) => {
                          if (err) {
                            sails.log.error(`#### Mqttserver Hook : updateApptype find apptype failed #####`);
                            sails.log.error(err);
                          } else if (!hasAppType) {
                            ApplicationType.create(updateAppType).exec((err, rs) => {
                              if (err) {
                                sails.log.error(`#### Mqttserver Hook : create applicationType failed #####`);
                                sails.log.error(err);
                              } else {
                                sails.log.debug(`#### Mqttserver Hook : create applicationType ${updateAppType.name} success #####`);
                              }
                            })
                          } else {
                            const updateAppTypeId = updateAppType.id;
                            delete updateAppType.id;
                            ApplicationType.update({ id: updateAppTypeId }, updateAppType).exec((err, rs) => {
                              if (err) {
                                sails.log.error(`#### Mqttserver Hook : updateApptype failed #####`);
                                sails.log.error(err);
                              } else {
                                sails.log.debug(`#### Mqttserver Hook : updateApptype ${updateAppType.name} success #####`);
                              }
                            })
                          }
                        })

                      }
                      break;

                    case 'deleteApptype':
                      sails.log.debug(`MQTT : receive deleteApptype  msg -> ${packet.payload}`);
                      if (packet.payload) {
                        ApplicationType.destroy({ id: packet.payload }).exec((err, rs) => {
                          if (err) {
                            sails.log.error(`#### Mqttserver Hook : deleteApptype failed #####`);
                            sails.log.error(err);
                          } else {
                            sails.log.debug(`#### Mqttserver Hook : deleteApptype ${packet.payload} success #####`);
                          }
                        })
                      }
                      break;
                    case 'temp':
                      sails.log.silly(`MQTT : receive temp  msg -> ${packet.payload}`);
                      if (packet.payload) {
                        sails.services.redis.hset(client.id, 'temp', packet.payload, (err, rs) => {
                          if (err) sails.log.error(err);
                        })
                      }
                      break;
                    case 'humi':
                      sails.log.silly(`MQTT : receive humi  msg -> ${packet.payload}`);
                      if (packet.payload) {
                        sails.services.redis.hset(client.id, 'humi', packet.payload, (err, rs) => {
                          if (err) sails.log.error(err);
                        })
                      }
                      break;
                    case 'power':
                      sails.log.silly(`MQTT : receive power  msg -> ${packet.payload}`);
                      if (packet.payload) {
                        sails.services.redis.hset(client.id, 'power', packet.payload, (err, rs) => {
                          if (err) sails.log.error(err);
                        })
                      }
                      break;
                    case 'powerType':
                      sails.log.silly(`MQTT : receive powerType  msg -> ${packet.payload}`);
                      if (packet.payload) {
                        sails.services.redis.hset(client.id, 'powerType', packet.payload, (err, rs) => {
                          if (err) sails.log.error(err);
                        })
                      }
                      break;
                    default:
                      sails.log.silly(`Not Processed Event -> ${packet.topic}`);
                  }
                } else {
                  switch (packet.topic) {
                    case 'alarm':
                      sails.log.silly(`MQTT : receive alarm  msg -> ${packet.payload}`);
                      if (packet.payload) {
                        let alarmArr = packet.payload.toString().split('|');
                        if (alarmArr.length === 4) {
                          if (alarmArr[1].indexOf('overtime') > -1 || alarmArr[1] === 'timeoutalert') {
                            sails.services.alarm.config('applicationOvertime', (err, config) => {
                              if (err) {
                                sails.log.error(err)
                              } else if (config === 'true') {
                                sails.services.message.alarm([alarmArr[0], alarmArr[2], alarmArr[3]].join('|'), alarmArr[1], 'local');
                              }
                            })
                          } else {
                            sails.services.message.alarm([alarmArr[0], alarmArr[2], alarmArr[3]].join('|'), alarmArr[1], 'local');
                          }
                        }
                      }
                      break;
                    case 'temp':
                      sails.log.silly(`MQTT : receive temp  msg -> ${packet.payload}`);
                      if (packet.payload) {
                        sails.services.redis.hset(client.id, 'temp', packet.payload, (err, rs) => {
                          if (err) sails.log.error(err);
                        })
                      }
                      break;
                    case 'humi':
                      sails.log.silly(`MQTT : receive humi  msg -> ${packet.payload}`);
                      if (packet.payload) {
                        sails.services.redis.hset(client.id, 'humi', packet.payload, (err, rs) => {
                          if (err) sails.log.error(err);
                        })
                      }
                      break;
                    case 'power':
                      sails.log.silly(`MQTT : receive power  msg -> ${packet.payload}`);
                      if (packet.payload) {
                        sails.services.redis.hset(client.id, 'power', packet.payload, (err, rs) => {
                          if (err) sails.log.error(err);
                        })
                      }
                      break;
                    case 'powerType':
                      sails.log.silly(`MQTT : receive powerType  msg -> ${packet.payload}`);
                      if (packet.payload) {
                        sails.services.redis.hset(client.id, 'powerType', packet.payload, (err, rs) => {
                          if (err) sails.log.error(err);
                        })
                      }
                      break;
                    default:
                      sails.log.silly(`Not Processed Event -> ${packet.topic}`);
                  }
                }
              });
            })
            //推送消息
            //远程审核通过工单
            pubsub.on('remoteAppStatus', (orgId, applicationId, status) => {
              if (!orgId) return sails.log.error(`####MqttServer Hook : publish remoteAppstatus failed, no orgId found`)
              let message = {
                topic: orgId,
                payload: `remoteAppStatus|${applicationId}|${status}`,
                qos: 2,
                retain: false
              };
              server.publish(message, function () {
                sails.log.info(`topic : ${message.topic}, payload : ${message.payload} published`)
              })
            });
            //汇报枪支弹药消息
            pubsub.on('reportGunBullet', (orgId) => {
              let message = {
                topic: orgId,
                payload: `reportGunBullet`,
                qos: 2,
                retain: false
              };
              server.publish(message, function () {
                sails.log.info(`topic : ${message.topic}, payload : ${message.payload} published`)
              })
            });
            //请求用户数据
            pubsub.on('uploadUser', (orgId, userId, applicationId) => {
              let message = {
                topic: orgId,
                payload: `uploadUser|${userId}|${applicationId}`,
                qos: 2,
                retain: false
              };
              server.publish(message, function () {
                sails.log.info(`topic : ${message.topic}, payload : ${message.payload} published`)
              })
            });
            //请求推送资源文件更新
            pubsub.on('uploadAssets', (orgId, date) => {
              let message = {
                topic: orgId,
                payload: `uploadAssets|${date}`,
                qos: 2,
                retain: false
              };
              server.publish(message, function () {
                sails.log.info(`topic : ${message.topic}, payload : ${message.payload} published`)
              })
            });
            //锁定机构
            pubsub.on('lockOrg', (orgId, status) => {
              let message = {
                topic: orgId,
                payload: `lockOrg|${status}`,
                qos: 2,
                retain: false
              };
              server.publish(message, function () {
                sails.log.info(`topic : ${message.topic}, payload : ${message.payload} published`)
              })
            });
            function setup() {
              sails.log.debug(`Mosca server is up and running at port ${moscaSettings.port}`);
              server.authenticate = authenticate;
            };

            function online(orgId) {
              sails.log.debug(`MQTT : receive ${orgId} online event`);
              Mqtt.update({ id: orgId }, { online: true }).exec((err, rs) => {
                if (err) sails.log.error(err);
                sails.log.debug(`#### MqttServer Hook : receive ${orgId} online event`);
              })
            };

            function offline(orgId) {
              sails.log.debug(`MQTT : receive ${orgId} offline event`);
              Mqtt.update({ id: orgId }, { online: false }).exec((err, rs) => {
                if (err) sails.log.error(err);
                sails.log.debug(`#### MqttServer Hook : receive ${orgId} offline event`);
              })
            };
            // }
          } else {
            sails.log.debug(`This is not Mqtt Server`);
          }
        })
      }
      sails.after(['lifted'], function () {
        setUpServer();
      });
      return cb();
    }
  }
}
