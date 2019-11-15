"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const msg_zh_1 = require("../locales/msg_zh");
const msg_en_1 = require("../locales/msg_en");
class ErrorFactory {
    /**
     * 获取异常
     * @param errNo     异常码
     */
    static getError(errNo, param) {
        //默认为未知错误
        if (!this.errMap.has(errNo)) {
            errNo = "0000";
        }
        let msg = this.errMap.get(errNo);
        let reg = /\$\{.+?\}/g;
        let r;
        //处理消息中的参数
        while ((r = reg.exec(msg)) !== null) {
            let index = r[0].substring(2, r[0].length - 1).trim();
            if (index && index !== '') {
                index = parseInt(index);
            }
            msg = msg.replace(r[0], param[index]);
        }
        return {
            code: errNo,
            message: msg
        };
    }
    /**
     * 异常初始化
     */
    static init(language) {
        this.language = language;
        let json;
        switch (language) {
            case 'zh':
                json = msg_zh_1.NoomiErrorTip_zh;
                break;
            case 'en':
                json = msg_en_1.NoomiErrorTip_en;
                break;
        }
        if (json !== undefined) {
            //object 转 map
            for (let o of Object.getOwnPropertyNames(json)) {
                this.errMap.set(o, json[o]);
            }
        }
    }
}
exports.ErrorFactory = ErrorFactory;
ErrorFactory.errMap = new Map();
ErrorFactory.language = 'zh';
/**
 * Noomi异常类
 */
class NoomiError extends Error {
    constructor(code, param) {
        if (param && !Array.isArray(param)) {
            param = [param];
        }
        let o = ErrorFactory.getError(code, param);
        super(o.message);
        this.code = o.code;
    }
}
exports.NoomiError = NoomiError;
//# sourceMappingURL=errorfactory.js.map