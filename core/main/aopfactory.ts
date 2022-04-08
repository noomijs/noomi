import { InstanceFactory } from "./instancefactory";
import { AopProxy } from "./aopproxy";
import { NoomiError } from "../tools/errorfactory";
import { TransactionManager } from "../database/transactionmanager";
import { Util } from "../tools/util";

/**
 * Aop通知类型
 */
interface IAopAdvice {
    /**
     * 切点
     */
    pointcutId?: string;

    /**
     * 类名
     */
    clazz?: any;

    /**
     * 通知类型 (before,after,after-return,after-throw,around)
     */
    type: string;
    /**
     * 对应的切面方法
     */
    method: string;
}

/**
 * Aop切面类型
 */
interface IAopAspect {
    /**
     * 实例名
     */
    instance?: string;
    /** 
     * 切点数组 
     */
    pointcuts: Array<AopPointcut>;
    /** 
     * 通知数组
     */
    advices: Array<IAopAdvice>;
}

/** 
 * 切点数据对象
 */
interface IAopPointcut {
    /**
     * 类
     */
    clazz: any;
    /**
     * 切点id
     */
    id: string;
    /**
     * 表达式串
     */
    expressions?: Array<string>;
}

/**
 * @exclude
 * aop文件配置对象
 */
interface IAopCfg {
    files: Array<string>;            //引入文件
    pointcuts: Array<IAopPointcut>;     //切点集合
    aspects: Array<IAopAspect>;      //切面集合
}

/**
 * aop 切点类
 */
class AopPointcut {
    /**
     * 切点id
     */
    id: string;

    /**
     * 实例名
     */
    // instanceName: string;

    /**
     * 切面类
     */
    aspectClazz: any;

    /**
     * 表达式数组（正则表达式）
     */
    expressions: Array<RegExp> = [];

    /**
     * 通知数组
     */
    advices: Array<IAopAdvice> = [];

    /**
     * 构造器
     * @param id            切点id(实例内唯一) 
     * @param instanceName  实例名
     * @param expressions   该切点对应的表达式数组，表达式为正则表达式串
     */
    constructor(id: string, expressions: Array<string>, clazz: any) {
        this.id = id;
        this.aspectClazz = clazz;
        if (expressions) {
            this.addExpression(expressions);
        }
    }

    /**
     * 给切点添加通知
     * @param advice    通知对象
     */
    public addAdvice(advice: IAopAdvice): void {
        this.advices.push(advice);
    }

    /**
     * 添加表达式串
     * @param expr  表达式串或数组
     */
    addExpression(expr: string | string[]) {
        if (!Array.isArray(expr)) {
            expr = [expr];
        }

        expr.forEach((item) => {
            if (typeof item !== 'string') {
                throw new NoomiError("2001");
            }
            this.expressions.push(Util.toReg(item));
        });
    }
}

/**
 * Aop工厂
 * 用于管理所有切面、切点
 */
class AopFactory {
    /**
     * 切点map，用于存储所有切点
     * key:切面类名.切点名
     */
    private static pointcuts: Map<string, AopPointcut> = new Map();

    /**
     * 已代理方法map，键为instanctName.methodName，避免重复代理
     * @since 0.4.4
     */
    private static proxyMethodMap: Map<string, AopPointcut[]> = new Map();
    /**
     * 注册切面map，键为className,值为
     *          {
     *              isAspect:true,  //避免用了pointcut，但是未使用Aspect注解
     *              pointCutId1:{expressions:Array<string>,advices:{type:类型,method:方法名}},
     *              ...
     *          }
     */
    private static registAspectMap: Map<any, any> = new Map();
    // private static registAspectMap: Map<string, any> = new Map();

    /**
     * 注册切点
     * @param cfg   pointcut配置
     * @since 1.0.0
     */
    public static registPointcut(cfg: IAopPointcut) {
        let pc = this.getRegistPointcut(cfg.clazz, cfg.id, true);
        // let pc = this.getRegistPointcut(cfg.clazz.name, cfg.id, true);

        if (cfg.expressions) {
            pc.expressions = pc.expressions.concat(cfg.expressions);
        }
    }

