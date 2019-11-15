/**
 * 页面工厂
 */
declare class PageFactory {
    static errorPages: any;
    /**
     * 添加错误提示页
     * @param code      错误码
     * @param url       页面地址
     */
    static addErrorPage(code: number, url: string): void;
    /**
     * 获取错误提示页
     * @param code      错误码
     */
    static getErrorPage(code: number): any;
}
export { PageFactory };
