/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes map URLs to views and controllers.
 *
 * If Sails receives a URL that doesn't match any of the routes below,
 * it will check for matching files (images, scripts, stylesheets, etc.)
 * in your assets directory.  e.g. `http://localhost:1337/images/foo.jpg`
 * might match an image file: `/assets/images/foo.jpg`
 *
 * Finally, if those don't match either, the default 404 handler is triggered.
 * See `api/responses/notFound.js` to adjust your app's 404 logic.
 *
 * Note: Sails doesn't ACTUALLY serve stuff from `assets`-- the default Gruntfile in Sails copies
 * flat files from `assets` to `.tmp/public`.  This allows you to do things like compile LESS or
 * CoffeeScript for the front-end.
 *
 * For more information on configuring custom routes, check out:
 * http://sailsjs.org/#!/documentation/concepts/Routes/RouteTargetSyntax.html
 */

'use strict';

const _ = require('lodash');

let actions = {

  /***************************************************************************
  *                                                                          *
  * Make the view located at `views/homepage.ejs` (or `views/homepage.jade`, *
  * etc. depending on your default view engine) your home page.              *
  *                                                                          *
  * (Alternatively, remove this and add an `index.html` file in your         *
  * `assets` directory)                                                      *
  *                                                                          *
  ***************************************************************************/
  'post /org/lockCabinet'  : 'Org.lockCabinet',
  'get /m/:moduleName': 'ModuleController.index',
  'get /':'DefaultController.index',
  'post /org':"OrgController.beforeSubmitCheckOrgName",
  'post /position':"PositionController.beforeSubmitCheckPositionName",
  'post /role':"RoleController.beforeSubmitCheckRoleName",
  'post /applicationType':"ApplicationTypeController.beforeSubmitCheckApplicationTypeName",
  /**
   * Remote Route
   */
  'get /master/*': 'RemoteController.master',
  'post /master/*': 'RemoteController.master',
  'put /master/*': 'RemoteController.master',
  'delete /master/*': 'RemoteController.master',

  'get /peer/:uid/*': 'RemoteController.peer',
  'post /peer/:uid/*': 'RemoteController.peer',
  'put /peer/:uid/*': 'RemoteController.peer',
  'delete /peer/:uid/*': 'RemoteController.peer',
  'get /remote/org/:id/*' : 'RemoteController.org',
  'put /remote/org/:id/*' : 'RemoteController.org',
  'post /remote/org/:id/*' : 'RemoteController.org',
  'delete /remote/org/:id/*' : 'RemoteController.org',
  'post /remote/requestNewToken' : 'RemoteController.requestNewToken',
  'get /remote/restart': 'RemoteController.restartPolo',
  'get /remote/checkremotemaster': 'RemoteController.checkRemoteMaster',
  'post /newsync': 'RemoteController.NewSync',
  'post /org/handshake' : 'OrgController.handShake',
  'put /org/manageToken' : 'OrgController.manageToken',
  'delete /org/manageToken' : 'OrgController.manageToken',
  'get /org/manageHandShake/:id/:result' : 'OrgController.manageHandShake',
  'post /sync/checkSync' : 'SyncController.checkSync',
  'post /sync/recieve' : 'SyncController.recieve',
  'post /sync/checkCount' : 'SyncController.checkCountRecieve',
  'post /sync/checkCountSync' : 'SyncController.checkCountSync',
  'post /cabinet/doHandshake' : 'CabinetController.doHandshake',
  'post /cabinet/handshake' : 'CabinetController.recieve',
  'get /cabinet/getBroadcastList' : 'CabinetController.getBroadcastList',
  'get /cabinet/refreshETCDCode' : 'CabinetController.refreshETCDCode',
  'get /cabinet/startCheck' : 'CabinetController.startCheck',
  'get /cabinet/filteredCabinet' : 'CabinetController.filteredCabinet',
  'get /cabinet/calibrate' : 'CabinetController.calibrate',
  'post /cabinet/checkAlive' : 'CabinetController.checkAlive',

  'get /sync/uploadPath'    : 'SyncController.uploadPath',
  'get /sync/uploadFile'    : 'SyncController.uploadFile',
  'post /sync/file'         : 'SyncController.file',
  'post /sync/syncAssets'   : 'SyncController.syncAssets',
  'get /sync/requestUpdate' : 'SyncController.requestUpdate',
  'get /sync/sendUpdate'    : 'SyncController.sendUpdate',
  //Sync
  'post /syncservice/recieve' : 'SyncController.recieve',
  /***************************************************************************
  *                                                                          *
  * Custom routes here...                                                    *
  *                                                                          *
  * If a request to a URL doesn't match any of the custom routes above, it   *
  * is matched against Sails route blueprints. See `config/blueprints.js`    *
  * for configuration options and examples.                                  *
  *                                                                          *
  ***************************************************************************/

  'post /application'                                : 'Application.create',
  'get /application/check'                           : 'Application.check',
  'get /application/approvedApplicationList'         : 'Application.approvedApplicationList',
  'get /application/prereturnApplicationList'        : 'Application.prereturnApplicationList',
  'get /application/remotePendingApplicationList'    : 'Application.remotePendingApplicationList',
  'put /application/processed/:id?'                  : 'Application.processed',
  'get /application/validate'                        : 'Application.validate',
  'get /application/emergencycheck'                  : 'Application.emergencycheck',
  'get /application/returnguncheck'                  : 'Application.returnguncheck',
  'get /application/returnbulletcheck'               : 'Application.returnbulletcheck',
  'get /application/checkbullet'                     : 'Application.checkbullet',
  'post /application/cancel'                         : 'Application.cancel',
  'post /application/adminauth'                      : 'Application.adminauth',
  'post /application/adminauthbyfingerprint'         : 'Application.adminauthbyfingerprint',  
  'post /application/adminauthbyFace'                : 'Application.adminauthbyFace',
  'get /application/storageCheck/:type'              : 'Application.storageCheck',
  'get /application/storageCheck'                    : 'Application.storageCheck',
  'get /application/maintainCheck'                   : 'Application.maintainCheck',
  'get /application/returnmaintaincheck'             : 'Application.returnMaintainCheck',
  'get /application/findWithApplicant'               : 'Application.findWithApplicant',
  'get /application/findViaGunCode'                  : 'Application.findViaGunCode',
  'get /applicationtype'                                       : 'Applicationtype.find',
  'get /applicationtypeforone'                                 : 'Applicationtype.applicationTypeForOne',
  'get /applicationtype/approvers'                             : 'Applicationtype.approvers',
  'post /applicationtype/beforesubmitcheckapplicationtypename' : 'Applicationtype.beforesubmitcheckapplicationtypename',
  'get /application/hasCapturedApplication'          : 'Application.hasCapturedApplication',
  'post /application/kioskApprove'                   : 'Application.kioskApprove',
  'post /application/kioskReturn'                    : 'Application.kioskReturn',
  'post /application/remoteApprove'                  : 'Application.remoteApprove',
  'post /application/updateApplicationStatus'        : 'Application.updateApplicationStatus',
  'post /application/remoteProcessList'              : 'Application.remoteProcessList',
  'put /application/status'                         : 'Application.status',

  'put /applicationprocess/:id?'                     : "Applicationprocess.update",

  'get /applicationprocess/findWithTotal'            : 'Applicationprocess.findWithTotal',
  'get /applicationprocess/findWithApplicant'        : 'Applicationprocess.findWithApplicant',

  'get /asset/play/:id?'                             : 'Asset.play',
  'get /asset/download/:id?'                         : 'Asset.download',
  'get /asset/image/:id?'                            : 'Asset.image',
  'delete /asset/applicationAssets/:id?'              : 'Asset.delete',
  'get /asset/list'                                  : 'Asset.list',


  'get /auth/logout'                                 : 'Auth.logout',
  'post /auth/signup'                                : 'Auth.signup',
  'get /auth/login'                                  : 'Auth.login',
  'post /auth/reset'                                 : 'Auth.reset',
  'post /auth/restore'                               : 'Auth.restore',
  'post /auth/disconnect'                            : 'Auth.disconnect',

  'put /cabinet/webcam'                              : 'Cabinet.webcam',
  'post /cabinet/verify/:code'                       : 'Cabinet.verify',
  'post /cabinet/open'                               : 'Cabinet.open',
  'post /cabinet/close'                              : 'Cabinet.close',
  'get /cabinet/list'                                : 'Cabinet.list',
  'get /cabinet/preVCode'                            : 'Cabinet.getPreVCode',
  'post /cabinet/updatesettings'                     : 'Cabinet.updatesettings',
  'get /cabinet/verifycabinet'                       : 'Cabinet.verifyCabinet',
  'get /cabinet/cleanconnect'                        : 'Cabinet.cleanConnect',
  'post /cabinet/recieveClean'                       : 'Cabinet.recieveClean',
  'get /cabinet/associatedBulletsCabinets'           : 'Cabinet.associatedBulletsCabinets',
  'get /cabinetmodule/list'                          : 'Cabinetmodule.list',
  'post /cabinetmodule/recordABGun'                  : 'Cabinetmodule.recordABGun',
  'post /cabinetmodule/open'                         : 'Cabinetmodule.open',
  'post /cabinetmodule/openall'                      : 'Cabinetmodule.openall',
  'post /cabinetmodule/opengate'                     : 'Cabinetmodule.openGate',
  'post /cabinetmodule/openBatch'                    : 'Cabinetmodule.openBatch',
  'post /cabinetmodule/openAssociatedBulletModule'   : 'Cabinetmodule.openAssociatedBulletModule',
  'get /cabinetmodule/countgun'                      : 'Cabinetmodule.countgun',
  'get /cabinetmodule/countbullet'                   : 'Cabinetmodule.countbullet',
  'get /cabinetmodule/info'                           : 'Cabinetmodule.info',
  'get /cabinetmodule/ezcreate'                       : 'Cabinetmodule.ezCreate',
  'post /cabinetmodule/ezcreate'                       : 'Cabinetmodule.ezCreate',
  'post /cabinetmodule/disablemodule'                 : 'Cabinetmodule.disableModule',
  'post /cabinetmodule/modulestatus'                  : 'Cabinetmodule.moduleStatus',
  'get /cabinetmodule/moduletype'                     : 'Cabinetmodule.moduleType',
  'get /cabinetmodule/gunlockrepair'                  : 'Cabinetmodule.gunLockRepair',
  'get /cabinetmodule/returnZero'                     : 'Cabinetmodule.returnZero',
  'get /cabinetmodule/calibrate'                      : 'Cabinetmodule.calibrate',
  'get /cabinetmodule/directOpen'                     : 'Cabinetmodule.directOpen',
  'put /cabinetmodule/:id'                           : 'Cabinetmodule.update',
  'delete /cabinetmodule/:id?'                       : 'Cabinetmodule.delete',
  'get /cabinetmodule/associatedBulletsModules'      : 'Cabinetmodule.associatedBulletsModules',
  'post /cabinetmodule/openSetAssociatedBulletModule': 'Cabinetmodule.openSetAssociatedBulletModule',

  'get /camera/record'                               : 'Camera.record',
  'get /camera/stop'                                 : 'Camera.stop',
  'get /camera/capture'                              : 'Camera.capture',
  'get /camera/stream'                               : 'Camera.startStream',
  'post /camera/upload'                              : 'Camera.upload',
  'post /camera/captureapplication'                  : 'Camera.captureApplication',
  'get /fingerprint/auth'                            : 'Fingerprint.auth',
  'get /fingerprint/record'                          : 'Fingerprint.record',
  'get /fingerprint/stopscan'                        : 'Fingerprint.stopscan',
  'get /fingerprint/clean'                           : 'Fingerprint.clean',
  'get /fingerprint/fingerPic'                       : 'Fingerprint.fingerPic',
  'post /fingerprint/recieve'                        : 'Fingerprint.recieveSync',

  'get /face/auth'                                   : 'Face.auth',
  'get /face/_auth'                                  : 'Face._auth',
  'get /face/record'                                 : 'Face.record',
  'get /face/stopscan'                               : 'Face.stopscan',
  'get /face/clean'                                  : 'Face.clean',
  'get /face/facePic'                                : 'Face.facePic',
  'post /face/recieve'                               : 'Face.recieveSync',

  'get /iris/auth'                                   : 'Iris.auth',
  'get /iris/record'                                 : 'Iris.record',
  'get /iris/stopscan'                               : 'Iris.stopscan',
  'get /iris/clean'                                  : 'Iris.clean',
  'get /iris/irisPic'                                : 'Iris.irisPic',
  'post /iris/recieve'                               : 'Iris.recieveSync',

  'get /gun/validation'                              : 'Gun.validation',
  'get /gun/gunisisit'                               : 'Gun.getGunIsisit',
  'get /gun/publicgun'                               : 'Gun.publicGun',
  'get /gun/masterpublicgun'                         : 'Gun.masterPublicGun',
  'post /gun/in'                                     : 'Gun.in',
  'delete /gun/:id?'                                 : 'Gun.delete',
  'post /gun'                                        : 'Gun.create',
  'put /gun/:id?'                                    : 'Gun.update',
  'get /gun/list'                                    : 'Gun.list',
  'get /gun/associateList'                           : 'Gun.associateList',
  'get /gun/checkAssociateGun'                       : 'Gun.checkAssociateGun',
  'get /gun/initABGun'                              : 'Gun.initABGun',

  'get /message/subscribe'                           : 'Message.subscribe',
  'post /message/send'                               : 'Message.send',
  'post /message/noti'                               : 'Message.noti',
  'post /message/blast'                              : 'Message.blast',
  'post /message/blastevent'                         : 'Message.blastevent',
  'get /message/subscribe2local'                     : 'Message.subscribeToLocalRoom',
  'get /message/subscribeAsLocal'                    : 'Message.subscribeAsLocal',

  'get /module'                                      : 'Module.index',

  'get /org/webcamUrl'                               : 'Org.webcamUrl',
  'put /org/webcamUrl/:id'                           : 'Org.webcamUrl',
  'delete /org/clear/:id'                           : 'Org.deleteOrg',
  'get /optlog/_logWithFaceAndFinger'                : 'Optlog._logWithFaceAndFinger',
  'get /optlog/download'                             : 'Optlog.download',
  'get /optlog/pdfdownload'                          : 'Optlog._logWithFaceAndFinger',
  'get /optlog/fetchLog'                             : 'Optlog.fetchLog',
  'get /optlog/syslog'                                : 'Optlog.sysLog',
  'get /optlog/_logs'                                : 'Optlog.logsWithFaceAndFinger',
  'get /optlog/logsTextOnly'                          : 'Optlog._logs',
  'post /optlog/kioskLog'                             : 'Optlog.kioskLog',
  'post /optlog/openLog'                             : 'Optlog.openLog',
  'get /org/validation'                              : 'Org.validation',
  'get /org/orgList'                                 : 'Org.orgList',

  'get /optlog/logsWithFaceAndFinger'                : 'Optlog._logsWithFaceAndFinger',
  'get /system/envinfo'                              : 'System.envinfo',
  'get /system/wakeup'                               : 'System.wakeUp',
  'post /system/resetalarm'                          : 'System.resetalarm',
  'get /system/settings'                             : 'System.settings',
  'post /system/updatesettings'                      : 'System.updatesettings',
  'get /system/resetdefault'                         : 'System.resetdefault',
  'get /system/ipAddress'                            : 'System.ipAddress',
  'get /system/version'                              : 'System.version',
  'post /system/uploadupdatefile'                    : 'System.uploadUpdateFile',
  'post /system/update'                              : 'System.update',
  'get /system/restart/:type'                        : 'System.restart',
  'post /system/updatesoftware'                      : 'System.updateSoftware',
  'get /system/testcan'                              : 'System.testCanStates',
  'get /system/mastertime'                           : 'System.getMasterTime',
  'get /system/faceperception'                       : 'System.facePerception',
  'get /system/restart'                              : 'System.restart',
  'get /user/me'                                     : 'User.me',
  'get /user/autocomplete'                           : 'User.autoComplete',
  'get /user/managers'                               : 'User.managers',
  'get /user/userinfo'                               : 'User.userInfo',
  'get /user/addsuperuser'                           : 'User.addSuperUser',
  'delete /user/:id?'                                : 'User.delete',
  'post /user'                                       : 'User.create',
  'post /system/importcsv'                           : 'System.importUserData',
  'get /system/fetchPic'                             : 'System.fetchPic',
  'post /system/modulecount'                         : 'System.moduleCount',
  'get /system/systemStatus'                         : 'System.systemStatus',
  'post /system/logo'                                : 'System.logo',
  'get /system/logo'                                 : 'System.logo',
  'get /system/downloadFile'                         : 'System.downloadFile',
  '/system/alarmConfig'                              : 'System.alarmConfig',
  'get /system/test/ping'                            : 'System.ping',
  'get /system/resetUUID'                            : 'System.resetUUID',
  'get /system/lockCabinet'                          : 'System.lockCabinet',

  'post /idCard/getUserId'                           : 'IdCard.getUserId',

  'get /messageexchange/testopenmsg'                 : 'MessageExchange.testOpenMsg',
  'get /messageexchange/testalarmmsg'                : 'MessageExchange.testAlarmMsg',

  'get /monit/setdiskstate'                          : 'Monit.setDiskState',

  'post /recordFrontEndFailLog/recordLog' : 'RecordFrontEndFailLog.recordLog',
  'get /pinyin/input'                             : 'Pinyin.input',
  'post /signature/save'                          : 'Signature.save',
  'get /signature/fetch'                          : 'Signature.fetch',

  'get /system/alarm'                             : 'System.alarm',

  'get /doorLockRepair/markDoorLockRepaired'      : 'DoorLockRepair.markDoorLockRepaired',
  'get /doorLockRepair/cancleRepair'              : 'DoorLockRepair.cancleRepair'


};

