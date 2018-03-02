;(function(global){
    var PICKERCOUNT = 0;
    var body = document.getElementsByTagName("body")[0];
    var coordinate = {start: {y:0},end: {y:0,status:true}, move: {y:0}};
    var Util = {
      removeClass: function(el, className) {
        var reg = new RegExp('(\\s|^)' + className + '(\\s|$)');
        el.className = el.className.replace(reg, ' ').replace(/^\s\s*/, '').replace(/\s\s*$/, '');
      },
      addClass: function(el, className) {
        !Util.hasClass(el,className) && (el.className += (el.className ? ' ' : '') + className);
      },
      hasClass: function(el, className) {
        return !!el.className && new RegExp('(^|\\s)' + className + '(\\s|$)').test(el.className);
      },
      loop: function(start,end,handle){
        for(var i = start; i < end; i++){
          Util.isFunc(handle) && handle(i);
        }
      },
      isFunc: function(name){
        return typeof name === 'function';
      },
      isArray: function(o) {
        return Object.prototype.toString.call(o) === '[object Array]';
      },
      isObject: function(o) {
        return typeof o === 'object';
      },
      damping: function (value) {//阻尼运算
        var steps = [20, 40, 60, 80, 100],rates = [0.5, 0.4, 0.3, 0.2, 0.1];
        var result = value,len = steps.length;
        while (len--) {
          if (value > steps[len]) {
            result = (value - steps[len]) * rates[len];
            for (var i = len; i > 0; i--) {
                result += (steps[i] - steps[i - 1]) * rates[i - 1];
            }
            result += steps[0] * 1;
            break;
          }
        }
        return result;
      },
      createEle: function(parent, tag, className, html) {
        var ele = document.createElement(tag);
        className && Util.addClass(ele,className);
        html && (ele.innerHTML = html);
        parent && parent.appendChild(ele);
        return ele;
      },
      getEle: function(ctx, selector) {
        return ctx.querySelector(selector);
      },
      setTransform: function(el,y) {
        el.style.transform = 'translate3d(0,'+ y +'px,0)';
      }
    }
    function Picker(config){
      this.index = ++PICKERCOUNT;//当前选择器的索引
      this.target = config.target instanceof HTMLElement ? config.target : typeof config.target === "string" ? Util.getEle(document,config.target) : null;//触发选择器的dom元素
      this.data  = config.data || [];//需要显示的数据
      this.value = config.value ? (Util.isArray(config.value) ? config.value : config.value.split(',')) : [];//选择器默认值
      this.childKey = config.childKey || 'child';//子数据索引名
      this.valueKey = config.valueKey || 'value';//用于索引初始值的key
      this.textKey = config.textKey || 'value';//用于显示的key
      this.autoFill = !(config.autoFill === false);//选择确定后是否填充到目标元素
      this.confirm = config.confirm;//确定选择的回调
      this.cancel = config.cancel;//取消回调
      this.initCallback = config.initCallback;//实例化完成的回调
      this.select = config.select;//单个列表选择后的回调
      this.lock = config.lock === true;//锁定确定按钮，用于异步加载时等待使用
      this.className = config.className || '';//定制的类名
      this.init();
    }
    Picker.prototype = {
      constructor: Picker,
      init: function(){
        this.initResult();
        var html = '<div class="mp-container"><div class="mp-header"><span class="mp-cancel">取消</span><span class="mp-confirm'+(this.lock ? ' disabled' : '')+'">确定</span></div><div class="mp-content"><div class="mp-shadowup"></div><div class="mp-shadowdown"></div><div class="mp-line"></div><div class="mp-box"></div></div>';
        var container = Util.createEle(body,'div','mp-mask',html);
        this.className && Util.addClass(container,this.className);
        container.id = 'mobilePicker'+this.index;
        this.container = container;
        this.box = Util.getEle(container, '.mp-box')//用于包含滚动元素的容器
        this.createScroll(this.data);//核心方法：创建滚动的元素
        this.value = [];
        this.bindEvent();//绑定事件
        this.finisInit();
      },
      initResult: function(config){
        this.scrollCount = 0;//已渲染的数据层级数
        this.selectIndex = [];//每个层级选中的索引集合
        this.result = [];//选择器最终的结果
        this.offset = [];//每个层级滚动的偏移量集合
      },
      finisInit: function(){
        var value = this.fillResult();
        Util.isFunc(this.initCallback) && this.initCallback(value,this.result);
      },
      update: function(options){
        for(var i in options) {
          this[i] = options[i];
        }
        this.initResult()
        this.box.innerHTML = '';
        this.createScroll(this.data);
        this.value = [];
      },
      getData: function(indexes){//获取数据集合
        var arr = [];
        for(var i = 0; i < indexes.length; i++){
          arr = i == 0 ? this.data : arr[indexes[i -1]][this.childKey];
        }
        return arr;
      },
      setResult: function(data){
        if(!Util.isObject(data)) return data;
        var temp = {};
        for(var key in data){
          key != this.childKey && (temp[key] = data[key]);
        }
        return temp;
      },
      createScroll: function(data){
        var scroll = Util.createEle(this.box,'div','mp-list-wrap','<ul></ul>');
        scroll.scrollIndex = this.scrollCount++;
        this.addList(Util.getEle(scroll, 'ul'), data);
      },
      getText: function(data){
        return Util.isObject(data) ? data[this.textKey] : data;
      },
      addList: function(parent, data){
        var html = '',that = this;
        var index = 0,scrollIndex = parent.parentNode.scrollIndex,text = '';
        Util.loop(0,data.length,function(i){
          text = that.getText(data[i]);
          html += '<li>'+text+'</li>';
          //初始化时有默认值，应该选中当前值，否则index就会为0，即选中第一个
          if(that.value.length && that.value[scrollIndex] && (Util.isObject(data[i]) && data[i][that.valueKey] == that.value[scrollIndex][that.valueKey] || data[i] == that.value[scrollIndex])){
            index = i;
          }
        });
        parent.innerHTML = html;
        this.offset.push(0);
        this.selectItem(data, index, scrollIndex);//选中并创建下一级选择器
      },
      updateList: function(index,data){
        var dom = this.box.childNodes[index];
        if(!dom){
          this.createScroll(data);
          return;
        }
        dom = Util.getEle(dom,'ul');
        this.addList(dom, data);
      },
      setScroll: function(index,data,value,callback) {
        value && (this.value[index] = value);
        this.offset.length = this.selectIndex.length = this.result.length = this.selectIndex.length = index;
        if(index == 0){
          this.data = data;
        } else {
          var temp = this.data[this.selectIndex[0]];
          for(var i = 1, len = index; i < len; i++){
            temp = temp[this.childKey][this.selectIndex[i]];
          }
          temp && (temp[this.childKey] = data);
        }
        this.updateList(index,data);
        this.value = [];
        Util.isFunc(callback) && callback(index,this.result);
      },
      removeScroll: function(index){
        var that = this;
        var node = this.box.childNodes[index];
        if(node){
          this.box.removeChild(node);
          this.scrollCount--;
          this.calcWidth();
        }
      },
      calcWidth: function() {
        var wraps = this.box.querySelectorAll('.mp-list-wrap');
        for(var m = 0; m < wraps.length; m++){
          wraps[m].style.width = (100 / this.scrollCount) + '%';
        }
      },
      selectItem:function(data, index, scrollIndex){//params: 数据，选中的索引，当前scroll的索引
        var that = this;
        var oldScrollCount = this.scrollCount;
        this.selectIndex.length = this.result.length = scrollIndex + 1;
        this.selectIndex[scrollIndex] = index;
        this.result[scrollIndex] = this.setResult(data[index]);
        this.setOffset(scrollIndex, index);
        if(data[index] && data[index][that.childKey] && Util.isArray(data[index][that.childKey]) && data[index][that.childKey].length){//存在子元素
          if(that.scrollCount < scrollIndex + 2){//如果上一次的ul个数少于当前需要的个数，则创建新的ul
            that.createScroll(data[index][that.childKey]);
          } else {
            that.updateList(scrollIndex + 1, data[index][that.childKey]);
          }
        } else {//说明当前的滚动器数目多于需要的，移除多余的
          for ( var j = oldScrollCount - 1, len = that.selectIndex.length; j >= len; j-- ) {//删除多余的ul
            that.removeScroll(j);
          }
        }
        // this.scrollIndex = this.offset.length = this.selectIndex.length;
        this.offset.length = this.selectIndex.length;
        this.calcWidth();//计算滚动对象的宽度
        Util.isFunc(that.select) && that.select(scrollIndex,this.result,index,data[index] && data[index][that.childKey] && Util.isArray(data[index][that.childKey]) && data[index][that.childKey].length);
      },
      fillContent: function(content){
        var tagName  = this.target.tagName.toLowerCase();
        if(['input','select','textarea'].indexOf(tagName) != -1) {
          this.target.value = content;
        } else {
          this.target.innerText = content;
        }
      },
      fillResult: function(){
        var value = '';
          for(var i = 0,len = this.result.length; i < len; i++){
            if(Util.isObject(this.result[i])){
              this.result[i][this.textKey] && (value += this.result[i][this.textKey]);
            } else {
              value += this.result[i];
            }
          }
          this.autoFill && this.fillContent(value);
          return value;
      },
      hide: function(){
        var that = this;
        Util.getEle(this.container,'.mp-container').style.transform = 'translate3d(0,100%,0)';
        Util.removeClass(body, 'mp-body');
        setTimeout(function(){
          that.container.style.visibility = 'hidden';
        },250)
      },
      show: function(){
        var that = this;
        that.container.style.visibility = 'visible';
        Util.addClass(body, 'mp-body');
        setTimeout(function(){
          Util.getEle(that.container,'.mp-container').style.transform= 'translate3d(0,0,0)';
        },0)
      },
      setOffset: function(scrollIndex, index){
        var scroll = this.box.childNodes[scrollIndex].querySelector('ul');
        var offset = scroll.childNodes[0] ? scroll.childNodes[0].offsetHeight * index : 0;
        Util.setTransform(scroll, -offset)
        this.offset[scrollIndex] = offset;
      },
      setLock: function(value){
        var confirm = Util.getEle(this.container,'.mp-confirm'),old = this.lock;
        this.lock = value !== false;
        if(old !== this.lock) {
          this.lock ? Util.addClass(confirm,'disabled') : Util.removeClass(confirm, 'disabled');
        }
      },
      bindEvent: function(){
        var that = this;
        that.target.disabled = true;
        ['touchstart','touchend','touchmove'].forEach(function(action){
            that.box.parentNode.addEventListener(action,function(event){
            event = event || window.event;
            event.preventDefault();
            var target  = event.target;
            var index = target.parentNode.scrollIndex;
            var child = target.childNodes;
            var liHeight = child[child.length - 1].offsetHeight;
            var scrollHeight = child[child.length - 2].offsetTop;
            if(target.tagName.toLowerCase() != 'ul') return;
            switch(action) {
              case 'touchstart':
                if(coordinate.end.status){
                  coordinate.end.status = !coordinate.end.status;
                  coordinate.start.y = event.touches[0].clientY;
                  coordinate.start.time = Date.now();
                }
                break;
              case 'touchmove':
                coordinate.move.y = event.touches[0].clientY;
                var distance = coordinate.start.y - coordinate.move.y;
                var os = distance + that.offset[index];
                if(os < 0){//已经滑到最顶部
                  Util.setTransform(target, Util.damping(-os));
                } else if(os <= scrollHeight){
                  Util.setTransform(target, -os);
                } else {//超过了整体的高度
                  Util.setTransform(target, -(scrollHeight + Util.damping(os-scrollHeight)));
                }
                break;
              case 'touchend':
                coordinate.end.y = event.changedTouches[0].clientY;
                var count = Math.floor((that.offset[index] + (coordinate.start.y - coordinate.end.y))/liHeight + 0.5)
                count = count < 0 ? 0 : Math.min(count, target.childNodes.length - 1);
                var temp = that.offset[index];
                that.offset[index] = count < 0 ? 0 : Math.min(count * liHeight,target.offsetHeight - 5 * liHeight)
                Util.setTransform(target, -that.offset[index]);
                coordinate.end.status = true;
                that.selectIndex.length  = index + 1;
                that.selectIndex[index] = count;
                that.selectItem(that.getData(that.selectIndex),count,index)
                break;
            }
          },false)
        });
        that.target.addEventListener('touchstart',function(event){
          (event || window.event).preventDefault();
          //记录旧结果，用于取消恢复
          that.oldResult = that.result.slice(0);
          that.show();
        });
        //  用click事件代替touchstart防止点透
        Util.getEle(that.container,'.mp-cancel').addEventListener('click',function(){
          that.hide();
          //恢复旧的结果
          that.update({
            value: that.oldResult,
            valueKey: that.textKey
          });
          Util.isFunc(that.cancel) && that.cancel();
        },false);
        Util.getEle(that.container,'.mp-confirm').addEventListener('click',function(){
          if(that.lock) return;
          var value = that.fillResult();
          that.hide();
          Util.isFunc(that.confirm) && that.confirm(value, that.result);
        });
      }
    }
    if (typeof module !== 'undefined' && typeof exports === 'object') {
      module.exports = Picker;
    } else if (typeof define === 'function' && (define.amd || define.cmd)) {
      define(function() { return Picker; });
    } else {
      global.Picker = Picker;
    }
})(this);