/**
 * cookie 类
 */
export declare class HttpCookie {
    params: Map<string, string>;
    constructor();
    /**
     * 设置值
     * @param key       键
     * @param value     值
     */
    set(key: string, value: string): void;
    /**
     * 获取值
     * @param key       键
     */
    get(key: string): string;
    /**
     * 获取所有参数
     */
    getAll(): Map<string, string>;
    /**
     * 删除键
     * @param key       键
     */
    remove(key: string): void;
}
