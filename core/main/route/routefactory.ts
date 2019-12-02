import {InstanceFactory} from "../instancefactory";
import { HttpRequest } from "../../web/httprequest";
import { HttpResponse } from "../../web/httpresponse";
import { NoomiError } from "../../tools/errorfactory";
import { Util } from "../../tools/util";
import { App } from "../../tools/application";

/**
 * route 管理
 */
interface RouteCfg{
    path?:string;
    reg?:RegExp;
    instanceName:string;
    method?:string;
    results?:Array<RouteResult>;
}

/**
 * route 结果
 */
interface RouteResult{
    type?:string;           //类型 redirect重定向，chain路由链（和redirect不同，url不变），json ajax json数据，默认json
    value?:any;             //返回值
    url?:string;            //路径，type 为redirect 和 url时，必须设置
    params?:Array<string>   //参数名数组
}
/**
 * 路由对象
 */
interface Route{
    instance:any;                   //实例
    method:string;                  //方法名
    results?:Array<RouteResult>;    //返回结果
}

class RouteFactory{
    //带通配符的路由
    static dynaRouteArr:RouteCfg[] = new Array();
    //不带通配符的路由
    static staticRouteMap:Map<string,RouteCfg> = new Map();
    /**
     * 添加路由
     * @param path      路由路径，支持通配符*，需要method支持
     * @param clazz     对应类
     * @param method    方法，path中包含*，则不设置
     */
    static addRoute(path:string,clazz:string,method?:string,results?:Array<RouteResult>){
        if(results && results.length>0){
            for(let r of results){
                if((r.type === 'chain' || r.type === 'redirect') && (!r.url || typeof r.url !=='string' || (r.url = r.url.trim())=== '')){
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
     * 根据路径获取路由
     * @param path      url path
     * @return          {instance:**,method:**,results?:**}
     */
    static getRoute(path:string):Route{
        let item:RouteCfg;
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
                        let index = item.path.indexOf("*");
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
     * 处理路径
     * @param pathOrRoute   路径或路由参数
     * @param params        调用参数
     * @param req           httprequest
     * @param res           response
     * @return              错误码或0
     */
    static handleRoute(pathOrRoute:any,params:object,req:HttpRequest,res:HttpResponse):number{
        let route:Route;
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
     * 处理结果
     * @param res       response
     * @param data      返回值
     * @param instance  路由对应实例
     * @param results   route结果数组    
     */
    static handleResult(res:HttpResponse,data:any,instance:any,results:Array<RouteResult>):void{
        if(results && results.length > 0){
            //单个结果，不判断返回值
            if(results.length === 1){
                this.handleOneResult(res,results[0],data,instance);
                return;
            }else{
                let r:RouteResult;
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
     * 处理一个结果
     * @param res           response
     * @param result        route result
     * @param data          数据
     * @param instance      实例
     */
    static handleOneResult(res:HttpResponse,result:RouteResult,data:any,instance?:any):void{
        let url:string;
        switch(result.type){
            case "redirect": //重定向
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
            case "chain": //路由器链
                
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
            case "none": //什么都不做
                break;
            default: //json
                res.writeToClient({
                    data:data
                });
        }
        
        /**
         * 处理带参数的url
         * @param url   源url，以${propName}出现
         * @return      处理后的url
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
         * @return          属性值
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
     * @param res   response
     * @param e     异常
     */
    static handleException(res:HttpResponse,e:any){
        let msg = e;
        res.writeToClient({
            data:"<h1>" +  new NoomiError('2102') + "</h1><h3>Error Message:" + msg + "</h3>"
        });
    }

    /**
     * 初始化
     * @param config 
     * @param ns        命名空间（上级路由路径） 
     */
    static init(config:any,ns?:string){
        let ns1 = config.namespace? config.namespace.trim():'';
        //设置命名空间，如果是子文件，需要连接上级文件
        ns = ns?App.path.posix.join(ns,ns1):ns1;
        
        //处理本级路由
        if(Array.isArray(config.routes)){
            config.routes.forEach((item)=>{
                //增加namespce前缀
                let p = App.path.posix.join(ns,item.path);
                this.addRoute(p,item.instance_name,item.method,item.results);
            });
        }

        //处理子路径路由
        if(Array.isArray(config.files)){
            config.files.forEach((item)=>{
                this.parseFile(App.path.posix.join(App.configPath, item),ns);
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
            let jsonStr:string = App.fs.readFileSync(App.path.posix.join(process.cwd(),path),'utf-8');
            json = App.JSON.parse(jsonStr);
        }catch(e){
            throw new NoomiError("2100") +'\n' + e;
        }
        this.init(json,ns);
    }
}

export {RouteFactory};

