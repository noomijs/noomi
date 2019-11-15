import { HttpRequest } from "./httprequest";
import { WebConfig } from "./webconfig";
import { RouteFactory } from "../main/route/routefactory";
import { FilterFactory } from "./filterfactory";
import { StaticResource } from "./staticresource";
import { App } from "../tools/application";

/**
 * request 队列
 */
interface RequestItem{
    req:HttpRequest;        //request
    expire?:number;         //过期时间
}
class RequestQueue{
    static queue:Array<RequestItem> = []; 
    //可以处理标志
    static canHandle:boolean = true;
    /**
     * 加入队列
     * @param req 
     * @param res 
     */
    static add(req:HttpRequest){
        let timeout = WebConfig.get('request_timeout') || 0;
        
        this.queue.push({
            req:req,
            expire:timeout>0?new Date().getTime() + timeout*1000:0
        });
        if(this.canHandle){
            this.handle();
        }
    }

    /**
     * 处理队列
     */
    static handle(){
        //队列轮询
        if(this.queue.length === 0){
            return;
        }
        //cpu超限，延迟1m执行队列
        if(!this.canHandle){
            this.canHandle = true;
            setTimeout(()=>{
                RequestQueue.handle();
            },1000);
            return;
        } 
            
        let item:any = this.queue.shift();
        if(item.expire === 0 || item.expire > new Date().getTime()){
            this.handleOne(item.req);
        }
        this.handle();
    }
    
    /**
     * 资源访问
     * @param request   request
     * @param path      url路径
     */
    
    static handleOne(request:HttpRequest){
        let path = App.url.parse(request.url).pathname;
        if(path === ''){
            return;
        }
        //获得路由，可能没有，则归属于静态资源
        let route = RouteFactory.getRoute(path);
        //路由资源
        if(route !== null){
            //参数
            request.init().then((params)=>{
                //过滤器执行
                FilterFactory.doChain(request.url,request,request.response).then((r)=>{
                    if(r){
                        //路由调用
                        RouteFactory.handleRoute(route,params,request,request.response);
                    }
                });
            });    
        }else{ //静态资源
            StaticResource.load(request,request.response,path);
        }
    }

    /**
     * 设置允许处理标志
     * @param v 
     */
    static setCanHandle(v:boolean){
        this.canHandle = v;
    }
}

export {RequestQueue}