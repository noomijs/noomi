import {InstanceFactory} from "../instancefactory";
import {AopProxy} from "./aopproxy";
import { AopAdvice,AopAdviceCollection,AopMethodOption,AopPointcutOption } from "../../types/aoptypes";
import { UnknownClass } from "../../types/other";
import { AopPointcut } from "./aoppointcut";



/**
 * Aop工厂
 * 用于管理所有切面、切点
 */
export class AopFactory {
    /**
     * 切点map
     * @remarks
     * 用于存储所有切点
     * 
     * key:className.pointcutName
     * 
     * value: pointcut
     */
    private static pointcuts: Map<string, AopPointcut> = new Map();
    /**
     * 已代理方法map
     * key: instanctName.methodName
     * value: 切点集合
     */
    private static proxyMethodMap: Map<string, AopPointcut[]> = new Map();
    /**
     * 注册切面map
     * @remarks 
     * key:class
     * 
     * value:object
     * ```json
     *  {
     *      isAspect:true,  // 避免用了pointcut，但是未使用Aspect注解
     *      pointCutId1:{
     *          expressions:Array<string>,
     *          advices:{type:类型,method:方法名}
     *      },
     *      ...
     *   }
     * ```
     */
    private static registAspectMap: Map<unknown, {boolean?,AopPointCut?}> = new Map();

    /**
     * 注册切点
     * @param cfg -   pointcut配置
     */
    public static registPointcut(cfg: AopPointcutOption) {
        const pc = this.getRegistPointcut(cfg.clazz, cfg.id, true);
        if (cfg.expressions) {
            pc.expressions = pc.expressions.concat(cfg.expressions);
        }
    }

    /**
     * 注册advice
     * @param cfg -   advice配置
     */
    public static registAdvice(cfg: AopAdvice) {
        if (!this.registAspectMap.has(cfg.clazz)) {
            return;
        }
        const pc = this.registAspectMap.get(cfg.clazz)[cfg.pointcutId];
        if (!pc) {
            return;
        }
        delete cfg.clazz;
        pc.advices.push(cfg);
    }

    /**
     * 从registAspectMap中获取注册的pointcut配置
     * @param clazz -         切面类
     * @param pointcutId -    切点id
     * @param create -        如果不存在，是否创建，如果为true，则创建，默认false
     * @returns             pointcut配置项
     */
    private static getRegistPointcut(clazz: unknown, pointcutId: string, create?: boolean): {advices:[],expressions:string[]} {
        let pc;
        if (this.registAspectMap.has(clazz)) {
            const obj = this.registAspectMap.get(clazz);
            pc = obj[pointcutId];
        } else {
            this.registAspectMap.set(clazz, {});
        }
        if (!pc && create) {  // 新建pointcut配置项
            const obj = this.registAspectMap.get(clazz);
            pc = {
                advices: [],
                expressions: []
            };
            obj[pointcutId] = pc;
        }
        return pc;
    }

    /**
     * 添加切面
     * @remarks
     * 
     * @param clazz -   切面类
     */
    public static addAspect(clazz: unknown) {
        const cfg = this.registAspectMap.get(clazz);
        //未得到pointcut，则不处理切面
        if(!cfg){
            return;
        }
        if (!InstanceFactory.hasClass(clazz)) {
            InstanceFactory.addInstance(clazz);
        }
        
        Object.keys(cfg).forEach(item => {
            const o = cfg[item];
            // 新建pointcut
            const pc = new AopPointcut(item, o.expressions, clazz);
            // 加入切点集
            this.pointcuts.set((<UnknownClass>clazz).name + '.' + item, pc);
            // 为切点添加advice
            o.advices.forEach(item1 => {
                // 添加advice
                pc.addAdvice(item1);
            });
        });
        // 删除已处理的class
        this.registAspectMap.delete(clazz);
    }

    /**
     * 为切点添加表达式
     * @param pointcutId -  切点id
     * @param expression -  表达式或数组
     */
    public static addExpression(pointcutId: string, expression: string | Array<string>) {
        const pc = this.pointcuts.get(pointcutId);
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
        const insts = InstanceFactory.getFactory();
        for (const ins of insts) {
            this.proxyOne(<UnknownClass>ins[0]);
        }
    }

    /**
     * 为某个类设置代理
     * @param clazz - 类
     */
    private static proxyOne(clazz: UnknownClass) {
        if (!this.pointcuts || this.pointcuts.size === 0) {
            return;
        }
        // 遍历pointcut
        let pc: AopPointcut;
        for (pc of this.pointcuts.values()) {
            let reg: RegExp;
            // 遍历expression
            for (reg of pc.expressions) {
                Object.getOwnPropertyNames(clazz.prototype).forEach(key => {
                    // 给方法设置代理，constructor 不需要代理
                    if (key === 'constructor' || typeof clazz.prototype[key] !== 'function') {
                        return;
                    }
                    // 添加到proxy method map
                    const name = clazz.name + '.' + key;
                    if (reg.test(name)) {
                        if (!this.proxyMethodMap.has(name)) {
                            this.proxyMethodMap.set(name, [pc]);
                            // 代理类方法
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
     * @param pointcutId -    切点id
     * @returns             切点对象
     */
    public static getPointcutById(pointcutId: string): AopPointcut {
        return this.pointcuts.get(pointcutId);
    }

    /**
     * 获取某个方法对应的advices
     * @param clazz -       类
     * @param methodName -  方法名
     * @returns             advice集合
     */
    public static getAdvices(clazz: UnknownClass, methodName: string): AopAdviceCollection {
        const pointcuts: AopPointcut[] = this.proxyMethodMap.get(clazz.name + '.' + methodName);
        if (pointcuts.length === 0) {
            return null;
        }
        let beforeArr: AopMethodOption[] = [];
        const aroundArr1: AopMethodOption[] = [];  // 前置around
        const aroundArr2: AopMethodOption[] = [];  // 后置around
        let afterArr: AopMethodOption[] = [];
        const throwArr: AopMethodOption[] = [];
        const returnArr: AopMethodOption[] = [];
        let pointcut: AopPointcut;
        for (pointcut of pointcuts) {
            pointcut.advices.forEach(item => {
                const ins: unknown = InstanceFactory.getInstance(pointcut.aspectClazz);
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
            before: beforeArr,
            after: afterArr,
            throws: throwArr,
            returns: returnArr
        }
    }
}
