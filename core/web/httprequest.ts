import { IncomingMessage, ServerResponse} from "http";
import { SessionFactory, Session } from "./sessionfactory";
import { HttpResponse } from "./httpresponse";
import { WebConfig } from "./webconfig";
import { WriteStream, fstat } from "fs";
import { App } from "../tools/application";
import { Util } from "../tools/util";
import { Socket } from "net";

/**
 * request类
 * @remarks
 * 在IncomingMessage基础上增加了参数解析等方法，更适合直接使用
 */
class HttpRequest extends IncomingMessage{
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
    parameters:object = new Object();
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
        try{
            let obj = await this.formHandle();
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
        }catch(e){
            console.error(e);
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
    getAllParameters():object{
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
    formHandle():Promise<object>{
        let req:IncomingMessage = this.srcReq;
        let contentString = req.headers['content-type'];
        let contentType:string[];
        //multipart/form-data 提交
        let isMultiple:boolean = false;
        //非文件multipart/form-data方式
        if(contentString){
            contentType = contentString.split(';');
            isMultiple = contentType[0] === 'multipart/form-data';
        }
        
        if(!isMultiple){
            return new Promise((resolve,reject)=>{
                let lData:Buffer = Buffer.from('');
                req.on('data',(chunk:Buffer)=>{
                    lData = Buffer.concat([lData,chunk]);
                });
                req.on('end',()=>{
                    let r;
                    //处理charset
                    let charset:string = 'utf8';
                    if(contentType && contentType.length>1){
                        let a1:string[] = contentType[1].split('=');
                        if(a1.length>1){
                            charset = a1[1].trim();
                        }
                    }
                    let data:string = lData.toString(<BufferEncoding>charset);
                    if(contentType && contentType[0] === 'application/json'){
                        r = JSON.parse(data);
                    }else{
                        r = App.qs.parse(data);
                    }
                    resolve(r);
                });
            });
        }

        let contentLen:number = parseInt(req.headers['content-length']);
        let maxSize:number = WebConfig.get('upload_max_size');
        
        //不能大于max size
        if(maxSize > 0 && contentLen > maxSize){
            return Promise.reject( "上传内容大小超出限制");
        }
        //临时目录，默认 /upload/tmp
        let tmpDir:string = WebConfig.get('upload_tmp_dir') || '/upload/tmp';
        let tmpDir1 = Util.getAbsPath([tmpDir]);
        //如果临时目录不存在，则生成临时目录
        if(!App.fs.existsSync(tmpDir1)){
            App.fs.mkdirSync(tmpDir1,{recursive:true});
        }

        let formHandler = new FormDataHandler(tmpDir);
        
        return new Promise((resolve,reject)=>{
            req.on('data',(chunk:Buffer)=>{
                formHandler.getSeparatorAndLineBreak(chunk);
                formHandler.addBuf(chunk);
                App.fs.writeFileSync('log.txt','\r\n$$ttt\r\n' + chunk.toString(),{flag:'a+'});
            });
            req.on('end',()=>{
                //最后一行数据
                resolve(formHandler.returnObj);
            });
        });
    }
}
/**
 * form 数据处理类
 */
class FormDataHandler{
    /**
     * 当前字段名
     */
    dataKey:string;
    /**
     * 当前字段值
     */
    value:Buffer|object;
    /**
     * 属性分隔符
     */
    dispLine:Buffer;
    /**
     * 换行符
     */
    rowChar:string;
    /**
     * 属性集
     */
    returnObj:object = {};
    /**
     * 缓冲池
     */
    buffers:Buffer[] = [];
    /**
     * 正在处理标志
     */
    handling:boolean;
    /**
     * 当前属性是否为文件
     */
    isFile:boolean;
    /**
     * 文件保存路径
     */
    savePath:string;
    
    constructor(path:string){
        this.savePath = path;
    }

    addBuf(buf:Buffer){
        this.buffers.push(buf);
        this.handleBuffer();
    }
    /**
     * 获取分隔符和换行符
     * @param buf   来源buffer
     * @returns     [属性分隔符,换行符]
     */
    getSeparatorAndLineBreak(buf:Buffer){
        if(this.dispLine){
            return;
        }
        let i = 0;
        for(i=0;i<buf.length;i++){
            if(buf[i] === 13){
                if(i<buf.length-1 && buf[i+1] === 10){
                    this.rowChar = '\r\n';
                }else{
                    this.rowChar = '\r';
                }
                break;
            }else if(buf[i] === 10){
                this.rowChar = '\n';
                break;
            }
        }
        this.dispLine = buf.subarray(0,i);
    }

    /**
     * 处理缓冲区
     */
    async handleBuffer(){
        if(this.handling || this.buffers.length === 0){
            return true;
        }
        
        let buf = this.buffers.shift();
        while(buf.length>0){
            let index = buf.indexOf(this.dispLine);
            //无分隔符，表示属性值从上一帧数据延续
            if(index === -1){
                if(!this.dataKey){
                    return;
                }
                if(this.isFile){
                    App.fs.writeFileSync(this.value['path'],buf,{encoding:'binary',flag:'a+'});
                }else {
                    this.value = Buffer.concat([<Buffer>this.value,buf]);
                }
                break;
            }
            //去掉换行符
            let buf1 = buf.subarray(0,index-this.rowChar.length);
            //如果键已存在，则作为数组
            if(this.dataKey){
                //文件结束
                if(this.isFile){
                    App.fs.writeFileSync(this.value['path'],buf1,{encoding:'binary',flag:'a+'});
                }else { //值加
                    this.value = Buffer.concat([<Buffer>this.value,buf1]);
                }
            
                //buffer需要转换为数组
                let v:any = this.value;
                if(v instanceof Buffer){
                    v = v.toString();
                }
            
                if(this.returnObj.hasOwnProperty(this.dataKey)){
                    //新建数组
                    if(!Array.isArray(this.returnObj[this.dataKey])){
                        this.returnObj[this.dataKey] = [this.returnObj[this.dataKey]];
                    }
                    //新值入数组
                    this.returnObj[this.dataKey].push(v);
                }else{
                    this.returnObj[this.dataKey] = v;
                }
            }
            //重置参数
            this.isFile = false;
            this.value = undefined;
        
            let start = index + this.dispLine.length;
            //结束符号
            if(buf[start]===45 && buf[start+1]===45){
                break;
            }
            buf = buf.subarray(start + this.rowChar.length);
            let r = this.readLine(buf);
            if(!r){
                break;
            }

            this.handleProp(r[0]);
            buf=r[1];
            if(this.isFile){//是文件，取文件类型
                r = this.readLine(buf);
                if(!r || r[0] === ''){
                    return;
                }
                this.value['fileType'] = r[0].substr(r[0].indexOf(':')+1).trim();
                buf=r[1];
            }else{
                this.value = Buffer.from('');
            }
            //读空行
            r = this.readLine(buf);
            if(r){
                buf = r[1];
            }
        }

        this.handling = false;
        //继续处理
        this.handleBuffer();
    }

    /**
     * 从buffer读一行
     * @param buf   buf
     * @returns     [行字符串,读取行后的buf]
     */
    readLine(buf:Buffer):any[]{
        let index = buf.indexOf(this.rowChar);
        if(index === -1){
            return null;
        }
        let r = buf.subarray(0,index).toString();
        buf = buf.subarray(index + this.rowChar.length);
        return [r,buf];
    }
    /**
     * 处理属性名
     * @param line  行数据
     */
    handleProp(line:string){
        if(line === ''){
            return;
        }
        let arr = line.toString().split(';');
        //数据项
        this.dataKey = arr[1].substr(arr[1].indexOf('=')).trim();
        this.dataKey = this.dataKey.substring(2,this.dataKey.length-1);
        if(arr.length === 3){  //文件
            let a1 = arr[2].split('=');
            let fn = a1[1].trim();
            let fn1 = fn.substring(1,fn.length-1);
            let fn2 = App.uuid.v1() + fn1.substr(fn1.lastIndexOf('.'));
            //得到绝对路径
            let filePath = Util.getAbsPath([this.savePath,fn2]);
            this.value = {
                fileName:fn1,
                path:filePath
            };
            this.isFile = true;
        }
    }
}

export{HttpRequest}