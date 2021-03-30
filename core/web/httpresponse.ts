import { ServerResponse, IncomingMessage } from "http";
import { HttpCookie } from "./httpcookie";
import { WebConfig } from "./webconfig";
import { App } from "../tools/application";
import { Stats } from "fs";

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
     * mime类型，默认text/html
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
     * 数据长度
     */
    size?:number;
    /**
     * 压缩类型，包括br,gzip,deflate
     */
    zip?:string;  

    /**
     * 回写类型  text,file 默认text
     * @since 0.4.7
     */
    writeType?:string;
}

/** 
 * response类
 * @remarks
 * 在ServerResponse基础上增加了写客户端方法，更适合直接使用
 */ 
export class HttpResponse extends ServerResponse{
    /**
     * 源response
     */
    srcRes:ServerResponse;
    /**
     * 源request
     */
    request:IncomingMessage;
    /**
     * cookie
     */
    cookie:HttpCookie = new HttpCookie();
    
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
        this.writeCookie();
        this.setCorsHead();
        let data:string|Buffer|object = config.data || '';
        let charset = config.charset || 'utf8';
        
        if(!(data instanceof Buffer)){
            if(typeof data === 'object'){
                data = JSON.stringify(data);
            }
        }
        
        let status = config.statusCode || 200;
        let type = config.type || 'text/html';
        //contenttype 和 字符集
        this.setHeader('Content-Type',type + ';charset=' + charset);
        
        if(config.size){
            this.setHeader('Content-Length',config.size);
        }
        
        //压缩
        if(config.zip){
            this.setHeader('Content-Encoding',config.zip);
            this.setHeader('Vary','Accept-Encoding');
        }

        //处理method = head
        if(this.doHead(config)){
            return;
        }
        
        this.srcRes.writeHead(status, {}).end(data,<BufferEncoding>charset);
    }

    /**
     * 写数据流到浏览器(客户端)
     * @param config    回写配置项
     *              data:file path
     * @param mimeType  mime 类型
     * @since           0.3.3
     */
    writeFileToClient(config:IResponseWriteCfg):void{
        this.writeCookie();
        this.setCorsHead();
        
        //文件路径
        let path:string = config.data;
        //mime类型
        if(!config.type){
            config.type = App.mime.getType(path);
        }
        if(!config.size){
            let stat:Stats = App.fs.statSync(path);
            config.size = stat.size;
        }

        this.setContentType(config.type);
        this.setContentLength(config.size);
        //处理method=head
        if(this.doHead(config)){
            return;
        }
        
        let req:IncomingMessage = this.request;
        let res = this.srcRes;
        let range = req.headers.range;
        // 带range的请求
        if (range) {
            let byteName:string;
            let arr = range.split('=');
            byteName = arr[0];
            let positions = arr[1].split("-");
            let start = parseInt(positions[0], 10);
            let stats = App.fs.statSync(path);
            let total = stats.size;
            let end = positions[1] ? parseInt(positions[1], 10) : total - 1;
            let size = (end - start) + 1;
            this.setContentLength(size);
            res.writeHead(206, {
                "Content-Range":byteName + ' ' + start + '-' + (start+size-1)  + "/" + total,
                "Accept-Ranges": byteName
            });
            
            let stream = App.fs.createReadStream(path, { start: start, end: end })
                .on("open", function() {
                    stream.pipe(res);
                }).on("error", function(err) {
                    res.end(err);
                });
        }else{
            res.writeHead(200, {});
            let stream = App.fs.createReadStream(path,{option:'r'});
            stream.pipe(res);
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

    /**
     * 设置跨域头
     */
    setCorsHead(){
        if(!this.request.headers['origin'] || !WebConfig.cors || !WebConfig.cors['domain']){
            return;
        }
        //来源域
        let domain:string = WebConfig.cors['domain'].trim();
        if(domain === ''){
            return;
        }
        this.setHeader('Access-Control-Allow-Origin',domain);
        this.setHeader('Access-Control-Allow-Headers',WebConfig.cors['allow_headers']||'');
        this.setHeader('Access-Control-Allow-Method',"POST,GET,HEAD,OPTIONS");
        if(domain !== '*'){
            this.setHeader('Access-Control-Allow-Credentials','true');
        }
        this.setHeader('Access-Control-Max-Age',WebConfig.cors['access_max_age']||86400);
    }

    /**
     * 设置回写类型
     * @param type      类型
     */
    setContentType(type:string){
        this.setHeader('Content-Type',type);
    }
    /**
     * 设置content length
     * @param length    内容长度
     */
    setContentLength(length:number){
        this.setHeader('Content-Length',length);
    }
    /**
     * 处理head方法请求
     * @param config    response config
     * @returns         如果请方法为head，则返回true，否则返回false
     */
    doHead(config:IResponseWriteCfg):boolean{
        if(this.request.method === 'HEAD'){
            this.srcRes.writeHead(200, {});
            this.srcRes.write('');
            this.srcRes.end();
            return true;
        }
        return false;
    }

    /**
     * 处理trace方法请求
     */
    doTrace(config:IResponseWriteCfg){
        this.setContentType("message/http");
        this.setContentLength(0);
    }

    /**
     * 处理options请求方法
     */
    doOptions(){
        this.setHeader('Allow','GET, POST, OPTIONS, HEAD');
        this.writeCookie();
        this.setCorsHead();
        this.setContentLength(0);
        this.srcRes.writeHead(200,{});
        this.srcRes.end();
    }
}