let blueprints = {

  //Generated -------------------------------------------------------
  'get /application'                                 : {blueprint : 'find'},
  'get /application/:id'                             : {blueprint : 'findOne'},
  'put /application/:id'                             : {blueprint : 'update'},
  'post /application/recieve'                        : {blueprint : 'create'},
  'delete /application/:id?'                         : {blueprint : 'destroy'},
  'get /applicationprocess'                          : {blueprint : 'find'},
  'get /applicationprocess/:id'                      : {blueprint : 'findOne'},
  'post /applicationprocess'                         : {blueprint : 'create'},
  'put /applicationprocess/recieve/:id'             : {blueprint : 'update'},
  'delete /applicationprocess/:id?'                  : {blueprint : 'destroy'},
  'get /applicationtype/:id'                         : {blueprint : 'findOne'},
  'post /applicationtype'                            : {blueprint : 'create'},
  'put /applicationtype/:id'                         : {blueprint : 'update'},
  'post /applicationtype/:id'                        : {blueprint : 'update'},
  'delete /applicationtype/:id?'                     : {blueprint : 'destroy'},
  'get /asset'                                       : {blueprint : 'find'},
  'get /asset/:id'                                   : {blueprint : 'findOne'},
  'post /asset'                                      : {blueprint : 'create'},
  'put /asset/:id'                                   : {blueprint : 'update'},
  'post /asset/:id'                                  : {blueprint : 'update'},
  'delete /asset/:id?'                               : {blueprint : 'destroy'},
  'get /bullettype'                                  : {blueprint : 'find'},
  'get /bullettype/:id'                              : {blueprint : 'findOne'},
  'post /bullettype'                                 : {blueprint : 'create'},
  'put /bullettype/:id'                              : {blueprint : 'update'},
  'post /bullettype/:id'                             : {blueprint : 'update'},
  'delete /bullettype/:id?'                          : {blueprint : 'destroy'},
  'get /cabinet'                                     : {blueprint : 'find'},
  'get /cabinet/:id'                                 : {blueprint : 'findOne'},
  'post /cabinet'                                    : {blueprint : 'create'},
  'put /cabinet/:id'                                 : {blueprint : 'update'},
  'post /cabinet/:id'                                : {blueprint : 'update'},
  'delete /cabinet/:id?'                             : {blueprint : 'destroy'},
  'get /cabinetmodule'                               : {blueprint : 'find'},
  'get /cabinetmodule/:id'                           : {blueprint : 'findOne'},
  'post /cabinetmodule'                              : {blueprint : 'create'},
  'post /cabinetmodule/:id'                          : {blueprint : 'update'},
  'get /contact'                                     : {blueprint : 'find'},
  'get /contact/:id'                                 : {blueprint : 'findOne'},
  'post /contact'                                    : {blueprint : 'create'},
  'put /contact/:id'                                 : {blueprint : 'update'},
  'post /contact/:id'                                : {blueprint : 'update'},
  'delete /contact/:id?'                             : {blueprint : 'destroy'},
  'get /dutyshift'                                   : {blueprint : 'find'},
  'get /dutyshift/:id'                               : {blueprint : 'findOne'},
  'post /dutyshift'                                  : ['DutyShiftController.dutyTimeValidate', {blueprint : 'create'}],
  'put /dutyshift/:id'                               : ['DutyShiftController.dutyTimeValidate', {blueprint : 'update'}],
  'post /dutyshift/:id'                              : ['DutyShiftController.dutyTimeValidate', {blueprint : 'update'}],
  'delete /dutyshift/:id?'                           : {blueprint : 'destroy'},
  'get /fingerprint'                                 : {blueprint : 'find'},
  'get /fingerprint/:id'                             : {blueprint : 'findOne'},
  'post /fingerprint'                                : {blueprint : 'create'},
  'put /fingerprint/:id'                             : {blueprint : 'update'},
  'post /fingerprint/:id'                            : {blueprint : 'update'},
  'delete /fingerprint/:id?'                         : {blueprint : 'destroy'},
  'get /gun'                                         : {blueprint : 'find'},
  'get /gun/:id'                                     : {blueprint : 'findOne'},
  'get /guntype'                                     : {blueprint : 'find'},
  'get /guntype/:id'                                 : {blueprint : 'findOne'},
  'post /guntype'                                    : {blueprint : 'create'},
  'put /guntype/:id'                                 : {blueprint : 'update'},
  'post /guntype/:id'                                : {blueprint : 'update'},
  'delete /guntype/:id?'                             : {blueprint : 'destroy'},
  'get /message'                                     : {blueprint : 'find'},
  'get /message/:id'                                 : {blueprint : 'findOne'},
  'post /message'                                    : {blueprint : 'create'},
  'put /message/:id'                                 : {blueprint : 'update'},
  'post /message/:id'                                : {blueprint : 'update'},
  'delete /message/:id?'                             : {blueprint : 'destroy'},
  'get /optlog'                                      : {blueprint : 'find'},
  'get /optlog/:id'                                  : {blueprint : 'findOne'},
  'post /optlog'                                     : {blueprint : 'create'},
  'put /optlog/:id'                                  : {blueprint : 'update'},
  'post /optlog/:id'                                 : {blueprint : 'update'},
  'get /org'                                         : {blueprint : 'find'},
  'get /org/:id'                                     : {blueprint : 'findOne'},
  'post /org'                                        : ['OrgController.beforeSubmitCheckOrgName', {blueprint : 'create'}],
  'put /org/:id'                                     : ['OrgController.beforeUpdateCheckLocal', {blueprint : 'update'}],
  'post /org/:id'                                    : ['OrgController.beforeSubmitCheckOrgName', {blueprint : 'update'}],
  'delete /org/:id?'                                 : {blueprint : 'destroy'},
  'get /position'                                    : {blueprint : 'find'},
  'get /position/:id'                                : {blueprint : 'findOne'},
  'post /position'                                   : ['PositionController.beforeSubmitCheckPositionName', {blueprint : 'create'}],
  'put /position/:id'                                : {blueprint : 'update'},
  'post /position/:id'                               : ['PositionController.beforeSubmitCheckPositionName', {blueprint : 'update'}],
  'delete /position/:id?'                            : {blueprint : 'destroy'},
  'get /role'                                        : {blueprint : 'find'},
  'get /role/:id'                                    : {blueprint : 'findOne'},
  'post /role'                                       : ['RoleController.beforeSubmitCheckRoleName', {blueprint : 'create'}],
  'put /role/:id'                                    : {blueprint : 'update'},
  'post /role/:id'                                   : ['RoleController.beforeSubmitCheckRoleName', {blueprint : 'update'}],
  'delete /role/:id?'                                : {blueprint : 'destroy'},
  'get /system'                                      : {blueprint : 'find'},
  'get /system/:id'                                  : {blueprint : 'findOne'},
  'post /system'                                     : {blueprint : 'create'},
  'put /system/:id'                                  : {blueprint : 'update'},
  'post /system/:id'                                 : {blueprint : 'update'},
  'delete /system/:id?'                              : {blueprint : 'destroy'},
  'get /user'                                        : {blueprint : 'find'},
  'get /user/:id'                                    : {blueprint : 'findOne'},
  'put /user/:id'                                    : ['UserController.checkParamsBeforeSubmit', {blueprint : 'update'}],
  'post /user/:id'                                   : {blueprint : 'update'},
  'post /user'                                       : {blueprint : 'create'},
  'post /passport'                                   : {blueprint : 'create'},
  'put /passport/:id'                                : {blueprint : 'update'},
  'get /face'                                        : {blueprint : 'find'},
  'delete /face/:id?'                                 : {blueprint : 'destroy'},
  'get /iris'                                        : {blueprint : 'find'},
  'delete /iris/:id?'                                 : {blueprint : 'destroy'},
  'get /applicationcaptured'                          : {blueprint: 'find' }
};

let generateRoute = function(){
  let security = {};
  _.each(blueprints, function(blueprint, routeName){
    security[routeName] = typeof blueprint === 'object' ? [{policy: 'localAccess'}, {policy: 'tokenAuth'}, {policy: 'basicAuth'}, {policy: 'passport'}, {policy: 'sessionAuth'}, blueprint]
                                                        : [{policy: 'localAccess'}, {policy: 'tokenAuth'}, {policy: 'basicAuth'}, {policy: 'passport'}, {policy: 'sessionAuth'}].concat(blueprint);
  });
  let routes = _.merge(actions, security);
  return routes;
};
module.exports.routes = generateRoute();
