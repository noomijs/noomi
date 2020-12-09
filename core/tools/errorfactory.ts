import { NoomiTip,NoomiErrorTip } from "../locales/noomitip";
import { Util } from "./util";
import { App } from "./application";

/**
 * 异常工厂
 * @remarks
 * 用于异常信息管理和异常信息处理
 */
class ErrorFactory{
    /**
     * 异常信息map，键为异常码，值为异常信息
     */
    private static errMap:Map<string,string> = new Map();
    /**
     * 异常提示语言
     */
    private static language:string='zh';
    /**
     * 获取异常
     * @param errNo     异常码
     * @param param     参数值数组，用于处理消息带参数的情况
     * @returns         {code:异常码,message:异常信息}    
     */
    public static getError(errNo:string,param?:Array<any>):any{
        //默认为未知错误
        let errObj:object = NoomiErrorTip[App.language];
        if(!errObj.hasOwnProperty(errNo)){
            errNo = "0000";   
        }
        let msg = errObj[errNo];
        msg = Util.compileString(msg,param);
        return {
            code:errNo,
            message:msg
        }
    }

    /**
     * 异常初始化
     * @param language  异常提示语言
     */
    // public static init(language){
    //     this.language = language;
    //     let json:object;
    //     switch(language){
    //         case 'zh':
    //             json = NoomiErrorTip_zh;
    //             break;
    //         case 'en':
    //             json = NoomiErrorTip_en;
    //             break;
    //     }
        
    //     if(json !== undefined){
    //         //object 转 map
    //         for(let o of Object.getOwnPropertyNames(json)){
    //             this.errMap.set(o,json[o]);
    //         }
    //     }
    // }
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