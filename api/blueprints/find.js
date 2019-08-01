/**
 * Module dependencies
 */
var actionUtil = require('sails/lib/hooks/blueprints/actionUtil'),
  _ = require('lodash');

/**
 * Find Records
 *
 *  get   /:modelIdentity
 *   *    /:modelIdentity/find
 *
 * An API call to find and return model instances from the data adapter
 * using the specified criteria.  If an id was specified, just the instance
 * with that unique id will be returned.
 *
 * Optional:
 * @param {Object} where       - the find criteria (passed directly to the ORM)
 * @param {Integer} limit      - the maximum number of records to send back (useful for pagination)
 * @param {Integer} skip       - the number of records to skip (useful for pagination)
 * @param {String} sort        - the order of returned records, e.g. `name ASC` or `age DESC`
 * @param {String} callback - default jsonp callback param (i.e. the name of the js function returned)
 */

module.exports = function findRecords (req, res, allowAll) {

  var user = req.session.user;
  if(!user) return res.forbidden('You are not allow to do this action');
  User.findOne({id: user.id})
  .populate('roles')
  .exec(function(err, user){
    if(err){
      return res.serverError(err);
    }
    if(!user) return res.forbidden('no user found');
    // Look up the model
    var Model = actionUtil.parseModel(req);

    // If an `id` param was specified, use the findOne blueprint action
    // to grab the particular instance with its primary key === the value
    // of the `id` param.   (mainly here for compatibility for 0.9, where
    // there was no separate `findOne` action)
    if ( actionUtil.parsePk(req) ) {
      return require('sails/lib/hooks/blueprints/actions/findOne')(req,res);
    }
    try{
      // Lookup for records that match the specified criteria
      var where = actionUtil.parseCriteria(req);
      if(!allowAll && !user.isAdmin()){
        //disabled for now
        where.createdBy = user.id;
      }
      var limit = actionUtil.parseLimit(req);
      var skip = actionUtil.parseSkip(req);
      var sort = actionUtil.parseSort(req);
    
      var query = Model.find()
      .where( where )
      .limit( limit )
      .skip( skip )
      .sort( sort );
      query = actionUtil.populateRequest(query, req);
      query.exec(function found(err, matchingRecords) {
        if (err) return res.serverError(err);

        // Only `.watch()` for new instances of the model if
        // `autoWatch` is enabled.
        if (req._sails.hooks.pubsub && req.isSocket) {
          Model.subscribe(req, matchingRecords);
          if (req.options.autoWatch) { Model.watch(req); }
          // Also subscribe to instances of all associated models
          _.each(matchingRecords, function (record) {
            actionUtil.subscribeDeep(req, record);
          });
        }

        var enablePagination = _.isNil(req.headers.pagination) ? req.query.pagination : req.headers.pagination;
        if(enablePagination === 'true'){
          var countQuery = Model.count()
          .where(where);
          countQuery.exec(function found(err, total) {
            var data = {
              total : _.isNil(total) ? 0 : total,
              filteredTotal : _.isNil(total) ? 0 : total,
              limit : limit,
              skip : skip,
              data : matchingRecords
            };
            res.ok(data);
          });
        }else{
          res.ok(matchingRecords);
        }
      });
    }catch(err){
      sails.log.error(err);
      res.serverError({error : '服务器错误'});
    }
  })
};