import { IncomingMessage, ServerResponse} from "http";
import { SessionFactory, Session } from "./sessionfactory";
import { HttpResponse } from "./httpresponse";
import { WebConfig } from "./webconfig";
import { WriteStream } from "fs";
import { App } from "../tools/application";
import { Util } from "../tools/util";

class HttpRequest extends IncomingMessage{
    srcReq:IncomingMessage;             //源request
    response:HttpResponse;            //response
    parameters:object = new Object();      //参数
    
    constructor(req:IncomingMessage,res:ServerResponse){
        super(req.socket);
        this.srcReq = req;
        //response 初始化
        this.response = new HttpResponse(req);
        this.response.init(this,res);
        this.url = req.url;
        this.method = req.method;
        this.initQueryString();
    }

    /**
     * 初始化
     * @return     promise 请求参数
     */
    async init():Promise<object>{
        //非 post
        if(this.method !== 'POST'){
            return this.parameters;
        }
        let obj = await this.formHandle(this.srcReq);;
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
     * 获取header信息
     * @param key       header参数 name
     */
    getHeader(key:string):string | string[] | undefined{
        return this.srcReq.headers[key];
    }

    /**
     * 获取请求方法
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
     * @return          参数值
     */
    getParameter(name:string):string{
        return this.parameters[name];
    }

    /**
     * 获取所有paramter
     * @return          parameter object
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
     * @param request   httprequest
     * @return          session
     */
    async getSession():Promise<Session>{
        return await SessionFactory.getSession(this);
    }

    /**
     * 处理输入流
     * @param stream 
     */ 
    formHandle(req:IncomingMessage):Promise<object>{
        //非文件multipart/form-data方式
        if(req.headers['content-type'].indexOf('multipart/form-data') === -1){
            return new Promise((resolve,reject)=>{
                let lData:Buffer = Buffer.from('');
                req.on('data',(chunk:Buffer)=>{
                    lData = Buffer.concat([lData,chunk]);
                });
                req.on('end',()=>{
                    let r = App.qs.parse(lData.toString('utf8'))
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
        let returnObj:object = {};             //返回对象
        let writeStream:WriteStream;        //输出流
        let oldRowChar:string='';              //上一行的换行符
        
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