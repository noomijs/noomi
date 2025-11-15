/**
 * 实例属性
 * 
 * @public
 */
export interface InstanceProperty{
    /**
     * 属性名
     */
    name: string;
    /**
     * 引用实例名
     */
    ref: string;
}

/**
 * 实例配置对象
 * 
 * @public
 */
export interface InstanceOption {
    /**
     * 单例模式，如果为true，表示该类只创建一个实例，调用时，共享调用
     */
    singleton?: boolean;
    /**
     * 参数数组，实例化时需要传入的参数
     */
    params?: Array<unknown>;
}

/**
 * 实例对象，实例工厂中的存储元素
 * 
 * @public
 */
export interface InstanceItem {
    /**
     * 实例对象
     */
    instance?: unknown;
    /**
     * 类引用
     */
    class?: unknown;
    /**
     * 单例标志
     */
    singleton?: boolean;
    /**
     * 构造器参数
     */
    params?: Array<unknown>;
    /**
     * 需要注入的属性列表
     */
    properties?: Map<string, unknown>;
}

/**
 * 注入参数对象，用于存储待注入对象的参数
 * 
 * @public
 */
export interface InjectItem {
    /**
     * 待注入实例
     */
    instance?: unknown,
    /**
     * 待注入类
     */
    clazz?: unknown,
    /**
     * 待注入属性名
     */
    propName: string,
    /**
     * 注入实例名
     */
    injectName: string
}