/**
 * Policy Mappings
 * (sails.config.policies)
 *
 * Policies are simple functions which run **before** your controllers.
 * You can apply one or more policies to a given controller, or protect
 * its actions individually.
 *
 * Any policy file (e.g. `api/policies/authenticated.js`) can be accessed
 * below by its filename, minus the extension, (e.g. "authenticated")
 *
 * For more information on how policies work, see:
 * http://sailsjs.org/#!/documentation/concepts/Policies
 *
 * For more information on configuring policies, check out:
 * http://sailsjs.org/#!/documentation/reference/sails.config/sails.config.policies.html
 */


module.exports.policies = {

  /***************************************************************************
  *                                                                          *
  * Default policy for all controllers and actions (`true` allows public     *
  * access)                                                                  *
  *                                                                          *
  ***************************************************************************/

  // '*': true,

  /***************************************************************************
  *                                                                          *
  * Here's an example of mapping some policies to run before a controller    *
  * and its actions                                                          *
  *                                                                          *
  ***************************************************************************/
  // RabbitController: {

  // Apply the `false` policy as the default for all of RabbitController's actions
  // (`false` prevents all access, which ensures that nothing bad happens to our rabbits)
  // '*': false,

  // For the action `nurture`, apply the 'isRabbitMother' policy
  // (this overrides `false` above)
  // nurture	: 'isRabbitMother',

  // Apply the `isNiceToAnimals` AND `hasRabbitFood` policies
  // before letting any users feed our rabbits
  // feed : ['isNiceToAnimals', 'hasRabbitFood']
  // }

  '*': [
    'tokenAuth',
    'basicAuth',
    'passport',
    'sessionAuth',
    // 'ModelPolicy',
    // 'AuditPolicy',
    // 'OwnerPolicy',
    // 'PermissionPolicy',
    // 'RolePolicy',
    // 'CriteriaPolicy'
  ],

  AssetController: {
    'image': true,
    'play': true,
    'list': true
  },

  FingerprintController: {
    'scan': 'localaccess',
    'auth': 'localaccess',
    'stopScan': 'localaccess',
    'record': 'localaccess',
    'fingerPic': 'localaccess'
  },

  FaceController: {
    '*': true
  },

  CabinetController: {
    'recieve': true,
    'getBroadcastList': true,
    'refreshETCDCode': true,
    'checkAlive': true,
    'filteredCabinet': true,
    'webcam': true
  },
  CabinetModuleController: {
    'countgun': 'localaccess',
    'countbullet': 'localaccess',
    'moduleType': true,
    'ezCreate': true,
  },

  ModuleController: {
    '*': 'localaccess'
  },

  AuthController: {
    '*': ['tokenAuth', 'basicAuth', 'passport'],
    'signup': true
  },

  SystemController: {
    'envinfo': true,
    'resetalarm': true,
    'version': true,
    'restart': 'localaccess',
    'ipAddress': true,
    'settings': ['tokenAuth', 'basicAuth'],
    'wakeUp': true,
    'facePerception': true,
    'fetchPic': true,
    'logo': true,
    'alarmConfig': true,
    'lockCabinet': true
  },

  DefaultController: {
    '*': true
  },


  RemoteController: {
    '*': 'tokenAuth',
    'requestNewToken': true
  },

  ApplicationController: {
    '*': ['tokenAuth', 'basicAuth', 'blockAuth'],
    'kioskApprove': true,
    'kioskReturn': true,
    'approvedApplicationList': true,
    'prereturnApplicationList': true,
    'remoteProcessList': true
  },

  ApplicationTypeController: {
    'applicationTypeForOne': true
  },
  CameraController: {
    '*': 'localaccess'
  },

  IdCardController: {
    '*': true
  },

  MonitController: {
    '*': true
  },

  UserController: {
    'delete': ['tokenAuth', 'basicAuth', 'blockAuth'],
    'autoComplete': true
  },

  OrgController: {
    '*': true
  },
  MessageController: {
    'subscribeToLocalRoom': true,
    'subscribeAsLocal': true
  },
  MessageExchangeController: {
    '*': true
  },
  GunController: {
    'getGunIsisit': true,
    'associateList': true,
    'checkAssociateGun': true
  },
  OptLogController: {
    'kioskLog': true,
    'fetchLog': true,
    'openLog': true
  },
  RecordFrontEndFailLogController: {
    '*': true
  },
  PinyinController: {
    '*': true
  },
  SignatureController: {
    '*': true
  },
  DoorLockRepairController: {
    '*': true
  },
  SyncController: {
    'uploadPath': true,
    'file': true,
    'uploadFile': true,
    'syncAssets': true,
    'requestUpdate': true,
    'sendUpdate': true
  }
};
