'use strict';
var less = require('./main.less');
var ejp = require('easy-jq-plugin');
var tpl = require('./main.jade');
var audio = require('common/audio.js').init();
var pubsub = require('PubSubJS');

var Keypad = function(element, conf){
  this.$node = $(element);
  //默认是小写
  this.isUppercase = false;

  //默认left类型的键盘显示number
  this.isNumberKeypad = true;
  return this;
}

var metadata = {
  vsersion : '0.0.1',
  name : 'keypad'
}

var prototype = {
  init : function(conf){
    log.debug('########keypadComponent: init %s#####')
    this.addKeyboard(this.$node, conf)
    return this;
  },
  addKeyboard : function($node, conf){
    log.debug('########keypadComponent: addKeyboard %s#####')

    var me = this;
    var keypadType = conf && conf.type || 'all';
    var showPosition = conf && conf.showPosition || 'bottom';
    var PinYinID = conf && conf.PinYinID || null;

    me.PinYinID = PinYinID;
    me.showPosition = showPosition;

    //input失去焦点，改变isFocus为false（isFocus是用来控制是否显示键盘的变量）
    $node.blur(function(){
      me.isFocus = false;
    });

    //点击input触发显示键盘
    $node.unbind('click').bind('click', function(e){
      me.isFocus = true;
      e.preventDefault();
      e.stopPropagation();
      var $input = $(this);
      var sourceValue = $input.val();
      var keypadComponent = document.getElementById('keypad-ui-component');

      //判断body里面是否已经存在了，键盘组件
      if(!keypadComponent){
        $('body').append(tpl());
      }

      //抛出点击input的事件
      $node.trigger('keypadComponentClickInputShow');

      if ($('#keypad-ui-component .keypad-ui-type-number').hasClass('hide')) {
        me.isNumberKeypad= false;
      } else {
        me.isNumberKeypad = true;
      }

      //判断虚拟键盘显示的位置,实现显示
      if(showPosition === 'left') {
        //添加一个左边淡出的主题
        $('#keypad-ui-component').find('.keypad-ui-main').removeClass().addClass('keypad-ui_main-left fadeInLeft keypad-ui-main animated')
        .find('.keypad-ui-type-number').addClass('pull-middle-center');
      } else {
        //先移除所有class，再添加fadeInUp(从下往上的一个淡出动画)、
        $('#keypad-ui-component').find('.keypad-ui-main').removeClass().addClass('fadeInUp keypad-ui-main animated')
        .find('.keypad-ui-type-number').removeClass('pull-middle-center');
      }


      //判断类型来决定显示那种键盘
      if(keypadType === "number"){
        $('.keypad-ui-type-all').addClass('hidden');
      }else if(keypadType === 'login_number'){
        $('.keypad-ui-type-all').addClass('hidden');
        $('.point-btn').removeClass('hidden');
      }else if(keypadType === "IP"){
        $('.point-btn').removeClass('hidden');
        $('.keypad-ui-type-all').addClass('hidden');
      }else if(keypadType === "http"){
        $('.point-btn').removeClass('hidden');
        $('.colon-btn').removeClass('hidden');
        $('.oblique-btn').removeClass('hidden');
        $('.keypad-ui-type-all').removeClass('hidden');
      }else{
        $('.point-btn').removeClass('hidden');
        $('.keypad-ui-type-all').removeClass('hidden');
      }

      //给doucment绑定一个click事件，判断是关闭键盘还是显示键盘
      $(document).unbind('click').bind('click', function updateShowState(e){
        var $target = $(e.target);
        var isClickKeyContainer = $target.hasClass('keypad-ui-div') || $target.hasClass('keypad-ui-area') || $target.hasClass('noCloseKeypad');
        if(!isClickKeyContainer){
          me.close();
        }
      })
      .on('off').on('keyup', function(e) {
        if (e.keyCode === 13) {
          me.close();
        }
      });

      //点击键盘按钮触发的事件
      $('.keypad-ui-box')
      .off('touchstart', '.key-btn')
      .on('touchstart', '.key-btn', function(e){
        var $target = $(e.target);
        $target.addClass('active_key_btn');
      })
      .off('touchend', '.key-btn')
      .on('touchend', '.key-btn', function(e) {
        var $target = $(e.target);
        $target.removeClass('active_key_btn');
      })
      .off('click', '.key-btn')
      .on('click', '.key-btn', function(e){
        console.log(e, '点击的按钮')
        var $me = $(this),
            target = e.target,
            targetNodeName = target.nodeName,
            $target = $(target),
            key = null,
            currInputValue = $input.val();
        //点击键盘键的时候抛出一个点击键盘的事件
        $('body').trigger('keypadComponentClick');

        if(targetNodeName === 'B'){
          key = $target.parent().data('id');
        }else if(targetNodeName === 'SPAN'){
          key = $target.data('id');
        }
        /*
            点击键盘的时候触发click音频
        */
        audio.play('click', true);
        //点击软件盘上面按钮，则修改isFocus为true，并且让input获取焦点
        $input.focus();
        me.isFocus = true;
        me.clickKeyIsSure = false;
        if(key === 'remove'){
          me.removeTexts($node, currInputValue);
        }else if(key === 'sure'){
          // 点击确认键的时候在input 抛一个确定事件
          $node.trigger('keypadClickSureKey');
          me.close();
        }else if(key === 'close'){
          me.close();
        }else if(key === 'case'){
          me.changeUppercaseLowercase($me);
        }else if(key === 'change'){
          me.changeKeypad();
        }else{
          var code = String(key).charCodeAt();
          if(code >= 46 && code <= 57){
            me.inserTexts($node, key, true);
          }else{
            me.isUppercase ? key = key.toLocaleUpperCase() : key = key;
            me.inserTexts($node, key, false);
          }
          // $input.val(currInputValue + key);
        }
        e.preventDefault();
        e.stopPropagation();
      });
    });


    me.initPinYinComponent();

    return this;
  },
  changeKeypad: function(){
    var $node = $('#keypad-ui-component');
    if (!this.isNumberKeypad) {
      this.isNumberKeypad = true;
      $node.find('.keypad-ui-type-number').removeClass('hide');
      $node.find('.keypad-ui-type-letter').addClass('hide');
    } else {
      this.isNumberKeypad = false;
      $node.find('.keypad-ui-type-number').addClass('hide');
      $node.find('.keypad-ui-type-letter').removeClass('hide');
    }
  },
  changeUppercaseLowercase: function($this){
    var me = this;
    var $node = $('#keypad-ui-component');
    if(me.isUppercase){
      me.isUppercase = false;
      $this.text('大写');
      $node.find('.Lowercase').removeClass('hide');
      $node.find('.Uppercase').addClass('hide');
    }else{
      me.isUppercase = true;
      $this.text('小写');
      $node.find('.Lowercase').addClass('hide');
      $node.find('.Uppercase').removeClass('hide');
    }
  },
  removeTexts: function($node, currInputValue){

    // 如果组件上有noWriteInput 就不进行删除操作
    $('body').trigger('keypadComponentUpdateTexts', {type: 'remove', $input: $node});
    if ($('#keypad-ui-component').hasClass('noWriteInput')) {
      return;
    }

    var CaretPos = this.getCursorPosition($node);
    $node.val(currInputValue && currInputValue.substring(0, CaretPos - 1 ) + currInputValue.substring(CaretPos, currInputValue.length));
    this.setCursorPosition($node, CaretPos, false);
  },
  inserTexts: function($node, keyStr, isNumber){
    var me = this,
      CaretPos = me.getCursorPosition($node),
      inputStr = $node.val(),
      objId = $node.get(0),
      inputType = $node.attr('type');

    $('body').trigger('keypadComponentUpdateTexts', {type: 'add', key: keyStr, $input: $node});
    // 如果组件上有noWriteInput 就不进行写入操作
    if ($('#keypad-ui-component').hasClass('noWriteInput')) {
      return;
    }

    if(inputType !== "number"){
      if(CaretPos !== inputStr.length - 1){
        var startText = inputStr.substring(0, CaretPos);
        var endText = inputStr.substring(objId.selectionEnd);
        var newStr = startText + keyStr + endText;
        $node.val(newStr);
      }else{
        $node.val(inputStr + keyStr);
      }
    }else{
      $node.val(Number(inputStr + keyStr));
    }
    me.setCursorPosition($node, CaretPos, true);
  },
  setCursorPosition: function($node, CaretPos, isAdd){
    var isAdd = isAdd && true || false;
    var inputType = $node.attr('type');
    if(inputType === "number"){
      return;
    }else{
      if(isAdd){
        var objId = $node.get(0);
        if(objId.setSelectionRange){
          objId.focus();
          objId.setSelectionRange(CaretPos + 1, CaretPos + 1);
        }else if (objId.createTextRange) {
          var range = objId.createTextRange();
          range.collapse(true);
          range.moveEnd('character', CaretPos + 1);
          range.moveStart('character', CaretPos + 1);
          range.select();
        }
      }else{
        var objId = $node.get(0);
        if(objId.setSelectionRange){
          objId.focus();
          objId.setSelectionRange(CaretPos - 1, CaretPos - 1);
        }else if (objId.createTextRange) {
          var range = objId.createTextRange();
          range.collapse(true);
          range.moveEnd('character', CaretPos - 1);
          range.moveStart('character', CaretPos - 1);
          range.select();
        }
      }
    }
  },
  getCursorPosition: function($node){
    var CaretPos = 0;
    var objId = $node.get(0);
    var inputType = $node.attr('type');
    if(inputType === "number"){
      CaretPos = $node.val().length;
    }else{
      if (document.selection) {  // IE Support
        objId.focus();
        var Sel = document.selection.createRange();
        Sel.moveStart('character', -objId.value.length);
        CaretPos = Sel.text.length;
      }else if(objId.selectionStart || objId.selectionStart == '0'){ // Firefox support
        CaretPos = objId.selectionStart;
      }
    }
    return CaretPos;
  },
  close: function(){
    log.debug('########keypadComponent: close %s#####')
    $(document).unbind('click')
    this.$node.trigger('keypadComponentClickInputHide');
    if(this.showPosition === 'left') {
      $('#keypad-ui-component').find('.keypad-ui-main').removeClass().addClass('fadeOutLeft keypad-ui-main animated keypad-ui_main-left');
    } else {
      $('#keypad-ui-component').find('.keypad-ui-main').removeClass().addClass('fadeOutDown keypad-ui-main animated');
    }
    this.$node.trigger('closeKeypadComponent');
  },
  destroy: function(){
    var $keypad = $('#keypad-ui-component');
    var me = this;
    if($keypad.length){
      $keypad.remove();
      me.destroyPinYinComponent();
    }
    return this;
  },
  /*
  拼音组件
  */
  resetPinYin: function () {
    this.emptyPinYin();
    this.PinYinSkip = 0;
    this.updatePinYinUI();
  },
  initPinYinComponent: function() {
    console.log('初始化拼音组件')
    var me = this;
    // 定义一个暂时存放pinyin的变量
    me._pinyin = '';

    me.$node
    // 监听点击input事件
    .off('keypadComponentClickInputShow')
    .on('keypadComponentClickInputShow', function(e) {
      // 重置拼音数据
      me.resetPinYin();

      if ($(e.target).attr('id') === me.PinYinID) {
        $('#PinYinComponent').removeClass('hide');
        // 开始监听PinYin
        me.createPinYinComponent();
        $('#keypad-ui-component').addClass('noWriteInput');
      } else {
        // 取消监听PinYin
        me._pinyin = '';
        me.destroyPinYinComponent();
        $('#PinYinComponent').addClass('hide');
        $('#keypad-ui-component').removeClass('noWriteInput');
      }
    });

    me.$node
    .off('keypadClickSureKey')
    .on('keypadClickSureKey', function() {
      var oldValue = me.$node.val();
      me.$node.val(oldValue + me._pinyin);
    });

  },
  createPinYinComponent: function() {
    var me = this,
        $body,
        PinYinJade;

    // 初始化PinYinSkip = 0;
    me.PinYinSkip = 0;

    var $PinYinComponent = $('#PinYinComponent');
    me.onPinYin();

    // 监听键盘触发输入
    $('body').off('keypadComponentUpdateTexts')
    .on('keypadComponentUpdateTexts', function(event, option) {
      if (option.type === 'add') {
        me._pinyin += option.key
      } else if (option.type === 'remove') {
        if (!me._pinyin) {
          var inputVal = me.$node.val();
          me.$node.val(inputVal.slice(0, -1))
        } else {
          me._pinyin = me._pinyin.slice(0, -1);
        }
      }
      $PinYinComponent.find('.pinyin_box').text(me._pinyin)

      me.emitPinYin();
    });

    $PinYinComponent.off('click').on('click', 'span', function(e) {
      var value = $(e.target).text();
      var oldValue = me.$node.val();
      var CaretPos = me.getCursorPosition(me.$node);
      if (value === '没有配合的文字,请补全拼音！') return;
      me._pinyin = '';
      $PinYinComponent.find('.pinyin_box').text('');
      me.$node.val(oldValue + value);
      me.setCursorPosition(me.$node, CaretPos, true);
      
      me.PinYinSkip = null;
      me.updatePinYinUI(null);
    });
    
    // 监听点击上一页、下一页
    me.onPinYinChangePage($PinYinComponent)
  },
  onPinYinChangePage: function($PinYinComponent) {
    var me = this;
    $PinYinComponent.on('click', '.btn', function() {
      var targetName = $(this).attr('name'),
          map = {
            'prev': function() {
              me.PinYinSkip -= 10;
              me.emitPinYin()
              console.log('this is PinYin prev, click')
            },
            'next': function() {
              me.PinYinSkip += 10;
              console.log('######################### PinYinSkip', me.PinYinSkip)
              me.emitPinYin()
              console.log('this is PinYin next, click')
            }
          }
      map[targetName] && map[targetName].call(this);
    })
  },
  emptyPinYin: function() {
    var $PinYinComponent = $('#PinYinComponent');
    this._pinyin = '';
    $PinYinComponent.find('.pinyin_box').text('');
    // this.updatePinYinUI();
  },
  emitPinYin: function() {
    var me = this,
        key = me._pinyin,
        limit = 10,
        $PinYinComponent = $('#PinYinComponent');
    $.ajax({
      url: '/pinyin/input?input=' + key + '&limit=' + limit + '&skip=' + me.PinYinSkip,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
  },
  onPinYin: function() {
    var me = this;
    pubsub.unsubscribe('words');
    pubsub.subscribe('words', function(topic, words) {
      console.log('############### this is pubsub.subscribe pinyin #############', words);
      me.updatePinYinUI(words);
    })
  },
  updatePinYinUI: function(aData) {
    var me = this,
        $PinYinComponent = $('#PinYinComponent'),
        $span = '';

    _.each(aData, function(item, index) {
      $span += '<span class="noCloseKeypad animated fadeIn">' + item + '</span>'
    });

    //显示下一页按钮
    $PinYinComponent.find('button[name="next"]').removeClass('hide');

    if (!aData) {
      $PinYinComponent.find('button[name="next"]').addClass('hide');
      $span = '<span class="animated fadeIn"></span>';
    } else if (aData && !aData.length) {
      $PinYinComponent.find('button[name="next"]').addClass('hide');
      $span = '<span class="animated fadeIn">没有配合的文字,请补全拼音！</span>';
    }

    if (!me.PinYinSkip) {
      $PinYinComponent.find('button[name="prev"]').addClass('hide');
    } else {
      $PinYinComponent.find('button[name="prev"]').removeClass('hide');
    }

    $PinYinComponent.find('.pinyin_result').empty().append($span);
  },
  destroyPinYinComponent: function() {
    pubsub.unsubscribe('pinyin');
    $('body').off('keypadComponentUpdateTexts');
  }
}

module.exports = ejp.pluginize(Keypad, metadata, prototype);
