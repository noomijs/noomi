import { ServerResponse, OutgoingHttpHeaders, IncomingMessage } from "http";
import { HttpCookie } from "./httpcookie";
import { ReadStream } from "fs";
import { WebConfig } from "./webconfig";

/**
 * response回写配置项
 */
interface ResponseWriteCfg{
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
}

export class HttpResponse extends ServerResponse{
    srcRes:ServerResponse;                  //源response
    request:IncomingMessage;                //源request
    cookie:HttpCookie = new HttpCookie();   //cookie
    
    init(req,res){
        this.request = req;
        this.srcRes = res;
    }
    /**
     * 写到浏览器(客户)端
     * @param config    回写配置项
     */
    writeToClient(config:ResponseWriteCfg):void{
        let data:any = config.data || '';
        if(typeof data === 'object'){
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
        }
        
        //contenttype 和 字符集
        headers['Content-Type'] = type + ';charset=' + charset;
        //数据长度
        headers['Content-Length'] = Buffer.byteLength(data);
        this.srcRes.writeHead(status, headers);
        this.srcRes.write(data,charset);
        this.srcRes.end();
    }

    /**
     * 写数据流到浏览器(客户端)
     * @param config    回写配置项
     */
    writeStreamToClient(config:ResponseWriteCfg):void{
        let charset = config.charset || 'utf8';
        let status = config.statusCode || 200;
        let type = config.type || 'text/html';

        //设置cookie
        this.writeCookie();
        let headers:OutgoingHttpHeaders = {};
        //跨域
        if(config.crossDomain){
            headers['Access-Control-Allow-Origin'] = '*';
            headers['Access-Control-Allow-Headers'] = 'Content-Type';
        }
        
        //contenttype 和 字符集
        headers['Content-Type'] = type + ';charset=' + charset;
        let stream:ReadStream = config.data;
        //数据长度
        this.srcRes.writeHead(status, headers);
        stream.on('data',(chunk)=>{
            this.srcRes.write(chunk);
        });

        stream.on('end',()=>{
            this.srcRes.end();
        });
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