"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.ERouteResultType = exports.RouteFactory = void 0;
var instancefactory_1 = require("../instancefactory");
var errorfactory_1 = require("../../tools/errorfactory");
var util_1 = require("../../tools/util");
var application_1 = require("../../tools/application");
var routeerrorhandler_1 = require("./routeerrorhandler");
/**
 * 路由结果类型
 * @since 0.0.6
 */
var ERouteResultType;
(function (ERouteResultType) {
    /**
     * 重定向
     */
    ERouteResultType["REDIRECT"] = "redirect";
    /**
     * 路由链,和redirect不同，浏览器地址不会改变
     */
    ERouteResultType["CHAIN"] = "chain";
    /**
     * 文件流，主要用于文件下载
     */
    ERouteResultType["STREAM"] = "stream";
    /**
     * 什么都不做
     */
    ERouteResultType["NONE"] = "none";
    /**
     * json数据,默认类型
     */
    ERouteResultType["JSON"] = "json";
})(ERouteResultType || (ERouteResultType = {}));
exports.ERouteResultType = ERouteResultType;
/**
 * 路由工厂类
 * 用于管理所有路由对象
 */
var RouteFactory = /** @class */ (function () {
    function RouteFactory() {
    }
    /**
     * 添加路由
     * @param path      路由路径，支持通配符*，需要method支持
     * @param clazz     对应类
     * @param method    方法，path中包含*，则不设置
     * @param results   路由处理结果集
     */
    RouteFactory.addRoute = function (path, clazz, method, results) {
        if (!path || !clazz) {
            return;
        }
        if (results && results.length > 0) {
            for (var _i = 0, results_1 = results; _i < results_1.length; _i++) {
                var r = results_1[_i];
                if ((r.type === ERouteResultType.CHAIN || r.type === ERouteResultType.REDIRECT)
                    && (!r.url || typeof r.url !== 'string' || (r.url = r.url.trim()) === '')) {
                    throw new errorfactory_1.NoomiError("2101");
                }
            }
        }
        if (method) {
            method = method.trim();
        }
        //没有通配符
        if (path.indexOf('*') === -1) {
            this.staticRouteMap.set(path, {
                instanceName: clazz.trim(),
                method: method,
                results: results
            });
        }
        else { //有通配符
            if (!this.dynaRouteArr.find(function (item) { return item.path === path; })) {
                this.dynaRouteArr.push({
                    path: path,
                    reg: util_1.Util.toReg(path, 3),
                    instanceName: clazz.trim(),
                    method: method,
                    results: results
                });
            }
        }
    };
    /**
     * 根据路径获取路由对象
     * @param path      url路径
     * @returns         路由对象
     */
    RouteFactory.getRoute = function (path) {
        var item;
        var method; //方法名
        //下查找非通配符map
        if (this.staticRouteMap.has(path)) {
            item = this.staticRouteMap.get(path);
            method = item.method;
        }
        else {
            for (var i = 0; i < this.dynaRouteArr.length; i++) {
                item = this.dynaRouteArr[i];
                //路径测试通过
                if (item.reg.test(path)) {
                    method = item.method;
                    if (!method) {
                        var index = item.path.indexOf("(");
                        //通配符处理
                        if (index !== -1) {
                            //通配符方法
                            method = path.substr(index);
                        }
                    }
                    break;
                }
            }
        }
        //找到匹配的则返回
        if (item && method) {
            var instance = instancefactory_1.InstanceFactory.getInstance(item.instanceName);
            if (instance && typeof instance[method] === 'function') {
                return { instance: instance, method: method, results: item.results };
            }
        }
        return null;
    };
    /**
     * 路由方法执行
     * @param pathOrRoute   路径或路由
     * @param req           request 对象
     * @param res           response 对象
     * @param params        调用参数对象
     * @returns             0 正常 1异常
     */
    RouteFactory.handleRoute = function (route, req, res, params) {
        return __awaiter(this, void 0, Promise, function () {
            var nullArr, r, func, re;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        //尚未初始化
                        if (!this.errorHandler) {
                            this.init({});
                        }
                        //绑定path
                        if (!route.path && req) {
                            route.path = req.url;
                        }
                        //设置request
                        if (typeof route.instance.setRequest === 'function') {
                            route.instance.setRequest(req);
                        }
                        //设置response
                        if (typeof route.instance.setResponse === 'function') {
                            route.instance.setResponse(res);
                        }
                        if (!!params) return [3 /*break*/, 2];
                        return [4 /*yield*/, req.init()];
                    case 1:
                        params = _a.sent();
                        _a.label = 2;
                    case 2:
                        //设置model
                        if (typeof route.instance.setModel === 'function') {
                            nullArr = void 0;
                            if (route.instance.__getNullCheck) { //空属性
                                nullArr = route.instance.__getNullCheck(route.method);
                            }
                            r = route.instance.setModel(params, nullArr);
                            if (r !== null) { //setmodel异常
                                throw r;
                            }
                        }
                        func = route.instance[route.method];
                        if (typeof func !== 'function') {
                            throw new errorfactory_1.NoomiError("1010");
                        }
                        return [4 /*yield*/, func.call(route.instance, route.instance || params)];
                    case 3:
                        re = _a.sent();
                        return [4 /*yield*/, this.handleResult(route, re)];
                    case 4: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * 处理路由结果
     * @param route     route对象
     * @param data      路由对应方法返回值
     */
    RouteFactory.handleResult = function (route, data) {
        return __awaiter(this, void 0, Promise, function () {
            var results, r, _i, results_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        results = route.results;
                        if (!(results && results.length > 0)) return [3 /*break*/, 6];
                        if (!(results.length === 1)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.handleOneResult(route, results[0], data)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        r = void 0;
                        _i = 0, results_2 = results;
                        _a.label = 3;
                    case 3:
                        if (!(_i < results_2.length)) return [3 /*break*/, 6];
                        r = results_2[_i];
                        if (!(r.value === undefined || data && data == r.value)) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.handleOneResult(route, r, data)];
                    case 4: return [2 /*return*/, _a.sent()];
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6: return [4 /*yield*/, this.handleOneResult(route, {}, data)];
                    case 7: 
                    //默认回写json
                    return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * 处理一个路由结果
     * @param route         route对象
     * @param result        route result
     * @param data          路由执行结果
     * @returns             cache数据对象或0
     */
    RouteFactory.handleOneResult = function (route, result, data) {
        return __awaiter(this, void 0, Promise, function () {
            /**
             * 处理带参数的url，参数放在{}中
             * @param url   源url，以${propName}出现
             * @returns     处理后的url
             */
            function handleParamUrl(instance, url) {
                var reg = /\$\{.*?\}/g;
                var r;
                //处理带参数url
                while ((r = reg.exec(url)) !== null) {
                    var pn = r[0].substring(2, r[0].length - 1);
                    url = url.replace(r[0], getValue(instance, pn));
                }
                return url;
            }
            /**
             * 获取属性值
             * @param instance  实例
             * @param pn        属性名
             * @returns         属性值
             */
            function getValue(instance, pn) {
                if (instance[pn] !== undefined) {
                    return instance[pn];
                }
                else if (instance.model && instance.model[pn] !== undefined) {
                    return instance.model[pn];
                }
            }
            var url, instance, res, ret, _a, pa, _i, _b, pn_1, v, pas, url1, params, _c, _d, pn_2, v, route1, pn, fn, mimeType;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        instance = route.instance;
                        res = route.instance.response;
                        ret = 0;
                        _a = result.type;
                        switch (_a) {
                            case ERouteResultType.REDIRECT: return [3 /*break*/, 1];
                            case ERouteResultType.CHAIN: return [3 /*break*/, 2];
                            case ERouteResultType.NONE: return [3 /*break*/, 4];
                            case ERouteResultType.STREAM: return [3 /*break*/, 5];
                        }
                        return [3 /*break*/, 6];
                    case 1:
                        url = handleParamUrl(instance, result.url);
                        pa = [];
                        //参数属性
                        if (result.params && Array.isArray(result.params) && result.params.length > 0) {
                            for (_i = 0, _b = result.params; _i < _b.length; _i++) {
                                pn_1 = _b[_i];
                                v = getValue(instance, pn_1);
                                if (v !== undefined) {
                                    pa.push(pn_1 + '=' + v);
                                }
                            }
                        }
                        pas = pa.join('&');
                        if (pas !== '') {
                            if (url.indexOf('?') === -1) {
                                url += '?' + pas;
                            }
                            else {
                                url += '&' + pas;
                            }
                        }
                        res.redirect(url);
                        return [3 /*break*/, 7];
                    case 2:
                        url = handleParamUrl(instance, result.url);
                        url1 = application_1.App.url.parse(url).pathname;
                        params = application_1.App.qs.parse(application_1.App.url.parse(url).query);
                        //参数处理
                        if (result.params && Array.isArray(result.params) && result.params.length > 0) {
                            for (_c = 0, _d = result.params; _c < _d.length; _c++) {
                                pn_2 = _d[_c];
                                v = getValue(instance, pn_2);
                                if (v !== undefined) {
                                    params[pn_2] = v;
                                }
                            }
                        }
                        route1 = this.getRoute(url1);
                        if (route1 === null) {
                            throw new errorfactory_1.NoomiError("2103", url1);
                        }
                        //设置route path
                        route1.path = url1;
                        return [4 /*yield*/, this.handleRoute(route1, route.instance.request, res, params)];
                    case 3: return [2 /*return*/, _e.sent()];
                    case 4: //什么都不做
                    return [3 /*break*/, 7];
                    case 5:
                        pn = result.params[0];
                        if (pn) {
                            fn = getValue(instance, pn);
                            if (fn) {
                                fn = util_1.Util.getAbsPath([fn]);
                                if (!application_1.App.fs.existsSync(fn)) {
                                    throw new errorfactory_1.NoomiError('0050');
                                }
                                res.writeFileToClient({
                                    data: fn
                                });
                            }
                        }
                        return [3 /*break*/, 7];
                    case 6:
                        mimeType = void 0;
                        //处理json对象
                        if (typeof data === 'object') {
                            data = JSON.stringify(data);
                            mimeType = 'application/json';
                        }
                        else {
                            mimeType = 'text/plain';
                        }
                        ret = {
                            data: data,
                            mimeType: mimeType
                        };
                        _e.label = 7;
                    case 7: return [2 /*return*/, ret];
                }
            });
        });
    };
    /**
     * 处理异常信息
     * @param res   response 对象
     * @param e     异常
     */
    RouteFactory.handleException = function (res, e) {
        var eh = instancefactory_1.InstanceFactory.getInstance(this.errorHandler);
        if (eh) {
            eh.handle(res, e);
        }
        else {
            res.writeToClient({
                data: e
            });
        }
    };
    /**
     * 初始化路由工厂
     * @param config    配置文件
     * @param ns        命名空间（上级路由路径）
     */
    RouteFactory.init = function (config, ns) {
        var _this = this;
        //初始化errorHandler
        if (!this.errorHandler) {
            if (config.route_error_handler) {
                this.errorHandler = config.route_error_handler;
            }
            else {
                instancefactory_1.InstanceFactory.addInstance({
                    name: 'noomi_route_error_handler',
                    instance: new routeerrorhandler_1.RouteErrorHandler(),
                    "class": routeerrorhandler_1.RouteErrorHandler
                });
                this.errorHandler = 'noomi_route_error_handler';
            }
        }
        var ns1 = config.namespace ? config.namespace.trim() : undefined;
        var pa = ns ? [ns] : [];
        if (ns1) {
            pa.push(ns1);
        }
        //处理本级路由
        if (Array.isArray(config.routes)) {
            config.routes.forEach(function (item) {
                pa.push(item.path);
                //增加namespce前缀
                var p = util_1.Util.getAbsPath(pa, true);
                _this.addRoute(p, item.instance_name, item.method, item.results);
            });
        }
        //处理子路径路由
        if (Array.isArray(config.files)) {
            config.files.forEach(function (item) {
                _this.parseFile(util_1.Util.getAbsPath([application_1.App.configPath, item]), ns);
            });
        }
    };
    /**
     * 解析路由文件
     * @param path  文件路径
     * @param ns    命名空间，默认 /
     */
    RouteFactory.parseFile = function (path, ns) {
        //读取文件
        var json = null;
        try {
            var jsonStr = application_1.App.fs.readFileSync(path, 'utf-8');
            json = application_1.App.JSON.parse(jsonStr);
        }
        catch (e) {
            throw new errorfactory_1.NoomiError("2100") + '\n' + e;
        }
        this.init(json, ns);
    };
    /**
     * 动态路由(带通配符)路由集合
     */
    RouteFactory.dynaRouteArr = new Array();
    /**
     * 静态路由(不带通配符)路由集合
     */
    RouteFactory.staticRouteMap = new Map();
    return RouteFactory;
}());
exports.RouteFactory = RouteFactory;
