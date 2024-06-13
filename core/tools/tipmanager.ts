import { NoomiTip_en } from "../locales/noomitip_en";
import { NoomiTip_zh } from "../locales/noomitip_zh";
import { App } from "./application";
import { Util } from "./util";

/**
 * 获取体胖信息
 */
export class TipManager{
    /**
     * 获取消息
     * @param type -    类型
     * @param code -    错误码
     * @param params -  参数
     * @returns         提示信息
     */
    private static get(type:'tip'|'error'|'model',code:string,...params):string{
        let msg:{tip,error,model};
        switch(App.language){
            case 'en':
                msg = NoomiTip_en;
                break;
            default:
                msg = NoomiTip_zh;
        }
        if(params.length>0){
            return Util.compileString(msg[type][code], ...params);
        }
        return msg[type][code];
    }

    /**
     * 获取提示信息
     * @param code -    提示码
     * @param params -  参数
     * @returns         提示信息
     */
    public static getTip(code:string, ...params):string{
        return this.get('tip',code,...params);
    }

    /**
     * 获取异常信息
     * @param code -    提示码
     * @param params -  参数
     * @returns         异常信息
     */
    public static getError(code:string, ...params):string{
        return this.get('error',code,...params) || this.get('error','0000');
    }

    /**
     * 获取模型校验或验证信息
     * @param code -    提示码
     * @param params-   参数
     * @returns         信息
     */
    public static getModel(code:string, ...params):string{
        return this.get('model',code,...params);
    }
}