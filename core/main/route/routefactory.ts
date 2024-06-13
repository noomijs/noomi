import {InstanceFactory} from "../instancefactory";
import {HttpRequest} from "../../web/httprequest";
import {HttpResponse} from "../../web/httpresponse";
import {NoomiError} from "../../tools/noomierror";
import {Util} from "../../tools/util";
import {App} from "../../tools/application";
import { ERouteResultType, RouteInst, RouteConfig, RouteClassCfg, RouteResultOption } from "../../types/routetypes";
import { UnknownClass } from "../../types/other";
import { BaseRoute } from "./baseroute";
import { WebCacheItem } from "../../types/webtypes";

/**
 * 路由工厂类
 * @remarks
 * 管理所有路由对象，进行路由处理
 */
export class RouteFactory {
    /**
     * 路由集合
     * key: 路由路径
     */
    static routeMap: Map<string, RouteConfig> = new Map();
    /**
     * 注册路由map
     * @remarks
     * 由于`@Route和@Router`的执行顺序问题，为避免路由重复添加，初始化结束后统一处理
     * 
     * key: 类
     * 
     * value: RouterClass配置
     */
    private static registRouteMap: Map<unknown, RouteClassCfg> = new Map();

    /**
     * 注册路由
     * @param cfg -   路由配置
     */
    public static registRoute(cfg: RouteConfig) {
        if (!InstanceFactory.hasClass(cfg.clazz)) {
            InstanceFactory.addInstance(cfg.clazz, false);
        }
        if (!this.registRouteMap.has(cfg.clazz)) {
            this.registRouteMap.set(cfg.clazz, {
                paths: []
            })
        }
        const obj = this.registRouteMap.get(cfg.clazz);
        // 保存namespace
        obj.namespace = cfg.namespace;
        if (!cfg.path) {
            return;
        }
        if (cfg.batch) { // router装饰器
            //只针对通配符进行处理，非通配符不进行匹配
            if (cfg.path.indexOf('*') !== -1) {
                const reg = Util.toReg(cfg.path, 3);
                for (const o of Object.getOwnPropertyNames((<UnknownClass>cfg.clazz).prototype)) {
                    //构造器，非方法，已注册的方法 不再处理
                    if (o === 'constructor' || 
                        typeof (<UnknownClass>cfg.clazz).prototype[o] !== 'function' || 
                        obj.paths.find(item => item.method === o)) {
                        continue;
                    }
                    if (reg.test(o)) {
                        obj.paths.push({path: o, method: o});
                    }
                }
            }
        } else { //route装饰器
            obj.paths.push({path: cfg.path, method: cfg.method.trim(), results: cfg.results});
        }
    }

    /**
     * 处理注册的路由
     * @remarks
     * 把所有注册的路由添加到路由工厂
     */
    public static handleRegistedRouters() {
        for (const r of this.registRouteMap) {
            if (!InstanceFactory.hasClass(r[0])) {
                InstanceFactory.addInstance(r[0], false);
            }
            const cfg = r[1];
            const ns = cfg.namespace || '';
            for (const p of cfg.paths) {
                this.addRoute(Util.getUrlPath([ns, p.path]), r[0], p.method, p.results);
            }
        }
        // 清空regist map
        this.registRouteMap.clear();
    }

    /**
     * 添加路由
     * @param path -          路由路径，支持通配符*，需要method支持
     * @param clazz -         对应类
     * @param methodName -    方法名
     * @param results -       路由处理结果集
     */
    private static addRoute(path: string, clazz: unknown, methodName: string, results?: Array<RouteResultOption>) {
        // 已存在则不再添加（因为通配符在非通配符后面）
        if (this.routeMap.has(path)) {
            return;
        }
        if (results && results.length > 0) {
            for (const r of results) {
                if ((r.type === ERouteResultType.CHAIN || r.type === ERouteResultType.REDIRECT)
                    && (!r.url || typeof r.url !== 'string' || (r.url = r.url.trim()) === '')) {
                    throw new NoomiError("2101");
                }
            }
        }
        this.routeMap.set(path, {
            clazz: clazz,
            method: methodName,
            results: results
        });
    }

    /**
     * 根据路径获取路由对象
     * @param path -    url路径
     * @returns         路由对象
     */
    public static getRoute(path: string): RouteInst {
        let item: RouteConfig;
        let method: string; // 方法名
        // 下查找非通配符map
        if (this.routeMap.has(path)) {
            item = this.routeMap.get(path);
            method = item.method;
        }
        // 找到匹配的则返回
        if (item && method) {
            const instance = InstanceFactory.getInstance(item.clazz);
            if (instance && typeof instance[method] === 'function') {
                return {instance: <BaseRoute>instance, method: method, results: item.results};
            }
        }
        return null;
    }

