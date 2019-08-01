var indexJade = require('./template/index.jade');
var font = require('fontawesome/less/font-awesome.less');
var pubsub = require('PubSubJS');
var keypad = require('keypad');
var simpleAppHeader = require('simpleappheader');
var loginForm = require('loginform');
var countdown = require('countdown');
var user = require("common/usermanagement");
var noty = require('customnoty');
var server = require('common/server').server;
var vprocessbar = require('vprocessbar');
var taskbar = require('taskbar');
var gridlist = require('gridlist');
var paging = require('paging');
var formwork = require('formwork');
var flexModal = require('flexmodal');
var list = require('list');
var checkbox3 = require('checkbox3/dist/checkbox3.css');
var indexCss = require('./index.less');
var monitor = require('monitor');
var writingBoard = require('writingBoard');
var standarLogin = require('standarLogin');
var bulletImg = require('./img/bullet.png');
var gunImg = require('./img/gun.png');
var gridCell = require('./template/gridcellStorage.jade');
var moment = require('moment');

var MinPage = function(reg) {
  reg.apply(this);
  return this;
}

var metadata = {
  NS: 'minPage',
  pub: [],
  sub: []
}

_.extend(MinPage, metadata);

var prototype = {
  init: function() {
    // 初始化临时数据存储器
    this.initTemporaryStroage();
    var hash = window.location.hash;
    var type = hash.split('#')[1] && hash.split('#')[1].split('=')[1];
    this.dataStroage.add('applicationType', type);

    // 检测是否开启监控功能
    this.checkedWebCam();
    this.checkedFaceLogin();
    this.initWakeScreen();
    
    // 开启自动登录
    pubsub.publish('message.subscribe');
    pubsub.publish('autologout.start');

    // 如果是取枪流程，初始化默认状态
  },
  stopCamrea: function(fn) {
    server({
      url: '/camera/stop'
    })
    .always(function() {
      fn && fn();
    });
  },
  show: function($node, cb) {
    var me = this;
    var isShowExitTips = false;
    // 用来记录是否为第一步
    me.isFirstStep = true;

    me._STATE = {};

    $node.append(indexJade());
    $node.find('.minPage-app_header').simpleAppHeader('show', function() {
      me.$node.find(".btn-back").addClass('disabled');
      if (me.isFirstStep) {
        me.destroyStandarLogin();
        me.stopCamrea(function() {
          me.nav("/m/simpleapplication");
          me.$node.find(".btn-back").removeClass('disabled');
        });
        return;
      }

      if (isShowExitTips) return;
      isShowExitTips = true;

      //点击返回按钮跳转到上一个app页面
      noty({
        text: "返回将退出流程,是否继续?",
        type: "info",
        layout: "top",
        timeout: null,
        buttons: [
          {
            addClass: "btn btn-empty big",
            text: "确定",
            onClick: function($noty) {
              me.stopCamrea(function() {
                me.nav('/m/simpleapplication');
              })
              me.createdApplication.isSubmit = null;
              me.destroyStandarLogin();
              $noty.close();
            }
          },
          {
            addClass: "btn btn-empty big",
            text: "取消",
            onClick: function($noty) {
              if (!me.$node) return;
              me.$node.find(".btn-back").removeClass('disabled');
              $noty.close();
            }
          }
        ],
        callback: {
          onClose: function() {
            isShowExitTips = false;
            if (!me.$node) return;
            me.$node.find(".btn-back").removeClass('disabled');
          }
        }
      });
    });

    // 初始化step 列表
    me.loadStepList();

    // 选择柜机后,检测是否有监控
    if (me.dataStroage.get('isOpenWebCam')) {
      me.initMonitor();
    }

    cb();
  },
  // 初始化监控
  initMonitor: function() {
    var me = this;
    var type = me.dataStroage.get('applicationType');
    if (['gun', 'returnGun'].indexOf(type) > -1) {
      // 初始化监控（枪柜）
      me.$monitor_left = me.$node.find('.monitor-container_left');
      me.$monitor_left.monitor('init', {
        url: 'ws://' + window.location.host.split(':')[0] + ':8082/',
        uid: 's1'
      });
      // 初始化监控（弹贵）
      me.$monitor_right = me.$node.find('.monitor-container_right');
      me.$monitor_right.monitor('init', {
        url: 'ws://' + window.location.host.split(':')[0] + ':8084/',
        css: {left: 'inherit', right: '10px' },
        uid: 's2'
      });
    } else {
      // 初始化监控（枪柜）
      me.$monitor_left = me.$node.find('.monitor-container_left');
      me.$monitor_left.monitor('init', {
        url: 'ws://' + window.location.host.split(':')[0] + ':8082/'
      });
    }
  },
  // 销毁监控组件
  destroyMonitor: function() {
    var me = this;
    if (me.$monitor_left) {
      me.$monitor_left.monitor('close');
    }
    if (me.$monitor_right) {
      me.$monitor_right.monitor('close');
    }
  },
  destroyStandarLogin: function() {
    if (!this.$node) return;
    var $rightMajor = this.$node.find('.right-major');
    if ($rightMajor.length) {
      $rightMajor.standarLogin('destroy');
    }
  },
  destroy: function(cb) {
    var me = this;
    me.destroyStandarLogin();
    me.destroyAutocomplete();
    me.destroyMonitor();

    // 清空当前的状态多工单状态
    me.clear_all_state();

    cb();
  },
  checkedWebCam: function () {
    var me = this;
    var settings = window.localStorage.getItem('systemSetData');
    if (settings) {
      settings = JSON.parse(settings);
      me.dataStroage.add('isOpenWebCam', settings.enableCam);
    } else {
      me.server({
        url: '/system/settings'
      })
      .done(function(data) {
        _.forEach(data, function(item, index) {
          if (item.key === 'enableCam') {
            if (item.value === 'true') {
              me.dataStroage.add('isOpenWebCam', true);
            } else {
              me.dataStroage.add('isOpenWebCam', false);
            }
          }
        });
      })
      .fail(function() {
        this.dataStroage.add('isOpenWebCam', false);
      });
    }
  },
  checkedFaceLogin: function() {
    var settings = window.localStorage.getItem('systemSetData');
    if (settings) {
      settings = JSON.parse(settings);
      this.dataStroage.add('hasFaceLogin', settings.facePerception);
    } else {
      this.dataStroage.add('hasFaceLogin', false);
    }
  },
  checkedSignature: function(key) {
    var settings = window.localStorage.getItem('systemSetData');
    if (settings) {
      try {
        settings = JSON.parse(settings);
      } catch(e) {
        settings = {};
      }
      return settings[key];
    } else {
      return false;
    }
  },
  // 生命周期以外的方法
  loadStepList: function() {
    var me = this;
    var stepPart = me.stepComponent();
    var getCountModuleName = function(type) {
      var applicationType = me.dataStroage.get('applicationType');
      if (applicationType === 'returnMaintain') return '输入归还枪支数';
      if (applicationType === 'gun') return '输入取子弹数';
      if (applicationType === 'returnGun') return '输入还子弹数';
      if (applicationType === 'bullet') return '输入取子弹数';
      if (applicationType === 'returnBullet') return '输入还子弹数';
    }

    // 赋值给模块的stepPart
    me.stepPart = stepPart;

    // 用户验证(0)
    stepPart.addSteps({
      type: 'userAuth',
      name: __("minPage").useAuth,
      id: 'eventStep',
      actions: [
      
      ],
      onShown: function($node, next) {
        me.initLoginModule();
        me.addKeyBoard();
        me.autocomplete();
      },
      onNext: function(next) {
        // 检测工单是否存在
        me.checkedApplication()
        .always(function() {
          next();
        })
      }
    });

    // 用户签名步骤(1)
    stepPart.addSteps({
      type: 'signature',
      name: '用户签名',
      id: 'applicantSignature',
      actions: [
        {
          name: '取消', target: function() {
            me.stopCamrea(function() {
              me.nav('/m/simpleapplication');
            })
          }
        }
      ],
      onShown: function($node, next) {
        // var user = me.dataStroage.get('user');
        // var currentLoginType = me.dataStroage.get('currentLoginType');

        // console.log('user', '当前用户', user);
        // var signaturePeople = user.alias || user.username;
        // // 人脸登录进行，当前是谁的提示
        // if (currentLoginType === 'face') {
        //   noty({
        //     text: '请' + signaturePeople + '进行签名',
        //     type: 'info',
        //     layout: 'top',
        //     timeout: 5000
        //   });
        // }

        me.initSignature();
        me.$node
        .off('trigger_save_signature')
        .on('trigger_save_signature', function(e, url) {
          me.dataStroage.add('userSignature', url);
          me.stepPart.nextStep();
        });
      }
    });

    // 归还信息(2.1)
    stepPart.addSteps({
      type: 'returnInfo',
      name: '归还信息',
      id: 'returnInfo',
      actions: [
        {
          name: '取消',
          target: function() {
            me.nav('/m/simpleapplication');
          }
        },
        {
          id: 'sureReturnInfoBtn',
          name: '确认',
          target: function() {
            me.stepPart.nextStep();
          }
        }
      ],
      onShown: function($node, next) {
        me.renderReturnAppInfo($node);
      }
    });

    // 选择柜机步骤(2.2)
    stepPart.addSteps({
      type: 'selectCabinet',
      name: __('minPage').selectedCabinet,
      id: 'selectCabinetStep',
      actions: [
        {
          name: '取消', target: function() {
            me.nav('/m/simpleapplication');
          }
        },
        {
          name: '上一步', target: function() {
            stepPart.prevStep();
          }
        }
      ],
      onShown: function($node, next) {
        me.isFirstStep = false;
        if (me.currentUserHasApplication) {
          next();
        } else {
          me.getCabinetList();
          me.speak('selectCabinet');
          // 获取工单类型id

          me.getApplicationTypeId();
          me.getUserOrg();
        }
      },
      onNext: function(next) {

        if (me.currentUserHasApplication) {
          return next();
        }

        var type = me.dataStroage.get('applicationType');
        if (['gun', 'bullet', 'storageBullet', 'storageGun'].indexOf(type) > -1) {
          next();
        } else {
          me.createdApplication()
          .done(function(data) {
            me.dataStroage.add('application', data);
            next();
          })
        }
      }
    });

    // 2.3
    // 选择存储模块
    stepPart.addSteps({
      type: 'storage',
      name: '选择存储模块',
      id: 'storage',
      actions: [
        {
          name: '取消',
          target: function () {
            me.nav('/m/simpleapplication');
          }
        },
        {
          name: '上一步',
          target: function() {
            stepPart.prevStep();
          }
        },
        {
          id: 'selectCabinetModuleBtn',
          name: '下一步',
          target: function() {
            stepPart.nextStep();
          },
          className: 'hide'
        }
      ],
      onShown: function ($node, next) {
        me.isFirstStep = false;
        var applicationType = me.dataStroage.get('applicationType');
        var isLocal = me.dataStroage.get('selectedCabinetIsLocal');
        var cabinetId = me.dataStroage.get('cabinetId');
        var type = '';

        if (applicationType === 'storageGun') {
          type = 'gun'
        } else if (applicationType === 'storageBullet') {
          type = 'bullet';
        }

        if (me.currentUserHasApplication) {
          next();
        } else {
          // 获取模块列表
          me.getStorageModuleList(type, isLocal, cabinetId,
            // 选了当前模块回调
            function($curr) {
              me.multipleSelectedModule($curr);
              // if (me.checkedOpenBatch()) {
              //   // 多选模式
              // } else {
              //   // 单选模式
              //   var cabinetModuleId = $curr.data('id');
              //   me.dataStroage.add('cabinetModuleId', cabinetModuleId);
              //   next();
              // }
            }
          );
        }
      },
      onNext: function(next) {
        if (me.currentUserHasApplication) {
          return next();
        }
        me.createdApplication()
        .done(function(data) {
          me.dataStroage.add('application', data);
          next();
        })
      }
    });

    // 选择枪支步骤(3)
    stepPart.addSteps({
      type: 'gun',
      name: __("minPage").selectedGun,
      id: 'selectGunStep',
      actions: [
        {
          name: '取消', target: function() {
            me.nav('/m/simpleapplication');
          }
        },
        {
          name: '上一步', target: function() {
            stepPart.prevStep();
          }
        },
        {
          id: 'selectGunsNextBtn',
          name: '下一步', target: function() {
            stepPart.nextStep();
          },
          className: 'hide'
        }
      ],
      onShown: function($node, next) {
        if (me.currentUserHasApplication) {
          next();
        } else {
          me.getGunList();
          me.speak('selectGun');
        }
      },
    });

    // 选择子弹步骤(4)
    stepPart.addSteps({
      type: 'bullet',
      name: __("minPage").selectedBullet,
      id: 'selectGunStep',
      actions: [
        {
          name: '取消', target: function() {
            me.stopCamrea(function() {
              me.nav('/m/simpleapplication');
            })
          }
        },
        {
          name: '上一步', target: function() {
            stepPart.prevStep();
          }
        },
        {
          name: '下一步', target: function() {
            stepPart.nextStep();
          }
        }
      ],
      onShown: function($node, next) {
        if (me.currentUserHasApplication) {
          next();
        } else {
          me.initSelectBulletModule();
          me.$node.find('#bulletNum').keypad('init', {
            type: 'IP'
          });
        }
      },
      onNext: function (next) {
        if (me.currentUserHasApplication) {
          return next();
        }
        var check = function (event, errors) {
          me.$editform.off(metadata.NS + '.form.validate.valid', check);
          me.$editform.off(metadata.NS + '.form.validate.error', check);
          if (errors) {
            me.errorHandle(errors.join(', '));
          } else {
            me.$editform.one(metadata.NS + '.form.submit', function (e, data) {
              // 存储表单信息
              console.log('this is form data', data);
              if (data.bulletNum) {
                me.dataStroage.add('inputNum', data.bulletNum);
              }
              me.dataStroage.add('formData', data);
              next();
            });
            me.$editform.formwork('submit');
          }
        }

        me.$editform
          .one(metadata.NS + '.form.validate.valid', check)
          .one(metadata.NS + '.form.validate.error', check);

        me.$editform.formwork('validate', ['#bulletType', '#bulletNum']);
      }      
    });

    // 选择弹仓步骤（5）
    stepPart.addSteps({
      type: 'bullet',
      name: __('minPage').selectedBulletWarehouse,
      actions: [
        {
          name: '取消', target: function () {
            me.stopCamrea(function() {
              me.nav('/m/simpleapplication');
            })
            me.createdApplication.isSubmit = null;
          }
        },
        {
          name: '上一步', target: function () {
            stepPart.prevStep();
          }
        },
        {
          name: '下一步', target: function() {
            stepPart.nextStep();
          },
          id: 'selectBulletNextBtn',
          className: 'hide'
        }
      ],
      onShown: function($node, next) {
        if (me.currentUserHasApplication) {
          next();
        } else {
          me.getBulletModuleList();
          me.speak('selectBulletModule');
        }
      },
      onNext: function (next) {
        if (me.currentUserHasApplication) {
          return next();
        }
        me.createdApplication()
          .done(function (data) {
            // 保存application信息
            console.log(data, '创建完子弹工单的返回值');
            me.dataStroage.add('application', data.application);
            me.dataStroage.add('targetModule', data.targetModule);
            next();
          });
      }    
    });
  
    // 填写数量
    stepPart.addSteps({
      type: 'count',
      name: getCountModuleName(),
      actions: [
        {
          name: '上一步',
          target: function () {
            me.stepPart.prevStep();
          }
        }
      ],
      onShown: function ($node, next) {
        var applicationType = me.dataStroage.get('applicationType');
        if (me.currentUserHasApplication) {
          if (['returnGun', 'returnBullet', 'returnMaintain'].indexOf(applicationType) === -1) {
            return next();
          }
        }
        // 开始渲染输入子弹数表单
        me.renderInputBulletNumberForm();
      },
      onNext: function (next) {
        var applicationType = me.dataStroage.get('applicationType');
        if (me.currentUserHasApplication) {
          if (['gun', 'bullet'].indexOf(applicationType) > -1) {
            return next();
          }
        }
        // 判断工单类型，进行选择是否要创建工单
        if (['gun'].indexOf(applicationType) === -1) return next();

        // 发起创建工单的请求
        me.createdApplication()
          .done(function (data) {
            if (applicationType === 'gun') {
              me.dataStroage.add('application', data);
            } else if (applicationType === 'bullet') {
              me.dataStroage.add('application', data.application);
              me.dataStroage.add('targetModule', data.targetModule);
            }
            next();
          });
      }
    });

    // 选择继续创建工单还是, 下一步授权
    stepPart.addSteps({
      type: 'continueApplication',
      name: '是否继续申请',
      actions: [
        {
          name: '管理员授权',
          target: function() {
            me.stepPart.nextStep();
          }
        }
      ],
      onShown: function() {
        var $rightMajor = me.$node.find('.right-major');
        var $html = require('./template/continueApplication.jade')();
        $rightMajor.empty().append($html);

          // // 发送签名信息
          me.sendSignature(
            me.dataStroage.get('userSignature'),
            me.dataStroage.get('user'),
            true
          );

        // 记录当前创建工单的信息
        me.recordCurrentUserCreatedApp();
        
        $rightMajor.find('.continueApplicationBtn')
        .off('click')
        .on('click', function() {
          me.stepPart.go(0);
        });

        // 直接修改AB状态， 避免到这个页面退出
        me.recordABGun();

        // 打印出当前已经创建的工单和人员信息
        var allApp = me.get_all_state();
        console.log('###### 当前已经创建的工单数据: #######', allApp);
      }
    });

    // 管理员授权步骤(6)
    stepPart.addSteps({
      type: 'adminAuth',
      name: __('minPage').adminApprove,
      actions: [
        {
          name: '取消', target: function() {
            me.stopCamrea(function() {
              me.nav('/m/simpleapplication');
            })
          }
        }
      ],
      onShown: function($node, next) {

        // // 发送签名信息
        // me.sendSignature(
        //   me.dataStroage.get('userSignature'),
        //   me.dataStroage.get('user'),
        //   true
        // );
        var type = me.dataStroage.get('applicationType');
        if ('gun' !== type) {
          // // 发送签名信息
          me.sendSignature(
            me.dataStroage.get('userSignature'),
            me.dataStroage.get('user'),
            true
          );
        }

        me.initAdminLoginModule();
        // 释放创建工单方法的isSubmit
        me.createdApplication.isSubmit = null;
        me.addKeyBoard();
        me.autocomplete();
      }
    });

    // 判断是有管理员签名(7)
    stepPart.addSteps({
      type: 'adminSignature',
      name: __('minPage').adminSignature,
      actions: [
        {
          name: '取消', target: function() {
            me.stopCamrea(function() {
              me.nav('/m/simpleapplication');
            })
          }
        }
      ],
      onShown: function($node, next) {
        var type = me.dataStroage.get('applicationType');
        // 管理员签名提示
        // var admin = me.dataStroage.get('admin');
        // var currentLoginType = me.dataStroage.get('currentLoginType');

        // if (currentLoginType === 'face') {
        //   var alias = '';
        //   if (admin) {
        //     alias = admin.alias || admin.username;
        //     noty({
        //       text: alias,
        //       type: 'info',
        //       layout: 'top',
        //       timeout: 5000
        //     });
        //   }
        // }

        me.initSignature();
        me.$node
        .off('trigger_save_signature')
        .on('trigger_save_signature', function(e, url) {
          me.stepPart.nextStep();
          console.log('管理员的userId', me.dataStroage.get('adminId'))
          // 检测是否为多工单 && A.B模式
          if (type === 'gun' && me.checkedABGunMode()) {
            me.sendAdminSignature(url);
          } else {
            me.sendSignature(url, {
              id: me.dataStroage.get('adminId')
            }, false);
          }
        });
      }
    });

    // 完成(8)
    stepPart.addSteps({
      type: 'completed',
      name: __('minPage').completed,
      actions: [
        {
          name: '退出', target: function() {
            me.nav('/m/simpleapplication');
          }
        },
        { name: '手动开启门禁', target: function(){ me.openOrgDoor() }, className: 'hide', id: 'orgDoorBtn'  }        
      ],
      onShown: function() {
        var type = me.dataStroage.get('applicationType');
        var cabinetName = me.dataStroage.get('cabinetName');
        var cabinetId = me.dataStroage.get('cabinetId');

        // 开启门禁
        if (me.checkedShowGateSwitch()) {
          me.openOrgDoor();
        }

        // 还枪打开关联弹仓处理
        if (me.includeArray(['returnGun'], type)) {
          me.returnGunOpenAssociatedBullet();
          
        }
        // 还枪打开关联弹仓处理(注意：多工单开启)
        if (me.includeArray(['gun'], type)) {
          me.getGunOpenAssociatedBullet();
        }

        // 开启门的时候,开启监控(注意: 目前只能打开最后一次的工单监控)
        if (me.dataStroage.get('isOpenWebCam')) {
          if (['gun', 'returnGun'].indexOf(type) > -1 && me.checkedABGunMode()) {
            // 渲染多个柜机监控控制按钮
            me.renderMultipleMonitorControlButtonGroup(
              // 开启监控回调 
              function(cabinetId) {
                me.$monitor_left.monitor('open', cabinetId);
                me.$monitor_right.monitor('open', cabinetId);
              }
            );
          } else {
            me.$monitor_left.monitor('open', cabinetId);

            // me.$monitor_right.monitor('open', cabinetId);
          }
        }

        // 打开枪位调用
        if (me.includeArray(['gun', 'bullet', 'returnGun', 'returnBullet', 'storageBullet', 'storageGun'], type)) {
          if (type === 'gun' && me.checkedABGunMode()) {
            me.openSingleDoorByAB();
          } else {
            me.openBatch();
          }
          // if (me.checkedOpenBatch()) {
          //   // 批量开模块
          //   me.openBatch();
          // } else {
          //   // 检测是否为取枪&&A.B枪模式
          //   if (type === 'gun' && me.checkedABGunMode()) {
          //     me.openSingleDoorByAB();
          //   } else {
          //     // 单开模块 (A.B枪模式)
          //     // me.openSingleDoor();
          //     // me.openBatch();
          //   }
          // }
        } else {
          // 全开模块
          me.openAllDoor();
        }
        
        if (type === 'gun' && me.checkedABGunMode()) {
          me.batchMarkAppProcessed();
        } else {
          // 更改工单状态
          me.markAppProcessed();
        }

        // 还枪，需要更改枪支状态
        if (type === 'returnGun') {
          me.markGunStatus();
        }

        // 获取当前所有的开门信息
        var applications = me.get_state('applications');
        var $html = '';

        if (applications) {
          console.log('###### 当前工单的信息: #########', applications);
          $html = require('./template/tips.jade')({
            applications: applications,
            cabinetName: cabinetName,
            type: type,
          });
        } else {
          $html = require('./template/tips.jade')({
            cabinetName: cabinetName,
            type: type
          });
        }

        me.$node.find('.right-major').html($html);
      }
    });

    // 进行步骤过滤：
    stepPart = me.filterSteps(stepPart);

    stepPart.displayStep();
  },
  renderInputBulletNumberForm: function() {
    var me = this;
    var $node = me.$node;

    $node.find('.right-major').html(require('./template/returnBulletNumber.jade'));
    $node.find('#bulletNumber').val(4);
    $node.find('input').keypad('init', {
      type: 'number'
    });

    $node.find('.getBulletNumberBtn')
    .off('click').on('click', function() {
      var num = $node.find('#bulletNumber').val();
      if (!num) {
        return me.showNoty('error', '取子弹数量不能为空');
      }
      me.dataStroage.add('formData', {
        bulletNum: num
      });
      me.dataStroage.add('inputCount', num);
      me.stepPart.nextStep();
    });
  },
  initSelectOpenBulletMode: function() {
    var me = this;
    var $node = me.$node;

    $node.find('.right-major').html(require('./template/getBulletMode.jade'));
    $node.find('.openTypeBtnGroup')
    .off('click')
    .on('click', '.btn', function (e) {
      var $target = $(e.currentTarget);
      var id = $target.attr('id');
      $target.addClass('disabled');
      if (id === 'openBulletBtn') {
        // 手动打开子弹模块
        me.renderGetBulletOnCabinetList();
      } else if (id === 'autoOpenBulletBtn') {
        // 自动打开子弹模块
        me.autoGetInfoAndOpen();
      } else if (id === 'notOpenBulletBtn') {
        // 只取枪
        me.stepPart.nextStep();
      }
    });
  },
  autoGetInfoAndOpen: function() {
    var me = this;
    var gun = me.dataStroage.get('gun');
    
    _.each(gun, function(item) {
      me.fetchAssociatedBulletsCabinets(item.type);
    });
  },
  fetchAssociatedBulletsCabinets: function(gunType) {
    var me = this;
    var gun = me.dataStroage.get('gun');
    var user = me.dataStroage.get('user');
    var token = user.token;
    var application = me.dataStroage.get('application')
    var url = '/cabinet/associatedBulletsCabinets?gunType=' + gunType + '&skip=0&limit=' + gun.length;

    server({
      url: url,
      beforeSend: function(xhr) {
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(token));
      }
    })
    .done(function(data) {
      var cabinet = data[Math.floor(Math.random() * data.length)];
      if (cabinet) {
        cabinetId = cabinet.id;
      }
      console.log('随机获取的柜机信息: ', cabinet)
      me.fetchAssociatedBulletsModules(gunType, cabinetId);

      if (application && application.cabinet) {
        // 柜机信息存在
      }
    })
    .fail(function(error) {
      var text = error && error.responseJSON && error.responseJSON.msg || '获取关联子弹模块失败';
      me.showNoty('error', text);
      me.$node.find('#autoOpenBulletBtn').removeClass('hide');
    });
  },
  fetchAssociatedBulletsModules: function(gunType, cabinetId) {
    var me = this;
    var user = me.dataStroage.get('user');
    var token = user.token;
    var url = '/cabinetmodule/associatedBulletsModules?gunType=' + gunType + '&cabinet=' + cabinetId + '&skip=0&limit=10';
    var gun = me.dataStroage.get('gun');
    server({
      url: url,
      beforeSend: function(xhr) {
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(token));
      }
    })
    .done(function(data) {
      console.log('自动获取子弹模块成功 =>', data);
      var cabinetModule = data[Math.floor(Math.random() * 10)];
      var id = cabinetModule.id;
      var canId = cabinetModule.canId;

      // 存储模块信息
      if (!me.selectedBulletCabinetModule) {
        me.selectedBulletCabinetModule = [];
      }

      me.selectedBulletCabinetModule.push({
        id: id,
        canId: canId
      });

      if (gun) {
        gun.pop();
      }
      if (!gun.length) {
        me.dataStroage.add('bulletCabinetModuleList', me.selectedBulletCabinetModule);
        me.stepPart.nextStep();
      }
    })
    .fail(function(error) {
      console.log('自动获取子弹模块异常 => ', error);
    });
  },
  renderGetBulletOnCabinetList: function() {
    var me = this;
    me.getCabinetByGunType(function ($curr) {
      var cabinetId = $curr.data('id');
      me.renderBulletModuleListByGunType(cabinetId);
    });
  },
  getCabinetByGunType: function(func) {
    var me = this;
    var $node = me.$node;
    var $html = require('./template/rightModule.jade');
    var gridTpl = require('./template/grid-cabinet.jade');
    var $listCont;
    var gun = me.dataStroage.get('gun');
    var url = '/cabinet/associatedBulletsCabinets?gunType=' + gun[gun.length - 1].type;

    $node.find('.right-major').html($html);
    $listCont = $node.find('.list-cont');
    me.getGridList(url, 9, $listCont, gridTpl, func);
  },
  initGetCabinetList: function(func, resetUrl) {
    var me = this;
    var $node = me.$node;
    var $html = require('./template/rightModule.jade');
    var gridTpl = require('./template/grid-cabinet.jade');
    var localCabinetInfo = me.dataStroage.get('localCabinetInfo');
    var $listCont, url = '/cabinet?sort={"createdAt":"ASC"}';
    var localIsMaster = localCabinetInfo.isMaster;
    var where = [];

    $node.find('.right-major').html($html);
    $listCont = $node.find('.list-cont');

    if (me.checkedIncludeLocalCabinet()) {
      if (!localIsMaster) {
        where.push({ key: 'isMaster', value: false })
      }
    } else {
      where.push({
        key: 'isLocal',
        value: false,
      });
      if (!localIsMaster) {
        where.push({ key: 'isMaster', value: false });
      }
    }
    _.each(where, function(item, index) {
      if (url.indexOf('?') > -1) {
        url = url + '&' + item.key + '=' + item.value;
      } else {
        url = url + '?' + item.key + '=' + item.value;
      }
    });

    me.getGridList(url, 9, $listCont, gridTpl, func);
  },
  renderBulletModuleListByGunType: function(cabinetId) {
    console.log('#### 开始渲染子弹模块 ####', cabinetId);
    var me = this;
    var $node = me.$node;
    var gun = me.dataStroage.get('gun');
    var applicant = me.dataStroage.get('user');
    var token = applicant.token;
    var $listCont;
    var $html = require('./template/rightModule.jade');
    var gridTpl = require('./template/grid-bulletModule.jade');

    var gunType = (gun.pop()).type;
    var url = '/cabinetmodule/associatedBulletsModules?gunType=' + gunType + '&cabinet=' + cabinetId;

    $node.find('.right-major').html($html);
    $listCont = $node.find('.list-cont');

    me.getGridList(url, 9, $listCont, gridTpl, function($curr) {
      var id = $curr.data('id');
      var canId = $curr.data('canid');
      
      console.log(' ######### bulletId子弹moduleId #########', id);

      if (!me.selectedBulletCabinetModule) {
        me.selectedBulletCabinetModule = [];
      }
      
      me.selectedBulletCabinetModule.push({
        id: id,
        canId: canId
      });

      // 如果还有其他gun，则继续选择子弹
      if (gun.length > 0) {
        me.showNoty('info', '还有其他，请继续选择子弹');
        me.dataStroage.add('gun', gun);
        me.renderGetBulletOnCabinetList.call(me);
      } else {
        me.dataStroage.add('bulletCabinetModuleList', me.selectedBulletCabinetModule);
        me.stepPart.nextStep();
      }
    });
  },
  includeArray: function(arr, key) {
    return arr.indexOf(key) > -1;
  },
  unIncludeArray: function(arr, key) {
    return !this.includeArray(arr, key);
  },
  filterSteps: function(stepPart) {
    /**
     * 以步骤里面的type为标识，根据工单类型或者系统配置进行过滤 
    */
    var me = this;
    var type = this.dataStroage.get('applicationType');
    var isDisabledSignature = this.checkedSignature('disableSignature');
    var adminSignature = this.checkedSignature('adminSignature');
    var steps = stepPart.steps;

    console.log('目前需要过滤的adminSignature, isDisabledSignature', isDisabledSignature, adminSignature);

    if (isDisabledSignature) {
      steps = _.filter(steps, function(item) {
        if (item.type !== 'signature') return true;
      });
    }

    if (!adminSignature) {
      steps = _.filter(steps, function(item) {
        if (item.type === 'adminSignature') return false;
        return true;
      });
    }

    // 过滤类型
    switch (type) {
      case 'gun':
        steps = _.filter(steps, function(item) {
          return me.unIncludeArray(['bullet', 'returnInfo', 'storage'], item.type);
        });
        break;
      case 'bullet':
        steps = _.filter(steps, function(item) {
          return me.unIncludeArray(['gun', 'returnInfo', 'count', 'storage', 'continueApplication'], item.type);
        });
        break;
      case 'returnGun':
      case 'returnBullet':
      case 'returnMaintain':
        steps = _.filter(steps, function(item) {
          return me.unIncludeArray(['gun', 'bullet', 'selectCabinet', 'storage', 'continueApplication'], item.type);
        });
        break;
      case 'storageBullet':
      case 'storageGun':
        steps = _.filter(steps, function(item) {
          return me.unIncludeArray(['gun', 'bullet', 'returnInfo', 'count', 'continueApplication'], item.type);
        });
        break;
      default:
        // 类型(maintain、emergency、storageBullet、storageGun):
        steps = _.filter(steps, function(item) {
          return me.unIncludeArray(['gun', 'bullet', 'returnInfo', 'count', 'storage', 'continueApplication'], item.type);
        });
        break;
    }
    
    if (type === 'returnMaintain') {
      if (!me.checkedNeedMaintainCount()) {
        steps = _.filter(steps, function (item) {
          return item.type !== 'count';
        });
      }
    }

    stepPart.steps = steps;
    return stepPart;
  },
  checkedIncludeLocalCabinet: function() {
    var settings = window.localStorage.getItem('systemSetData');
    if (settings) {
      settings = JSON.parse(settings);
      return settings.includeLocalCabinet;
    } else {
      return false;
    }
  },
  getBulletModuleList: function() {
    var me = this;
    var $node = me.$node;
    var $html = require('./template/rightModule.jade');
    var gridTpl = require('./template/grid-bulletModule.jade');
    var $listCont, url;
    var localCabinetInfo = me.dataStroage.get('localCabinetInfo');
    var localCabinetId = localCabinetInfo.id;
    var selectCabinetId = me.dataStroage.get('cabinetId');
    var bulletTypeId = me.dataStroage.get('formData').bulletType;
    var selectedCabinetIsMaster = me.dataStroage.get('selectedCabinetIsMaster');

    $node.find('.right-major').html($html);
    $listCont = $node.find('.list-cont');
    
    console.log('当前选择的子弹类型', bulletTypeId, '选择的柜机: ', selectCabinetId);

    if (selectCabinetId === localCabinetId) {
      url = '/cabinetmodule/list?type=bullet&cabinetId=' + selectCabinetId + '&isLocal=true'; 
    } else {
      url = '/cabinetmodule/list?type=bullet&cabinetId=' + selectCabinetId + '&isLocal=false';
    }

    if (!me.checkedOpenBatch()) {
      url = url + '&bulletType=' + bulletTypeId;
    }

    me.getGridList(url, 9, $listCont, gridTpl, function($curr) {
      if (me.checkedOpenBatch()) {
        me.selectBulletMethod($curr);
      } else {
        var bulletModuleId = $curr.data('id');
        var bulletFormData = me.dataStroage.get('formData');

        bulletFormData['bulletModuleId'] = bulletModuleId;
        me.dataStroage.add('formData', bulletFormData);
        me.stepPart.nextStep();
      }
    });
  },
  getCabinetList: function() {
    var me = this;
   
    me.initGetCabinetList(function ($curr) {
      var cabinetId = $curr.data('cabinet');
      var cabinetName = $curr.data('name');
      var type = me.dataStroage.get('applicationType');
      var selectedCabinetIsMaster = $curr.data('ismaster');
      var selectedCabinetIsLocal = $curr.data('islocal');

      console.log('选择了柜机: ', cabinetId, cabinetName, selectedCabinetIsMaster, selectedCabinetIsLocal);

      if (type === 'maintain') {
        if (!(me.user.hasPermission('manage-cabinet') || me.user.hasPermission('view-app') || me.user.hasPermission('manage-system'))) {
          return noty({
            text: '非管理员无法创建维护工单',
            type: 'error',
            layout: 'top',
            timeout: 2000
          });
        }
      } else {
        if ((me.user.hasPermission('manage-cabinet') || me.user.hasPermission('view-app')) && me.user.hasPermission('manage-system')) {
          // 判断管理是否可以创建工单
          if (!me.checkedAdminCreatedApp()) {
            return noty({
              text: '管理员无法创建工单',
              type: 'error',
              layout: 'top',
              timeout: 2000
            });
          }
        }
      }

      if (!cabinetId) {
        return noty({
          text: '无法获取当前柜机的code',
          type: 'error',
          layout: 'top',
          timeout: 2000
        });
      }
      var applicationTypeId = me.dataStroage.get('applicationTypeId');

      if (!applicationTypeId) {
        return noty({
          text: '没有找到无需审核人工单类型ID',
          type: 'error',
          layout: 'top',
          timeout: 1000
        });
      }
      me.selectedGun = [];
      me.selectedBullet = [];
      me.selectedGunCabinetModule = [];
      me.dataStroage.add('cabinetId', cabinetId);
      me.dataStroage.add('selectedCabinetIsMaster', selectedCabinetIsMaster);
      me.dataStroage.add('selectedCabinetIsLocal', selectedCabinetIsLocal);
      me.dataStroage.add('cabinetName', cabinetName);
      // 进入下一个流程
      me.stepPart.nextStep();
    });
  },
  getGunList: function() {
    var me = this;
    var $node = me.$node;
    var $html = require('./template/rightModule.jade');
    var cabinetCode = me.dataStroage.get('cabinetId');
    var gridTpl = require('./template/grid-gun.jade');
    var $listCont, url;
    var localCabinetInfo = me.dataStroage.get('localCabinetInfo');
    var localCabinetId = localCabinetInfo.id;

    $node.find('.right-major').html($html);

    $listCont = $node.find('.list-cont');

    url = '/gun/masterpublicgun?cabinetId=' + cabinetCode;

    if (!localCabinetInfo.isMaster) {
      url = '/master/gun/masterpublicgun?cabinetId=' + cabinetCode;
    }

    me.getGridList(url, 20, $listCont, function(data) {
      var useGunIdList = me.get_state('useGunIdList') || [];
      if (useGunIdList.indexOf(data.id) > -1) {
        data.disabled = true;
      } else {
        data.disabled = false;
      }
      return gridTpl(data);
    }, 
    function($curr) {
      if (me.checkedOpenBatch()) {
        me.selectGunMethod($curr);
      } else {
        // 选择1支后进行工单创建
        var cabinetModuleId = $curr.data('cabinetmoduleid');
        var gunId = $curr.data('id');
        var gunType = $curr.data('type');

        var cabinetId = me.dataStroage.get('cabinetId');

        me.dataStroage.add('gunId', gunId);
        me.dataStroage.add('gunType', gunType);
        me.dataStroage.add('cabinetModuleId', cabinetModuleId);
        
        me.dataStroage.add('gun', [{
          id: gunId,
          type: gunType,
          cabinetModule: cabinetModuleId
        }]);

        // 检测是否使用AB枪模式
        if (me.checkedABGunMode()) {

          // 检测当前的枪是否被取过
          var useGunIdList = me.get_state('useGunIdList') || [];

          if (useGunIdList.indexOf(gunId) > -1) {
            return me.showNoty('error', '当前枪支被使用中');
          }

          // 检测该枪是否可以取
          me.resquestCheckAssociateGun(gunId, cabinetId)
          .done(function(data) {
            if (data && data.pass) {
              me.stepPart.nextStep();
            } else {
              if (data && data.gun) {
                me.showNoty('error', '请取上一工单的关联枪' + data.gun.code);
              } else if (data.msg) {
                me.showNoty('error', data.msg);
              }
            }
          })
          .fail(function(error) {
            var err = error && error.responseJSON && error.responseJSON.msg;
            me.showNoty('error', err);
          });
        } else {
          me.stepPart.nextStep();
        }
      }
    });
  },
  resquestCheckAssociateGun: function(gunId, cabinetId) {
    var me = this;
    var def = $.Deferred();
    var applicantToken = me.dataStroage.get('user').token;
    server({
      url: '/gun/checkAssociateGun?gunId=' + gunId + '&cabinetId=' + cabinetId,
      beforeSend: function(xhr) {
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(applicantToken));
      }
    })
    .done(function(data) {
      def.resolve(data);
    })
    .fail(function(error) {
      def.reject(error);
    });
    return def;
  },
  getGridList: function(url, limit, $gridBox, gridTpl, clickGridHandle) {
    var me = this;
    var $node = me.$node;
    var token = me.dataStroage.get('user').token;
    $gridBox.gridlist({
      source: {
        url: url
      },
      noSessionNeedToken: token,
      limit: limit || 20,
      dataHandler: function(data) {
        // _.map(data, function(item) {
        //   var oldValue = item.code;
        //   var newValue = parseInt(item.code);
        //   if (_.isNaN(newValue)) {
        //     newValue = oldValue;
        //   }
        //   item.code = newValue;
        //   return item;
        // });
        // data.sort(function(a, b){
        //   return a.code - b.code;
        // });
        return data;
      },
      innerTpl: function(data) {
        return gridTpl(data);
      }
    }).gridlist('show');

    var $pagerBox = $node.find('.paging-btn-box');

    $pagerBox
    .off('click', '.btn')
    .on('click', '.btn', function() {
      var map = {
        next : function(){
          $gridBox.gridlist('next');
        },
        prev : function(){
          $gridBox.gridlist('prev');
        }
      };
      var target = $(this).attr('name');
      map[target] && map[target].call(me);
    }).paging('show');

    $gridBox.off('click')
    .on('click', '.grid-list-cell', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var $curr = $(e.currentTarget);
      if (typeof clickGridHandle === 'function') {
        clickGridHandle.call(null, $curr);
      }
    })
    .on('onNext', function(e, skip, total, limit){
      $pagerBox.paging('next', skip, total, limit);
      me.showSelectedGun();
    })
    .on('onPrev', function(e, skip, total, limit){
      $pagerBox.paging('prev', skip, total, limit);
      me.showSelectedGun();
    })
    .on('gridlist.afterTotalChange', function(event, total, limit, skip){
      if(total <= 0){
        $('.taskbar .finish-btn').addClass('hide');
      }
      $pagerBox.paging('refresh', skip, total, limit);
    });

    $gridBox
    .off('click', '.eye-btn')
    .on('click', '.eye-btn', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var target = $(e.target);
      var gridlist = target.parents('.gun_grid_cell').clone();
      var $some_content = gridlist.find('.some_content');
      var $model = $('<div/>').appendTo($('body'));
      $model.flexmodal()
      .on('shown.bs.modal', function(e) {
        $model.find('#gunDetaile').html($some_content);
      })
      $model.flexmodal('show', {
        modalTitle: '枪支详情'
      }, require('./template/gunDetaile.jade'))
    });

  },
  stepComponent: function(defaultStep) {
    var $node = this.$node;
    var stepExample = {
      currentStep: defaultStep || 0,
      steps: [],
      addSteps: function(step) {
        this.steps.push(step);
      },
      removeStep: function(index) {
        this.steps.splice(index, 1);
      },
      displayStep: function(data, cursor) {
        var me = this;
        var targetStepIndex = me.currentStep + (!_.isNil(cursor) ? cursor : 0);

        if(targetStepIndex >= me.steps.length || targetStepIndex < 0) return;

        var step = this.steps[targetStepIndex];

        var prevStep = (targetStepIndex >= 0) ? this.steps[targetStepIndex - 1] : null;

        if (prevStep && prevStep.onNext) {
          prevStep.onNext(function() {
            drawStep();
          });
        } else {
          drawStep();
        }

        function drawStep() {
          me.currentStep = targetStepIndex;
          var leftMenuItems = _.map(me.steps, function(step) {
            return { name: step.name, target: 'javascript:void(0)', id: step.id};
          });
          $node.find('.leftmenu').vProcessBar('show', me.currentStep, leftMenuItems);
          $node.find('.taskbar').taskbar().taskbar('show', step.actions);
          $node.find('.right-major').empty();
          step.onShown($node, _.bind(me.nextStep, me), data);
        }

      },
      prevStep: function(data) {
        if (this.currentStep > 0) {
          var cursor = -1;
          this.displayStep(data, cursor);
        }
      },
      nextStep: function(data) {
        if (this.currentStep < this.steps.length) {
          var cursor = 1;
          this.displayStep(data, cursor);
        }
      },
      go: function (current, data) {
        var me = this;
        me.currentStep = current;
        if (current >= 0 && current <= me.steps.length - 1) {
          me.displayStep(data, 0);
        }
      }
    } /* this.initStep*/
    return stepExample;
  },
  renderReturnAppInfo: function($node) {
    var me = this;
    var $rightMajor = $node.find('.right-major');
    var application = this.dataStroage.get('application');
    var typeLabel = {
      bullet: '还子弹',
      gun: '还枪',
      maintain: '还维护枪支'
    };
    var $sureReturnInfoBtn = $node.find('#sureReturnInfoBtn');
    var info = application ? {
      cabinetName: application.cabinet && application.cabinet.name,
      detail: application.detail,
      type: typeLabel[application.flatType]
    }: null;
    var type = this.dataStroage.get('applicationType');

    // 如果没有工单信息，则隐藏确定按钮。展示顶替归还
    if (!info) {
      $sureReturnInfoBtn.addClass('hide');
    } else {
      $sureReturnInfoBtn.removeClass('hide');
    }

    $rightMajor.empty().append(require('./template/returnDetail.jade')(
      {
        i18n: __('checkedAppTips'),
        info: info,
        type: type
      }
    ))
    .off('click', '.replaceReturnBtn')
    .on('click', '.replaceReturnBtn', function() {
      me.renderReplaceReturnForm($rightMajor);
    });
  },
  renderReplaceReturnForm: function ($node) {
    var $form = $node.empty().append(require('./template/returnForm.jade')());
    var me = this;

    $form.find('#gunCode').keypad('init');

    $form
    .off('click', '.searchGunNumberBtn')
    .on('click', '.searchGunNumberBtn', function() {
      var gunCode = $form.find('#gunCode').val();
      if (!gunCode) {
        return me.showNoty('error', '请填写枪号');
      }

      // 渲染替还枪支信息
      me.fetchReplaceAppInfo(gunCode);
    });
  },
  fetchReplaceAppInfo: function(code, func) {
    var me = this;
    var user = me.dataStroage.get('user');
    var token = user.token;
    me.server({
      url: '/application/findViaGunCode?gunCode=' + code,
      beforeSend: function(xhr) {
        xhr.setRequestHeader('Authorization', 'Token ' + btoa(token));
      }
    })
    .done(function(data) {
      me.dataStroage.add('assistReturn', true);
      if (data && data.length) {
        me.renderReplaceAppInfo(data[0]);
      } else {
        me.showNoty('error', '没有找到对应枪支的工单');
      }
    })
    .fail(function(error) {
      var errText = error && error.responseJSON && error.responseJSON.msg || '获取替还工单信息失败';
      me.showNoty('error', errText);
    });
  },
  renderReplaceAppInfo: function(data) {
    var me = this;
    var $rightMajor = me.$node.find('.right-major');
    $rightMajor.html(require('./template/replaceReturnInfo.jade')(data));
    me.$node.find('#sureReturnInfoBtn').removeClass('hide');

    me.dataStroage.add('application', {
      id: data.id,
      gun: data.gun,
      cabinetModule: data.cabinetmodule,
      flatType: 'gun'
    });

    me.dataStroage.add('cabinetName', data.cName);
    me.dataStroage.add('cabinetId', data.cId);
  },
  initLoginModule: function() {
    var me = this;
    var $node = me.$node;
    var $module = $node.find('.right-major');

    $module.standarLogin('show', {
      isAdmin: false,
      password: {
        isNoSession: true
      },
      fingerprint: {
        ajaxConfig: {
          url: '/fingerprint/auth'
        }
      }
    });

    $module
    .off('loginSuccess').on('loginSuccess', function(e, user, type) {
      console.log('on minPage: 普通用户验证登录', user, type);
      me.dataStroage.add('user', user);
      
      // type => face | fingerprint | password
      // me.dataStroage.add('currentLoginType', type);
      if (type === 'face') {
        var alias = '当前登录的用户:' + (user.alias || user.username);
        noty({
          text: alias,
          type: 'info',
          layout: 'top',
          timeout: 5000
        })
      }

      me.getLocalCabinetInfo().always(function () {
        me.stepPart.nextStep();
      });
    })
    .off('loginError').on('loginError', function(e) {

    });
  },
  initAdminLoginModule: function() {
    var me = this;
    var $node = me.$node;

    var $module = $node.find('.right-major');
    var application = me.dataStroage.get('application');
    var applicant = me.dataStroage.get('user');
    var applicationType = me.dataStroage.get('applicationType');
    var applicantToken = applicant.token;

    console.log('当前工单信息', application, applicationType);

    var data = {
      application: application,
      applicationList: application.id
    };

    // 如果是批量授权 && AB枪的情况
    if (applicationType === 'gun' && me.checkedABGunMode()) {
      var applications = me.get_state('applications');
      var applicationList = [];

      _.each(applications, function(item) {
        applicationList.push(item.application.id);
      });
      
      console.log('当前所有的工单, applications: ', applications, applicationList);

      applicationList = applicationList.length > 1 ? applicationList.join(',') : applicationList[0];

      data.applicationList = applicationList
    }


    $module.standarLogin('show', {
      isAdmin: true,
      face: {
        adminAjaxConfig: {
          url: '/application/adminauthbyFace',
          method: 'POST',
          // data: {
          //   application: { id: application.id }
          // },
          data: data,
          beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Token ' + btoa(applicantToken));
          }
        }
      },
      password: {
        adminAjaxConfig: {
          url: '/application/adminauth',
          method: 'POST',
          dataType: 'json',
          // data: {
          //   application: application,
          // },
          data: data,
          beforeSend: function(xhr) {
            xhr.setRequestHeader('Authorization', 'Token ' + btoa(applicantToken));
          }
        }
      },
      fingerprint: {
        ajaxConfig: {
          url: '/application/adminauthbyfingerprint',
          method: 'post',
          dataType: 'JSON',
          // data: {
          //   application: application
          // },
          data: data,
          beforeSend: function(xhr) {
            xhr.setRequestHeader('Authorization', 'Token ' + btoa(applicantToken));
          }
        }
      }
    });

    $module
    .off('loginSuccess').on('loginSuccess', function(e, data, loginType) {

      var userId = data && data.id ? data.id : (data.userId ? data.userId : null);
      var user = data.user;      
      if (loginType === 'face') {
        var alias = '当前登录的用户:' + (user.alias || user.username);
        noty({
          text: alias,
          type: 'info',
          layout: 'top',
          timeout: 5000
        });
      }

      console.log('管理员token', data)

      if (!userId) {
        me.showNoty('error', '管理员的UserId不存在');
      }

      me.dataStroage.add('admin', data);
      me.dataStroage.add('adminId', userId);
      me.stepPart.nextStep();
    })
    .off('loginError').on('loginError', function(e, data) {

    });
  },
  isAdmin: function (data, permissions) {
    var hasRole = false;
    if (data && data.roles && data.roles.length > 0) {
      _.each(data.roles, function(item) {
        if (item.permissions && item.permissions.length > 0) {
          if (_.indexOf(item.permissions, permissions) >= 0) {
            hasRole = true;
          }
        }
      });
    }
    return hasRole;
  },
  showNoty: function(type, text) {
    if (type === 'error') {
      noty({text: text, type: 'error', layout: 'top', timeout: 3000})
    } else {
      noty({text: text, type: 'success', layout: 'topRight', timeout: 3000})
    }
  },
  errorHandle: function(error) {
    if (typeof error === 'object' && error.responseJSON && error.responseJSON.error) {
      noty({text: error.responseJSON.error, type: 'error', layout: 'top', timeout: 1000});
    }
    else if (error && error.responseJSON && error.responseJSON.msg) {
      noty({
        text: error.responseJSON.msg,
        type: 'error',
        layout: 'top',
        timeout: 1000
      });
    }
    else if (typeof error === 'string') {
      noty({text: error, type: 'error', layout: 'top', timeout: 1000});
    }
    else  {
      noty({text: '未知错误', type: 'error', layout: 'top', timeout: 1000});
    }
  },
  initTemporaryStroage: function() {
    this.dataStroage = {
      store: {},
      add: function(key, data) {
        this.store[key] = data;
      },
      remove: function(key) {
        delete this.store[key];
      },
      get: function(key) {
        return this.store[key];
      }
    }
  },
  initSelectBulletModule: function() {
    var me = this;
    var $node = me.$node;
    var $html = require('./template/bulletform.jade');
    var $form = null;
    var applicantToken = me.dataStroage.get('user').token;
    var prevFormData = me.dataStroage.get('formData');

    $node.find('.right-major').append($html({
      i18n: __('simpleCreateApplication').form
    }));

    if (me.checkedOpenBatch()) {
      me.$node.find("#bulletAppTypeGroup").hide();
      me.$node.find('#bulletTypeGroup').hide();
    } else {
      me.$node.find("#bulletAppTypeGroup").show();
      me.$node.find('#bulletTypeGroup').show();
    }

    $form = $node.find('form#selectBulletForm');
    me.$editform = $form;

    $form.formwork({
      namespace: metadata.NS,
      fields: {
        '#bulletTypeText': {
          name: 'bulletTypeText',
          init: function() {
            var $model = $('<div/>').appendTo($node);

            $model.flexmodal()
            .off('shown.bs.modal')
            .on('shown.bs.modal', function(e) {
              var $node = $(e.target);
              var $list = $node.find('.type-list').empty();
              $list.list({
                source: {
                  url: '/bullettype',
                  noSessionNeedToken: applicantToken
                },
                limit: 5,
                innerTpl: require('./template/bulletListCell.jade'),
                renderFn: null
              });
              $list
              .off('click', 'li')
              .on('click', 'li', function(e) {
                var $currLi  = $(e.currentTarget),
                    typeId = $currLi.data('id'),
                    typeName = $currLi.data('name');
                $model.flexmodal('modalHide');
                if (typeId) {
                  $form.find('#bulletTypeText').val(typeName);
                  $form.find('#bulletType').val(typeId);
                  $form.find('#bulletTypeClearBtn').removeClass('hide');
                }
              })
              .list('show');
            });

            // 监听点击input触发事件
            $(this).off('click').on('click', function() {
              $model.flexmodal('show',
                {
                  modalTitle: '请选择类型'
                },
                require('./template/list.jade')
              );
            });

            $node.find('#bulletTypeClearBtn')
            .off('click')
            .on('click', function(e) {
              e.preventDefault();
              $form.find('#bulletTypeText').val(null);
              $form.find('#bulletType').val(null);
              $form.find('#num').val(null);
              $form.find('#bulletTypeClearBtn').addClass('hide');
            });

          },/* init */
          refresh: function(value, data) {
            var prevFormData = data[0];
            if (prevFormData) {
              bulletTypeText = prevFormData.bulletTypeText;
              $(this).val(bulletTypeText);
            }
          }
        },
        '#bulletType': {
          name: 'bulletType',
          validate: function() {
            var isPrivategun = me.dataStroage.get('isPrivategun');
            if (!me.checkedOpenBatch()) {
              if (!$(this).val() && !isPrivategun) {
                return '子弹类型不能为空';
              }
            }
          },
          refresh: function (value, data) {
            var prevFormData = data[0];
            if (prevFormData) {
              var bulletType = prevFormData && prevFormData.bulletType;
              $(this).val(bulletType);
            }
          }
        },
        '#bulletNum': {
          name: 'bulletNum',
          validate: function() {
            if (!$(this).val()) {
              return '子弹数不能为空';
            }
          },
          refresh: function(value, data) {
            var prevFormData = data[0];
            if (prevFormData) {
              $(this).val(Number(prevFormData.bulletNum));
            }
            console.log('获取到上一次设置的值', prevFormData);
          }
        },
        '[name="bulletAppType"]': {
          name: 'bulletAppType',
          init : function() {
            $(this).off('click').on('click', function(e){
              if($(this).prop("checked")){
                var value = $(this).val();
                switch (value){
                  case 'privategun':
                    $('#bulletTypeGroup').addClass('hide').val(null);
                    me.dataStroage.add('isPrivategun', true);
                  break;
                  case 'specific':
                    $('#bulletTypeGroup').removeClass('hide').val(null);
                    me.dataStroage.add('isPrivategun', false);
                  break;
                }
              }
            });
          },
          refresh: function(value, data){
          }
        }
      }
    }).formwork('init');
    /*formwork*/
    $form.formwork('refresh', [prevFormData]);
  },
  createdApplication: function() {
    var me = this,
        applicantToken,
        applicationTypeId,
        bulletForm,
        org,
        data,
        d = $.Deferred();

    // 如果已经是在提交状态则return掉
    if (me.createdApplication.isSubmit) {
      noty({text: '正在创建工单, 请稍等', type: 'info', layout: 'topRight', timeout: 2000});
      d.reject();
      return d;
    } else {
      me.createdApplication.isSubmit = true;
    }

    applicantToken = me.dataStroage.get('user').token;
    applicationTypeId = me.dataStroage.get('applicationTypeId');
    bulletForm = me.dataStroage.get('formData');
    org = me.dataStroage.get('userOrgId');
    gunId = me.dataStroage.get('gunId');
    cabinetId = me.dataStroage.get('cabinetId');
    cabinetModule = me.dataStroage.get('cabinetModuleId');
    var type = me.dataStroage.get('applicationType');

    if (!applicationTypeId) {
      d.reject();
      noty({text: '工单类型ID获取失败, 请重试', type: 'error', layout: 'top', timeout: 3000});
      return d;
    }
    
    // 处理批量取枪
    if (me.checkedOpenBatch() && type === 'gun') {
      gunId = gunId.join(',');
      cabinetModule = cabinetModule.join(',');
    }

    // 创建取子弹，模块信息特殊处理
    if (type === 'bullet') {
      cabinetModule = bulletForm.bulletModuleId;
    }

    if (me.checkedOpenBatch() && (type === 'stroageBullet' || type === 'storageGun')) {
      cabinetModule = cabinetModule.join(',');
    }

    data = {
      gun: gunId,
      cabinet: cabinetId,
      cabinetModule: cabinetModule,
      detail: '常规任务',
      type: applicationTypeId,
      bulletAppType: bulletForm && bulletForm.bulletAppType || '',
      bulletType: bulletForm && bulletForm.bulletType || '',
      bulletModuleId: bulletForm && bulletForm.bulletModuleId || '',
      num: bulletForm && bulletForm.bulletNum || '',
      org: org,
      quickApplication: true
    }

    server({
      url: '/application',
      method: 'POST',
      dataType: 'json',
      data: data,
      beforeSend: function(xhr) {
        xhr.setRequestHeader('Authorization', 'Token ' + btoa(applicantToken));
      }
    })
    .done(function(data) {
      me.createdApplication.isSubmit = false;
      d.resolve(data);
    })
    .fail(function(error) {
      me.createdApplication.isSubmit = null;
      d.reject(error);
      me.errorHandle(error);
    })
    return d;
  },
  getApplicationTypeId: function() {
    var me = this;
    var applicantToken = me.dataStroage.get('user').token;
    var type = me.dataStroage.get('applicationType');

    server({
      url: '/applicationtype?where={"type": "' + type + '", "approverOption": "none"}',
      beforeSend: function(xhr) {
        xhr.setRequestHeader('Authorization', 'Token ' + btoa(applicantToken));
      }
    })
    .done(function(data) {
      if (data && data[0]) {
        me.dataStroage.add('applicationTypeId', data[0].id);
      }
      console.log(data[0] && data[0].id, '### this is application type id ###');
    })
    .fail(function(error) {
      console.log(error);
    });
  },
  getUserOrg: function() {
    var me = this;
    var applicantToken = me.dataStroage.get('user').token;
    server({
      url: '/org?where={"isLocal": true}',
      beforeSend: function(xhr) {
        xhr.setRequestHeader('Authorization', 'Token ' + btoa(applicantToken));
      }
    })
    .done(function(data) {
      if (data && data.length > 0) {
        me.dataStroage.add('userOrgId', data[0].id);
        console.log(data[0].id, '@@@@@@@ 机构id  @@@@@@');
      } else {
        console.log('当前用户机构为空！！！！');
      }
    })
    .fail(function(error) {
      console.log('获取用的机构id失败', error);
    });
  },
  // 打开关联子弹模块 (关联子弹多工单处理)
  openAssociatedBullet: function (applicationId, userId, token) {
    var me = this;
    // var user = me.dataStroage.get('user');
    // var application = me.dataStroage.get('application');
    // var userId = user.id;
    // var token = user.token;
    // var applicationId = application.id;

    var data = {
      applicationId: applicationId,
      applicantId: userId
    };


    server({
      url: '/cabinetmodule/openSetAssociatedBulletModule',
      beforeSend: function(xhr) {
        xhr.setRequestHeader('Authorization', 'Token ' + btoa(token));
      },
      method: 'POST',
      data: data
    })
    .done(function(data) {
      if (data.length) {
        console.log('关联取子弹的信息：', data);
        me.renderBulletModuleInfo(data);
      }
      me.showNoty('success', '已发送联动开启弹仓命令');
    })
    .fail(function(error) {
      me.errorHandle(error);
    });
  },
  renderBulletModuleInfo: function(data) {
    var $ul = '';
    var li = '';
    var me = this;
    var applicationType = me.dataStroage.get('applicationType');

    if (applicationType === 'returnGun') return;

    _.each(data, function(item) {
      li += '<li>' +
        '<h2 class="xl">' + '弹仓所在柜机:' + item.cabinetName + ' / 弹仓:' + item.cmName + '</h2>' +
      '</li>';
    });
    $ul = '<ul>' + li + '<ul>';

    // 记录当前创建的子弹信息
    if (!me.openBulletModuleSet) {
      me.openBulletModuleSet = [];
    }
    // 记录最后渲染多开子弹提示
    me.openBulletModuleSet.push($ul);

    if (this.$node.find('.bullet_module_list_box') && this.$node.find('.bullet_module_list_box').length) {
      // this.$node.find('.bullet_module_list_box').html($ul);
      var applications = me.get_state('applications');
      if (me.openBulletModuleSet.length === applications.length) {
        var $ulSet = '';
        _.each(me.openBulletModuleSet, function(item) {
          $ulSet += item;
        });
        this.$node.find('.bullet_module_list_box').html($ulSet);
      }
      console.log("子弹联动开启", me.openBulletModuleSet, applications);
    }
  },
  // 这里要考虑多工单起来开的问题
  getGunOpenAssociatedBullet: function() {
    var me = this;
    var applications = me.get_state('applications');
    console.log('当前applications, on getGunOpenAssociateBullet 方法中', applications);
    _.each(applications, function(item) {
      var applicationId = item.application.id;
      var userId = item.user.id;
      var token = item.user.token;
      me.openAssociatedBullet(applicationId, userId, token);
    });
  },
  returnGunOpenAssociatedBullet: function() {
    var me = this;
    var user = me.dataStroage.get('user');
    var application = me.dataStroage.get('application');
    var userId = user.id;
    var token = user.token;
    var applicationId = application.id;
    
    this.openAssociatedBullet(applicationId, userId, token);
  },
  // 多次调用的单开
  openSingleDoorByAB: function() {
    var me = this;
    var applications = me.get_state('applications');
    // var url = '/cabinetmodule/open';
    // var action = 'getGun';
    // var moduleType = 'gun';
    var localCabinetInfo = me.dataStroage.get('localCabinetInfo');
    var localCabinetId = localCabinetInfo.id;
    var url = '/cabinetmodule/openBatch';

    var openRequest = function(config, data) {
      server(config)
      .done(function() {
        me.pushOpenLog(data, 'openBatch');
        noty({text: '开启命令发送成功', type: 'success', timeout: 3000, layout: 'topRight'});
      })
      .fail(function(error) {
        me.errorHandle(error);
      });
    };

    _.each(applications, function(item) {
      console.log('每一个application的具体数据: ', item);
      var data = {
        moduleId: item.application.cabinetModule,
        moduleType: 'gun',
        action: 'getGun',
        gunList: '',
        applicationId: item.application.id,
      };
      if (typeof item.application.gun === 'string') {
        data.gunList = item.application.gun;
      } else {
        data.gunList = item.application.gun[0].id;
      }
      var token = item.user.token;


      if (localCabinetInfo.isMaster) {
        if (localCabinetId !== item.cabinetId) {
          url = '/peer/' + item.cabinetId + '/cabinetmodule/openBatch';
        }
      }

      var config = {
        url: url,
        method: 'POST',
        dataType: 'json',
        data: data,
        beforeSend: function (xhr) {
          xhr.setRequestHeader('Authorization', 'Token' + btoa(token));
        }
      };
      openRequest(config, data);
    });

  },
  // 简单的单开门
  openSingleDoor: function() {
    var me = this;
    var application = me.dataStroage.get('application');
    var cabinetId = me.dataStroage.get('cabinetId');
    var applicantToken = me.dataStroage.get('user').token;
    var applicationType = me.dataStroage.get('applicationType');
    var localCabinetInfo = me.dataStroage.get('localCabinetInfo');
    
    var localCabinetId = localCabinetInfo.id;
    var selectCabinetId = me.dataStroage.get('cabinetId');

    var url = '/cabinetmodule/open';
    // 当是bullet类型时有targetModule
    var targetModule = me.dataStroage.get('targetModule');
    var action = '';
    var moduleId = '';
    var moduleType = '';

    if (!application) {
      return noty({text: '工单信息不存在，开门失败!', type: 'error', layout: 'top', tiemout: 3000});
    }

    if (applicationType === 'gun') {
      action = 'getGun';
    } else if (applicationType === 'returnGun') {
      action = 'returnGun';
    }

    if (['storageGun', 'storageBullet'].indexOf(applicationType) > -1) {
      moduleId = me.dataStroage.get('cabinetModuleId');
    } else {
      moduleId = application.cabinetModule;
    }

    if (applicationType === 'storageBullet') {
      moduleType = 'bullet';
    } else if (applicationType === 'storageGun') {
      moduleType = 'gun';
    } else {
      moduleType = application.flatType;
    }

    console.log('工单信息', application);

    var data = {
      moduleId: moduleId,
      moduleType: moduleType,
      action: action,
      moduleCanId: targetModule && targetModule.canId || '',
      applicationId: application.id
    }

    if (localCabinetInfo.isMaster) {
      if (localCabinetId !== selectCabinetId) {
        url = '/peer/' + cabinetId + '/cabinetmodule/open';
      }
    }

    server({
      url: url,
      method: 'POST',
      dataType: 'json',
      data: data,
      beforeSend : function(xhr){
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(applicantToken));
        noty({text: '发送操作命令中', type: 'info', layout: 'topRight', timeout:5000});
      }
    })
    .done(function() {
      me.pushOpenLog(data, 'open')
      noty({text: '操作命令发送成功', type: 'success', timeout:5000, layout: 'topRight'});
    })
    .fail(function(error) {
      me.errorHandle(error);
    });
  },
  openBatch: function() {
    var me = this;
    var application = me.dataStroage.get('application');
    var applicantToken = me.dataStroage.get('user').token;
    var cabinetId = me.dataStroage.get('cabinetId');
    var gunId = me.dataStroage.get('gunId') || me.dataStroage.get('application').gun;
    var localCabinetInfo = me.dataStroage.get('localCabinetInfo');
    var url, action;
    var applicationType = me.dataStroage.get('applicationType');

    var localCabinetId = localCabinetInfo.id;
    var selectCabinetId = me.dataStroage.get('cabinetId');
    
    var moduleType = application.flatType;

    if (applicationType === 'gun' && typeof gunId !== 'string') {
      gunId = gunId.join(',');
    }

    if (applicationType === 'gun') {
      action = 'getGun';
    } else if (applicationType === 'returnGun') {
      action = 'returnGun';
    } else if (applicationType === 'bullet') {
      action = 'getBullet';
    } else if (applicationType === 'returnBullet') {
      action = 'returnBullet';
    } else if (applicationType === 'storageGun') {
      action = 'storageGun';
    } else if (applicationType === 'storageBullet') {
      action = 'storageBullet';
    }

    // storageBullet 和 storageGun 的moduleType进行特殊处理
    if (['storageBullet', 'storageGun'].indexOf(applicationType) > -1) {
      moduleType = 'bullet';
    }

    console.log('当前的moduelType: ', application.flatType);

    var data = {
      moduleType: moduleType,
      action: action,
      applicationId: application.id,
      gunList: gunId
    }

    // 特殊处理gunList, storageGun 与 storageBullet  
    console.log('############ 批量开门 ##########', applicationType, application.cabinetModule);

    if (['bullet', 'returnBullet', 'storageGun', 'storageBullet'].indexOf(applicationType) > -1) {
      data.moduleList = application.cabinetModule;
    }

    console.log('##### openBatch open #############', localCabinetInfo)
    url = '/cabinetmodule/openBatch';
   
    if (localCabinetInfo.isMaster) {
      if (selectCabinetId !== localCabinetId) {
        url = '/peer/' + cabinetId + '/cabinetmodule/openBatch';
      }
    }

    server({
      url: url,
      method: 'POST',
      data: data,
      beforeSend: function(xhr) {
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(applicantToken));
        noty({text: '发送操作命令中', type: 'info', layout: 'topRight', timeout:5000});
      }
    })
    .done(function() {
      me.pushOpenLog(data, 'openBatch');
      noty({text: '批量开门成功', type: 'success', layout: 'topRight', timeout: 3000})
    })
    .fail(function(error) {
      me.errorHandle(error);
    });
  },
  openAllDoor: function() {
    var me = this;
    var applicantToken = me.dataStroage.get('user').token;
    var cabinetId = me.dataStroage.get('cabinetId');
    var application = me.dataStroage.get('application');
    var type = me.dataStroage.get('applicationType');
    var localCabinetInfo = me.dataStroage.get('localCabinetInfo');
    var url = '/cabinetmodule/openall';

    var localCabinetId = localCabinetInfo.id;
    var selectCabinetId = me.dataStroage.get('cabinetId');

    if (type === 'maintain') {
      application.maintain = 'get';
    } else if (type === 'returnMaintain') {
      application.maintain = 'save';
    }

    if (localCabinetInfo.isMaster) {
      if (selectCabinetId !== localCabinetId) {
        url = '/peer/' + cabinetId + '/cabinetmodule/openall'
      }
    }

    server({
      url: url,
      method: 'post',
      dataType: 'json',
      data: { application: application },
      beforeSend : function(xhr){
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(applicantToken));
        noty({text: '发送操作命令中', type: 'info', layout: 'topRight', timeout:5000});
      }
    })
    .done(function() {
      // 记录开门日志
      me.pushOpenLog(application, 'openall');
      noty({text: '全开操作成功!', type: 'success', timeout:4000, layout: 'topRight'});
    })
    .fail(function(error) {
      me.errorHandle(error);
    });
  },
  // 开启门禁
  openOrgDoor: function() {
    var me = this,
        username = me.dataStroage.get('user').usrename,
        userId = me.dataStroage.get('user').id,
        alias = me.dataStroage.get('user').alias,
        applicantToken = me.dataStroage.get('user').token;
        
    this.server({
      url: '/cabinetmodule/opengate',
      method: 'post',
      beforeSend: function (xhr) {
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(applicantToken));
      },
      data: {
        username: username,
        userId: userId,
        alias: alias
      }
    })
    .done(function(data) {
      noty({text: '库房门已打开', type: 'success', layout: 'topRight', timeout: 3000});
    })
    .fail(function(error) {
      var errObj = null;
      me.$node.find('#orgDoorBtn').removeClass('hide');
      if (error.responseText) {
        errObj = JSON.parse(error.responseText)
      } else {
        errObj = {error: '开启库房门失败'}
      }
      noty({text: errObj.error, type: 'error', layout: 'top', timeout: 3000});
    })
  },  
  pushOpenLog: function(data, openType) {
    var me = this;
    var cabinetName = me.dataStroage.get('cabinetName');
    var type = me.dataStroage.get('applicationType');
    var application = me.dataStroage.get('application');
    var moduleType = application.flatType;
    var newData = data;
    var assistReturn = me.dataStroage.get('assistReturn');
    var user = me.dataStroage.get('user');
    var inputCount = me.dataStroage.get('inputCount');

    newData = _.merge(newData, {
      openType: openType
    });

    me.speak('cabinetDoorOpened');
    console.log(type, '############# type', data);

    if (['storageGun', 'storageBullet', 'maintain', 'returnMaintain', 'emergency'].indexOf(type) > -1) {
      newData = {};
      newData.applicationId = data.id;
    }

    if (type === 'gun') {
      newData.action = 'getGun';
    } else if (type === 'bullet') {
      newData.action = 'getBullet';
    } else if (type === 'storageGun') {
      newData.action = 'storageGun';
    } else if (type === 'storageBullet') {
      newData.action = 'storageBullet';
    } else {
      newData.action = type;
    }

    if (type === 'maintain') {
      newData.maintain = 'get';
      delete newData.openType;
    } else if (type === 'returnMaintain') {
      newData.maintain = 'save';
      delete newData.openType
    }

    if (assistReturn) {
      newData = _.merge(newData, {
        assistUserName: user.username,
        assistUserAlias: user.alias,
        assistReturn: true
      })
    }

    if (inputCount) {
      newData.num = inputCount;
    }

    // 处理特殊的moduleType
    if ('storageGun' === type) {
      newData.moduleType = 'gun';
    } else if ('storageBullet' === type) {
      newData.moduleType = 'bullet';
    } else {
      newData.moduleType = moduleType;
    }

    this.server({
      url: '/optlog/openLog',
      method: 'POST',
      data: _.merge(newData, { cabinetName: cabinetName})
    })
  },
  markAppProcessed: function() {
    var me = this;
    var application = me.dataStroage.get('application');
    var status = 'complete';
    var type = me.dataStroage.get('applicationType');

    if (type === 'gun' || type === 'bullet' || type === 'maintain') {
      status = 'processed';
    }

    server({
      url: '/application/status',
      method: 'PUT',
      data: { applicationId: application.id, status: status },
      beforeSend : function(xhr){
        xhr.setRequestHeader('onemachine', true);
      }
    })
    .done(function() {
      noty({text: '申请状态已经更新', type: 'success', timeout:5000, layout: 'topRight'});
    })
    .fail(function() {
      noty({text: '申请状态更改失败', type: 'error', timeout: 5000, layout: 'top'});
    });
  },
  // 批量单取出枪, 工单状态修改
  batchMarkAppProcessed: function() {
    var me = this;
    var status = 'processed';
    var applications = me.get_state('applications');

    var updateStatus = function(data) {
      server({
        url: '/application/status',
        method: 'PUT',
        data: data,
        beforeSend: function(xhr) {
          xhr.setRequestHeader('onemachine', true);
        }
      })
      .done(function() {
        me.showNoty('success', '申请状态已更新');
      })
      .fail(function() {
        me.showNoty('error', '申请状态更新失败');
      });
    }

    _.each(applications, function(item) {
      var data = {
        applicationId: item.application.id,
        status: status
      };
      updateStatus(data);
    });
  },
  markGunStatus: function() {
    var me = this;
    var user = me.dataStroage.get('user');
    var token = user.token;
    var application = me.dataStroage.get('application');

    me.server({
      url: '/gun/in',
      method: 'POST',
      data : { gunId: application.gun },
      beforeSend: function (xhr) {
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(token));
      }
    })
    .done(function() {
      me.showNoty('success', '枪支状态已经更新');
    })
    .fail(function(err) {
      var text = err && err.responseJSON && err.responseJSON.error || '修改枪支状态操作命令发送失败';
      me.showNoty('error', text);
    });
  },
  getLocalCabinetInfo: function() {
    var d = $.Deferred();
    var me = this;
    var applicantToken = me.dataStroage.get('user').token;
    server({
      url: '/cabinet?where={"isLocal": true}',
      beforeSend: function(xhr) {
        xhr.setRequestHeader('Authorization', 'Token ' + btoa(applicantToken));
      }
    })
    .done(function(data) {
      d.resolve(data[0]);
      me.dataStroage.add('localCabinetInfo', data[0]);
    })
    .fail(function(error) {
      d.reject(error);
      console.log('获取自己柜机的信息失败', error);
    });
    return d;
  },
  addKeyBoard: function () {
    this.$node.find('input').keypad('init', {
      type: 'login_number',
      showPosition: 'left'
    });
  },
  autocomplete: function() {
    this.$node.find('#username').Autocomplete({
      url: '/user/autocomplete',
      limit: 5
    }).Autocomplete('show')
  },
  destroyAutocomplete: function() {
    this.$node.find('#username').Autocomplete('destroy');
  },
  checkedApplication: function() {
    var me = this;
    var d = $.Deferred();
    var applicantToken = this.dataStroage.get('user').token;
    var type = this.dataStroage.get('applicationType');
    var url;
    switch (type) {
      case 'gun':
        url = '/application/check';
        break;
      case 'bullet':
        url = '/application/checkbullet';
        break;
      case 'storageGun':
        url = '/application/storageCheck/gun';
        break;
      case 'storageBullet':
        url = '/application/storagecheck/bullet';
        break;
      case 'maintain':
        url = '/application/maintainCheck';
        break;
      case 'emergency':
        url = '/application/emergencycheck';
        break;
      case 'returnGun':
        url = '/application/returnguncheck';
        break;
      case 'returnBullet':
        url = '/application/returnbulletcheck';
        break;
      case 'returnMaintain':
        url = '/application/returnmaintaincheck';
        break;
      default:
    }

    if (!url) {
      d.reject();
      return noty({text: '没有找到对应的工单类型检测结果', type: 'error', layout: 'top', timeout: 2000});
    }

    server({
      url: url,
      beforeSend: function(xhr) {
        xhr.setRequestHeader('onemachine', true);
        xhr.setRequestHeader('Authorization', 'Token ' + btoa(applicantToken));
      }
    })
    .done(function(data) {
      console.log('检测工单成功response:', data);
      me.currentUserHasApplication = true;
      me.applicationDataHandle(data);
      d.resolve(data);
    })
    .fail(function(error) {
      console.log('检测工单失败response', error);
      me.currentUserHasApplication = false;
      d.reject(error);
    });
    return d;
  },
  checkedShowGateSwitch: function() {
    var setting = window.localStorage.getItem('systemSetData');
    if (setting) {
      try {
        setting = JSON.parse(setting);
        return setting.showGateSwitch;
      } catch(e) {
        return false;
      }
    } else {
      return false;
    }
  },
  checkedOpenBatch: function() {
    var setting = window.localStorage.getItem('systemSetData');
    if (setting) {
      setting = JSON.parse(setting);
      return setting.openBatch;
    } else {
      return false;
    }
  },
  checkedABGunMode: function() {
    var setting = window.localStorage.getItem('systemSetData');
    if (setting) {
      setting = JSON.parse(setting);
      return setting.enableABGun;
    } else {
      return false;
    }
  },
  checkedAdminCreatedApp: function() {
    var setting = window.localStorage.getItem('systemSetData');
    if (setting) {
      setting = JSON.parse(setting);
      return setting.adminCreateApp;
    } else {
      return false;
    }
  },
  checkedNeedMaintainCount: function() {
    var setting = window.localStorage.getItem('systemSetData');
    if (setting) {
      setting = JSON.parse(setting);
      return setting.needMaintainCount;
    } else {
      return false;
    }
  },
  showSelectedGun: function() {
    var me = this;
    if (!me.selectedGun && !me.selectedGun.length) return;
    console.log('初始化选择的枪支')
    setTimeout(function() {
      _.each(me.selectedGun, function(item) {
        var $item = $('#'+item);
        if ($item.length) {
          $item.addClass('selectedItem');
        }
      })
    }, 400)
  },  
  selectGunMethod: function($cell) {
    var me = this;
    var gunId = $cell.data('id');
    var gunCabinetModule = $cell.data('cabinetmoduleid');
    var gunType = $cell.data('type');
    var gunArray = [];
    me.$node.find('#selectGunsNextBtn').removeClass('hide');
    
    if (!me.selectedGun) me.selectedGun = []; 
    if (!me.selectedGunCabinetModule) me.selectedGunCabinetModule = [];
    if (!me.selectedGunType) me.selectedGunType = [];

    if ($cell.hasClass('selectedItem')) {
      $cell.removeClass('selectedItem');
      me.selectedGun.splice(me.selectedGun.indexOf(gunId), 1);
      me.selectedGunCabinetModule.splice(me.selectedGunCabinetModule.indexOf(gunCabinetModule), 1);
      me.selectedGunType.splice(me.selectedGunType.indexOf(gunType), 1);
      if (me.selectedGun.length === 0) {
        me.$node.find('#selectGunsNextBtn').addClass('hide');
      }
    } else {
      $cell.addClass('selectedItem');
      me.selectedGun.push(gunId);
      me.selectedGunCabinetModule.push(gunCabinetModule);

      // 类型可能相同，如果枪支类型存在，就不添加
      me.selectedGunType.push(gunType);
    }

    // 存储选中

    me.dataStroage.add('gunId', me.selectedGun);
    me.dataStroage.add('cabinetModuleId', me.selectedGunCabinetModule);
    
    _.each(me.selectedGunType, function(item, index) {
      gunArray.push({
        id: me.selectedGun[index],
        type: me.selectedGunType[index],
        cabinetModule: me.selectedGunCabinetModule[index]
      });
    });

    me.dataStroage.add('gun', gunArray);
    console.log(me.selectedGun, me.selectedGunCabinetModule, gunArray);
  },
  selectBulletMethod: function($cell) {
    var me = this;
    var moduleId = $cell.data('id');

    me.$node.find('#selectBulletNextBtn').removeClass('hide');

    if (!me.selectedBulletModule) me.selectedBulletModule = [];

    if ($cell.hasClass("selectedItem")) {
      $cell.removeClass('selectedItem');
      me.selectedBulletModule.splice(me.selectedBulletModule.indexOf(moduleId), 1);
      if (me.selectedBulletModule.length === 0) {
        me.$node.find('#selectBulletNextBtn').addClass('hide');
      }
    } else {
      $cell.addClass('selectedItem');
      me.selectedBulletModule.push(moduleId);
    }
    var bulletFormData = me.dataStroage.get('formData');
    bulletFormData['bulletModuleId'] = me.selectedBulletModule.join(',');

    me.dataStroage.add('formData', bulletFormData);
    console.log('选择的 bullet module id', me.selectedBulletModule, moduleId);
  },
  initSignature: function() {
    var me = this;
    me.$node.find('.right-major')
    .off('saveSignature')
    .on('saveSignature', function(event, dataUrl) {
      if (!dataUrl) {
        return noty({text: '签名板不能为空', type: 'error', layout: 'top', timeout: 3000});
      }
      me.$node.trigger('trigger_save_signature', dataUrl);
    })
    .off('clearSignature')
    .on('clearSignature', function() {
      console.log('清除签名板');
    })
    .empty().writingBoard('show');
  },
  sendSignature: function (dataURL, user, isApplicant) {
    var me = this,
        d = $.Deferred(),
        application = me.dataStroage.get('application'),
        applicationId = application && application.id;
        token = user && user.token;
        userId = user && _.isObject(user) && user.id;
    server({
      url: '/signature/save',
      method: 'post',
      beforeSend: function(xhr) {
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(token));
      },
      data: {
        user: userId,
        signature: dataURL,
        application: applicationId,
        isApplicant: isApplicant
      }
    })
    .done(function(data) {
      d.resolve(data);
    })
    .fail(function(error) {
      d.reject(error);
    });
    return d;
  },
  // 针对多工单, 管理员签名的处理
  sendAdminSignature: function(dataURL) {
    var me = this;
    var applications = me.get_state('applications');
    var adminUserId = me.dataStroage.get('adminId');
    var send = function(data, token) {
      server({
        url: '/signature/save',
        method: 'POST',
        beforeSend: function(xhr) {
          xhr.setRequestHeader('Authorization', 'Token', btoa(token));
        },
        data: data
      })
    };

    // 遍历调用发送管理员签名
    _.each(applications, function(item) {
      var data = {
        user: adminUserId,
        signature: dataURL,
        application: item.application.id,
        isApplicant: false
      };
      var token = item.user && item.user.token;
      send(data, token);
    });
  },
  wakeScreen: function () {
    server({
      url: '/system/wakeup',
      method: 'get'
    });
  },
  initWakeScreen: function () {
    var me = this;

    var throttled = _.throttle(me.wakeScreen, 6000, { 'trailing': false });

    $(document)
    .off('click')
    .on('click', throttled)
  },
  /*
   处理工单信息，存储需要的数据
  */
  applicationDataHandle: function(data) {
    var me = this;
    if (data && data.application) {
      me.dataStroage.add('application', data.application);
      if (data.application.cabinet) {
        console.log('######### this is cabinet name', data.application.cabinet.name)
        me.dataStroage.add('cabinetName', data.application.cabinet.name);
        me.dataStroage.add('cabinetId', data.application.cabinet.id);
      } else {
        noty({text: '工单信息有误,没有检测到柜机信息', type: 'error', layout: 'top', timeout: 2000})
      }

      // 记录num
      if (data.application.num) {
        me.dataStroage.add('inputCount', data.application.num);
      }
    }

    // 存储枪支
    if (data && data.gun) {
      me.dataStroage.add('gun', data.gun);
    }
  },
  /**
   * 获取存储的模块列表并且渲染
   * @param {*} type       模块的类型
   * @param {*} isLocal    是否本地
   * @param {*} cabinetId: 柜机的id
   */
  getStorageModuleList: function(type, isLocal, cabinetId, fn) {
    var me = this;
    var $node = me.$node;
    var $html = require('./template/rightModule.jade');
    var url = '/cabinetmodule/list?isLocal=' + isLocal + '&type=' + type + '&cabinetId=' + cabinetId;
    var gridTpl = require('./template/gridcellStorage.jade');

    $node.find('.right-major').html($html);

    $list = $node.find('.list-cont');
    
    me.getGridList(url, 9, $list,
    // gridTpl
    function(data) {
      _.merge(data, {
        moment: moment,
        i18n: __('modulemanagement')
      });
      return gridTpl(data);
    },
    // 点击grid回调
    function($curr) {
      fn && fn($curr);
      // var id = $curr.data('id');
      // me.stepPart.nextStep();
    });
  },
  // 存储枪、弹多选模式
  multipleSelectedModule: function ($cell) {
    var me = this;
    var moduleId = $cell.data('id');

    me.$node.find('#selectCabinetModuleBtn').removeClass('hide');
    if (!me.selectedCabinetModule) me.selectedCabinetModule = [];

    if ($cell.hasClass('selectedItem')) {
      $cell.removeClass('selectedItem');
      me.selectedCabinetModule.splice(me.selectedCabinetModule.indexOf(moduleId), 1);
      if (me.selectedCabinetModule.length === 0) {
        me.$node.find('#selectCabinetModuleBtn').addClass('hide');
      }
    } else {
      $cell.addClass('selectedItem');
      me.selectedCabinetModule.push(moduleId);
    }
    console.log('当前选中的模块信息: ', me.selectedCabinetModule);
    me.dataStroage.add('cabinetModuleId', me.selectedCabinetModule);
  },
  /**
   * @param {object} application 创建工单成功返回的工单数据 
   */
  recordCurrentUserCreatedApp: function() {
    var me = this;
    var application = me.dataStroage.get('application');
    var user = me.dataStroage.get('user');
    var cabinetId = me.dataStroage.get('cabinetId');
    var cabinetName = me.dataStroage.get('cabinetName');
    var userId = user.id;
    var gunId = '';

    if (typeof application.gun === 'string') {
      gunId = application.gun;
    } else {
      gunId = application.gun[0].id;
    }

    var data = {
      user: user,
      cabinetId: cabinetId,
      application: application,
      cabinetName: cabinetName
    };

    var applications = me.get_state('applications') || [];
    var isExsit = false;
    _.each(applications, function(item) {
      if (item.user.id === userId) {
        isExsit = true;
        return true;
      }
    });
    
    // 如果已经存在, 则不进行数据的存在
    if (isExsit) {
      return;
    }

    applications.push(data);

    // 记录当前用户下面工单信息
    me.add_state('applications', applications);

    // 把当前这个工单记录为上一次操作
    me.add_state('prev', data);

    // 记录当前用户选中gunId
    var gunIdList = me.get_state('useGunIdList') || [];
    if (gunIdList.indexOf(gunId) === -1) {
      gunIdList.push(gunId)
    }

    // 存在已经被选过去的枪支
    me.add_state('useGunIdList', gunIdList);
  },
  /**
   *  记录当前的AB枪
   *   
   */
  recordABGun: function(fn) {
    var me = this;
    var prevData = me.get_state('prev');
    
    if (!prevData) return fn && fn();

    var application = prevData.application;
    var gunId = '';
    var cabinetId = prevData.cabinetId;
    var user = prevData.user;
    var token = user.token;

    if (typeof application.gun === 'string') {
      gunId = application.gun;
    } else {
      gunId = application.gun[0].id;
    }

    me.server({
      url: "/cabinetmodule/recordABGun",
      method: 'POST',
      data: {
        gunId: gunId,
        cabinetId: cabinetId
      },
      beforeSend: function(xhr) {
        xhr.setRequestHeader("Authorization", 'Token ' + btoa(token));
      }
    })
    .done(function() {
      fn && fn()
    })
    .fail(function() {
      me.showNoty('error', 'AB枪状态更改失败, 请重试');
    });
  },
  /**
   * 管理多工单一次批注管理方法
   */
  _STATE: {},
  add_state: function(userId, value) {
    this._STATE[userId] = value;
  },
  get_state: function(key) {
    return this._STATE[key];
  },
  get_all_state: function() {
    return this._STATE;
  },
  clear_all_state: function () {
    console.log('清空所有的_STATE')
    this._STATE = {};
  },
  merge_state: function(userId, Obj) {
    var old = this._STATE[userId];
    if (this._STATE[userId]) {
      _.merge(old, Obj);
      this._STATE[userId] = old;
    }
  },
  /**
   * 
   * @param {Function} fn 选择了柜机的回调
   */
  renderMultipleMonitorControlButtonGroup: function(openFn) {
    var me = this;
    var applications = me.get_state('applications');
    var applicationType = me.dataStroage.get('applicationType');
    var $footer = me.$node.find('.minPage-app_footer').removeClass('hide');
    var btnGroup = '';
    var len = applications && applications.length;
    var lastCabinetId = '';

    if (applicationType === 'returnGun') {
      $footer.addClass('hide');
      var cabinetId = me.dataStroage.get('cabinetId');
      console.log("柜机的Id: ", cabinetId);
      openFn && openFn(cabinetId);
      return;
    };

      _.each(applications, function (item, index) {
        console.log('生成柜机监控切换列表', item);
        var btn = '';
        if (index === len - 1) {
          lastCabinetId = item.cabinetId;
          btn = "<button class='btn btn-empty highlight big monitorOpenBtn active' data-id='" + item.cabinetId + "'>" + '第' + (index + 1) + '组监控' + "</button>";
        } else {
          btn = "<button class='btn btn-empty highlight big monitorOpenBtn' data-id='" + item.cabinetId + "'>" + '第' + (index + 1) + '组监控' + "</button>";
        }
        btnGroup += btn;
      });

    
    $footer.append(btnGroup);

    me.$node.find('.monitorOpenBtn')
    .off('click')
    .on('click', function() {
      var $this = $(this);
      var cabinetId = $this.data('id');

      $this.addClass('active').siblings().removeClass('active');
      openFn && openFn(cabinetId);
      // closeFn && closeFn(cabinetId, function () {
        
      // });
    });

    // 默认开启
    openFn && openFn(lastCabinetId);
  }
}

_.extend(MinPage.prototype, prototype);

module.exports = MinPage;
