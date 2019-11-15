"use strict";
/**
 * cookie 类
 */
Object.defineProperty(exports, "__esModule", { value: true });
class HttpCookie {
    constructor() {
        this.params = new Map();
    }
    /**
     * 设置值
     * @param key       键
     * @param value     值
     */
    set(key, value) {
        this.params.set(key, value);
    }
    /**
     * 获取值
     * @param key       键
     */
    get(key) {
        return this.params.get(key);
    }
    /**
     * 获取所有参数
     */
    getAll() {
        return this.params;
    }
    /**
     * 删除键
     * @param key       键
     */
    remove(key) {
        this.params.delete(key);
    }
}
exports.HttpCookie = HttpCookie;
//# sourceMappingURL=httpcookie.js.map