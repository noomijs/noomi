/**
* Aop 代理类
*/
declare class AopProxy {
    /**
     *
     * @param instanceName  实例名
     * @param methodName    方法名
     * @param func          执行函数
     * @param instance      实例
     */
    static invoke(instanceName: string, methodName: string, func: Function, instance: any): any;
}
export { AopProxy };