    /**
     * 注册advice
     * @param cfg   advice配置 
     * @since 1.0.0
     */
    public static registAdvice(cfg: IAopAdvice) {
        if (!this.registAspectMap.has(cfg.clazz)) {
            return;
        }
        let pc = this.registAspectMap.get(cfg.clazz)[cfg.pointcutId];
        if (!pc) {
            return;
        }
        delete cfg.clazz;
        pc.advices.push(cfg);
    }

    /**
     * 从registAspectMap中获取注册的pointcut配置
     * @param className     类名
     * @param pointcutId    切点id
     * @param create        如果不存在，是否创建，如果为true，则创建，默认false
     * @returns             pointcut配置项
     * @since 1.0.0
     */
    private static getRegistPointcut(clazz: any, pointcutId: string, create?: boolean): any {
        let pc;
        if (this.registAspectMap.has(clazz)) {
            let obj = this.registAspectMap.get(clazz);
            pc = obj[pointcutId];
        } else {
            // this.registAspectMap.set(clazz, {
            //     advices: [],
            //     expressions: []
            // });
            this.registAspectMap.set(clazz, {});
        }
        if (!pc && create) {  //新建pointcut配置项
            let obj = this.registAspectMap.get(clazz);
            pc = {
                advices: [],
                expressions: []
            };
            obj[pointcutId] = pc;
        }
        return pc;
    }
    /**
     * 处理切面
     * @param clazz     切面类     
     * @since 1.0.0
     */
    public static addAspect(clazz: any) {
        if (!InstanceFactory.hasClass(clazz)) {
            InstanceFactory.addInstance(clazz, {
                singleton: true
            });
        }
        let cfg = this.registAspectMap.get(clazz);
        Object.keys(cfg).forEach(item => {
            let o = cfg[item];
            //新建pointcut
            let pc = new AopPointcut(item, o.expressions, clazz);
            //加入切点集
            this.pointcuts.set(clazz.name + '.' + item, pc);
            //为切点添加advice
            o.advices.forEach(item1 => {
                //添加advice
                pc.addAdvice(item1);
            });
        });
        //删除已处理的class
        this.registAspectMap.delete(clazz);
    }

    /**
     * 为切点添加表达式
     * @param pointcutId    切点id
     * @param expression    表达式或数组
     */
    public static addExpression(pointcutId: string, expression: string | Array<string>) {
        let pc = this.pointcuts.get(pointcutId);
        if (!pc) {
            return;
        }
        pc.addExpression(expression);
    }

    /**
     * 为所有aop匹配的方法设置代理
     */
    public static proxyAll() {
        if (!this.pointcuts || this.pointcuts.size === 0) {
            return;
        }
        for (let ins of InstanceFactory.getFactory()) {
            this.proxyOne(ins[0]);
        }
    }

