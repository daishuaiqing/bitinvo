'use strict';


var messageQueue = [];
var signalStatus = 3;
var phoneBuffer = function(phone){
  let buf = new Buffer(phone, 'ascii');
  let count = 1, ebyte = '0x', arr = [], localArr = [];
  for(let i = 0;i < buf.length;i++){
    if(localArr.length == 4){
      localArr.reverse();
      ebyte += localArr.join('');
      arr.push(ebyte);
      ebyte = '0x';
      localArr = [];
    }
    localArr.push(buf[i].toString(16));
    if(i == buf.length-1 && localArr.length < 4){
      let need = 4-localArr.length;
      for(let j = 1;j < need+1;j++){
        localArr.push('00')
      }
      localArr.reverse();
      ebyte += localArr.join('');
      arr.push(ebyte)
    }else if(i == buf.length-1 && localArr.length == 4){
      localArr.reverse();
      ebyte += localArr.join('');
      arr.push(ebyte);
    }
  }
  return arr;
};

var contentBuffer = function(content){
  let contentArr = content.split('\\u').join('').split('');
  let count = 0, ebyte = '0x', arr = [], localArr = [];
  for(let i = 0; i < contentArr.length; i = i+2){ //i+2 Only Work In Chinese
    if(localArr.length == 4){
      localArr.reverse();
      ebyte += localArr.join('');
      arr.push(ebyte);
      ebyte = '0x';
      localArr = [];
    }
    let item = contentArr[i] + contentArr[i+1];
    localArr.push(item);
    if(i == contentArr.length-2 && localArr.length < 4){
      let need = 8-localArr.length*2;
      for(let j = 1; j < need+1; j++){
        localArr.push('0');
      };
      localArr.reverse();
      ebyte += localArr.join('');
      arr.push(ebyte);
    }else if(i == contentArr.length-2 && localArr.length == 4){
      localArr.reverse();
      ebyte += localArr.join('');
      arr.push(ebyte);
    }
  }
  return arr;
};


module.exports = {
  sendSMS: function(phone, content){
    sails.log.debug(' #### SMS:sendSMS to phone : %s', phone);
    if(!phone){
      sails.log.error(' #### SMS:sendSMS phone : %s is invalid', phone);
    }
    // if(signalStatus > 0){
      // SGS_MESSAGE_SEND_SMS
      var onComplete = function(data){
        if(Number(data.status) == 0){
          messageQueue.shift();
          sails.log.debug('SMS Send Success');
          let queueLength = messageQueue.length;
          sails.log.debug('Message Queue Length is :' + queueLength);
          if(queueLength > 0){
            sails.log.debug('Start Next Queue');
            let phoneTrans = messageQueue[0].phoneTrans;
            let contentTrans = messageQueue[0].contentTrans;
            sails.services.fifoclient.sendFifoMessage('sendSMS',{
              phone: phoneTrans,contentTrans: contentTrans
            }, onComplete, onError);
          }
        }else if(data.status == 1){
          sails.log.error('SMS Send Failed');
          let phoneTrans = messageQueue[0].phoneTrans;
          let contentTrans = messageQueue[0].contentTrans;
          sails.services.fifoclient.sendFifoMessage('sendSMS',{
            phone: phoneTrans,contentTrans: contentTrans
          }, onComplete, onError);
        }
      };

      var onError = function(error){
        sails.log.error(error);
      };
      let unicode = content.replace(/[^\x00-\xff]/g, function(normal) {
        return escape(normal).replace(/%u/g, '\\u');
      });
      let phoneTrans = phoneBuffer(phone);
      let contentTrans = contentBuffer(unicode);
      let queueData = {
        phone: phone,
        content: content,
        phoneTrans: phoneTrans,
        contentTrans: contentTrans
      };
      sails.log.info(queueData);
      if(messageQueue.length == 0){
        sails.log.debug('Insert New Msg to Empty Queue')
        sails.services.fifoclient.sendFifoMessage('sendSMS',{
          phone: phoneTrans,contentTrans: contentTrans
        }, onComplete, onError);
        messageQueue.push(queueData);
      }else{
        sails.log.debug('Insert New Msg to Queue')
        messageQueue.push(queueData);
      }
    // }else{
    //   sails.log.error('SMS Device No signal So cannot send SMS');
    // }

  },
  getSMSDeviceStatus: function(){
    // SGS_MESSAGE_GET_SMS_DEVICE_STATUS
    setTimeout(function(){
      sails.log.debug(' #### SMS:getSMSDeviceStatus');

      System.findOrCreate({key: 'signal'}).then((data) => {
        signalStatus = data.value;
      })
    },15*1000)
  }
}
