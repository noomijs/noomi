import { HttpResponse } from "./httpresponse";
import { WebCache, IWebCacheObj } from "./webcache";
import { WebConfig } from "./webconfig";
import { HttpRequest } from "./httprequest";
import { Util } from "../tools/util";
import { App } from "../tools/application";
import { Stream } from "stream";
import { Stats } from "fs";

/**
 * 静态资源加载器
 */
class StaticResource{
    /**
     * 静态资源map，用于管理可访问静态资源路径，目录可以带通配符‘*’
     */
    static staticMap:Map<string,RegExp> = new Map();

    /**
     * 可压缩类型，也是缓存类型
     */
    static zipTypes:Array<RegExp> = [
        /^text\/\S+$/,
        /^application\/\S*script$/,
        /^application\/json$/
    ]
    /**
     * 加载静态资源
     * @param request   request
     * @param response  response
     * @param path      文件路径
     * @param zip       是否压缩
     * @returns         http code 或 缓存数据 
     */
    static async load(request:HttpRequest,response:HttpResponse,path:string,zip?:boolean):Promise<number|IWebCacheObj>{
        //检测路径是否在static map中
        let finded:boolean = false;
        for(let p of this.staticMap){
            if(p[1].test(path)){
                finded = true;
                break;
            }
        }
        if(!finded){
            return 404;
        }
        
        //文件路径
        let filePath:string = Util.getAbsPath([path]);
        //缓存数据对象
        let cacheData;
        //状态码
        if(WebConfig.useServerCache){ //从缓存取，如果用浏览器缓存数据，则返回0，不再操作
            let ro:number|object = await WebCache.load(request,response,path);
            if(ro !== undefined && typeof ro === 'object'){
                cacheData = ro;
            }
        }
        
        //不存在缓存数据，或者请求为gzip但不存在zipData，需要读取文件
        if(cacheData === undefined || (zip && !cacheData['zipData'])){ 
            if(!App.fs.existsSync(filePath) || !App.fs.statSync(filePath).isFile()){
                return 404;
            }else{
                cacheData = await this.readFile(filePath,zip);
                if(WebConfig.useServerCache){
                    await WebCache.add(path,cacheData);
                }
            }
        }
        return cacheData;
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
                    //添加 file watcher
                    // if(App.openWatcher){
                    //     FileWatcher.addDir(Util.getAbsPath([paths]),EWatcherType.STATIC);
                    // }
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

    /**
     * 读文件
     * @param path      绝对路径
     * @param zip       压缩方法
     * @returns         cache数据对象
     */
    static async readFile(path:string,zip?:boolean):Promise<IWebCacheObj>{
        const fs = App.fs;
        //未压缩数据buffer
        let srcBuf:Buffer;
        //压缩数据buffer
        let zipBuf:Buffer;
        
        const stream = App.stream;
        const zlib = App.zlib;
        const util = App.util;
        const pipeline = util.promisify(stream.pipeline);
        
        
        //mime 类型
        let mimeType:string = App.mime.getType(path);
        
        //源文件流
        let srcStream:Stream;
        //zip文件流
        let zipStream:Stream;
        let srcBufs = [];
        let zipBufs = [];
        let tmpFn:string;
        
        //创建输入流
        srcStream = fs.createReadStream(path);

        //从源输入流读数据
        srcBuf = await new Promise((res,rej)=>{
            srcStream.on('data',(buf)=>{
                srcBufs.push(buf);
            });
            srcStream.on('end',()=>{
                res(Buffer.concat(srcBufs));
            });
        });
        //不缓存数据标志
        let saveData:boolean = this.checkNeedZip(mimeType);
        
        if(zip && saveData){
            //生成临时文件
            tmpFn = App.path.resolve(App.path.dirname(path),App.uuid.v1());
            //zip对象
            let zipTool;
            //根据不同类型压缩
            if(zip){
                zipTool = zlib.createGzip();
            }
            
            //创建压缩管道
            await pipeline(fs.createReadStream(path),zipTool,App.fs.createWriteStream(tmpFn));
            //创建压缩输入流
            zipStream = fs.createReadStream(tmpFn);
            //从zip输入流读数据
            zipBuf = await new Promise((res,rej)=>{
                zipStream.on('data',(buf)=>{
                    zipBufs.push(buf);
                });
                zipStream.on('end',()=>{
                    res(Buffer.concat(zipBufs));
                    //删除临时压缩文件
                    fs.unlink(tmpFn,(err)=>{
                        if(err){
                            console.error(err);
                        }
                    });
                });
            });
        }
        
        //文件信息
        let stat:Stats = fs.statSync(path);
        //最后修改 
        let lastModified:string = stat.mtime.toUTCString();
        //计算hash
        const hash = App.crypto.createHash('md5');
        hash.update(srcBuf,'utf8');
        let etag:string = hash.digest('hex');
        
        //数据大小
        let dataSize:number = stat.size;
        //数据
        let data:string;
        //压缩大小
        let zipSize:number;
        //压缩数据
        let zipData:string;
        //文件size<64m才进行缓存
        if(saveData && stat.size < 67108864){
            data = srcBuf.toString('binary');
            if(zipBuf){
                zipSize = zipBuf.length;
                zipData = zipBuf.toString('binary');
            }
        }

        return {
            etag:etag,
            lastModified:lastModified,
            mimeType:mimeType,
            dataSize:dataSize,
            zipSize:zipSize,
            data:data,
            zipData:zipData
        }
    }

    /**
     * 检查mime类型文件是否需要压缩
     * @param mimeType 
     */
    static checkNeedZip(mimeType:string):boolean{
        if(!mimeType){
            return false;
        }
        //判断是否为可压缩类型
        for(let reg of this.zipTypes){
            if(reg.exec(mimeType) !== null){
                return true;
            }
        }
        return false;
    }
}

export {StaticResource};
