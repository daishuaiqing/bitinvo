/**
* ApplicationProcess.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

  attributes: {
    detail: {
      type: 'string'
    },
    applicant: {
      model: 'user'
    }, 
    approver: {
      model: 'user',
      required: true
    },
    application:{
      model:'application',
      required: true
    },
    message : {
      model : 'message'
    },
    status: {
      type: 'string',
      /*
      new = just created
      wip = approved by at least one if multiple approver required
      approved = all approved
      rejected = rejected by apprver
      */
      enum: [
        'new',  //用户刚刚建立
        'approved',  // 审核完成可以取枪
        'rejected',//审核完成，不可以取枪
        'cancelled', // 用户取消
        'error' // 发生错误
      ], 
      defaultsTo: 'new'
    },
    org :{
      model : 'org'
    }
  },
  
  afterCreate: function(item, cb){
    ApplicationProcess.findOne({id: item.id}).populate('application')
    .then((data) => {
      data = data.toObject();
      sails.services.syncrole.Sync(data, 'applicationprocess');
      cb();
    })
  },

  afterUpdate: function(item, cb){
    ApplicationProcess.findOne({id: item.id}).populate('application')
    .then((data) => {
      data = data.toObject();
      sails.services.syncrole.Sync(data, 'applicationprocess', 'update');
      cb();
    })
  },
};

