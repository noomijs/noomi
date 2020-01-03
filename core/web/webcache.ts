import { NCache } from "../tools/ncache";
import { HttpRequest } from "./httprequest";
import { HttpResponse } from "./httpresponse";
import { Stats } from "fs";
import { App } from "../tools/application";

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
     * 缓存文件类型，默认[*]
     */
    static fileTypes:Array<string>;
    /**
     * 单个文件最大size
     */
    static maxSingleSize:number;
    /**
     * 不能缓存的媒体类型
     */
    static excludeFileTypes:Array<string> = ["image","audio","video"];  
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
        this.fileTypes = cfg.file_type || ['*'];
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
     * @returns         {data:文件内容,type:mime type}
     */
    static async add(url:string,path:string,response?:HttpResponse):Promise<Object>{
        const fs = App.fs;
        const pathMdl = App.path;
        let addFlag:boolean = false;

        //获取lastmodified
        let stat:Stats = await new Promise((resolve,reject)=>{
            fs.stat(path,(err,data)=>{
                resolve(data);
            });
        });
        let mimeType:string;
        //获取mime type
        mimeType = App.mime.getType(path);
        //超出最大尺寸
        if(stat.size < this.maxSingleSize){
            //非全部类型，需要进行类型判断
            if(this.fileTypes[0] === '*'){
                addFlag = true;
            }else{
                let extName = pathMdl.extname(url);
                if(this.fileTypes.includes(extName)){
                    addFlag = true;
                }
            }
            //媒体类型不缓存
            if(addFlag){
                for(let t of this.excludeFileTypes){
                    if(mimeType.indexOf(t)){
                        addFlag = false;
                        break;
                    }
                }
            }    
        }
        
        let data:string|undefined;
        if(addFlag){
            //读数据
            data = await new Promise((resolve,reject)=>{
                App.fs.readFile(path,'utf8',(err,v)=>{
                    if(err){
                        resolve();
                    }
                    resolve(v);
                });
            });
            //最后修改 
            let lastModified:string = stat.mtime.toUTCString();
            //计算hash
            const hash = App.crypto.createHash('md5');
            hash.update(data,'utf8');
            let etag:string = hash.digest('hex');
            if(response){
                this.writeCacheToClient(response,etag,lastModified);
            }
            if(addFlag){
                await this.cache.set({
                    key:url,
                    value:{
                        etag:etag,
                        lastModified:lastModified,
                        data:data,
                        type:mimeType
                    }
                });
            }
            if(response){
                this.writeCacheToClient(response,etag,lastModified);
            }
        }else{
            this.writeCacheToClient(response);
        }
        
        if(data){
            return {data:data,type:mimeType};
        }
    }

    /**
     * 加载资源
     * @param request   request
     * @param response  response
     * @param url       url
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
                if(map !== null && map.data && map.data !== ''){
                    this.writeCacheToClient(response,map.etag,map.lastModified);
                    return {
                        data:map.data,
                        type:map.type
                    }
                }
        }
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