import { BaseRoute } from "../main/route/baseroute";

/**
 * 路由类配置
 */
export type RouteClassCfg = {
    /**
     * 命名空间
     */
    namespace?: string;
    /**
     * 路径数组
     */
    paths?: {
        /**
         * 路径
         */
        path:string;
        /**
         * 方法名
         */
        method:string;
        /**
         * 路由结果集
         */
        results?:RouteResultOption[];
    }[];
}

/**
 * 路由配置
 */
export type RouteConfig = {
    /**
     * 路由路径
     */
    path?: string;
    /**
     * 命名空间
     */
    namespace?: string;
    /**
     * 批量定义路由，针对Router装饰器有效
     */
    batch?:boolean;
    /**
     * 路由类
     */
    clazz?: unknown;
    /**
     * 路由正则表达式
     */
    reg?: RegExp;
    /**
     * 该路由对应的方法名
     */
    method?: string;
    /**
     * 路由执行结果数组
     * 如果results未设置或数组长度为0，则type=`json`
     */
    results?: Array<RouteResultOption>;
}

/**
 * 路由结果类型
 */
export enum ERouteResultType {
    /**
     * 重定向
     */
    REDIRECT = 'redirect',
    /**
     * 路由链,和redirect不同的是，浏览器地址不会改变
     */
    CHAIN = 'chain',
    /**
     * 文件流，主要用于文件下载
     */
    STREAM = 'stream',
    /**
     * 什么都不做
     */
    NONE = 'none',
    /**
     * json数据,默认类型
     */
    JSON = 'json'
}

/**
 * 路由结果配置项
 */
export type RouteResultOption = {
    /**
     * 结果类型
     */
    type?: ERouteResultType;
    /**
     * 返回值，当返回值与value一致时，将执行此结果
     */
    value?: unknown;
    /**
     * 方法对应的路由路径
     * @remarks
     * 完整路径=namespace+url，以`/`开头，如:Router装饰器设置的namespace为/user,url为/getinfo,则访问路由为`/user/getinfo`
     * 
     * type 为`redirect`和`chain`时，必须设置
     */
    url?: string;
    /**
     * 参数名数组
     * @remarks
     * 当type为chain时有效，从当前路由对应类中获取参数数组对应的属性值，并以参数对象传递到下一个路由
     */
    params?: Array<string>
}

/**
 * 路由实例
 */
export type RouteInst = {
    /**
     * 路由对应实例
     */
    instance: BaseRoute;
    /**
     * 路由对应方法名
     */
    method: string;
    /**
     * 路由处理结果集
     */
    results?: Array<RouteResultOption>;
    /**
     * route 实例对应url路径
     */
    path?: string;
    /**
     * 参数对象
     */
    params?: object;
}
