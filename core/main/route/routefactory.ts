import {InstanceFactory} from "../instancefactory";
import { HttpRequest } from "../../web/httprequest";
import { HttpResponse } from "../../web/httpresponse";
import { NoomiError } from "../../tools/errorfactory";
import { Util } from "../../tools/util";
import { App } from "../../tools/application";
import { IWebCacheObj } from "../../web/webcache";


/**
 * 路由类配置
 */
interface IRouteClassCfg{
    /**
     * 命名空间
     */
    namespace?:string;

    /**
     * 路径数组，数组元素为 {path:路径,method:方法名}
     */
    paths?:any[];
}
/**
 * 路由配置类型
 */
interface IRouteCfg{
    /**
     * 路由路径
     */
    path?:string;

    /**
     * 命名空间
     */
    namespace?:string;

    /**
     * 路由类
     */
    clazz?:any;
    
    /**
     * 路由正则表达式
     */
    reg?:RegExp;
    
    /**
     * 该路由对应的方法名
     */
    method?:string;
    /**
     * 路由执行结果数组
     */
    results?:Array<IRouteResult>;
}

/**
 * 路由结果类型
 * @since 0.0.6
 */
enum ERouteResultType{
    /**
     * 重定向
     */
    REDIRECT='redirect',
    /**
     * 路由链,和redirect不同，浏览器地址不会改变
     */
    CHAIN='chain',  
    /**
     * 文件流，主要用于文件下载
     */    
    STREAM='stream',
    /**
     * 什么都不做
     */
    NONE='none', 
    /**
     * json数据,默认类型
     */
    JSON='json'  
}

/**
 * 路由结果类型
 */
interface IRouteResult{
    /**
     * 结果类型
     */
    type?:ERouteResultType;
    /**
     * 返回值，当返回值与value一致时，将执行此结果
     */
    value?:any;
    /**
     * 路径，type 为redirect 和 url时，必须设置
     */
    url?:string;
    /**
     * 参数名数组，当type为chain时，从当前路由对应类中获取参数数组对应的属性值并以参数对象传递到下一个路由
     */
    params?:Array<string>
}
/**
 * 路由对象
 */
interface IRoute{
    /**
     * 路由对应实例
     */
    instance:any; 
    /**
     * 路由对应方法名
     */
    method:string;
    /**
     * 路由处理结果集
     */
    results?:Array<IRouteResult>;
    /**
     * route 实例对应url路径
     * @since 0.4.7
     */
    path?:string;

    /**
     * 参数对象
     * @since 0.4.7
     */
    params?:object;
}

/**
 * 路由工厂类
 * 用于管理所有路由对象
 */
class RouteFactory{
    /**
     * 路由集合
     * key: 路由路径
     */
    static routeMap:Map<string,IRouteCfg> = new Map();
    
    /**
     * 注册路由map，添加到实例工厂时统一处理
     * key: 类
     */
    private static registRouteMap:Map<any,IRouteClassCfg> = new Map();


    /**
     * 注册路由
     * @param cfg   路由配置 
     */
    public static registRoute(cfg:IRouteCfg){
        if(!InstanceFactory.hasClass(cfg.clazz)){
            InstanceFactory.addInstance(cfg.clazz,{
                singleton:false
            });
        }
        if(!this.registRouteMap.has(cfg.clazz)){
            this.registRouteMap.set(cfg.clazz,{
                paths:[]
            })
        }
        let obj = this.registRouteMap.get(cfg.clazz);
        
        if(!cfg.path){
            return;
        }

        if(cfg.namespace){ // router装饰器
            obj.namespace = cfg.namespace;
            if(cfg.path.indexOf('*') !== -1){
                let reg = Util.toReg(cfg.path,3);
                for(let o of Object.getOwnPropertyNames(cfg.clazz.prototype)){
                    if(o === 'constructor' || typeof  cfg.clazz.prototype[o] !== 'function' || obj.paths.find(item=>item.method === o)){
                        continue;
                    }
                    if(reg.test(o)){
                        obj.paths.push({path:o,method:o});
                    }
                }
            }
        }else{
            obj.paths.push({path:cfg.path,method:cfg.method,results:cfg.results});
        }
    }

