import { IncomingMessage, ServerResponse} from "http";
import { SessionFactory, Session } from "./sessionfactory";
import { HttpResponse } from "./httpresponse";
import { WebConfig } from "./webconfig";
import { App } from "../tools/application";
import { Util } from "../tools/util";
import { Socket } from "net";
import { NoomiError } from "../tools/errorfactory";
import { PostFormHandler } from "./postformhandler";
import { PostFileHandler } from "./postfileparamhandler";
import { PostTextHandler } from "./posttexthandler";

/**
 * request类
 * @remarks
 * 在IncomingMessage基础上增加了参数解析等方法，更适合直接使用
 */
export class HttpRequest extends IncomingMessage{
    /**
     * 源IncommingMessage对象(server listen 时传入)，某些需要操纵源IncommingMessage的情况下，可以直接使用
     */
    srcReq:IncomingMessage;
    /**
     * http response对象
     */
    response:HttpResponse;
    /**
     * 参数对象
     */
    parameters:Object = new Object();
    /**
     * 构造器
     * @param req 源IncommingMessage对象(createServer时传入)
     * @param res 源ServerResponse对象(createServer时传入)
     */
    constructor(req:IncomingMessage,res:ServerResponse){
        super(req.socket);
        this.srcReq = req;
        //response 初始化
        this.response = new HttpResponse(req);
        this.response.init(req,res);
        this.url = req.url;
        this.method = req.method;
        this.initQueryString();
    }

    /**
     * 初始化
     * @returns 请求参数
     */
    async init():Promise<object>{
        //非 post
        if(this.method !== 'POST'){
            return this.parameters;
        }
        
        let obj = await this.postHandle();
        // 合并参数
        if(typeof obj === 'object'){
            Object.getOwnPropertyNames(obj).forEach(key=>{
                //已存在该key，需要做成数组
                if(this.parameters[key]){
                    if(!Array.isArray(this.parameters[key])){
                        this.parameters[key] = [this.parameters[key]];
                    }
                    this.parameters[key].push(obj[key]);
                }else{
                    this.parameters[key] = obj[key];
                }
            });
        }
        return this.parameters;
    }

    /**
     * 获取请求消息头信息
     * @param key   消息头名，具体取值参考message.headers
     * @returns     消息值
     */
    getHeader(key:string):string | string[] | undefined{
        return this.srcReq.headers[key];
    }

    /**
     * 获取请求方法，入GET、POSt等
     */
    getMethod():string{
        return this.srcReq.method;
    }

    /**
     * 获取来源url路径
     */
    getUrl():string{
        return this.srcReq.url;
    }

    /**
     * 获取socket，可以通过socket获取远程地址、本地地址等
     * @returns     socket对象
     */
    getSocket():Socket{
        return this.srcReq.socket;
    }
    /**
     * 设置参数
     * @param name      参数名
     * @param value     参数值
     */
    setParameter(name:string,value:string){
        this.parameters[name] = value;
    }

    /**
     * 获取参数
     * @param name      参数名
     * @returns         参数值
     */
    getParameter(name:string):string{
        return this.parameters[name];
    }

    /**
     * 获取所有paramter
     * @returns         参数object
     */
    getAllParameters():Object{
        return this.parameters;
    }

    /**
     * 初始化url查询串
     */
    initQueryString(){
        this.parameters = App.qs.parse(App.url.parse(this.url).query);
    }
    
    /**
     * 获取session
     * @returns   session对象
     */
    async getSession():Promise<Session>{
        return await SessionFactory.getSession(this);
    }

    /**
     * POST时的参数处理
     * @returns     参数值对象
     */
    postHandle():Promise<object>{
        let req:IncomingMessage = this.srcReq;
        let contentString = req.headers['content-type'];
        if(!contentString){
            return Promise.reject(new NoomiError('0502'));
        }
        let contentTypeObj:any = this.handleContentType(contentString);
        let contentLen:number = parseInt(req.headers['content-length']);
        let maxSize:number = WebConfig.get('upload_max_size');
        //不能大于max size
        if(maxSize > 0 && contentLen > maxSize){
            return Promise.reject(new NoomiError('0501'));
        }
        //临时目录，默认 /upload/tmp
        let tmpDir:string = WebConfig.get('upload_tmp_dir') || '/upload/tmp';
        let tmpDir1 = Util.getAbsPath([tmpDir]);
        //如果临时目录不存在，则生成临时目录
        if(!App.fs.existsSync(tmpDir1)){
            App.fs.mkdirSync(tmpDir1,{recursive:true});
        }
        let fileHandler:PostFileHandler;
        let formHandler:PostFormHandler;
        let textHandler:PostTextHandler;
        //post类型 2:form-data 1:文本串 2:独立文件 
        let postType:number;
        if(contentTypeObj.boundary){
            formHandler = new PostFormHandler(contentTypeObj.boundary,tmpDir);
            postType = 0;
        }else if(contentTypeObj.type.startsWith('text/') ||
            contentTypeObj.type === 'application/json' ||
            contentTypeObj.type === 'application/x-www-form-urlencoded'){  //文本
            textHandler = new PostTextHandler(contentTypeObj);
            postType = 1;
        }else if(contentTypeObj.type.startsWith('image') ||
            contentTypeObj.type.startsWith('video') ||
            contentTypeObj.type.startsWith('audio') ||
            contentTypeObj.type.startsWith('application/')){ //独立文件
            postType = 2;
            fileHandler = new PostFileHandler(tmpDir,contentTypeObj.type);
        }
        return new Promise((resolve,reject)=>{
            req.on('data',(chunk:Buffer)=>{
                switch(postType){
                    case 0:
                        formHandler.handleBuf(chunk);
                        break;
                    case 1:
                        textHandler.handleBuf(chunk);
                        break;
                    case 2:
                        fileHandler.handleBuf(chunk);
                }
            });
            req.on('end',()=>{
                switch(postType){
                    case 0:
                        resolve(formHandler.getResult());
                        return;
                    case 1:
                        resolve(textHandler.getResult());
                        return;
                    case 2:
                        resolve(fileHandler.getResult());
                }
            });
        });
    }

    /**
     * 处理content-typestring
     * @param contentTypeString     content-type
     * @returns                     {boundary:分隔符,charset:charset,type:type} 
     */
    private handleContentType(contentTypeString:string):any{
        let arr = contentTypeString.replace(/\s+/g,'').split(';');
        let obj:any = {};
        for(let t of arr){
            if(t.startsWith('boundary=')){
                let a = t.split('=');
                obj.boundary = a[1];
            }else if(t.startsWith('charset=')){
                let a = t.split('=');
                obj.charset = a[1];
            }else if(t.indexOf('=') === -1){
                obj.type = t;
            }
        }
        return obj;
    }
}
