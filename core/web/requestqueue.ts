import { HttpRequest } from "./httprequest";
import { WebConfig } from "./webconfig";
import { RouteFactory } from "../main/route/routefactory";
import { FilterFactory } from "./filterfactory";
import { StaticResource } from "./staticresource";
import { App } from "../tools/application";
import { PageFactory } from "../tools/pagefactory";

/**
 * @exclude
 * request 队列
 */
interface IRequestItem{
    req:HttpRequest;        //request
    expire?:number;         //过期时间
}
/**
 * @exclude
 * 请求队列
 */
class RequestQueue{
    static queue:Array<IRequestItem> = []; 
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
            
        let item:IRequestItem = this.queue.shift();
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
        switch (request.method){
            case 'OPTIONS':
                request.response.writeToClient({
                    statusCode:200,
                    data:''
                });
            return;
            case 'DELETE':
                request.response.writeToClient({
                    statusCode:501
                });
                return;
            case 'PUT':
                request.response.writeToClient({
                    statusCode:501
                });
                return;
            case 'HEAD':
                request.response.writeToClient({
                    statusCode:501
                });
                return;    
            case 'TRACE':
                request.response.writeToClient({
                    statusCode:501
                });
                return;        
            case 'PATCH':
                request.response.writeToClient({
                    statusCode:501
                });
                return;    
        }
        let path = App.url.parse(request.url).pathname;
        if(path === '' || path ==='/'){
            //默认页面
            if(WebConfig.welcomePage){
                StaticResource.load(request,request.response,WebConfig.welcomePage);
            }
            return;
        }
        //过滤器执行
        FilterFactory.doChain(request.url,request,request.response).then(async (r)=>{
            if(!r){
                return;
            }
            let code = await StaticResource.load(request,request.response,path);
            if(code === 404){
                //获得路由，可能没有，则
                let route = RouteFactory.getRoute(path);
                if(route === null){
                    code = 404;
                }else{
                    //参数
                    let params = await request.init();
                    code = RouteFactory.handleRoute(path,params,request,request.response);
                }
                if(code !== 0){
                    let page = PageFactory.getErrorPage(code);
                    if(page){
                        request.response.redirect(page);
                    }else{
                        request.response.writeToClient({
                            statusCode:code
                        });
                    }
                }
            }
        });
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