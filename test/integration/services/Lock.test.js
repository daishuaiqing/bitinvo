'use strict';

describe('LockService',function(){
  describe('#OpenAll()',function(){
    it('should return Lock Info',function(done){
      sails.services.Lock.openAll();
      done;
    })
  })
})
