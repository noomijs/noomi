declare class ErrorFactory {
    static errMap: Map<string, string>;
    static language: string;
    /**
     * 获取异常
     * @param errNo     异常码
     */
    static getError(errNo: string, param?: Array<any>): any;
    /**
     * 异常初始化
     */
    static init(language: any): void;
}
/**
 * Noomi异常类
 */
declare class NoomiError extends Error {
    code: string;
    constructor(code: string, param?: any);
}
export { ErrorFactory, NoomiError };
