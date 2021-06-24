import { App } from "../tools/application";
import { Util } from "../tools/util";

/**
 * form 参数处理器
 */
export class PostFormHandler{
    /**
     * 分隔符
     */
    private boundary:Buffer;

    /**
     * 换行符
     */
    private lineBreak:string;

    /**
     * 文件存储路径
     */
    private saveDir:string;
    /**
     * 属性名
     */
    private propName:string;

    /**
     * 开始读数据值
     */
    private valueStarted:boolean;

    /**
     * 当前帧
     */
    private buf:Buffer;
    
    /**
     * 值
     */
    private value:any;

    /**
     * 返回对象
     */
    private returnObj:any;

    /**
     * 当前属性为文件类型
     */
    private isFile:boolean;

    /**
     * @param boundary      属性分隔符
     * @param tmpDir        文件临时存储路径
     */
    constructor(boundary:string,tmpDir:string){
        if(boundary){
            this.boundary =  Buffer.from('--'+ boundary);
        }
        this.saveDir = tmpDir;
        this.returnObj = {}
    }

    /**
     * 处理buf
     * @param buf  新缓冲区
     */
    public handleBuf(buf:Buffer){
        //获取换行符，首次执行时处理
        this.getLineBreak(buf);

        let buf1 = this.buf?Buffer.concat([this.buf,buf]):buf;
        let ind:number = buf1.indexOf(this.boundary);
        if(ind !== -1){
            while((ind=buf1.indexOf(this.boundary)) !== -1){
                if(this.valueStarted) { //有值
                    //待写内容
                    let buf2 = buf1.subarray(0,ind-this.lineBreak.length);
                    if(this.isFile){
                        if(this.value.fileName){ //文件
                            App.fs.writeFileSync(this.value.path,buf2,{flag:'a+'});
                        }
                    }else{ //普通串
                        this.value = (this.value?Buffer.concat([this.value,buf2]):buf2).toString();
                    }
                    //属性值绑定到属性名，如果属性名已存在，则作为数组
                    if(this.returnObj.hasOwnProperty(this.propName)){
                        //新建数组
                        if(!Array.isArray(this.returnObj[this.propName])){
                            this.returnObj[this.propName] = [this.returnObj[this.propName]];
                        }
                        //新值入数组
                        this.returnObj[this.propName].push(this.value);
                    }else{
                        this.returnObj[this.propName] = this.value;
                    }
                    //处理完当前属性，参数还原
                    this.propName = undefined;
                    this.value = undefined;
                    this.valueStarted = undefined;
                    this.isFile = undefined;
                }
                //处理属性名
                //去掉boundary
                this.buf = buf1.subarray(ind+this.boundary.length+this.lineBreak.length);
                //取属性
                this.handleNewProp();
                //更新buf1
                buf1 = this.buf;
            }
        }else if(this.valueStarted){ //有值
            if(this.isFile){
                if(this.buf && this.value.fileName){ //当前为文件
                    //直接把上一帧写文件
                    App.fs.writeFileSync(this.value.path,this.buf,{flag:'a+'});
                    //保留当前帧
                    this.buf = buf;
                }
            }else{ //不是文件，添加到buf
                this.buf = buf1;
            }
        }else{
            this.buf = buf;
            this.handleNewProp();
        }
    }

    /**
     * 获取换行符
     * @param buf   来源buffer
     * @returns
     */
    private getLineBreak(buf:Buffer){
        if(this.lineBreak){
            return;
        }
        this.lineBreak = buf.indexOf('\r\n') === -1?'\n':'\r\n';
        let buf1 = buf;
        while(!this.boundary && buf1.length>0){
            let ind = buf1.indexOf(this.lineBreak);
            if(ind === -1){
                return;
            }
            let buf2 = buf1.subarray(0,ind);
            let line = buf2.toString().trim();
            if(line.startsWith('--')){
                this.boundary = Buffer.from(line);
                break;
            }
            buf1 = buf1.subarray(ind+this.lineBreak.length);
        }
 }
    /**
     * 从buffer读一行
     * @param buf   buf
     * @returns     行字符串
     */
    private readLine():string{
        if(!this.buf || this.buf.length === 0){
            return null;
        }
        let index = this.buf.indexOf(this.lineBreak);
        if(index === -1){
            return null;
        }
        let r = this.buf.subarray(0,index).toString();
        this.buf = this.buf.subarray(index + this.lineBreak.length);
        return r;
    }

    /**
     * 处理新属性
     * 包括属性名、文件类型，值前的空行
     */
    private handleNewProp(){
        if(this.valueStarted){
            return;
        }
        //取属性
        while(this.buf.length>0 && !this.propName){
            this.handleProp();
        }
        if(this.value && this.value.fileName){
            while(this.buf.length>0 && !this.value.fileType){
                this.handleFileType();
            }
            if(this.value.fileType){
                let r;
                while((r=this.readLine()) !== null){
                    if(r === ''){
                        this.valueStarted = true;
                        break;
                    }
                }
            }
        }else if(this.readLine() !== null){
            this.valueStarted = true;
        }
    }
    /**
     * 处理文件类型
     */
    private handleFileType(){
        let line = this.readLine();
        if(!line || line === ''){
            return;
        }
        this.value['fileType'] = line.substr(line.indexOf(':')+1).trim();
    }
    /**
     * 处理属性名
     */
    private handleProp(){
        let line = this.readLine();
        if(!line || line === ''){
            return;
        }
        let arr = line.toString().split(';');
        //数据项名
        let pn = arr[1].substr(arr[1].indexOf('=')).trim();
        this.propName = pn.substring(2,pn.length-1);
        if(arr.length > 2){  //文件
            for(let i=2;i<arr.length;i++){
                let s = arr[i].trim();
                if(s.startsWith('filename=')){
                    this.isFile = true;
                    let a1 = s.split('=');
                    //文件名为空，此项不存
                    if(a1[1] == '""'){
                        this.value = {};
                        return;
                    }
                    let fn = a1[1];
                    let fn1 = fn.substring(1,fn.length-1).trim();
                    let fn2 = App.uuid.v1() + fn1.substr(fn1.lastIndexOf('.'));
                    //得到绝对路径
                    let filePath = Util.getAbsPath([this.saveDir,fn2]);
                    this.value = {
                        fileName:fn1,
                        path:filePath
                    };
                }
            }
        }
    }

    /**
     * 获取result
     * @returns     参数值对象
     */
    public getResult(){
        return this.returnObj;
    }
}