/**
 * log 配置项
 */
export type LogOption = {
    type?:'default'|'file';
    expression?:string[]|string;
}