import {InstanceFactory} from "../instancefactory";
import { HttpRequest } from "../../web/httprequest";
import { HttpResponse } from "../../web/httpresponse";
import { NoomiError } from "../../tools/errorfactory";
import { Util } from "../../tools/util";
import { App } from "../../tools/application";
import { RouteErrorHandler } from "./routeerrorhandler";
import { IWebCacheObj } from "../../web/webcache";

/**
 * 路由配置类型
 */
interface IRouteCfg{
    /**
     * 路由路径
     */
    path?:string;
    /**
     * 路由正则表达式
     */
    reg?:RegExp;
    /**
     * 该路由对应的实例名
     */
    instanceName:string;
    /**
     * 该路由对应的实例方法
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
     * 动态路由(带通配符)路由集合
     */
    static dynaRouteArr:IRouteCfg[] = new Array();
    /**
     * 静态路由(不带通配符)路由集合
     */
    static staticRouteMap:Map<string,IRouteCfg> = new Map();
    /**
     * 异常处理器实例名
     * @since 0.3.7
     */
    static errorHandler:string;
    /**
     * 添加路由
     * @param path      路由路径，支持通配符*，需要method支持
     * @param clazz     对应类
     * @param method    方法，path中包含*，则不设置
     * @param results   路由处理结果集
     */
    static addRoute(path:string,clazz:string,method?:string,results?:Array<IRouteResult>){
        if(!path || !clazz){
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
        
        //没有通配符
        if(path.indexOf('*') === -1){
            this.staticRouteMap.set(path,{
                instanceName:clazz.trim(),
                method:method,
                results:results
            });
        }else{ //有通配符
            if(!this.dynaRouteArr.find(item=>item.path === path)){
                this.dynaRouteArr.push({
                    path:path,
                    reg:Util.toReg(path,3),
                    instanceName:clazz.trim(),
                    method:method,
                    results:results
                });
            }
        }
    }

    /**
     * 根据路径获取路由对象
     * @param path      url路径
     * @returns         路由对象 
     */
    static getRoute(path:string):IRoute{
        let item:IRouteCfg;
        let method:string; //方法名
        //下查找非通配符map
        if(this.staticRouteMap.has(path)){
            item = this.staticRouteMap.get(path);
            method = item.method;
        }else{
            for(let i=0;i<this.dynaRouteArr.length;i++){
                item = this.dynaRouteArr[i];
                //路径测试通过
                if(item.reg.test(path)){
                    method = item.method;
                    if(!method){
                        let index = item.path.indexOf("(");
                        //通配符处理
                        if(index !== -1){
                            //通配符方法
                            method = path.substr(index);
                        }
                    }
                    break;
                }
            }
        }
        //找到匹配的则返回
        if(item && method){
            let instance = InstanceFactory.getInstance(item.instanceName);
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
    static async handleRoute(route:IRoute,req:HttpRequest,res:HttpResponse,params?:object):Promise<number|IWebCacheObj>{
        //尚未初始化
        if(!this.errorHandler){
            this.init({});
        }
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
            let nullArr;
            if(route.instance.__getNullCheck){ //空属性
                nullArr = route.instance.__getNullCheck(route.method);    
            }
            let r = route.instance.setModel(params,nullArr);
            if(r !== null){  //setmodel异常
                throw r;
            }
        }
        
        //实际调用方法
        let func = route.instance[route.method]; 
        if(typeof func !== 'function'){
            throw new NoomiError("1010");
        }
        
        try{
            let re = await func.call(route.instance,route.instance||params);
            return await this.handleResult(route,re);
        }catch(e){
            throw e;
        }
    }

    /**
     * 处理路由结果
     * @param route     route对象
     * @param data      路由对应方法返回值
     */
    static async handleResult(route:IRoute,data:any):Promise<number|IWebCacheObj>{
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
    static async handleOneResult(route:IRoute,result:IRouteResult,data:any):Promise<IWebCacheObj|number>{
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
                res.redirect(url);
                break;
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
                //处理json对象
                let mimeType:string = 'text/html';
                if(typeof data === 'object'){
                    data = JSON.stringify(data);
                    mimeType = 'application/json';
                }
                ret = {
                    data:data,
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
     */
    static handleException(res:HttpResponse,e:any){
        let eh:RouteErrorHandler = InstanceFactory.getInstance(this.errorHandler);
        if(eh){
            eh.handle(res,e);
        }else{
            res.writeToClient({
                data:e
            });
        }
    }

    /**
     * 初始化路由工厂
     * @param config    配置文件
     * @param ns        命名空间（上级路由路径） 
     */
    static init(config:any,ns?:string){
        //初始化errorHandler
        if(!this.errorHandler){
            if(config.route_error_handler){
                this.errorHandler = config.route_error_handler;
            }else{
                InstanceFactory.addInstance({
                    name:'noomi_route_error_handler',
                    instance:new RouteErrorHandler(),
                    class:RouteErrorHandler
                });
                this.errorHandler = 'noomi_route_error_handler';
            }
        }
        let ns1:string = config.namespace? config.namespace.trim():'';
        //设置命名空间，如果是子文件，需要连接上级文件
        let pa = ns?[ns,ns1]:[ns1]; 
        ns = Util.getAbsPath(pa);
        
        //处理本级路由
        if(Array.isArray(config.routes)){
            config.routes.forEach((item)=>{
                //增加namespce前缀
                let p = Util.getAbsPath([ns,item.path]);
                this.addRoute(p,item.instance_name,item.method,item.results);
            });
        }

        //处理子路径路由
        if(Array.isArray(config.files)){
            config.files.forEach((item)=>{
                this.parseFile(Util.getAbsPath([App.configPath, item]),ns);
            });
        }
    }
    /**
     * 解析路由文件
     * @param path  文件路径
     * @param ns    命名空间，默认 /
     */
    static parseFile(path:string,ns?:string){
        interface RouteJSON{
            namespace:string;           //命名空间
            route_error_handler:string; //路由异常处理器
            files:Array<string>;        //引入文件
            routes:Array<any>;          //实例配置数组
        }
        
        //读取文件
        let json:RouteJSON = null;
        try{
            let jsonStr:string = App.fs.readFileSync(path,'utf-8');
            json = App.JSON.parse(jsonStr);
        }catch(e){
            throw new NoomiError("2100") +'\n' + e;
        }
        this.init(json,ns);
    }
}

export {RouteFactory,IRoute,IRouteCfg,IRouteResult,ERouteResultType};

