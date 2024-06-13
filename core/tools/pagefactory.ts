/**
 * 页面工厂
 * @remarks
 * 用于管理页面及路径
 */
export class PageFactory {
    /**
     * 错误页面集合
     */
    static errorPages: Map<number, string> = new Map();

    /**
     * 添加错误提示页
     * @param code -      错误码
     * @param url -       页面地址
     */
    static addErrorPage(code: number, url: string) {
        this.errorPages.set(code, url);
    }

    /**
     * 获取错误提示页
     * @param code -      错误码
     * @returns         错误码对应的页面url
     */
    static getErrorPage(code: number): string {
        return this.errorPages.get(code);
    }
}