    /**
     * 添加路由类
     * @param clazz     类
     * @param params    路由参数
     */
    public static addRouter(clazz:any){
        if(!InstanceFactory.hasClass(clazz)){
            InstanceFactory.addInstance(clazz,{
                singleton:false
            });
        }
        const cfg = this.registRouteMap.get(clazz);
        // const cfg = this.registRouteMap.get(clazz.name);
        for(let p of cfg.paths){
            this.addRoute(Util.getUrlPath([cfg.namespace||'',p.path]),clazz,p.method,p.results);
        }
        //删除已处理的class
        this.registRouteMap.delete(clazz);
    }
    /**
     * 添加路由
     * @param path          路由路径，支持通配符*，需要method支持
     * @param clazz         对应类
     * @param method        方法，path中包含*，则不设置
     * @param results       路由处理结果集
     */
    private static addRoute(path:string,clazz:any,method?:string,results?:Array<IRouteResult>){
        //已存在则不再添加（因为通配符在非通配符后面）
        if(this.routeMap.has(path)){
            return;
        }
        if(results && results.length>0){
            for(let r of results){
                if((r.type === ERouteResultType.CHAIN || r.type === ERouteResultType.REDIRECT) 
                    && (!r.url || typeof r.url !=='string' || (r.url = r.url.trim())=== '')){
                    throw new NoomiError("2101");
                }
            }
        }
        if(method){
            method = method.trim();
        }
        this.routeMap.set(path,{
            clazz:clazz,
            method:method,
            results:results
        });
    }

    /**
     * 根据路径获取路由对象
     * @param path      url路径
     * @returns         路由对象 
     */
    public static getRoute(path:string):IRoute{
        let item:IRouteCfg;
        let method:string; //方法名
        //下查找非通配符map
        if(this.routeMap.has(path)){
            item = this.routeMap.get(path);
            method = item.method;
        }
        //找到匹配的则返回
        if(item && method){
            let instance = InstanceFactory.getInstance(item.clazz);
            // let instance = InstanceFactory.getInstance(item);
            if(instance && typeof instance[method] === 'function'){
                return {instance:instance,method:method,results:item.results};
            }    
        }
        return null;
    }
    
    /**
     * 路由方法执行
     * @param pathOrRoute   路径或路由
     * @param req           request 对象
     * @param res           response 对象
     * @param params        调用参数对象
     * @returns             0 正常 1异常
     */
    public static async handleRoute(route:IRoute,req:HttpRequest,res:HttpResponse,params?:object):Promise<number|IWebCacheObj|string>{
        //绑定path
        if(!route.path && req){
            route.path = req.url;
        }

        //设置request
        if(typeof route.instance.setRequest === 'function'){
            route.instance.setRequest(req);
        }

        //设置response
        if(typeof route.instance.setResponse === 'function'){
            route.instance.setResponse(res);
        }

        //初始化参数
        if(!params){
            params = await req.init();
        }
        
        //设置model
        if(typeof route.instance.setModel === 'function'){
            route.instance.setModel(params||{},route.method);
        }
        
        //实际调用方法
        let func = route.instance[route.method]; 
        if(typeof func !== 'function'){
            throw new NoomiError("1010");
        }
        
        let re = await func.call(route.instance,route.instance||params);
        if(re === ERouteResultType.REDIRECT) {
            return re;
        }
        return await this.handleResult(route,re);
    }

    /**
     * 处理路由结果
     * @param route     route对象
     * @param data      路由对应方法返回值
     */
    public static async handleResult(route:IRoute,data:any):Promise<number|IWebCacheObj|string>{
        const results = route.results;
        if(results && results.length > 0){
            //单个结果，不判断返回值
            if(results.length === 1){
                return await this.handleOneResult(route,results[0],data);
            }else{
                let r:IRouteResult;
                for(r of results){
                    //result不带value，或找到返回值匹配，则处理
                    if(r.value === undefined || data && data == r.value){
                        return await this.handleOneResult(route,r,data);
                    }
                }
            }
        }
        //默认回写json
        return await this.handleOneResult(route,{},data);
    }

