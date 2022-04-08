import { HttpRequest } from "./httprequest";
import { WebConfig } from "./webconfig";
import { RouteFactory, IRoute, ERouteResultType } from "../main/route/routefactory";
import { FilterFactory } from "./filterfactory";
import { StaticResource} from "./staticresource";
import { App } from "../tools/application";
import { PageFactory } from "../tools/pagefactory";
import { HttpResponse } from "./httpresponse";
import { Util } from "../tools/util";
import { WebCache, IWebCacheObj } from "./webcache";
import { WebAfterHandler } from "./webafterhandler";
import { NoomiError } from "../tools/errorfactory";
import { CpuFactory } from "./cpufactory";

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
        if(this.queue.length === 0) {
            CpuFactory.openInterval();
        }
        let timeout = WebConfig.get('request_timeout') || 0;
        this.queue.push({
            req: req,
            expire:timeout>0?new Date().getTime()+timeout*1000:0
        });
        this.handle();
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
            setTimeout(()=>{
                RequestQueue.handle();
            },1000);
            return;
        } 
            
        let item:IRequestItem = this.queue.shift();
        if(item.expire === 0 || item.expire > new Date().getTime()){
            this.handleOne(item.req);
        }
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
        let gzip:boolean = zipStr && zipStr.indexOf('gzip') !== -1?true:false;
        
        let path = App.url.parse(request.url).pathname;
        let data;
        
        //welcome页面
        if(path === '' || path ==='/'){
            if(WebConfig.welcomePage){
                path = WebConfig.welcomePage;
            }
        }
        
        //过滤器执行
        if(!await FilterFactory.doChain(request.url,request,response)){
            return;
        }
        //从路由查找
        let route:IRoute = RouteFactory.getRoute(path);
        if(route !== null){
            //执行
            try{
                data = await RouteFactory.handleRoute(route,request,response);
                //重定向直接返回
                if(data === ERouteResultType.REDIRECT){
                    return;
                }
            }catch(e){
                //输出异常对象
                if(e instanceof NoomiError) {
                    console.error(e);
                    return;
                }
                data = e;
            }
        }else{ //静态资源
            //从web cache获取数据
            data = await WebCache.load(request,response,path);
            if(!data){
                //加载静态数据
                data = await StaticResource.load(request,response,path,gzip);
            }
        }
        data = await WebAfterHandler.doChain(request.url,data,request,response);
        this.handleResult(response,data,path,gzip);
    }

    /**
     * 处理结果
     * @param response  response对象
     * @param data      数据或数据对象
     * @param path      资源路径
     * @param isZip     是否zip
     * @returns         void
     * @since 0.5.5
     */
    private static handleResult(response:HttpResponse,data:any,path:string,isZip:boolean){
        if(!data){
            return;
        }
        if(typeof data === 'number'){
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
            let cData:IWebCacheObj = <IWebCacheObj>data;
            //json格式为utf8，zip和流用binary
            let charset = data.mimeType && data.mimeType.indexOf('/json') === -1 || isZip&&cData.zipData?'binary':'utf8';
            //写web cache相关参数
            WebCache.writeCacheToClient(response,cData.etag,cData.lastModified);
            //可能只缓存静态资源信息，所以需要判断数据
            if(isZip && cData.zipData){ //压缩数据
                response.writeToClient({
                    data:cData.zipData,
                    type:cData.mimeType,
                    size:cData.zipSize,
                    zip:'gzip',
                    charset:charset
                });
            }else if(cData.etag){  //文件
                response.writeFileToClient({
                    data:Util.getAbsPath([path]),
                    type:cData.mimeType,
                    size:cData.dataSize
                });
            }else if(cData.data){ //数据
                response.writeToClient({
                    data:cData.data,
                    type:cData.mimeType,
                    size:cData.dataSize,
                    charset:charset
                });
            }else{  //数据对象
                response.writeToClient({
                    data:cData.data,
                    charset:charset
                });
            }
        }else{
            response.writeToClient({  //非对象
                data:data
            });
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