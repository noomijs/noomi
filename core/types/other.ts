/**
 * 未知类
 * 
 * @public
 */
export type UnknownClass = ()=>void;

/**
 * hook 项
 * 
 * @public
 */
export interface HookItem {
    /**
     * 实例名
     */
    clazz: UnknownClass;
    /**
     * 方法名
     */
    method: string;
    /**
     * 参数数组
     */
    params?: unknown[];
}

/**
 * 通用有效数据类型
 * 
 * @public
 */
export type CommonDataType = 'string'|'number'|'int'|'float'|'boolean'|'date'|'time'|'datetime'|'object'|'array';

/**
 * 属性配置
 * @remarks
 * 用于模型的属性定义
 * 
 * @public
 */
export interface PropOption {
    /**
     * 属性类型
     */
    type?:CommonDataType;
    /**
     * 校验器验证集或验证名(无参数形式)
     * @remarks
     * 结构为：
     * ```json
     * {
     *      校验器名:参数数组(可以是空数组)
     *      ...
     * }
     * 校验器名可以是noomi内置的校验器，或校验模型的校验方法（在模型类中定义）
     * ```
     */
    validator?:object|string;
}