"use strict";
exports.__esModule = true;
exports.InstanceFactory = void 0;
var errorfactory_1 = require("../tools/errorfactory");
var staticresource_1 = require("../web/staticresource");
var util_1 = require("../tools/util");
var application_1 = require("../tools/application");
var filewatcher_1 = require("../tools/filewatcher");
/**
 * 实例工厂
 * @remarks
 * 用于管理所有的实例对象
 */
var InstanceFactory = /** @class */ (function () {
    function InstanceFactory() {
    }
    /**
     * 工厂初始化
     * @param config    配置项
     */
    InstanceFactory.init = function (config) {
        var _this = this;
        if (typeof config === 'object') {
            this.handleJson(config);
        }
        else {
            this.parseFile(config);
        }
        //执行后处理
        setImmediate(function () {
            _this.doAfterInitOperations();
        });
    };
    /**
     * 添加单例到工厂
     * @param cfg       实例配置对象
     * @param replace   替换之前的实例
     * @returns         undefined或添加的实例
     */
    InstanceFactory.addInstance = function (cfg) {
        var _this = this;
        var insObj;
        var path;
        //单例模式，默认true
        var singleton = cfg.singleton !== undefined ? cfg.singleton : true;
        var mdl;
        //从路径加载模块
        if (cfg.path && typeof cfg.path === 'string' && (path = cfg.path.trim()) !== '') {
            for (var _i = 0, _a = this.mdlBasePath; _i < _a.length; _i++) {
                var mdlPath = _a[_i];
                mdl = require(util_1.Util.getAbsPath([mdlPath, path]));
                //支持ts和js,ts编译后为{className:***},js直接输出为class
                //找到则退出
                if (mdl) {
                    if (typeof mdl === 'object') {
                        mdl = mdl[cfg["class"]];
                    }
                    // class
                    if (mdl.constructor !== Function) {
                        throw new errorfactory_1.NoomiError("1003");
                    }
                    break;
                }
            }
        }
        else {
            mdl = cfg["class"];
        }
        if (!mdl) {
            throw new errorfactory_1.NoomiError("1004", path);
        }
        //增加实例名
        mdl.prototype.__instanceName = cfg.name;
        var instance;
        if (singleton) {
            instance = cfg.instance || new mdl(cfg.params);
        }
        insObj = {
            instance: instance,
            "class": mdl,
            singleton: singleton,
            properties: cfg.properties
        };
        //执行后处理
        setImmediate(function () {
            _this.doAfterInitOperations();
        });
        this.factory.set(cfg.name, insObj);
        if (insObj.instance) {
            //设置name
            //有实例，需要加入注入
            if (cfg.properties && cfg.properties.length > 0) {
                cfg.properties.forEach(function (item) {
                    _this.addInject(insObj.instance, item.name, item.ref);
                });
            }
            return insObj.instance;
        }
    };
    /**
     * 为实例添加注入
     * @param instance      实例类
     * @param propName      属性名
     * @param injectName    注入的实例名
     */
    InstanceFactory.addInject = function (instance, propName, injectName) {
        // 加入注入依赖
        var insName = instance.__instanceName;
        if (!insName) {
            return;
        }
        var ins = this.factory.get(insName);
        if (!ins) {
            return;
        }
        //加入注入列表
        this.injectList.push({
            instance: instance,
            propName: propName,
            injectName: injectName
        });
        if (ins.singleton) {
            var arr = this.injectMap.get(injectName) || [];
            //如果不存在，则加入数组，当注入实例更新后，则需要更新注入
            if (!arr.find(function (item) { return item['insName'] === insName; })) {
                arr.push({ insName: insName, propName: propName });
                this.injectMap.set(injectName, arr);
            }
        }
        else { //加入属性列表
            var props = ins.properties || [];
            if (!props.find(function (item) { return item.name === propName; })) {
                props.push({
                    name: propName,
                    ref: injectName
                });
            }
            ins.properties = props;
        }
        //添加到注入到初始化后操作
        this.addAfterInitOperation(this.finishInject, this);
    };
    /**
     * 完成注入操作
     */
    InstanceFactory.finishInject = function () {
        for (var _i = 0, _a = this.injectList; _i < _a.length; _i++) {
            var item = _a[_i];
            var instance = InstanceFactory.getInstance(item.injectName);
            // 实例不存在
            if (!instance) {
                throw new errorfactory_1.NoomiError('1001', item.injectName);
            }
            //注入到实例，单例才需要注入，否则在getInstance时生成
            var ins = this.factory.get(instance.__instanceName);
            if (ins && ins.singleton) {
                Reflect.set(item.instance, item.propName, instance);
            }
        }
        //清空inject list
        this.injectList = [];
    };
    /**
     * 获取实例
     * @param name  实例名
     * @param param 参数数组
     * @returns     实例化的对象或null
     */
    InstanceFactory.getInstance = function (name, param) {
        var _this = this;
        var ins = this.factory.get(name);
        if (!ins) {
            return null;
        }
        if (ins.singleton) {
            return ins.instance;
        }
        else {
            var mdl = ins["class"];
            param = param || ins.params || [];
            var instance_1 = Reflect.construct(mdl, param);
            //注入属性
            if (ins.properties && ins.properties.length > 0) {
                ins.properties.forEach(function (item) {
                    instance_1[item.name] = _this.getInstance(item.ref);
                });
            }
            return instance_1;
        }
    };
    /**
     * 通过类获取实例
     * @param clazz     类
     * @param param     参数数组
     * @returns         实例
     */
    InstanceFactory.getInstanceByClass = function (clazz, param) {
        return this.getInstance(clazz.prototype.__instanceName, param);
    };
    /**
     * 获取实例对象
     * @param name  实例名
     * @returns     实例对象
     */
    InstanceFactory.getInstanceObj = function (name) {
        return this.factory.get(name);
    };
    /**
     * 执行实例的一个方法
     * @param instancee     实例名或实例对象
     * @param methodName    方法名
     * @param params        参数数组
     * @param func          方法(与methodName二选一)
     * @returns             方法对应的结果
     */
    InstanceFactory.exec = function (instance, methodName, params, func) {
        //实例名，需要得到实例对象
        var instanceName = '';
        if (instance && typeof instance === 'string') {
            instanceName = instance;
            instance = this.getInstance(instance);
        }
        //实例不存在
        if (!instance) {
            throw new errorfactory_1.NoomiError("1001", instanceName);
        }
        func = func || instance[methodName];
        //方法不存在
        if (!func) {
            throw new errorfactory_1.NoomiError("1010", methodName);
        }
        return func.apply(instance, params);
    };
    /**
     * @exclude
     * 解析实例配置文件
     * @param path      文件路径
     */
    InstanceFactory.parseFile = function (path) {
        //读取文件
        var jsonStr = application_1.App.fs.readFileSync(path, 'utf-8');
        var json = null;
        try {
            json = application_1.App.JSON.parse(jsonStr);
        }
        catch (e) {
            throw new errorfactory_1.NoomiError("1000") + '\n' + e;
        }
        this.handleJson(json);
    };
    /**
     * @exclude
     * 处理配置对象
     * @param json      实例对象
     */
    InstanceFactory.handleJson = function (json) {
        var _this = this;
        if (json.module_path) {
            if (Array.isArray(json.module_path)) {
                json.module_path.forEach(function (item) {
                    if (!_this.mdlBasePath.includes(item)) {
                        //加入禁止访问路径
                        staticresource_1.StaticResource.addPath(item.charAt(0) === '/' ? item : '/' + item);
                        _this.mdlBasePath.push(item);
                    }
                });
            }
            else if (typeof json.module_path === 'string') {
                if (!this.mdlBasePath.includes(json.module_path)) {
                    var item = json.module_path;
                    //加入禁止访问路径
                    staticresource_1.StaticResource.addPath(item === '/' ? item : '/' + item);
                    this.mdlBasePath.push(item);
                }
            }
        }
        //子文件
        if (Array.isArray(json.files)) {
            json.files.forEach(function (item) {
                _this.parseFile(util_1.Util.getAbsPath([application_1.App.configPath, item]));
            });
        }
        //实例数组
        if (Array.isArray(json.instances)) {
            json.instances.forEach(function (item) {
                if (typeof item === 'string') { //模块在路径中
                    _this.addInstances(item);
                }
                else {
                    _this.addInstance(item);
                }
            });
        }
    };
    /**
     * 从文件添加实例
     * @param path  文件路径
     */
    InstanceFactory.addInstances = function (path) {
        var basePath = process.cwd();
        var pathArr = path.split('/');
        var pa = [basePath];
        var handled = false; //是否已处理
        for (var i = 0; i < pathArr.length - 1; i++) {
            var p = pathArr[i];
            if (p.indexOf('*') === -1 && p !== "") {
                pa.push(p);
            }
            else if (p === '**') { //所有子孙目录
                handled = true;
                if (i < pathArr.length - 2) {
                    throw new errorfactory_1.NoomiError('1000');
                }
                handleDir(pa.join('/'), pathArr[pathArr.length - 1], true);
            }
        }
        if (!handled) {
            handleDir(pa.join('/'), pathArr[pathArr.length - 1]);
        }
        function handleDir(dirPath, fileExt, deep) {
            var dir = application_1.App.fs.readdirSync(dirPath, { withFileTypes: true });
            var fn = fileExt;
            var reg = util_1.Util.toReg(fn, 3);
            //添加 file watcher
            if (application_1.App.openWatcher) {
                filewatcher_1.FileWatcher.addDir(dirPath, filewatcher_1.EWatcherType.DYNAMIC);
            }
            for (var _i = 0, dir_1 = dir; _i < dir_1.length; _i++) {
                var dirent = dir_1[_i];
                if (dirent.isDirectory()) {
                    if (deep) {
                        handleDir(application_1.App.path.resolve(dirPath, dirent.name), fileExt, deep);
                    }
                }
                else if (dirent.isFile()) {
                    // @Instance注解方式文件，自动执行instance创建操作
                    if (reg.test(dirent.name)) {
                        require(application_1.App.path.resolve(dirPath, dirent.name));
                    }
                }
            }
        }
    };
    /**
     * 获取instance工厂
     * @returns     实例工厂
     */
    InstanceFactory.getFactory = function () {
        return this.factory;
    };
    /**
     * 更新与clazz相关的注入
     * @param clazz 类
     * @since 0.4.4
     */
    InstanceFactory.updInject = function (clazz) {
        //更改的instance name
        var insName = clazz.prototype.__instanceName;
        if (!insName) {
            return;
        }
        var arr = this.injectMap.get(insName);
        if (!arr || arr.length === 0) {
            return;
        }
        for (var _i = 0, arr_1 = arr; _i < arr_1.length; _i++) {
            var cn = arr_1[_i];
            var c = this.getInstance(cn['insName']);
            var ins = this.getInstance(insName);
            if (c) {
                c[cn['propName']] = ins;
            }
        }
    };
    /**
     * 添加初始化结束后操作
     * @param foo   待执行操作
     * @since 0.4.0
     */
    InstanceFactory.addAfterInitOperation = function (foo, thisObj) {
        //已添加操作不再添加
        if (this.afterInitOperations.find(function (item) { return item['func'] === foo; })) {
            return;
        }
        this.afterInitOperations.push({
            func: foo,
            thisObj: thisObj
        });
    };
    /**
     * 执行初始化操作
     * @since 0.4.0
     */
    InstanceFactory.doAfterInitOperations = function () {
        if (this.afterInitOperations.length === 0) {
            return;
        }
        for (var _i = 0, _a = this.afterInitOperations; _i < _a.length; _i++) {
            var foo = _a[_i];
            foo['func'].apply(foo['thisObj']);
        }
        //清理初始化后操作
        this.afterInitOperations = [];
    };
    /**
     * 实例工厂map，存放所有实例对象
     */
    InstanceFactory.factory = new Map();
    /**
     * 模块基础路径数组，加载实例时从该路径加载
     */
    InstanceFactory.mdlBasePath = [];
    /**
     * 待注入对象数组
     */
    InstanceFactory.injectList = [];
    /**
     * 注入依赖map  键为注入类实例名，值为数组，数组元素为{className:类名,propName:属性名}
     * @since 0.4.4
     */
    InstanceFactory.injectMap = new Map();
    /**
     * 初始化后操作数组(实例工厂初始化结束后执行) {func:Function,thisObj:func this指向}
     * @since 0.4.0
     */
    InstanceFactory.afterInitOperations = [];
    return InstanceFactory;
}());
exports.InstanceFactory = InstanceFactory;
