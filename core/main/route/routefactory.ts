import {InstanceFactory} from "../instancefactory";
import { HttpRequest } from "../../web/httprequest";
import { HttpResponse } from "../../web/httpresponse";
import { NoomiError } from "../../tools/errorfactory";
import { Util } from "../../tools/util";
import { App } from "../../tools/application";

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
     * 添加路由
     * @param path      路由路径，支持通配符*，需要method支持
     * @param clazz     对应类
     * @param method    方法，path中包含*，则不设置
     * @param results   路由处理结果集
     */
    static addRoute(path:string,clazz:string,method?:string,results?:Array<IRouteResult>){
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
            let reg = Util.toReg(path,3);
            this.dynaRouteArr.push({
                path:path,
                reg:Util.toReg(path,3),
                instanceName:clazz.trim(),
                method:method,
                results:results
            });
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
     * @param params        调用参数对象
     * @param req           request 对象
     * @param res           response 对象
     * @returns             错误码或0
     */
    static handleRoute(pathOrRoute:string|IRoute,params:object,req:HttpRequest,res:HttpResponse):number{
        let route:IRoute;
        if(typeof pathOrRoute === 'string'){
            route = this.getRoute(pathOrRoute);
        }else{
            route = pathOrRoute;
        }

        if(!route){
            return 404;
        }
        
        //设置request
        if(typeof route.instance.setRequest === 'function'){
            route.instance.setRequest(req);
        }

        //设置response
        if(typeof route.instance.setResponse === 'function'){
            route.instance.setResponse(res);
        }

        //设置model
        if(typeof route.instance.setModel === 'function'){
            route.instance.setModel(params);
        }

        let func = route.instance[route.method]; 
        if(typeof func !== 'function'){
            throw new NoomiError("1010");
        }
        
        try{
            let re = func.call(route.instance,params);
            if(App.util.types.isPromise(re)){  //返回promise
                re.then((data)=>{
                    this.handleResult(res,data,route.instance,route.results);
                }).catch((e)=>{
                    this.handleException(res,e);
                });
            }else{      //直接返回
                this.handleResult(res,re,route.instance,route.results);
            }
        }catch(e){
            this.handleException(res,e);
        }
        return 0;
    }

    /**
     * 处理路由结果
     * @param res       response 对象
     * @param data      路由对应方法返回值
     * @param instance  路由对应实例
     * @param results   route结果数组    
     */
    static handleResult(res:HttpResponse,data:any,instance:any,results:Array<IRouteResult>):void{
        if(results && results.length > 0){
            //单个结果，不判断返回值
            if(results.length === 1){
                this.handleOneResult(res,results[0],data,instance);
                return;
            }else{
                let r:IRouteResult;
                for(r of results){
                    //result不带value，或找到返回值匹配，则处理
                    if(r.value === undefined || data && data == r.value){
                        this.handleOneResult(res,r,data,instance);
                        return;
                    }
                }
            }
        }
        //默认回写json
        this.handleOneResult(res,{},data);
    }

    /**
     * 处理一个路由结果
     * @param res           response 对象
     * @param result        route result
     * @param data          路由执行结果
     * @param instance      路由实例
     */
    static handleOneResult(res:HttpResponse,result:IRouteResult,data:any,instance?:any):void{
        let url:string;
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
                return;
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
                const route = this.getRoute(url1);
                if(route !== null){
                    //调用
                    try{
                        let re = route.instance[route.method](params);
                        if(App.util.types.isPromise(re)){
                            re.then(data=>{
                                this.handleResult(res,data,route.instance,route.results);
                            }).catch(e=>{
                                this.handleException(res,e);
                            });
                        }else{
                            this.handleResult(res,re,route.instance,route.results);
                        }
                    }catch(e){
                        this.handleException(res,e);
                    }
                }
                return;
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
                return;
            default: //json
                res.writeToClient({
                    data:data
                });
        }
        
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
        let msg = e;
        res.writeToClient({
            data:"<h1>" +  new NoomiError('2102') + "</h1><h3>Error Message:" + msg + "</h3>"
        });
    }

    /**
     * 初始化路由工厂
     * @param config    配置文件
     * @param ns        命名空间（上级路由路径） 
     */
    static init(config:any,ns?:string){
        let ns1 = config.namespace? config.namespace.trim():'';
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
            namespace:string;       //命名空间
            files:Array<string>;    //引入文件
            routes:Array<any>;      //实例配置数组
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

