/**
 * SignatureController
 *
 * @description :: Server-side logic for managing signatures
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
'use strict'
module.exports = {
  save: (req, res) => {
    let signature = req.body;
    const isApplicant = req.body.isApplicant;
    Signature.create(signature).exec((err, rs) => {
      if (err) {
        sails.log.error(`#### SignatureController : save create signature failed ${err} #####`);
        return res.serverError(err);
      }
      if (isApplicant == 'true') {
        OptLog.findOne({
          object: 'application',
          action: '提交申请',
          objectId: signature.application
        }).exec((err, optlog) => {
          if (err) {
            sails.log.error(`#### Signature : save get optlog failed`);
            sails.log.error(err);
          } else {
            if (optlog && !optlog.signature) {
              OptLog.update({
                id: optlog.id
              }, {
                  signature: rs.id
                }).exec((err, rs) => {
                  if (err) {
                    sails.log.error(`#### Signature : save set optlog signature failed`);
                    sails.log.error(err);
                  }
                })
            }
          }
        })
      } else {
        OptLog.findOne({
          object: 'application',
          objectId: signature.application,
          createdBy: signature.user,
          actionType: ['admin_face_authorize_success', 'admin_fingerprint_authorize_success', 'admin_password_authorize_success'],
          signature: ''
        }).exec((err, exLog) => {
          if (err) {
            sails.log.error(`#### SignatureContorller : save get previous log signature failed`);
            sails.log.error(err);
          } else if (exLog) {
            OptLog.update({ id: exLog.id }, {
              signature: rs.id
            }).exec((err, rs) => {
              sails.log.error(`#### Signature : save set previous signature failed`);
              sails.log.error(err);
            })
          }
        })
      }
      return res.ok();
    })
  },

  fetch: (req, res) => {
    let signatureId = req.query.signatureId;
    Signature.findOne({ 'id': signatureId }).exec((err, rs) => {
      if (err) {
        sails.log.error(`#### SignatureController : fetch get signature failed ${err} #####`);
        return res.serverError(err);
      }
      if (rs) {
        return res.ok(rs.signature);
      } else {
        return res.serverError('no signature found');
      }
    })
  }
};

