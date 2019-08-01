'use strict'

module.exports = {
  publishList: () => {
    System.findOne({ key: 'enableFetchList' }).exec((err, sys) => {
      if (sys && sys.value == 'true') {
        Application.find({
          status: 'approved',
          cabinet: sails.config.cabinet.id,
          flatType: ['gun', 'bullet', 'storageGun', 'storageBullet']
        }).exec((err, app) => {
          if (err) {
            sails.log.error(`#### Application Service : publishList : search approved application faild ${err} ####`);
          } else {
            sails.services.message.local({
              topic: 'approvedApplication',
              value: { count: app.length }
            })
          }
        })
        Application.find({
          status: 'prereturn',
          cabinet: sails.config.cabinet.id
        }).exec((err, app) => {
          if (err) {
            sails.log.error(`#### Application Service : publishList : search prereturn application faild ${err} ####`);
          } else {
            sails.services.message.local({
              topic: 'prereturnApplication',
              value: { count: app.length }
            })
          }
        })
        Application.find({
          status: ['approved', 'pending', 'new'],
          remote: true,
          remoteStatus: 'pending'
        }).exec((err, app) => {
          if (err) {
            sails.log.error(`#### Application Service : publishList : search remote pending application faild ${err} ####`);
          } else {
            sails.services.message.local({
              topic: 'remotePendingApplication',
              value: { count: app.length }
            })
          }
        })
      }
    })
  }
}
