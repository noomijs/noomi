interface FilterConfig {
    instance_name?: string;
    method_name?: string;
    url_pattern?: any;
    instance?: any;
    order?: number;
}
/**
 * filter
 */
interface Filter {
    instance: any;
    method: string;
    patterns: Array<RegExp>;
    order: number;
}
/**
 * 过滤器工厂类
 */
declare class FilterFactory {
    static filters: Array<Filter>;
    /**
     * 添加过滤器到工厂
     * @param name          过滤器名
     * @param instanceName  实例名
     */
    static addFilter(cfg: FilterConfig): void;
    /**
     * 文件解析
     * @param path      filter的json文件
     */
    static parseFile(path: string): void;
    /**
     * 初始化
     * @param config
     */
    static init(config: any): void;
    /**
     * 获取过滤器链
     * @param url   url
     * @returns     filter名数组
     */
    static getFilterChain(url: string): Array<Filter>;
    /**
     * 执行过滤器链
     * @param url       url路径
     * @param request   httprequest
     * @param response  httpresponse
     * @param           promise boolean
     */
    static doChain(url: string, request: any, response: any): Promise<boolean>;
}
export { FilterFactory };
