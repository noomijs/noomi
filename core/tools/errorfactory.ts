import { NoomiErrorTip_zh } from "../locales/msg_zh";
import { NoomiErrorTip_en } from "../locales/msg_en";

/**
 * 异常工厂
 * @remarks
 * 用于异常信息管理和异常信息处理
 */
class ErrorFactory{
    /**
     * 异常信息map，键为异常码，值为异常信息
     */
    static errMap:Map<string,string> = new Map();
    /**
     * 异常提示语言
     */
    static language:string='zh';
    /**
     * 获取异常
     * @param errNo     异常码
     * @param param     参数值数组，用于处理消息带参数的情况
     * @returns         {code:异常码,message:异常信息}    
     */
    static getError(errNo:string,param?:Array<any>):any{
        //默认为未知错误
        if(!this.errMap.has(errNo)){
            errNo = "0000";   
        }
        let msg = this.errMap.get(errNo);
        let reg = /\$\{.+?\}/g;
        let r;
        //处理消息中的参数
        while((r=reg.exec(msg)) !== null){
            let index = r[0].substring(2,r[0].length-1).trim();
            if(index && index !== ''){
                index = parseInt(index);
            }
            msg = msg.replace(r[0],param[index]);
        }
        return {
            code:errNo,
            message:msg
        }
    }
    /**
     * 异常初始化
     * @param language  异常提示语言
     */
    static init(language){
        this.language = language;
        let json:object;
        switch(language){
            case 'zh':
                json = NoomiErrorTip_zh;
                break;
            case 'en':
                json = NoomiErrorTip_en;
                break;
        }
        
        if(json !== undefined){
            //object 转 map
            for(let o of Object.getOwnPropertyNames(json)){
                this.errMap.set(o,json[o]);
            }
        }
    }
}

/**
 * Noomi异常类
 * @remarks
 * 用于产生异常信息
 */
class NoomiError extends Error{
    code:string;
    /**
     * 构造器
     * @param code      异常码 
     * @param param     参数或参数数组
     */
    constructor(code:string,param?:any){
        if(param && !Array.isArray(param)){
            param = [param]
        }
        let o = ErrorFactory.getError(code,param);
        super(o.message);
        this.code = o.code;
    }
}

export {ErrorFactory,NoomiError}