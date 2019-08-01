'use strict';
/**
 * Module dependencies
 */

var actionUtil = require('sails/lib/hooks/blueprints/actionUtil');
var util = require('util');
var _ = require('lodash');
const ApplicationController = require('../controllers/ApplicationController');
/**
 * Update One Record
 *
 * An API call to update a model instance with the specified `id`,
 * treating the other unbound parameters as attributes.
 *
 * @param {Integer|String} id  - the unique id of the particular record you'd like to update  (Note: this param should be specified even if primary key is not `id`!!)
 * @param *                    - values to set on the record
 *
 */
module.exports = function updateOneRecord (req, res) {

  // Split Model's name
  let urlArr = req.url.split('/');
  let modelName = urlArr[1];
  // Look up the model
  var Model = actionUtil.parseModel(req);
  // Locate and validate the required `id` parameter.
  var pk = actionUtil.requirePk(req);

  // Create `values` object (monolithic combination of all parameters)
  // But omit the blacklisted params (like JSONP callback param, etc.)
  var values = sails.services.utils.replaceNull(actionUtil.parseValues(req));
  // if(modelName === 'user' || modelName === 'fingerprint' || modelName === 'passport'){
  //   return sails.services.sync.insertSync(pk, modelName, values)
  //   .then((suc) => {
  //     sails.log.info(suc);
  //     return res.ok(suc);
  //   })
  //   .catch((err) => {
  //     if(typeof err === 'string'){return res.badRequest({error: err})};
  //     sails.log.error(err);
  //     return res.serverError(err);
  //   })
  // }
  // No matter what, don't allow changing the PK via the update blueprint
  // (you should just drop and re-add the record if that's what you really want)
  if (typeof values[Model.primaryKey] !== 'undefined' && values[Model.primaryKey] != pk) {
    req._sails.log.warn('Cannot change primary key via update blueprint; ignoring value sent for `' + Model.primaryKey + '`');
  }
  // Make sure the primary key is unchanged
  values[Model.primaryKey] = pk;

  // Find and update the targeted record.
  //
  // (Note: this could be achieved in a single query, but a separate `findOne`
  //  is used first to provide a better experience for front-end developers
  //  integrating with the blueprint API.)
  var query = Model.findOne(pk);
  modelName = _.toLower(modelName);
  if(modelName === 'user'){
    query = Model.findOne(pk).populate('roles');
  }
  if(modelName === 'applicationtype'){
    query = Model.findOne(pk).populate('approvers');
  }
  // Populate the record according to the current "populate" settings
  query = actionUtil.populateRequest(query, req);

  query.exec(function found(err, matchingRecord) {

    if (err) return res.serverError(err);
    if (!matchingRecord){
      if(modelName === 'cabinetmodule' || modelName === 'gun'){
        sails.log.debug('No result here, create one');
        delete values.localId;
        return Model.create(values).exec((err, created) => {
          if(err) return res.negotiate(err);
          sails.log.info('Created new instance ok');
          return res.ok(created);
        });
      }else{
        return res.notFound();
      }
    } 
    //Add Chksum match
    let obj = matchingRecord.toObject();
    let matchingChksum = matchingRecord.chksum? matchingRecord.chksum: sails.services.syncrole.pureSign(obj);
    let tempObj = Object.assign({}, obj, values);
    let valuesChksum = sails.services.syncrole.pureSign(tempObj);
    if(valuesChksum === matchingChksum){
      if(sails.services.syncrule.updateRule[modelName]){
        if(sails.services.syncrule.updateRule[modelName](obj, values)){
          sails.log.info('No change here');
          return res.ok(tempObj);
        }
      }else{
        sails.log.info('No change here');
        return res.ok(tempObj);
      }
    }

    if(modelName == 'user' && typeof values.roles !== 'undefined' && values.roles.length == 0){
      return res.ok(tempObj);
    }

    Model.update(pk, values).exec(function updated(err, records) {
      // Differentiate between waterline-originated validation errors
      // and serious underlying issues. Respond with badRequest if a
      // validation error is encountered, w/ validation info.
      if (err) return res.negotiate(err);


      // Because this should only update a single record and update
      // returns an array, just use the first item.  If more than one
      // record was returned, something is amiss.
      if (!records || !records.length || records.length > 1) {
        req._sails.log.warn(
        util.format('Unexpected output from `%s.update`.', Model.globalId)
        );
      }

      var updatedRecord = records[0];

      // If we have the pubsub hook, use the Model's publish method
      // to notify all subscribers about the update.
      if (req._sails.hooks.pubsub) {
        if (req.isSocket) { Model.subscribe(req, records); }
        Model.publishUpdate(pk, _.cloneDeep(values), !req.options.mirror && req, {
          previous: _.cloneDeep(matchingRecord.toJSON())
        });
      }
      
      // Do a final query to populate the associations of the record.
      //
      // (Note: again, this extra query could be eliminated, but it is
      //  included by default to provide a better interface for integrating
      //  front-end developers.)
      var Q = Model.findOne(updatedRecord[Model.primaryKey]);
      Q = actionUtil.populateRequest(Q, req);
      Q.exec(function foundAgain(err, populatedRecord) {
        if (err) return res.serverError(err);
        if (!populatedRecord) return res.serverError('Could not find record after updating!');
        if(modelName === 'applicationprocess' && matchingRecord.status !== values.status){
          ApplicationController.updateProcess(updatedRecord, req.session.user);
        }
        res.ok(populatedRecord);
      }); // </foundAgain>
    });// </updated>
  }); // </found>
};
