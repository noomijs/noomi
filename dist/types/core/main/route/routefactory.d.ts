import { HttpRequest } from "../../web/httprequest";
import { HttpResponse } from "../../web/httpresponse";
/**
 * route 管理
 */
interface RouteCfg {
    path?: string;
    reg?: RegExp;
    instanceName: string;
    method?: string;
    results?: Array<RouteResult>;
}
/**
 * route 结果
 */
interface RouteResult {
    type?: string;
    value?: any;
    url?: string;
    params?: Array<string>;
}
/**
 * 路由对象
 */
interface Route {
    instance: any;
    method: string;
    results?: Array<RouteResult>;
}
declare class RouteFactory {
    static dynaRouteArr: RouteCfg[];
    static staticRouteMap: Map<string, RouteCfg>;
    /**
     * 添加路由
     * @param path      路由路径，支持通配符*，需要method支持
     * @param clazz     对应类
     * @param method    方法，path中包含*，则不设置
     */
    static addRoute(path: string, clazz: string, method?: string, results?: Array<RouteResult>): void;
    /**
     * 根据路径获取路由
     * @param path      url path
     * @return          {instance:**,method:**,results?:**}
     */
    static getRoute(path: string): Route;
    /**
     * 处理路径
     * @param pathOrRoute   路径或路由参数
     * @param params        调用参数
     * @param req           httprequest
     * @param res           response
     */
    static handleRoute(pathOrRoute: any, params: object, req: HttpRequest, res: HttpResponse): void;
    /**
     * 处理结果
     * @param res       response
     * @param data      返回值
     * @param instance  路由对应实例
     * @param results   route结果数组
     */
    static handleResult(res: HttpResponse, data: any, instance: any, results: Array<RouteResult>): void;
    /**
     * 处理一个结果
     * @param res           response
     * @param result        route result
     * @param data          数据
     * @param instance      实例
     */
    static handleOneResult(res: HttpResponse, result: RouteResult, data: any, instance?: any): void;
    /**
     * 处理异常信息
     * @param res   response
     * @param e     异常
     */
    static handleException(res: HttpResponse, e: any): void;
    /**
     * 初始化
     * @param config
     * @param ns        命名空间（上级路由路径）
     */
    static init(config: any, ns?: string): void;
    /**
     * 解析路由文件
     * @param path  文件路径
     * @param ns    命名空间，默认 /
     */
    static parseFile(path: string, ns?: string): void;
}
export { RouteFactory };
