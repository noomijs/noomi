import { IncomingMessage, ServerResponse} from "http";
import { SessionFactory, Session } from "./sessionfactory";
import { HttpResponse } from "./httpresponse";
import { WebConfig } from "./webconfig";
import { WriteStream } from "fs";
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
        let obj = await this.formHandle();;
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
        //非文件multipart/form-data方式
        let contentType:string[] = req.headers['content-type'].split(';');
        if(contentType[0] !== 'multipart/form-data'){
            return new Promise((resolve,reject)=>{
                let lData:Buffer = Buffer.from('');
                req.on('data',(chunk:Buffer)=>{
                    lData = Buffer.concat([lData,chunk]);
                });
                req.on('end',()=>{
                    let r;
                    //处理charset
                    let charset:string = 'utf8';
                    if(contentType.length>1){
                        let a1:string[] = contentType[1].split('=');
                        if(a1.length>1){
                            charset = a1[1].trim();
                        }
                    }
                    let data:string = lData.toString(charset);
                    if(contentType[0] === 'application/json'){
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
        let tmpDir:string = WebConfig.get('upload_tmp_dir');
        
        //不能大于max size
        if(maxSize > 0 && contentLen > maxSize){
            return Promise.reject( "上传内容大小超出限制");
        }

        let dispLineNo:number = 0;          //字段分割行号，共三行
        let isFile:boolean = false;         //是否文件字段
        let dataKey:string;                 //字段名
        let value:string|object;            //字段值
        let dispLine:Buffer;                //分割线
        let startField:boolean = false;     //新字段开始
        let returnObj:object = {};          //返回对象
        let writeStream:WriteStream;        //输出流
        let oldRowChar:string='';           //上一行的换行符
        
        return new Promise((resolve,reject)=>{
            let lData:Buffer;
            let flag = false;
            req.on('data',(chunk:Buffer)=>{
                if(!flag){
                    flag = true;
                }
                lData = handleBuffer(chunk,lData);
            });
            req.on('end',()=>{
                //最后一行数据
                if(lData){
                    handleLine(lData);
                }
                resolve(returnObj);
            });
        });
        
        /**
         * 处理缓冲区
         * @param buffer        缓冲区 
         * @param lastData      行开始缓冲区
         */
        function handleBuffer(buffer:Buffer,lastData?:Buffer):Buffer{
            let rowStartIndex:number = 0;  //行开始位置
            let i:number = 0;
            for(;i<buffer.length;i++){
                let rowChar = '';
                let ind = i;
                if(buffer[i] === 13){
                    if(i<buffer.length-1 && buffer[i+1] === 10){
                        i++;
                        rowChar = '\r\n';
                    }else{
                        rowChar = '\r';
                    }
                }else if(buffer[i] === 10){
                    rowChar = '\n';
                }
                //处理行
                if(rowChar !== ''){
                    let newBuf:Buffer = buffer.subarray(rowStartIndex,ind);
                    if(lastData){
                        newBuf = Buffer.concat([lastData,newBuf]);
                        lastData = undefined;
                    }
                    handleLine(newBuf,rowChar);
                    rowChar = '';
                    rowStartIndex = ++i;
                }
            }
            
            //最末没出现换行符，保存下一行
            if(rowStartIndex<buffer.length-1){
                return buffer.subarray(rowStartIndex);
            }
        }
        
        /**
         * 处理行
         * @param lineBuffer    行buffer
         * @param rowChar       换行符 
         */
        function handleLine(lineBuffer:Buffer,rowChar?:string){
            //第一行，设置分割线
            if(!dispLine){
                dispLine = lineBuffer;
                startField = true;
                dispLineNo = 1;
                return;
            }
            
            //字段结束
            if(dispLine.length === lineBuffer.length && dispLine.equals(lineBuffer) || 
                dispLine.length+2 === lineBuffer.length && dispLine.equals(lineBuffer.subarray(0,dispLine.length))){  //新字段或结束
                //关闭文件流
                if(isFile){
                    writeStream.end();
                }

                if(returnObj.hasOwnProperty(dataKey)){
                    //新建数组
                    if(!Array.isArray(returnObj[dataKey])){
                        returnObj[dataKey] = [returnObj[dataKey]];
                    }
                    //新值入数组
                    returnObj[dataKey].push(value);
                }else{
                    returnObj[dataKey] = value;
                }
                startField = true;
                dispLineNo = 1;
                isFile = false;
                value = '';
                oldRowChar = '';
                return;
            }else if(oldRowChar !== ''){//写之前的换行符
                //写换行符
                if(isFile){ //文件换行符
                    writeStream.write(oldRowChar);
                }else{ //值换行符
                    value += oldRowChar;
                }
            }
            oldRowChar = '';
            
            if(startField){
                //buffer转utf8字符串
                let line = lineBuffer.toString();
                //第一行
                switch(dispLineNo){
                    case 1:  //第一行
                        dispLineNo = 2;
                        let arr = line.split(';');  
                        //数据项
                        dataKey = arr[1].substr(arr[1].indexOf('=')).trim();
                        dataKey = dataKey.substring(2,dataKey.length-1);
                        if(arr.length === 3){  //文件
                            let a1 = arr[2].split('=');
                            let fn = a1[1].trim();
                            let fn1 = fn.substring(1,fn.length-1);
                            let fn2 = App.uuid.v1() + fn1.substr(fn1.lastIndexOf('.'));
                            let filePath = Util.getAbsPath([tmpDir,fn2]);
                            value = {
                                fileName:fn1,
                                path:filePath
                            };
                            writeStream = App.fs.createWriteStream(filePath,'binary');
                            isFile = true;  
                        }
                        return;
                    case 2: //第二行（空或者文件类型）
                        if(isFile){  //文件字段
                            value['fileType'] = line.substr(line.indexOf(':')).trim();
                        }
                        dispLineNo = 3;
                        return;
                    case 3: //第三行（字段值或者空）
                        if(!isFile){
                            value = line; 
                        }
                        startField = false;
                        return;
                }
            } else{
                if(rowChar){
                    oldRowChar = rowChar;
                }
                if(isFile){  //写文件
                    writeStream.write(lineBuffer);
                }else{  //普通字段（textarea可能有换行符）
                    value += lineBuffer.toString();
                }
            }   
        }
    }
}

export{HttpRequest}