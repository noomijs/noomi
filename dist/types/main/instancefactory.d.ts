/**
 * 实例工厂
 */
/**
 * 实例属性
 */
interface InstanceProperty {
    name: string;
    ref: string;
}
/**
 * 实例配置
 */
interface InstanceCfg {
    name: string;
    class?: any;
    path?: string;
    instance?: any;
    singleton?: boolean;
    params?: Array<any>;
    properties?: Array<InstanceProperty>;
}
/**
 * 实例对象
 */
interface InstanceObj {
    instance?: any;
    class?: any;
    singleton: boolean;
    params?: Array<any>;
    properties?: Array<InstanceProperty>;
}
declare class InstanceFactory {
    static factory: any;
    static mdlBasePath: Array<string>;
    static injectList: Array<any>;
    static init(config: any): void;
    /**
     * 添加单例到工厂
     * @param cfg 实例配置
     */
    static addInstance(cfg: InstanceCfg): any;
    /**
     * 添加inject
     * @param instance      实例对象
     * @param propName      属性名
     * @param injectName    注入的实例名
     *
     */
    static addInject(instance: any, propName: string, injectName: string): void;
    /**
     * 完成注入列表的注入操作
     */
    static finishInject(): void;
    /**
     * 获取实例
     * @param name  实例名
     * @param param 参数数组
     * @return      实例化的对象
     */
    static getInstance(name: string, param?: Array<any>): any;
    /**
     * 通过类获取实例
     * @param clazz     类
     * @param param     参数数组
     * @return          实例化的对象
     */
    static getInstanceByClass(clazz: any, param?: Array<any>): any;
    /**
     * 获取instance object
     * @param name instance name
     */
    static getInstanceObj(name: string): InstanceObj;
    /**
     * 执行方法
     * @param instancee     实例名或实例对象
     * @param methodName    方法名
     * @param params        参数数组
     * @param func          方法(与methodName二选一)
     */
    static exec(instance: any, methodName: string, params: Array<any>, func?: Function): any;
    /**
     * 解析实例配置文件
     * @param path      文件路径
     */
    static parseFile(path: string): void;
    /**
     * 处理配置对象
     * @param json      inistance object
     */
    private static handleJson;
    /**
     * 添加实例(从路径添加)
     * @param path
     */
    static addInstances(path: string): void;
    /**
     * 获取instance工厂
     */
    static getFactory(): any;
}
export { InstanceFactory };
