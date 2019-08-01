'use strict';
/**
 * ApplicationProcessController
 *
 * @description :: Server-side logic for managing Applicationprocesses
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
const actionUtil = require('sails/lib/hooks/blueprints/actionUtil');

const ApplicationController = require('./ApplicationController');
const co = require('co');
module.exports = {
  update: function (req, res, next) {
    sails.log.debug(' #### ApplicationProcessController:update Application Process');

    var appProcess = req.body;
    var user = req.session.user ? req.session.user : req.user;
    if (!user) {
      sails.log.error(' #### ApplicationController:update No User found');
      return res.forbidden({ error: 'user can not be found' });
    }

    appProcess = sails.services.utils.replaceNull(actionUtil.parseValues(req));

    ApplicationProcess
      .update({ id: appProcess.id }, appProcess)
      .exec(function (err, updateds) {
        if (err) return res.negotiate(err);
        sails.log.debug(' #### ApplicationProcessController:update update Application Process success');
        var updated = updateds.pop();
        if (updated) {
          ApplicationController.updateProcess(updated, user);
          res.ok(appProcess);
        } else {
          res.badRequest({ error: 'Nothing found' });
        }
      })
  },
  findWithTotal: function (req, res, next) {
    let time = req.query['time'] || new Date();
    let skip = req.query['skip'] || 0;
    let limit = req.query['limit'] || 9;
    let than = req.query['than'] || 'bigger';
    let user = req.session.user ? req.session.user : req.user;
    if (than == 'bigger') {
      ApplicationProcess
        .find({ where: { application: { start: { '>': time } }, isDeleted: false, approver: user.id }, skip: skip, limit: limit, sort: 'createdAt DESC' })
        .populate('applicant')
        .populate('application')
        .exec((err, data) => {
          ApplicationProcess
            .find({ where: { application: { start: { '>': time } }, isDeleted: false, approver: user.id } })
            .populate('application').exec((err, count) => {
              let result = {
                total: count.length,
                limit: limit,
                skip: skip,
                data: data
              };
              res.ok(result);
            })
        });
    } else if (than == 'smaller') {
      ApplicationProcess
        .find({ where: { application: { start: { '<': time } }, isDeleted: false, approver: user.id }, skip: skip, limit: limit, sort: 'createdAt DESC' })
        .populate('applicant')
        .populate('application')
        .exec((err, data) => {
          ApplicationProcess
            .find({ where: { application: { start: { '<': time } }, isDeleted: false, approver: user.id } })
            .populate('application').exec((err, count) => {
              let result = {
                total: count.length,
                limit: limit,
                skip: skip,
                data: data
              };
              res.ok(result);
            })
        });
    }
  },
  findWithApplicant: function (req, res, next) {
    let time = req.query['time'] || new Date();
    let skip = req.query['skip'] || 0;
    let limit = req.query['limit'] || 9;
    let than = req.query['than'] || 'bigger';
    let user = req.session.user ? req.session.user : req.user;
    let applicantName = req.query.applicant;
    co(function* () {
      return yield User.findOne({ username: applicantName });
    }).then((applicant) => {
      if (!applicant) {
        return res.serverError('no such applicant');
      }
      if (than == 'bigger') {
        ApplicationProcess
          .find({ where: { application: { start: { '>': time } }, isDeleted: false, approver: user.id, applicant: applicant.id }, skip: skip, limit: limit, sort: 'createdAt DESC' })
          .populate('applicant')
          .populate('application')
          .exec((err, data) => {
            ApplicationProcess
              .find({ where: { application: { start: { '>': time } }, isDeleted: false, approver: user.id, applicant: applicant.id } })
              .populate('application').exec((err, count) => {
                let result = {
                  total: count.length,
                  limit: limit,
                  skip: skip,
                  data: data
                };
                res.ok(result);
              })
          });
      } else if (than == 'smaller') {
        ApplicationProcess
          .find({ where: { application: { start: { '<': time } }, isDeleted: false, approver: user.id, applicant: applicant.id }, skip: skip, limit: limit, sort: 'createdAt DESC' })
          .populate('applicant')
          .populate('application')
          .exec((err, data) => {
            ApplicationProcess
              .find({ where: { application: { start: { '<': time } }, isDeleted: false, approver: user.id, applicant: applicant.id } })
              .populate('application').exec((err, count) => {
                let result = {
                  total: count.length,
                  limit: limit,
                  skip: skip,
                  data: data
                };
                res.ok(result);
              })
          });
      }
    }).catch((err) => {
      sails.log.error('#### ApplicationProcessController: findWithApplicant error ####');
      sails.log.error(err);
      return res.serverError(err);
    })
  }
};
