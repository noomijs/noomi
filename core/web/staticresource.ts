import { HttpResponse } from "./httpresponse";
import { PageFactory } from "../tools/pagefactory";
import { WebCache } from "./webcache";
import { WebConfig } from "./webconfig";
import { HttpRequest } from "./httprequest";
import { Util } from "../tools/util";
import { App } from "../tools/application";
import { ReadStream } from "fs";

/**
 * 静态资源加载器
 */
class StaticResource{
    /**
     * 静态资源map，用于管理可访问静态资源路径，目录可以带通配符‘*’
     */
    static staticMap:Map<string,RegExp> = new Map();

    /**
     * 加载静态资源
     * @param path      文件路径
     * @param request   request
     * @param response  response
     * @returns         http异常码或0
     */
    static async load(request:HttpRequest,response:HttpResponse,path:string):Promise<number>{
        
        let finded:boolean = false;
        
        //检测路径是否在static map中
        for(let p of this.staticMap){
            if(p[1].test(path)){
                finded = true;
                break;
            }
        }

        if(!finded){
            return 404;
        }
        let errCode:number;
        let data:string;           //file data
        let mimeType:string;    //mimetype
        //静态资源
    
        let filePath = Util.getAbsPath([path]);
        if(WebConfig.useServerCache){ //从缓存取，如果用浏览器缓存数据，则返回0，不再操作
            let ro:number|object = await WebCache.load(request,response,path);
            if(ro === 0){
                //回写没修改标志
                response.writeToClient({
                    statusCode:304
                });
            }else if(ro !== undefined){
                data = ro['data'];
                mimeType = ro['type'];
            }
        }
        if(data === undefined){ //读取文件
            if(!App.fs.existsSync(filePath) || !App.fs.statSync(filePath).isFile()){
                errCode = 404;
            }else{
                let cacheData:object;
                //存到cache
                if(WebConfig.useServerCache){
                    cacheData = await WebCache.add(path,filePath,response);
                }
                //文件流输出
                if(cacheData === undefined){
                    mimeType = App.mime.getType(filePath);
                    let stream:ReadStream = App.fs.createReadStream(filePath);
                    response.writeStreamToClient({
                        data:stream,
                        type:mimeType
                    });
                }else{
                    response.writeToClient({
                        data:cacheData['data'],
                        type:cacheData['type']
                    });
                }
            }
        }
        return errCode || 0;
    }

    /**
     * 添加静态路径
     * @param paths   待添加的目录或目录数组 
     */
    static addPath(paths:string|string[]){
        if(!Array.isArray(paths)){
            if(typeof paths === 'string'){
                if(App.fs.existsSync(Util.getAbsPath([paths]))){
                    this.staticMap.set(paths,Util.toReg(paths,1));
                }
            }
        }else {
            paths.forEach(item=>{
                if(typeof item === 'string'){
                    this.addPath(item);
                }
            });
        }
    }
}

export {StaticResource};
