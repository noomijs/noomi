import { NCache } from "../tools/ncache";
import { HttpRequest } from "./httprequest";
import { HttpResponse } from "./httpresponse";
import { Stats } from "fs";
import { App } from "../tools/application";
import { Stream } from "stream";

/**
 * web 缓存类
 * @remarks
 * 用于管理缓存资源
 */
class WebCache{
    /**
     * cache对象
     */
    static cache:NCache;
    /**
     * cache-control max-age
     */
    static maxAge:number;
    /**
     * cache-control public
     */
    static isPublic:boolean;
    /**
     * cache-control privite
     */
    static isPrivate:boolean;
    /**
     * cache-control no-cache
     */
    static noCache:boolean;
    /**
     * cache-control no-store
     */
    static noStore:boolean;
    /**
     * cache-control must-revalidation
     */
    static mustRevalidation:boolean;
    /**
     * cache-control proxy-revalidation
     */
    static proxyRevalidation:boolean;
    /**
     * expires
     */
    static expires:number;
    /**
     * 单个文件最大size
     */
    static maxSingleSize:number;
    /**
     * 不能缓存的媒体类型
     */
    // static excludeFileTypes:Array<string> = ["audio/","video/"];
    /**
     * 可压缩类型
     */
    static cacheTypes:Array<RegExp> = [
        /^text\/\S+$/,
        /^application\/\S*script$/,
        /^application\/json$/
    ]
    /**
     * 初始化
     * @param cfg   配置项，包括:
     *                  file_type           缓存文件类型，默认[*]
     *                  max_age             cache-control max-age
     *                  no_cache            cache-control no-cache   
     *                  no_store            cache-control no-store
     *                  public              cache-control public
     *                  private             cache-control privite
     *                  must_revalidation   cache-control must-revalidation
     *                  proxy_revalidation  cache-control proxy-revalidation
     *                  expires             过期时间(秒)
     *                  max_single_size     单个缓存文件最大尺寸
     */
    static async init(cfg:any){
        this.maxAge = cfg.max_age|0;
        this.noCache = cfg.no_cache || false;
        this.noStore = cfg.no_store || false;
        this.isPublic = cfg.public || false;
        this.isPrivate = cfg.private || false;
        this.mustRevalidation = cfg.must_revalidation || false;
        this.proxyRevalidation = cfg.proxy_revalidation || false;
        this.expires = cfg.expires || 0;
        this.maxSingleSize = cfg.max_single_size || 20000000;
        //创建cache
        this.cache = new NCache({
            name:'NWEBCACHE',
            maxSize:cfg.max_size || 0,
            saveType:cfg.save_type || 0,
            redis:cfg.redis
        });
    }

