import { TipManager } from "./tipmanager";

/**
 * Noomi异常类
 * @remarks
 * 用于产生异常信息
 */
export class NoomiError extends Error {
    /**
     * 错误码
     */
    code: string;

    /**
     * 构造器
     * @param code -      异常码或异常对象/信息等
     * @param params -    参数
     */
    constructor(code: unknown, ...params) {
        let msg;
        const tp = typeof code;
        //数字串，从异常消息获取
        if(tp === 'string' && /^\d+$/.test(<string>code)){
            msg = TipManager.getError(<string>code, ...params);
            super(msg);
            this.message = msg;
            this.code = <string>code;
        }else{
            super();
            this.message = <string>code;        
        }
    }
}