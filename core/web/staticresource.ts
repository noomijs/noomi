import { HttpResponse } from "./httpresponse";
import { PageFactory } from "../tools/pagefactory";
import { WebCache } from "./webcache";
import { WebConfig } from "./webconfig";
import { HttpRequest } from "./httprequest";
import { Util } from "../tools/util";
import { App } from "../tools/application";

/**
 * 静态资源加载器
 */
class StaticResource{
    static forbiddenMap:Map<string,RegExp> = new Map(); //forbidden path map
    /**
     * 
     * @param path      文件路径
     * @param request   request
     * @param response  response
     */
    static async load(request:HttpRequest,response:HttpResponse,path:string):Promise<void>{
        //config 为默认路径
        if(this.forbiddenMap.size === 0){
            this.addPath('/config');
        }
        let finded:boolean = false;
        
        //检测是否在forbidden map中
        for(let p of this.forbiddenMap){
            if(p[1].test(path)){
                finded = true;
                break;
            }
        }

        let errCode:number;
        let data:any;
        //禁止访问路径，直接返回404
        if(finded){
            errCode = 404;
        }else{
            let filePath = App.path.posix.join(process.cwd(),path);
            
            if(WebConfig.useServerCache){ //从缓存取，如果用浏览器缓存数据，则返回0，不再操作
                data = await WebCache.load(request,response,path);
                if(data === 0){
                    //回写没修改标志
                    response.writeToClient({
                        statusCode:304
                    });
                }
            }
            if(data === undefined){ //读取文件
                if(!App.fs.existsSync(filePath) || !App.fs.statSync(filePath).isFile()){
                    errCode = 404;
                }else{
                    data = await new Promise((resolve,reject)=>{
                        App.fs.readFile(filePath,'utf8',(err,v)=>{
                            if(err){
                                resolve();
                            }
                            resolve(v);
                        });
                    });
                    //存到cache
                    if(data && WebConfig.useServerCache){
                        await WebCache.add(path,filePath,data,response);
                    }
                }
            }
        }
        if(data){
            //写到浏览器
            await response.writeToClient({
                data:data
            });
        }else if(errCode !== undefined){
            let page = PageFactory.getErrorPage(errCode);
            if(page){
                response.redirect(page);
            }else{
                response.writeToClient({
                    statusCode:errCode
                });
            }
        }
    }

    /**
     * 添加静态路径
     * @param paths   待添加的目录或目录数组 
     */
    static addPath(paths:any){
        if(!Array.isArray(paths)){
            if(typeof paths === 'string'){
                if(App.fs.existsSync(App.path.posix.join(process.cwd(),paths))){
                    this.forbiddenMap.set(paths,Util.toReg(paths,1));
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
