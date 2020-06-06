import { HttpResponse } from "./httpresponse";
import { WebCache } from "./webcache";
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
     * 可压缩类型
     */
    static zipTypes:Array<RegExp> = [
        /^text\/\S+$/,
        /^application\/\S*script$/,
        /^application\/json$/
    ]
    /**
     * 加载静态资源
     * @param path      文件路径
     * @param request   request
     * @param response  response
     * @returns         http异常码或0
     */
    static async load(request:HttpRequest,response:HttpResponse,path:string):Promise<number>{
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

        // gzip
        let gzip:string = <string>request.getHeader("accept-encoding");
        if(gzip.indexOf('gzip') !== -1){
            gzip = 'gzip';
        }else if(gzip.indexOf('br') !== -1){
            gzip = 'br';
        }else if(gzip.indexOf('deflate') !== -1){
            gzip = 'deflate';
        }else{
            gzip = undefined;
        }
        
        //文件路径
        let filePath:string = Util.getAbsPath([path]);
        //是否存储文件数据
        let saveData:boolean = false;
        //缓存数据对象
        let cacheData;
        //状态码
        if(WebConfig.useServerCache){ //从缓存取，如果用浏览器缓存数据，则返回0，不再操作
            let ro:number|object = await WebCache.load(request,response,path);
            if(ro === 0){
                //回写没修改标志
                response.writeToClient({
                    statusCode:304
                });
                return;
            }else if(ro !== undefined){
                cacheData = ro;
                saveData = true;
            }
        }
        
        if(cacheData === undefined){ //读取文件
            if(!App.fs.existsSync(filePath) || !App.fs.statSync(filePath).isFile()){
                return 404;
            }else{
                cacheData = await this.readFile(filePath,gzip);
                saveData = cacheData['saveData'];
                if(WebConfig.useServerCache){
                    await WebCache.add(path,cacheData,!saveData);
                }
            }
        }
        
        let data;
        if(saveData){
            if(cacheData['zipData']){
                data = cacheData['zipData'];
            }else{
                data = cacheData['data'];
                gzip = undefined;
            }
        }
        
        //设置文件相关头
        if(WebConfig.useServerCache){
            response.setHeader('ETag',cacheData['etag']);
            response.setHeader('Last-Modified',cacheData['lastModified']);
        }
        
        if(data){
            response.writeToClient({
                data:data,
                type:cacheData['type'],
                size:cacheData['size'],
                zip:gzip
            });
        }else{
            response.writeFileToClient({
                data:filePath,
                type:cacheData['type'],
                size:cacheData['size']
            });
        }
        return 0;
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

    /**
     * 读文件
     * @param path      绝对路径
     * @param zip       压缩方法
     * @returns         {
     *                      etag:etag,
     *                      lastModified:lastModified,
     *                      type:mimeType,
     *                      data:srcBuf,     未压缩数据
     *                      zipData:srcBuf   压缩数据
     *                      size:content length
     *                      saveData:是否可缓存数据
     *                  }
     */
    static async readFile(path:string,zip?:string):Promise<object>{
        const fs = App.fs;
        //未压缩数据buffer
        let srcBuf:Buffer;
        //压缩数据buffer
        let zipBuf:Buffer;
        
        const stream = App.stream;
        const zlib = App.zlib;
        const util = App.util;
        const pipeline = util.promisify(stream.pipeline);
        //获取lastmodified
        let stat:Stats = await new Promise((resolve,reject)=>{
            fs.stat(path,(err,data)=>{
                resolve(data);
            });
        });
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
            switch(zip){
                case 'br':
                    zipTool = zlib.createBrotliDecompress();
                    break;
                case 'gzip':
                    zipTool = zlib.createGzip();
                    break;
                case 'deflate':
                    zipTool = zlib.createInflate();
                    break;
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
                            console.log(err);
                        }
                    });
                });
            });
        }
        
        //最后修改 
        let lastModified:string = stat.mtime.toUTCString();
        //计算hash
        const hash = App.crypto.createHash('md5');
        hash.update(srcBuf,'utf8');
        let etag:string = hash.digest('hex');
        return {
            etag:etag,
            lastModified:lastModified,
            type:mimeType,
            //如果压缩，则用压缩后的长度，否则用文件长度
            size:zipBuf?zipBuf.length:stat.size,
            data:srcBuf,
            zipData:zipBuf,
            saveData:saveData
        }
    }


    /**
     * 检查mime类型文件是否需要压缩
     * @param mimeType 
     */
    static checkNeedZip(mimeType:string):boolean{
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
