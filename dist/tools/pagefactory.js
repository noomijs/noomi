"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 页面工厂
 */
class PageFactory {
    /**
     * 添加错误提示页
     * @param code      错误码
     * @param url       页面地址
     */
    static addErrorPage(code, url) {
        this.errorPages.set(code, url);
    }
    /**
     * 获取错误提示页
     * @param code      错误码
     */
    static getErrorPage(code) {
        return this.errorPages.get(code);
    }
}
exports.PageFactory = PageFactory;
PageFactory.errorPages = new Map(); //错误页面集合
//# sourceMappingURL=pagefactory.js.map