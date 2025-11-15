/**
 * log 配置项
 * 
 * @public
 */
export interface LogOption {
    /**
     * 日志记录类型
     */
    type?:LogRecordType;

    /**
     * 表达式
     */
    expression?:string[]|string;
}

/**
 * 日志记录类型
 * 
 * @public
 */
export enum  LogRecordType {
    /**
     * 控制台
     */
    "CONSOLE" = 0,

    /**
     * 文件
     */
    "FILE" = 1
}