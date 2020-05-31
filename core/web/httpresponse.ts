import { ServerResponse, OutgoingHttpHeaders, IncomingMessage } from "http";
import { HttpCookie } from "./httpcookie";
import { ReadStream } from "fs";
import { WebConfig } from "./webconfig";
import { App } from "../tools/application";

/**
 * response回写配置项
 */
interface IResponseWriteCfg{
    /**
     * 待写数据，可以是数据串或stream
     */
    data?:any; 
    /**
     * 字符集，默认utf8
     */             
    charset?:string;   
    /**
     * 数据类型，默认text/html
     */
    type?:string;
    /**
     * http状态码，默认200
     */
    statusCode?:number;
    /**
     * 跨域配置串，多个域名用','分割，默认用webconfig中配置的网址数组，如果都没配置，则使用*
     */
    crossDomain?:string;    

    /**
     * 压缩类型，包括br,gzip,deflate
     */
    zip?:string;  
}

/** 
 * response类
 * @remarks
 * 在ServerResponse基础上增加了写客户端方法，更适合直接使用
 */ 
export class HttpResponse extends ServerResponse{
    srcRes:ServerResponse;                  //源response
    request:IncomingMessage;                //源request
    cookie:HttpCookie = new HttpCookie();   //cookie
    
    /**
     * 初始化response对象
     * @param req   源request对象
     * @param res   源response对象
     */
    init(req:IncomingMessage,res:ServerResponse){
        this.request = req;
        this.srcRes = res;
    }
    /**
     * 写到浏览器(客户)端
     * @param config    回写配置项
     */
    writeToClient(config:IResponseWriteCfg):void{
        let data:string|Buffer|object = config.data || '';
        if(!(data instanceof Buffer) && typeof data === 'object'){
            data = JSON.stringify(data);
        }
        let charset = config.charset || 'utf8';
        let status = config.statusCode || 200;
        let type = config.type || 'text/html';

        //设置cookie
        this.writeCookie();
        let headers:OutgoingHttpHeaders = {};
        //默认*
        let crossDomain:string = config.crossDomain || WebConfig.crossDomain || '*';
        //跨域
        if(config.crossDomain || WebConfig.crossDomain){
            headers['Access-Control-Allow-Origin'] = crossDomain;
            headers['Access-Control-Allow-Headers'] = 'Content-Type,x-requested-with';
            headers['Access-Control-Allow-Credentials'] = 'true';
            headers['Access-Control-Allow-Methods'] = 'PUT,POST,GET,OPTIONS';
        }
        
        //contenttype 和 字符集
        headers['Content-Type'] = type + ';charset=' + charset;
        //压缩
        if(config.zip){
            headers['Content-Encoding'] = config.zip;
            headers['Vary'] = 'Accept-Encoding';
        }
        this.srcRes.writeHead(status, headers);
        this.srcRes.write(data);
        this.srcRes.end();
    }

    /**
     * 写数据流到浏览器(客户端)
     * @param config    回写配置项
     *              data:file path
     * @since           0.3.3
     */
    writeFileToClient(config:IResponseWriteCfg):void{
        //设置cookie
        this.writeCookie();
        let headers:OutgoingHttpHeaders = {};
        //跨域
        if(config.crossDomain){
            headers['Access-Control-Allow-Origin'] = '*';
            headers['Access-Control-Allow-Headers'] = 'Content-Type';
        }
        //文件路径
        let path:string = config.data;
        //mime类型
        let type = App.mime.getType(path);
        
        //contenttype
        headers['Content-Type'] = type;
        
        let req:IncomingMessage = this.request;
        let res = this.srcRes;
        let range = req.headers.range;
        // 带range的请求
        if (range) {
            let byteName:string;
            let arr = range.split('=');
            byteName = arr[0];
            var positions = arr[1].split("-");
            var start = parseInt(positions[0], 10);
            let stats = App.fs.statSync(path);
            let total = stats.size;
            let end = positions[1] ? parseInt(positions[1], 10) : total - 1;
            let size = (end - start) + 1;
            
            res.writeHead(206, {
                "Content-Range":byteName + ' ' + start + '-' + (start+size-1)  + "/" + total,
                "Accept-Ranges": byteName,
                "Content-Length":size,
                "Content-Type": type
            });    
            
            let stream = App.fs.createReadStream(path, { start: start, end: end })
                .on("open", function() {
                    stream.pipe(res);
                }).on("error", function(err) {
                    res.end(err);
                });
        }else{
            res.writeHead(200, headers);
            let stream = App.fs.createReadStream(path)
                .on("open", function() {
                    stream.pipe(res)})
                .on('end', ()=>{
                    res.end();
                });
        }
    }

    /**
     * 设置回传header
     * @param key       键
     * @param value     值
     */
    setHeader(key:string,value:number|string|string[]){
        this.srcRes.setHeader(key,value);
    }
    
    /**
     * 获取header
     * @param key 
     * @returns    返回值
     */
    getHeader(key:string):number|string|string[]{
        return this.srcRes.getHeader(key);
    }

    /**
     * 重定向
     * @param page  跳转路径url 
     */
    redirect(page:string){
        this.writeCookie();
        this.srcRes.writeHead(
            302,
            {
                'Location':page,
                'Content-Type':'text/html'
            }
        );
        this.srcRes.end();
    }

    /**
     * 写cookie到header
     */
    writeCookie(){
        let kvs = this.cookie.getAll();
        let str = '';
        for(let kv of kvs){
            str += kv[0] + '=' + kv[1] + ';';
        }
        if(str !== ''){
            str += 'Path=/';
            this.srcRes.setHeader('Set-Cookie',str);
        }
        return str;
    }
}