    /**
     * 添加资源到缓存中
     * @param url       url请求url
     * @param path      url对应路径
     * @param response  response对象
     * @param gzip      压缩类型 gzip,br,deflate
     * @returns         {data:文件内容,type:mime type}
     */
    static async add(url:string,path:string,response:HttpResponse,gzip:string):Promise<Object>{
        const fs = App.fs;
        let addFlag:boolean = false;
        //未压缩数据buffer
        let srcBuf:Buffer;
        //压缩数据buffer
        let zipBuf:Buffer;
        //是否需要压缩
        let needZip:boolean = false;
        let needCache:boolean = false;
        
        //获取lastmodified
        let stat:Stats = await new Promise((resolve,reject)=>{
            fs.stat(path,(err,data)=>{
                resolve(data);
            });
        });
        //mime 类型
        let mimeType:string = App.mime.getType(path);

        needCache = this.checkNeedCache(mimeType);
        //超出最大尺寸
        addFlag = needCache && this.maxSingleSize > 0 && stat.size < this.maxSingleSize;
        
        if(addFlag){
            const stream = App.stream;
            const zlib = App.zlib;
            const util = App.util;
            const pipeline = util.promisify(stream.pipeline);
            //源文件流
            let srcStream:Stream;
            //zip文件流
            let zipStream:Stream;
            let srcBufs = [];
            let zipBufs = [];
            let tmpFn:string;

            needZip = gzip && needCache;
            
            if(needZip){
                //生成临时文件
                tmpFn = App.path.resolve(App.path.dirname(path),App.uuid.v1());
                //zip对象
                let zip;
                //根据不同类型压缩
                switch(gzip){
                    case 'br':
                        zip = zlib.createBrotliDecompress();
                        break;
                    case 'gzip':
                        zip = zlib.createGzip();
                        break;
                    case 'deflate':
                        zip = zlib.createInflate();
                        break;
                }
                
                //创建压缩管道
                await pipeline(fs.createReadStream(path),zip,App.fs.createWriteStream(tmpFn));
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
                            console.log(err);
                        });
                    });
                });
            }
            
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
            
            //最后修改 
            let lastModified:string = stat.mtime.toUTCString();
            //计算hash
            const hash = App.crypto.createHash('md5');
            hash.update(srcBuf,'utf8');
            let etag:string = hash.digest('hex');
            //存到cache
            await this.cache.set({
                key:url,
                value:{
                    etag:etag,
                    lastModified:lastModified,
                    data:srcBuf,
                    zipData:zipBuf,
                    type:mimeType
                }
            });
        
            if(response){
                this.writeCacheToClient(response,etag,lastModified);
            }
        }else{
            this.writeCacheToClient(response);
        }
        
        if(srcBuf){
            return {data:srcBuf,zipData:zipBuf,type:mimeType,zip:needZip};
        }
    }

    /**
     * 加载资源
     * @param request   request
     * @param response  response
     * @param url       url
     * @param gzip      压缩类型 br,gzip,deflate
     * @returns         0不用回写数据 或 {data:data,type:mimetype}
     */
    static async load(request:HttpRequest,response:HttpResponse,url:string):Promise<number|object>{
        let rCheck:number = await this.check(request,url);
        switch(rCheck){
            case 0:
                return 0;
            case 1:
                //从缓存获取
                let map = await this.cache.getMap(url);
                if(map !== null){
                    this.writeCacheToClient(response,map.etag,map.lastModified);
                    return {
                        data:map.data,
                        zipData:map.zipData,
                        type:map.type
                    }
                }
        }
    }

    /**
     * 检查mime类型文件是否需要压缩
     * @param mimeType 
     */
    static checkNeedCache(mimeType:string):boolean{
        //判断是否为可压缩类型
        for(let reg of this.cacheTypes){
            if(reg.exec(mimeType) !== null){
                return true;
            }
        }
        return false;
    }
    /**
     * 写cache到客户端
     * @param response          response对象
     * @param etag              etag            文件hash码    
     * @param lastModified      lasmodified     最后修改时间
     */
    static writeCacheToClient(response:HttpResponse,etag?:string,lastModified?:string){
        //设置etag
        if(etag){
            response.setHeader('Etag',etag);
        }
        
        //设置lastmodified
        if(lastModified){
            response.setHeader('Last-Modified',lastModified);
        }
        
        //设置expire
        if(this.expires && this.expires>0){
            response.setHeader('Expires',new Date(new Date().getTime() + this.expires*1000).toUTCString());
        }
        //设置cache-control
        let cc:Array<string> = [];
        this.isPublic?cc.push('public'):'';
        this.isPrivate?cc.push('private'):'';
        this.noCache?cc.push('no-cache'):'';
        this.noStore?cc.push('no-store'):'';
        this.maxAge>0?cc.push('max-age=' + this.maxAge):'';
        this.mustRevalidation?cc.push('must-revalidation'):'';
        this.proxyRevalidation?cc.push('proxy-revalidation'):'';
        response.setHeader('Cache-Control',cc.join(','));
    }

    /**
     * 资源check，如果需要更改，则从服务器获取
     * @param request   request对象
     * @returns         0:从浏览器获取 1:已更新 2:资源不在缓存
     */
    static async check(request:HttpRequest,url:string):Promise<number>{
        let exist = await this.cache.has(url);
        if(!exist){
            return 2;
        }
        //检测 lastmodified
        let modiSince = request.getHeader('if-modified-since');
        let r:boolean = false;
        if(modiSince){
            let result = await this.cache.get(url,'lastModified');
            r = (modiSince === result);
            if(!r){
                return 1;
            }
        }
        //检测etag
        let etag = request.getHeader('if-none-match');
        if(etag){
            let result = await this.cache.get(url,'etag');
            r = (result === etag);
            if(!r){
                return 1;
            }
        }
        return r?0:1;
    }
}

export{WebCache}