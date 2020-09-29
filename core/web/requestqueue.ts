import { HttpRequest } from "./httprequest";
import { WebConfig } from "./webconfig";
import { RouteFactory, IRoute } from "../main/route/routefactory";
import { FilterFactory } from "./filterfactory";
import { StaticResource, IStaticCacheObj } from "./staticresource";
import { App } from "../tools/application";
import { PageFactory } from "../tools/pagefactory";
import { HttpResponse } from "./httpresponse";
import { Util } from "../tools/util";
import { WebCache } from "./webcache";

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
    
    static async handleOne(request:HttpRequest){
        let response:HttpResponse = request.response;
        switch (request.method){
            case 'OPTIONS':
                response.doOptions();
                return;
            case 'DELETE':
                response.writeToClient({
                    statusCode:405
                });
                return;
            case 'PUT':
                response.writeToClient({
                    statusCode:405
                });
                return;
            case 'PATCH':
                response.writeToClient({
                    statusCode:405
                });
                return;    
        }
        // gzip
        let zipStr:string = <string>request.getHeader("accept-encoding");
        let gzip:boolean = zipStr.indexOf('gzip') !== -1?true:false;
        
        let path = App.url.parse(request.url).pathname;
        let data;
        if(path === '' || path ==='/'){
            //默认页面
            if(WebConfig.welcomePage){
                data = await StaticResource.load(request,response,WebConfig.welcomePage,gzip);
            }
        }
        if(!data){
            //过滤器执行
            if(!await FilterFactory.doChain(request.url,request,response)){
                return;
            }
            //加载静态数据
            data = await StaticResource.load(request,response,path,gzip);
        }
        if(data){
            if(typeof data === 'number'){
                //静态资源不存在，需要看路由是否存在
                if(data === 404){
                    //获得路由，可能没有
                    let route:IRoute = RouteFactory.getRoute(path);
                    if(route !== null){
                        //参数
                        let params = await request.init();
                        data = RouteFactory.handleRoute(route,params,request,response);
                    }
                }
                if(data !== 0){
                    let page = PageFactory.getErrorPage(data);
                    if(page && App.fs.existsSync(Util.getAbsPath([page]))){
                        response.redirect(page);
                    }else{
                        response.writeToClient({
                            statusCode:data
                        });
                    }
                }
            }else if(typeof data === 'object'){
                let cData:IStaticCacheObj = <IStaticCacheObj>data;
                //写web cache相关参数
                WebCache.writeCacheToClient(response,cData.etag,cData.lastModified);
                //可能只缓存静态资源信息，所以需要判断数据
                if(gzip && cData.zipData){
                    response.writeToClient({
                        data:cData.zipData,
                        type:cData.mimeType,
                        size:cData.zipSize,
                        zip:'gzip',
                        charset:'binary'
                    });
                }else if(cData.data){
                    response.writeToClient({
                        data:cData.data,
                        type:cData.mimeType,
                        size:cData.dataSize,
                        charset:'binary'
                    });
                }else{
                    response.writeFileToClient({
                        data:Util.getAbsPath([path]),
                        type:cData.mimeType,
                        size:cData.dataSize
                    });
                }
            }
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