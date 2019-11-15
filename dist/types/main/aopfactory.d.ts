/**
 * AOP 工厂
 */
/**
 * 通知
 */
interface AopAdvice {
    pointcut_id?: string;
    type: string;
    method: string;
    instance: any;
}
/**
 * 切面
 */
interface AopAspect {
    instance: string;
    pointcuts: Array<AopPointcut>;
    advices: Array<AopAdvice>;
}
/**
 * aop 切点
 */
declare class AopPointcut {
    id: string;
    proxyClass: any;
    expressions: Array<RegExp>;
    advices: Array<AopAdvice>;
    constructor(id: string, expressions: Array<string>, proxyClass?: any);
    /**
     * 匹配方法是否满足表达式
     * @param instanceName  实例名
     * @param methodName    待检测方法
     * @return              true/false
     */
    match(instanceName: string, methodName: string): boolean;
    /**
     * 给切点添加通知
     * @param advice
     */
    addAdvice(advice: AopAdvice): void;
}
/**
 * aop factory
 */
declare class AopFactory {
    static aspects: any;
    static pointcuts: any;
    static needToUpdateProxy: boolean;
    /**
     * 添加切面
     */
    static addAspect(cfg: AopAspect): void;
    /**
     * 添加切点
     * @param id            切点id
     * @param expressions   方法匹配表达式数组
     * @param proxyClass    特定代理类
     */
    static addPointcut(id: string, expressions: Array<string>, proxyClass?: any): void;
    /**
     * 为pointcut添加expression
     * @param pointcutId    切点id
     * @param expression    表达式或数组
     */
    static addExpression(pointcutId: string, expression: string | Array<string>): void;
    /**
     * 添加通知
     * @param advice 通知配置
     */
    static addAdvice(advice: AopAdvice): void;
    /**
     * 解析文件
     * @param path  文件路径
     */
    static parseFile(path: string): void;
    /**
     * 初始化
     * @param config
     */
    static init(config: any): void;
    /**
     * 更新aop匹配的方法代理，为所有aop匹配的方法设置代理
     */
    static updMethodProxy(): void;
    /**
     * 通过正则式给方法加代理
     * @param expr          表达式正则式
     * @param instances     处理过的instance name
     */
    static addProxyByExpression(expr: RegExp, instances?: Array<string>): void;
    /**
     * 获取切点
     * @param instanceName  实例名
     * @param methodName    方法名
     * @return              pointcut array
     */
    static getPointcut(instanceName: string, methodName: string): Array<AopPointcut>;
    /**
     * 根据id获取切点
     * @param pointcutId    pointcut id
     * @return              pointcut
     */
    static getPointcutById(pointcutId: string): AopPointcut;
    /**
     * 获取advices
     * @param instanceName  实例名
     * @param methodName    方法名
     * @return              {
     *                          before:[{instance:切面实例,method:切面方法},...]
     *                          after:[{instance:切面实例,method:切面方法},...]
     *                          return:[{instance:切面实例,method:切面方法},...]
     *                          throw:[{instance:切面实例,method:切面方法},...]
     *                      }
     */
    static getAdvices(instanceName: string, methodName: string): object;
}
export { AopFactory };
