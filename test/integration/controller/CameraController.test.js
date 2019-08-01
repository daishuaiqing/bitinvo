'use strict';
const request = require('supertest');

describe('CameraController',function(){

  describe('#capture',function(){
    it('should return upload path', function (done) {
      request(sails.hooks.http.app)
        .get('/camera')
        .expect(200)
        .end(function(err,res){
          if(err) return done(err);
          console.log(res.text);
          done();
        })
    });
  })

})
