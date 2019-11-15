/**
 * web 配置
 */
export declare class WebConfig {
    static config: any;
    static useServerCache: boolean;
    /**
     * 获取参数
     * @param name
     */
    static get(name: string): any;
    static init(config: any): void;
    /**
     * 解析路由文件
     * @param path  文件路径
     * @param ns    命名空间，默认 /
     */
    static parseFile(path: string): void;
    /**
     * 设置异常提示页面
     * @param pages page配置（json数组）
     */
    static setErrorPages(pages: Array<any>): void;
}
