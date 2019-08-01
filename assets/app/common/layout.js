'use strict';

var Layout = function(){
  log.info('Layout has been created');
}

Layout.AE = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';

var prototype = {
  in : function(module, config, cb, error){
    log.info('%s %s is going """IN"""', module.NS, module.getIId());
    var $node = config.node;
    var $moduleNode = $('<div/>',{
      id : module.getIId()
    });

    module.$node = $moduleNode;

    if(!module.show){
      log.error(new Error('Module must implement show method'));
      error && error();
      return;
    }

    var canceled = false;
    var cbTimer = setTimeout(function(){
      canceled = true;
      error && error();
    }, 3000);

    var show = function(){
      module.show($moduleNode, function(){
        if(canceled)return;
        clearTimeout(cbTimer);
        log.info('%s %s is ready for showing', module.NS, module.getIId());
        $moduleNode.addClass('animated fadeIn __app-container__ clearfix');
        log.info('%s %s is goning to be attached to body ', module.NS, module.getIId());
        $node.append($moduleNode);
        log.info('%s %s is attached and cb is going to be called ', module.NS, module.getIId());
        cb && cb();
      });
    }

    //如果不是debug模式的话，在模块出现错误的时候回返回登录页面
    var isDebug = $('html').hasClass('debug');
    if(isDebug){
      show();
    }else{
      try{
        show();
      }catch(e){
        log.error(e);
        error && error();
      }
    }
    // 模块append到node以后，进行loading隐藏
    this.firstScreenController();
    
    return this;
  },
  out : function(module, config, cb){
    log.info('%s %s is going """"OUT""""', module.NS, module.getIId());
    if(!module.$node) {
      log.info('%s %s ########has no module node #######', module.NS, module.getIId());
      return;
    }
    log.info('%s %s """"OUT Check is ok """"', module.NS, module.getIId());


    var switchScene = function(){
      log.info('**************** %s %s *********** in the delay', module.NS, module.getIId());
      if(module.destroy){
      log.info('%s %s has destroy method', module.NS, module.getIId());
        module.destroy(function(){
          log.info('%s %s is going to be detached', module.NS, module.getIId());
          module.$node.remove();
          log.info('%s %s is detached', module.NS, module.getIId());
          module.$node = null;
          log.info('%s %s destroy method invocked, going to cb', module.NS, module.getIId());
          cb && cb();
        });
      }else{
        log.info('%s %s has not implement destroy, so just remove it', module.NS, module.getIId());
        log.info('%s %s is going to be detached', module.NS, module.getIId());
        module.$node.remove();
        log.info('%s %s is detached', module.NS, module.getIId());
        module.$node = null;
        cb && cb();
      }
    }

    //为了加快转场，可以把这个设置为false，界面上的转场不会有reverse的效果
    var enableTransition = false;
    if(enableTransition){
      var $node = module.$node;
      var $allFadeInDown = $node.find('.animated.fadeInDown');
      var $allFadeInRight = $node.find('.animated.fadeInRight');
      var $allFadeInLeft = $node.find('.animated.fadeInLeft');
      var $allSlideInRight = $node.find('.animated.slideInRight');
      var $allSlideInLeft = $node.find('.animated.slideInLeft');

      $allFadeInDown.removeClass('fadeInDown').addClass('in-transition-fadeInDown');
      $allFadeInRight.removeClass('fadeInRight').addClass('in-transition-fadeInRight');
      $allFadeInLeft.removeClass('fadeInLeft').addClass('in-transition-fadeInLeft');
      $allSlideInRight.removeClass('slideInRight').addClass('in-transition-slideInRight');
      $allSlideInLeft.removeClass('slideInLeft').addClass('in-transition-slideInLeft');

      var $allInTransiFadeInDown = $node.find('.animated.in-transition-fadeInDown');
      var $allInTransiFadeInRight = $node.find('.animated.in-transition-fadeInRight');
      var $allInTransiFadeInLeft = $node.find('.animated.in-transition-fadeInLeft');
      var $allInTransiSlideInRight = $node.find('.animated.in-transition-slideInRight');
      var $allInTransiSlideInLeft = $node.find('.animated.in-transition-slideInLeft');

      // 为了让reverse动画生效， 必须延时20ms（经验值)
      _.delay(function(){
        $allInTransiFadeInDown.addClass('fadeInDown reverse');

        $allInTransiFadeInRight.addClass('fadeInRight reverse');
        $allInTransiFadeInLeft.addClass('fadeInLeft reverse');

        $allInTransiSlideInRight.addClass('slideInRight reverse');
        $allInTransiSlideInLeft.addClass('slideInLeft reverse');

        // module.$node.find('animated').removeClass('animated').addClass('animated');
        $node.addClass('animated fadeOut');
        _.delay(
          function(e){
            switchScene();
          },
          200
        );
      }, 10);
    }else{
      switchScene();
    }
    return this;
  },
  init : function(){
    return this;
  },
  destroy : function(){
    return this;
  },
  firstScreenController : function () {
    var $load = $('#firstScreenLoad');
    if ($load.length > 0) {
      !$load.hasClass('hide') && $load.addClass('hide');
    }
    return this;
  }
}

_.extend(Layout.prototype, prototype);
module.exports = new Layout();