    /**
     * 处理一个路由结果
     * @param route         route对象
     * @param result        route result
     * @param data          路由执行结果
     * @returns             cache数据对象或0
     */
    public static async handleOneResult(route:IRoute,result:IRouteResult,data:any):Promise<IWebCacheObj|number|string>{
        let url:string;
        const instance = route.instance;
        const res:HttpResponse = route.instance.response;
        //返回值
        let ret:IWebCacheObj|number = 0;
        switch(result.type){
            case ERouteResultType.REDIRECT: //重定向
                url = handleParamUrl(instance,result.url);
                let pa = [];
                //参数属性
                if(result.params && Array.isArray(result.params) && result.params.length>0){
                    for(let pn of result.params){
                        let v = getValue(instance,pn);
                        if(v !== undefined){
                            pa.push(pn+'=' + v);
                        }
                    }
                }
                let pas:string = pa.join('&');
                if(pas !== ''){
                    if(url.indexOf('?') === -1){
                        url += '?' + pas;
                    }else{
                        url += '&' + pas;
                    }
                }
                return res.redirect(url);
            case ERouteResultType.CHAIN: //路由器链
                url = handleParamUrl(instance,result.url);
                let url1 = App.url.parse(url).pathname;
                let params = App.qs.parse(App.url.parse(url).query);
                //参数处理
                if(result.params && Array.isArray(result.params) && result.params.length>0){
                    for(let pn of result.params){
                        let v = getValue(instance,pn);
                        if(v !== undefined){
                            params[pn] = v;
                        }
                    }
                }
                let route1 = this.getRoute(url1);
                if(route1 === null){
                    throw new NoomiError("2103",url1);
                }
                //设置route path
                route1.path = url1;
                return await this.handleRoute(route1,route.instance.request,res,params);
            case ERouteResultType.NONE:    //什么都不做
                break;
            case ERouteResultType.STREAM:  //文件流
                //文件名
                let pn:string = result.params[0];
                if(pn){
                    let fn:string = getValue(instance,pn);
                    if(fn){
                        fn = Util.getAbsPath([fn]);
                        if(!App.fs.existsSync(fn)){
                            throw new NoomiError('0050');
                        }
                        res.writeFileToClient({
                            data:fn
                        });
                    }
                }
                break;
            default: //json
                let mimeType:string;
                //处理json对象
                if(typeof data === 'object'){
                    data = JSON.stringify(data);
                    mimeType = 'application/json';
                }else{
                    mimeType = 'text/plain';
                }
                ret = {
                    data:data, //如果无数据，则返回''
                    mimeType:mimeType
                };
        }
        return ret;
        
        /**
         * 处理带参数的url，参数放在{}中
         * @param url   源url，以${propName}出现
         * @returns     处理后的url
         */
        function handleParamUrl(instance:any,url:string):string{
            let reg:RegExp = /\$\{.*?\}/g;
            let r:RegExpExecArray;
            //处理带参数url
            while((r=reg.exec(url)) !== null){
                let pn = r[0].substring(2,r[0].length-1);
                url = url.replace(r[0],getValue(instance,pn));
            }
            return url;
        }

        /**
         * 获取属性值
         * @param instance  实例 
         * @param pn        属性名
         * @returns         属性值
         */
        function getValue(instance:any,pn:string):any{
            if(instance[pn] !== undefined){
                return instance[pn];
            }else if(instance.model && instance.model[pn] !== undefined){
                return instance.model[pn];
            }
        }
    }

    /**
     * 处理异常信息
     * @param res   response 对象
     * @param e     异常
     * @deprecated  1.0.0
     */
    static handleException(res:HttpResponse,e:any){}

    /**
     * 初始化路由工厂
     * @param config    配置文件
     * @param ns        命名空间（上级路由路径） 
     */
    // static init(config:any,ns?:string){
    //     let ns1:string = config.namespace? config.namespace.trim():undefined;
    //     if(ns1){
    //         if(ns){
    //             ns = Util.getUrlPath([ns,ns1]);
    //         }else{
    //             ns = Util.getUrlPath([ns1])
    //         }
    //     }
    //     if(!ns){
    //         ns = '';
    //     }
    //     //处理本级路由
    //     if(Array.isArray(config.routes)){
    //         config.routes.forEach((item)=>{
    //             //增加namespce前缀
    //             let p = Util.getUrlPath([ns,item.path]);
    //             this.addRoute(p,item.instance_name,item.method,item.results);
    //         });
    //     }

    //     //处理子路径路由
    //     if(Array.isArray(config.files)){
    //         config.files.forEach((item)=>{
    //             const p = Util.getAbsPath([App.configPath, item]);
    //             this.parseFile(p,ns);
    //         });
    //     }
    // }
    // /**
    //  * 解析路由文件
    //  * @param path  文件路径
    //  * @param ns    命名空间，默认 /
    //  */
    // static parseFile(path:string,ns?:string){
    //     interface RouteJSON{
    //         namespace:string;           //命名空间
    //         route_error_handler:string; //路由异常处理器
    //         files:Array<string>;        //引入文件
    //         routes:Array<any>;          //实例配置数组
    //     }
        
    //     //读取文件
    //     let json:RouteJSON = null;
    //     try{
    //         let jsonStr:string = App.fs.readFileSync(path,'utf-8');
    //         json = App.JSON.parse(jsonStr);
    //     }catch(e){
    //         throw new NoomiError("2100") +'\n' + e;
    //     }
    //     this.init(json,ns);
    // }
}

export {RouteFactory,IRoute,IRouteCfg,IRouteResult,ERouteResultType};

