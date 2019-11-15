"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const instancefactory_1 = require("../instancefactory");
const errorfactory_1 = require("../../tools/errorfactory");
const util_1 = require("../../tools/util");
const application_1 = require("../../tools/application");
class RouteFactory {
    /**
     * 添加路由
     * @param path      路由路径，支持通配符*，需要method支持
     * @param clazz     对应类
     * @param method    方法，path中包含*，则不设置
     */
    static addRoute(path, clazz, method, results) {
        if (results && results.length > 0) {
            for (let r of results) {
                if ((r.type === 'chain' || r.type === 'redirect') && (!r.url || typeof r.url !== 'string' || (r.url = r.url.trim()) === '')) {
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
            this.dynaRouteArr.push({
                path: path,
                reg: util_1.Util.toReg(path, 3),
                instanceName: clazz.trim(),
                method: method,
                results: results
            });
        }
    }
    /**
     * 根据路径获取路由
     * @param path      url path
     * @return          {instance:**,method:**,results?:**}
     */
    static getRoute(path) {
        let item;
        let method; //方法名
        //下查找非通配符map
        if (this.staticRouteMap.has(path)) {
            item = this.staticRouteMap.get(path);
            method = item.method;
        }
        else {
            for (let i = 0; i < this.dynaRouteArr.length; i++) {
                item = this.dynaRouteArr[i];
                //路径测试通过
                if (item.reg.test(path)) {
                    method = item.method;
                    if (!method) {
                        let index = item.path.indexOf("*");
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
            let instance = instancefactory_1.InstanceFactory.getInstance(item.instanceName);
            if (instance && typeof instance[method] === 'function') {
                return { instance: instance, method: method, results: item.results };
            }
        }
        return null;
    }
    /**
     * 处理路径
     * @param pathOrRoute   路径或路由参数
     * @param params        调用参数
     * @param req           httprequest
     * @param res           response
     */
    static handleRoute(pathOrRoute, params, req, res) {
        let route;
        if (typeof pathOrRoute === 'string') {
            route = this.getRoute(pathOrRoute);
        }
        else {
            route = pathOrRoute;
        }
        //设置request
        if (typeof route.instance.setRequest === 'function') {
            route.instance.setRequest(req);
        }
        //设置response
        if (typeof route.instance.setResponse === 'function') {
            route.instance.setResponse(res);
        }
        //设置model
        if (typeof route.instance.setModel === 'function') {
            route.instance.setModel(params);
        }
        let func = route.instance[route.method];
        if (typeof func !== 'function') {
            throw new errorfactory_1.NoomiError("1010");
        }
        try {
            let re = func.call(route.instance, params);
            if (application_1.App.util.types.isPromise(re)) { //返回promise
                re.then((data) => {
                    this.handleResult(res, data, route.instance, route.results);
                }).catch((e) => {
                    this.handleException(res, e);
                });
            }
            else { //直接返回
                this.handleResult(res, re, route.instance, route.results);
            }
        }
        catch (e) {
            this.handleException(res, e);
        }
    }
    /**
     * 处理结果
     * @param res       response
     * @param data      返回值
     * @param instance  路由对应实例
     * @param results   route结果数组
     */
    static handleResult(res, data, instance, results) {
        if (results && results.length > 0) {
            //单个结果，不判断返回值
            if (results.length === 1) {
                this.handleOneResult(res, results[0], data, instance);
                return;
            }
            else {
                let r;
                for (r of results) {
                    //result不带value，或找到返回值匹配，则处理
                    if (r.value === undefined || data && data == r.value) {
                        this.handleOneResult(res, r, data, instance);
                        return;
                    }
                }
            }
        }
        //默认回写json
        this.handleOneResult(res, {}, data);
    }
    /**
     * 处理一个结果
     * @param res           response
     * @param result        route result
     * @param data          数据
     * @param instance      实例
     */
    static handleOneResult(res, result, data, instance) {
        let url;
        switch (result.type) {
            case "redirect": //重定向
                url = handleParamUrl(instance, result.url);
                let pa = [];
                //参数属性
                if (result.params && Array.isArray(result.params) && result.params.length > 0) {
                    for (let pn of result.params) {
                        let v = getValue(instance, pn);
                        if (v !== undefined) {
                            pa.push(pn + '=' + v);
                        }
                    }
                }
                let pas = pa.join('&');
                if (pas !== '') {
                    if (url.indexOf('?') === -1) {
                        url += '?' + pas;
                    }
                    else {
                        url += '&' + pas;
                    }
                }
                res.redirect(url);
                return;
            case "chain": //路由器链
                url = handleParamUrl(instance, result.url);
                let url1 = application_1.App.url.parse(url).pathname;
                let params = application_1.App.qs.parse(application_1.App.url.parse(url).query);
                //参数处理
                if (result.params && Array.isArray(result.params) && result.params.length > 0) {
                    for (let pn of result.params) {
                        let v = getValue(instance, pn);
                        if (v !== undefined) {
                            params[pn] = v;
                        }
                    }
                }
                const route = this.getRoute(url1);
                if (route !== null) {
                    //调用
                    try {
                        let re = route.instance[route.method](params);
                        if (application_1.App.util.types.isPromise(re)) {
                            re.then(data => {
                                this.handleResult(res, data, route.instance, route.results);
                            }).catch(e => {
                                this.handleException(res, e);
                            });
                        }
                        else {
                            this.handleResult(res, re, route.instance, route.results);
                        }
                    }
                    catch (e) {
                        this.handleException(res, e);
                    }
                }
                return;
            case "none": //什么都不做
                break;
            default: //json
                res.writeToClient({
                    data: data,
                    type: 'application/json'
                });
        }
        /**
         * 处理带参数的url
         * @param url   源url，以${propName}出现
         * @return      处理后的url
         */
        function handleParamUrl(instance, url) {
            let reg = /\$\{.*?\}/g;
            let r;
            //处理带参数url
            while ((r = reg.exec(url)) !== null) {
                let pn = r[0].substring(2, r[0].length - 1);
                url = url.replace(r[0], getValue(instance, pn));
            }
            return url;
        }
        /**
         * 获取属性值
         * @param instance  实例
         * @param pn        属性名
         * @return          属性值
         */
        function getValue(instance, pn) {
            if (instance[pn] !== undefined) {
                return instance[pn];
            }
            else if (instance.model && instance.model[pn] !== undefined) {
                return instance.model[pn];
            }
        }
    }
    /**
     * 处理异常信息
     * @param res   response
     * @param e     异常
     */
    static handleException(res, e) {
        let msg = e;
        res.writeToClient({
            data: "<h1>" + new errorfactory_1.NoomiError('2102') + "</h1><h3>Error Message:" + msg + "</h3>"
        });
    }
    /**
     * 初始化
     * @param config
     * @param ns        命名空间（上级路由路径）
     */
    static init(config, ns) {
        let ns1 = config.namespace ? config.namespace.trim() : '';
        //设置命名空间，如果是子文件，需要连接上级文件
        ns = ns ? application_1.App.path.posix.join(ns, ns1) : ns1;
        //处理本级路由
        if (Array.isArray(config.routes)) {
            config.routes.forEach((item) => {
                //增加namespce前缀
                let p = application_1.App.path.posix.join(ns, item.path);
                this.addRoute(p, item.instance_name, item.method, item.results);
            });
        }
        //处理子路径路由
        if (Array.isArray(config.files)) {
            config.files.forEach((item) => {
                this.parseFile(application_1.App.path.posix.join(application_1.App.configPath, item), ns);
            });
        }
    }
    /**
     * 解析路由文件
     * @param path  文件路径
     * @param ns    命名空间，默认 /
     */
    static parseFile(path, ns) {
        //读取文件
        let json = null;
        try {
            let jsonStr = application_1.App.fs.readFileSync(application_1.App.path.posix.join(process.cwd(), path), 'utf-8');
            json = application_1.App.JSON.parse(jsonStr);
        }
        catch (e) {
            throw new errorfactory_1.NoomiError("2100") + '\n' + e;
        }
        this.init(json, ns);
    }
}
exports.RouteFactory = RouteFactory;
//带通配符的路由
RouteFactory.dynaRouteArr = new Array();
//不带通配符的路由
RouteFactory.staticRouteMap = new Map();
//# sourceMappingURL=routefactory.js.map