    /**
     * 为某个类设置代理
     * @param instanceName  实例名
     * @param clazz         类
     */
    // public static proxyOne(instanceName: string) {
    //     if (!this.pointcuts || this.pointcuts.size === 0) {
    //         return;
    //     }
    //     const clazz = InstanceFactory.getInstanceCfg(instanceName).class;
    //     //遍历pointcut
    //     let pc: AopPointcut;
    //     for (pc of this.pointcuts.values()) {
    //         let reg: RegExp;
    //         //遍历expression
    //         for (reg of pc.expressions) {
    //             Object.getOwnPropertyNames(clazz.prototype).forEach(key => {
    //                 //给方法设置代理，constructor 不需要代理
    //                 if (key === 'constructor' || typeof clazz.prototype[key] !== 'function') {
    //                     return;
    //                 }
    //                 //添加到proxy method map
    //                 const name = clazz.name + '.' + key;
    //                 if (!this.proxyMethodMap.has(name)) {
    //                     this.proxyMethodMap.set(name, [pc]);
    //                 } else {
    //                     this.proxyMethodMap.get(name).push(pc);
    //                 }
    //                 //代理类方法
    //                 clazz.prototype[key] = AopProxy.invoke(clazz, key);
    //             });
    //         }
    //     }
    // }
    public static proxyOne(clazz: any) {
        if (!this.pointcuts || this.pointcuts.size === 0) {
            return;
        }
        //遍历pointcut
        let pc: AopPointcut;
        for (pc of this.pointcuts.values()) {
            let reg: RegExp;
            //遍历expression
            for (reg of pc.expressions) {
                Object.getOwnPropertyNames(clazz.prototype).forEach(key => {
                    //给方法设置代理，constructor 不需要代理
                    if (key === 'constructor' || typeof clazz.prototype[key] !== 'function') {
                        return;
                    }
                    //添加到proxy method map
                    const name = clazz.name + '.' + key;
                    if (reg.test(name)) {
                        if (!this.proxyMethodMap.has(name)) {
                            this.proxyMethodMap.set(name, [pc]);
                            //代理类方法
                            clazz.prototype[key] = AopProxy.invoke(clazz, key);
                        } else {
                            this.proxyMethodMap.get(name).push(pc);
                        }
                    }
                });
            }
        }
    }

    /**
     * 根据id获取切点
     * @param pointcutId    切点id
     * @returns             切点对象
     */
    public static getPointcutById(pointcutId: string): AopPointcut {
        return this.pointcuts.get(pointcutId);
    }

    /**
     * 获取advices
     * @param clazz         类
     * @param methodName    方法名
     * @return              {
     *                          before:[{instance:切面实例,method:切面方法},...]
     *                          after:[{instance:切面实例,method:切面方法},...]
     *                          return:[{instance:切面实例,method:切面方法},...]
     *                          throw:[{instance:切面实例,method:切面方法},...]
     *                      }
     */
    public static getAdvices(clazz: any, methodName: string): object {
        const pointcuts: AopPointcut[] = this.proxyMethodMap.get(clazz.name + '.' + methodName);
        if (pointcuts.length === 0) {
            return null;
        }

        let beforeArr: Array<object> = [];
        let aroundArr1: Array<object> = [];  //前置around
        let aroundArr2: Array<object> = [];  //后置around
        let afterArr: Array<object> = [];
        let throwArr: Array<object> = [];
        let returnArr: Array<object> = [];

        let pointcut: AopPointcut;
        let hasTransaction: boolean = false;
        for (pointcut of pointcuts) {
            if (pointcut.id === TransactionManager.pointcutId) {
                hasTransaction = true;
                continue;
            }
            pointcut.advices.forEach(item => {
                // let ins: any = InstanceFactory.getInstance(pointcut.instanceName);
                let ins: any = InstanceFactory.getInstance(pointcut.aspectClazz);

                switch (item.type) {
                    case 'before':
                        beforeArr.push({
                            instance: ins,
                            method: item.method
                        });
                        return;
                    case 'after':
                        afterArr.push({
                            instance: ins,
                            method: item.method
                        });
                        return;
                    case 'around':
                        aroundArr1.push({
                            instance: ins,
                            method: item.method
                        });
                        aroundArr2.push({
                            instance: ins,
                            method: item.method
                        });
                        return;
                    case 'after-return':
                        returnArr.push({
                            instance: ins,
                            method: item.method
                        });
                        return;
                    case 'after-throw':
                        throwArr.push({
                            instance: ins,
                            method: item.method
                        });
                }
            });
        }

        beforeArr = aroundArr1.concat(beforeArr);
        afterArr = afterArr.concat(aroundArr2);
        return {
            hasTransaction: hasTransaction,
            before: beforeArr,
            after: afterArr,
            throw: throwArr,
            return: returnArr
        }
    }
}

export { AopFactory, IAopAdvice, IAopAspect, AopPointcut, IAopCfg, IAopPointcut };