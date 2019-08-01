/**
 * Module dependencies
 */
var actionUtil = require('sails/lib/hooks/blueprints/actionUtil');

/**
 * Find One Record
 *
 * get /:modelIdentity/:id
 *
 * An API call to find and return a single model instance from the data adapter
 * using the specified id.
 *
 * Required:
 * @param {Integer|String} id  - the unique id of the particular instance you'd like to look up *
 *
 * Optional:
 * @param {String} callback - default jsonp callback param (i.e. the name of the js function returned)
 */

module.exports = function findOneRecord (req, res) {

  var Model = actionUtil.parseModel(req);
  var pk = actionUtil.requirePk(req);

  var user = req.session.user;
  if(!user) return res.forbidden('You are not allow to do this action');

  User.findOne({id: user.id})
  .populate('roles')
  .exec(function(err, user){
    if(err){
      return res.serverError(err);
    }
    if(!user) return res.forbidden('no user found');
    // Lookup for records that match the specified criteria
    var where = actionUtil.parseCriteria(req);
    if(!user.isAdmin()){
      //disabled for now
      where.createdBy = user.id;
    }
    var query = Model.findOne(pk).where(where);

    query = actionUtil.populateRequest(query, req);
    query.exec(function found(err, matchingRecord) {
      if (err) return res.serverError(err);
      if(!matchingRecord) return res.notFound('No record found with the specified `id`.');

      if (req._sails.hooks.pubsub && req.isSocket) {
        Model.subscribe(req, matchingRecord);
        actionUtil.subscribeDeep(req, matchingRecord);
      }

      res.ok(matchingRecord);
    });
  });
};