    /**
     * 路由方法执行
     * @param route -       路由
     * @param req -         request 对象
     * @param res -         response 对象
     * @param params -      调用参数对象
     * @returns             路由执行结果
     */
    public static async handleRoute(route: RouteInst, req: HttpRequest, res: HttpResponse, params?: object): Promise<unknown> {
        //绑定path, 没有必要
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
        //初始化参数
        if (!params) {
            params = await req.init();
        }
        //设置model
        if (typeof route.instance.setModel === 'function') {
            route.instance.setModel(params || {}, route.method);
        }
        //实际调用方法
        const func = route.instance[route.method];
        if (typeof func !== 'function') {
            throw new NoomiError("1010");
        }
        const re = await func.call(route.instance, params);
        if (re === ERouteResultType.REDIRECT) {
            return re;
        }
        return await this.handleResult(route, re);
    }

    /**
     * 处理路由结果
     * @param route -   route对象
     * @param data -    路由对应方法的返回值
     * @returns         处理后的结果
     */
    public static async handleResult(route: RouteInst, data: object|string): Promise<unknown> {
        const results = route.results;
        if (results && results.length > 0) {
            // 单个结果，不判断返回值
            if (results.length === 1) {
                return await this.handleOneResult(route, results[0], data);
            } else {
                let r: RouteResultOption;
                for (r of results) {
                    // result不带value，或找到返回值匹配，则处理
                    if (r.value === undefined || data && data == r.value) {
                        return await this.handleOneResult(route, r, data);
                    }
                }
            }
        }
        // 默认回写json
        return await this.handleOneResult(route, {}, data);
    }

    /**
     * 处理一个路由结果
     * @param route -       route对象
     * @param result -      route result
     * @param data -        路由执行结果
     * @returns             cache数据对象或0
     */
    private static async handleOneResult(route: RouteInst, result: RouteResultOption, data: object|string): Promise<unknown> {
        let url: string;
        const instance = route.instance;
        const res: HttpResponse = route.instance['response'];
        // 返回值
        let ret: WebCacheItem | number = 0;
        switch (result.type) {
            case ERouteResultType.REDIRECT: // 重定向
                url = handleParamUrl(instance, result.url);
                const pa = [];
                // 参数属性
                if (result.params && Array.isArray(result.params) && result.params.length > 0) {
                    for (const pn of result.params) {
                        const v = getValue(instance, pn);
                        if (v !== undefined) {
                            pa.push(pn + '=' + v);
                        }
                    }
                }
                const pas: string = pa.join('&');
                if (pas !== '') {
                    if (url.indexOf('?') === -1) {
                        url += '?' + pas;
                    } else {
                        url += '&' + pas;
                    }
                }
                return res.redirect(url);
            case ERouteResultType.CHAIN: // 路由器链
                url = handleParamUrl(instance, result.url);
                const url1 = App.url.parse(url).pathname;
                const params = App.qs.parse(App.url.parse(url).query);
                // 参数处理
                if (result.params && Array.isArray(result.params) && result.params.length > 0) {
                    for (const pn of result.params) {
                        const v = getValue(instance, pn);
                        if (v !== undefined) {
                            params[pn] = v;
                        }
                    }
                }
                const route1 = this.getRoute(url1);
                if (route1 === null) {
                    throw new NoomiError("2103", url1);
                }
                // 设置route path
                route1.path = url1;
                return await this.handleRoute(route1, route.instance['request'], res, params);
            case ERouteResultType.NONE:    // 什么都不做
                break;
            case ERouteResultType.STREAM:  // 文件流
                // 文件名
                const pn: string = result.params[0];
                if (pn) {
                    let fn: string = <string>getValue(instance, pn);
                    if (fn) {
                        fn = Util.getAbsPath([fn]);
                        if (!App.fs.existsSync(fn)) {
                            throw new NoomiError('0050');
                        }
                        res.writeFileToClient({
                            data: fn
                        });
                    }
                }
                break;
            default: // json
                let mimeType: string;
                // 处理json对象
                if (typeof data === 'object') {
                    // data = JSON.stringify(data);
                    mimeType = 'application/json';
                } else {
                    mimeType = 'text/plain';
                }
                ret = {
                    data:<string>data, // 如果无数据，则返回''
                    mimeType: mimeType
                };
        }
        return ret;

        /**
         * 处理带参数的url，参数放在`{}`中
         * @param instance -  路由实例
         * @param url -       源url，以`${propName}`格式出现
         * @returns         处理后的url
         */
        function handleParamUrl(instance: unknown, url: string): string {
            const reg: RegExp = /\$\{.*?\}/g;
            let r: RegExpExecArray;
            // 处理带参数url
            while ((r = reg.exec(url)) !== null) {
                const pn = r[0].substring(2, r[0].length - 1);
                url = url.replace(r[0], <string>getValue(<object>instance, pn));
            }
            return url;
        }

        /**
         * 获取属性值
         * @param instance -    实例
         * @param pn -          属性名
         * @returns             属性值
         */
        function getValue(instance: unknown, pn: string): unknown {
            if (instance[pn] !== undefined) {
                return instance[pn];
            } else if (instance['model'] && instance['model'][pn] !== undefined) {
                return instance['model'][pn];
            }
        }
    }
}
