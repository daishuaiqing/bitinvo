'use strict';

var ion = require('ion-sound-nasetech');

var Audio = function(){
    log.info('Audio has been created');
    this.currentSoundId = null;
}

var prototype = {
  play : function(soundId, keepPrev){
    if(soundId){
      var prevSoundId = this.currentSoundId;
      $.ionSound.play(soundId);
      if(!keepPrev && prevSoundId && soundId !== prevSoundId){
        try {
          $.ionSound.stop(prevSoundId)
        } catch(e) {
          console.log('stop audio fail');
        }
      }
      this.currentSoundId = soundId;
    }
  },
  init : function(){
    // can not call ion directly , probably it is a  bug
    $.ionSound({
      sounds: [
        {
          name: "scan"
        },
        {
          name: "scan_success"
        },
        {
          name: "signin"
        },
        {
          name: "notmeauth"
        },
        {
          name: "account_signin_success"
        },
        {
          name: "login_fail"
        },
        {
          name: "authorizing"
        },
        {
          name: "offline_authorizing"
        },
        {
          name: "withdrawing"
        },
        {
          name: "doorclosing"
        },
        {
          name: "checking"
        },
        {
          name: "scan_success"
        },
        {
          name: "scan_fail"
        },
        {
          name: "fingerprintRecordFail"
        },
        {
          name: "applicationrejected"
        },
        {
          name: "fingerprintRecordSuccess"
        },
        {
          name: "checkingApplication"
        },
        {
          name: "cabinetDoorOpened"
        },
        {
          name: "gunWarehouseOpen"
        },
        {
          name: "takeBullet"
        },
        {
          name: 'BKSP'
        },
        {
          name: 'NEXT'
        },
        {
          name: 'PREV'
        },
        {
          name: 'CANCEL'
        },
        {
          name: 'click'
        },
        {
          name: 'movefinger'
        },
        //以下是新加的语音 内容匹配见"/assets/audiomessage.txt"
        {
          name: 'applicationTime'
        },
        {
          name: 'applicationTimeErr'
        },
        {
          name: 'checkApplicationFail'
        },
        {
          name: 'authorize'
        },
        {
          name: 'chooseType'
        },
        {
          name: 'confirmAuthorize'
        },
        {
          name: 'establishSuccess'
        },
        {
          name: 'fingerprint'
        },
        {
          name: 'fingerprintfail'
        },
        {
          name: 'fingerprintisfull'
        },
        {
          name: 'noApplication'
        },
        {
          name: 'noApplicationReview'
        },
        {
          name: 'noApplicationCrossCabine'
        },
        {
          name: 'orderAuthorizeFail'
        },
        {
          name: 'orderAuthorizeSuccess'
        },
        {
          name: 'unAuthorizedAccess'
        },
        {
          name: 'welcome'
        },
        {
          name: 'bulletNumberNull'
        },
        {
          name: 'authorizedOrProxy'
        },
        {
          name: 'processAuth'
        },
        {
          name: 'selectCabinet'
        },
        {
          name: 'selectGun'
        },
        {
          name: 'sureEndTime'
        },
        {
          name: 'end'
        },
        {
          name: 'face'
        },
        {
          name: 'face1'
        },
        {
          name: 'face2'
        },
        {
          name: 'face3'
        },
        {
          name: 'face4'
        },
        {
          name: 'face5'
        },
        {
          name: 'face6'
        },
        {
          name: 'face7'
        },
        {
          name: 'face_error'
        },
        {
          name: 'face_success'
        },
        {
          name: 'no_face'
        },
        {
          name: 'selectBulletModule'
        },
        {
          name: 'notApplicationAuthPeople'
        },
        {
          name: 'admin_finger'
        },
        {
          name: 'another_admin_auth'
        },
        {
          name: 'faceAuth'
        },
        {
          name: 'admin_auth_failed'
        },
        {
          name: 'restartApp'
        }
      ],
      volume: 1,
      path: "/audio/",
      preload: true,

      multiplay: false,
      hasCache : false,

      ready_callback: function (obj) {
        obj.name;     // File name
        obj.alias;    // Alias (if set)
        obj.ext;      // File .ext
        obj.duration; // Seconds
      },
      ended_callback: function (obj) {
        obj.name;     // File name
        obj.alias;    // Alias (if set)
        obj.part;     // Part (if sprite)
        obj.start;    // Start time (sec)
        obj.duration; // Seconds
      }
    });
    return this;
  },
  destroy : function(){
    return this;
  }
}

_.extend(Audio.prototype, prototype);

var $Audio = null;

if (window.$Audio) {
  $Audio = window.$Audio;
} else {
  window.$Audio = new Audio();
  $Audio = window.$Audio;
}

module.exports = $Audio;
