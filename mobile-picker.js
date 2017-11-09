;(function(global){
    var pickerIndex = 0;
    var body = document.getElementsByTagName("body")[0];
    var coordinate = {start: {y:0},end: {y:0,status:true}, move: {y:0}}
    function loop(start,end,handle){
      for(var i = start; i < end; i++){
        typeof handle === 'function' && handle(i);
      }
    }
    function isFunc(name){
      return typeof name === 'function';
    }
    function isArray(o){
      return Object.prototype.toString.call(o) === '[object Array]';
    }
    function damping(value) {//阻尼运算
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
    }
    function Picker(config){
      this.index = ++pickerIndex;//当前选择器的索引
      this.target = typeof config.target === 'string' ? document.getElementById(config.target) : config.target;//触发选择器的dom元素
      this.data  = config.data || [];//需要显示的数据
      this.value = config.value ? (isArray(config.value) ? config.value : config.value.split(',')) : [];//选择器默认值
      this.childKey = config.childKey || 'child';//子数据索引名
      this.valueKey = config.valueKey || 'value';//用于索引初始值的key
      this.textKey = config.textKey || 'value';//用于显示的key
      this.autoFill = !(config.autoFill === false);//选择确定后是否填充到目标元素
      this.confirm = config.confirm;//确定选择的回调
      this.cancel = config.cancel;//取消回调
      this.select = config.select;//滚动结束后的回调
      this.lock = config.lock === true;//
      this.className = config.className || '';
      this.init();
    }
    Picker.prototype = {
      constructor: Picker,
      init: function(){
        this.initConfig();
        var container = document.createElement('div');
        var html = '<div class="mp-container"><div class="mp-header"><span class="mp-cancel">取消</span><span class="mp-confirm'+(this.lock ? ' disabled' : '')+'">确定</span></div><div class="mp-content"><div class="mp-shadowup"></div><div class="mp-shadowdown"></div><div class="mp-line"></div><div class="mp-box"></div></div>';
        container.className = 'mp-mask' + (this.className ? ' '+this.className : '');
        container.id = 'mobilePicker'+this.index;
        container.innerHTML = html;
        body.appendChild(container);
        this.container = container;
        this.box = container.querySelector('.mp-box')//用于包含滚动元素的容器
        this.createScroll(this.data);//创建第一个滚动元素
        this.value = [];
        this.bindEvent();//绑定事件
      },
      initConfig: function(config){
        this.scrollCount = 0;//已渲染的数据层级数
        this.selectIndex = [];//选中的内容索引
        this.result = [];//选择器的结果
        this.offset = [];//滚动器的偏移量
      },
      update: function(options){
        for(var i in options) {
          this[i] = options[i];
        }
        this.initConfig()
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
        if(typeof data !== 'object') return data;
        var temp = {};
        for(var key in data){
          key != this.childKey && (temp[key] = data[key])
        }
        return temp;
      },
      createScroll: function(data){
        var scroll = document.createElement('div');
        scroll.className = 'mp-list-wrap';
        scroll.innerHTML = '<ul></ul>';
        scroll.scrollIndex = this.scrollCount++;
        this.box.appendChild(scroll);
        this.addList(scroll.querySelector('ul'), data);
      },
      getText: function(data){
        return typeof data === 'object' ? data[this.textKey] : data;
      },
      addList: function(parent, data){
        var html = '',that = this;
        var index = 0,scrollIndex = parent.parentNode.scrollIndex,text = '';
        loop(0,data.length,function(i){
          text = that.getText(data[i]);
          html += '<li>'+text+'</li>';
          if(that.value.length && that.value[scrollIndex] && (typeof data[i] === 'object' && data[i][that.valueKey] === that.value[scrollIndex] || data[i] == that.value[scrollIndex])){//说明当前有默认要选中的值
            index = i;
          }
        });
        parent.innerHTML = html;
        this.offset.push(0);
        this.selectItem(data, index, scrollIndex);
      },
      updateList: function(index,data){
        var dom = this.box.childNodes[index];
        if(!dom){
          this.createScroll(data);
          return;
        }
        dom = dom.querySelector('ul');
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
        isFunc(callback) && callback(index,this.result);
      },
      removeScroll: function(index){
        var that = this;
        this.box.removeChild(this.box.childNodes[index]);
        this.scrollCount--;
        var wraps = that.box.querySelectorAll('.mp-list-wrap');
        for(var m = 0; m < wraps.length; m++){
          wraps[m].style.width = (100 / that.scrollCount) + '%';
        }
      },
      selectItem:function(data, index, scrollIndex){//params: 数据，选中的索引，当前scroll的索引
        var that = this;
        var oldScrollCount = this.scrollCount;
        this.selectIndex.length = this.result.length = scrollIndex + 1;
        this.selectIndex[scrollIndex] = index;
        this.result[scrollIndex] = this.setResult(data[index]);
        this.setOffset(scrollIndex, index);
        if(data[index] && data[index][that.childKey] && isArray(data[index][that.childKey]) && data[index][that.childKey].length){//存在子元素
          if(that.scrollCount < scrollIndex + 2){//如果上一次的ul个数少于当前需要的个数，则创建新的ul
            that.createScroll(data[index][that.childKey]);
          } else {
            that.updateList(scrollIndex + 1, data[index][that.childKey]);
          }
        } else {
          for ( var j = oldScrollCount - 1, len = that.selectIndex.length; j >= len; j-- ) {//删除多余的ul
            that.removeScroll(j);
          }
        }

        this.scrollIndex = this.offset.length = this.selectIndex.length;
        //计算滚动对象的宽度
        var wraps = that.box.querySelectorAll('.mp-list-wrap');
        for(var m = 0; m < wraps.length; m++){
          wraps[m].style.width = (100 / that.scrollCount) + '%';
        }
        isFunc(that.select) && that.select(scrollIndex,this.result,index,data[index] && data[index][that.childKey] && isArray(data[index][that.childKey]) && data[index][that.childKey].length);
      },
      fillContent: function(content){
        var tagName  = this.target.tagName.toLowerCase();
        if(['input','select','textarea'].indexOf(tagName) != -1) {
          this.target.value = content;
        } else {
          this.target.innerText = content;
        }
      },
      hide: function(){
        var that = this;
        this.container.querySelector('.mp-container').style.transform= 'translate3d(0,100%,0)';
        body.className = body.className.replace('mp-body','');
        setTimeout(function(){
          that.container.style.visibility = 'hidden';
        },250)
      },
      show: function(){
        var that = this;
        that.container.style.visibility = 'visible';
        body.className = body.className + ' mp-body';
        setTimeout(function(){
          that.container.querySelector('.mp-container').style.transform= 'translate3d(0,0,0)';
        },0)
      },
      setOffset: function(scrollIndex, index){
        var scroll = this.box.childNodes[scrollIndex].querySelector('ul');
        var offset = scroll.childNodes[0] ? scroll.childNodes[0].offsetHeight * index : 0;
        scroll.style.transform = 'translate3d(0,-'+offset+'px,0)';
        this.offset[scrollIndex] = offset;
      },
      setLock: function(value){
        var confirm = this.container.querySelector('.mp-confirm'),old = this.lock;
        this.lock = value !== false;
        if(old !== this.lock) {
          confirm.className = this.lock ? confirm.className + ' disabled' : confirm.className.replace(' disabled','');
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
                  target.style.transform = 'translate3d(0,'+ (damping(-os)) +'px,0)';
                } else if(os <= scrollHeight){
                  target.style.transform = 'translate3d(0,-'+ os +'px,0)';
                } else {//超过了整体的高度
                  target.style.transform = 'translate3d(0,-'+(scrollHeight + damping(os-scrollHeight))+'px,0)';
                }
                break;
              case 'touchend':
                coordinate.end.y = event.changedTouches[0].clientY;
                var count = Math.floor((that.offset[index] + (coordinate.start.y - coordinate.end.y))/liHeight + 0.5)
                count = count < 0 ? 0 : Math.min(count, target.childNodes.length - 1);
                var temp = that.offset[index];
                that.offset[index] = count < 0 ? 0 : Math.min(count * liHeight,target.offsetHeight - 5 * liHeight)
                target.style.transform = 'translate3d(0,-' + that.offset[index] + 'px, 0)';
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
          that.show();
        });
        //  用click事件代替touchstart防止点透
        that.container.querySelector('.mp-cancel').addEventListener('click',function(){
          that.hide();
          isFunc(that.cancel) && that.cancel();
        },false);
        that.container.querySelector('.mp-confirm').addEventListener('click',function(){
          if(that.lock) return;
          var value = '';
          for(var i = 0,len = that.result.length; i < len; i++){
            if(typeof that.result[i] === 'object'){
              that.result[i][that.textKey] && (value += that.result[i][that.textKey]);
            } else {
              value += that.result[i];
            }
          }
          that.autoFill && that.fillContent(value);
          that.hide();
          isFunc(that.confirm) && that.confirm(value, that.result);
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
