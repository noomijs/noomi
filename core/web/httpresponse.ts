import { ServerResponse, OutgoingHttpHeaders, IncomingMessage } from "http";
import { HttpCookie } from "./httpcookie";
import { App } from "../tools/application";

interface WriteCfg{
    data?:any;              //数据
    charset?:string;        //字符集
    type?:string;           //数据类型
    statusCode?:number;     //http 异常码
    crossDomain?:boolean;   //是否跨域
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
     * 回写到浏览器端
     * @param data          待写数据 
     * @param charset       字符集
     * @param type          MIME类型
     * @param crossDomain   跨域
     */
    writeToClient(config:WriteCfg):void{
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
        //跨域
        if(config.crossDomain){
            headers['Access-Control-Allow-Origin'] = '*';
            headers['Access-Control-Allow-Headers'] = 'Content-Type';
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
     * 写header
     * @param key 
     * @param value 
     */
    setHeader(key:string,value:any){
        this.srcRes.setHeader(key,value);
    }
    

    /**
     * 回写文件到浏览器端
     * @param file          待写文件 
     * @param charset       字符集
     * @param type          数据类型
     * @param crossDomain   跨域
     */
    async writeFileToClient(config:any){
        let charset = config.charset || 'utf8';
        let status = config.statusCode || 200;
        //设置cookie
        this.writeCookie();

        let type = App.mime.getType(config.path);
        let errCode:number;
        
        let data:Buffer = await new Promise((resolve,reject)=>{
            App.fs.readFile(config.path,'utf8',(err,file)=>{
                if(err){
                    errCode = 404;
                    resolve();
                }else{
                    resolve(file);
                }
            });
        });    
        //有异常码，退出
        if(errCode!==undefined){
            return errCode;
        }
        
        let headers:OutgoingHttpHeaders = {};
        //数据长度
        headers['Content-Length'] = Buffer.byteLength(data);
        
        //contenttype 和 字符集
        headers['Content-Type'] = type + ';charset=' + charset;
        this.srcRes.writeHead(status, headers);
        this.srcRes.write(data,charset);
        this.srcRes.end();
    }

    /**
     * 重定向
     * @param response      
     * @param page          跳转路径 
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
     * 写cookie到头部
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