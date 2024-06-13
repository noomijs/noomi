import { AopPointcut } from "../main/aop/aoppointcut";

/**
 * Aop通知类型
 */
export type AopAdvice = {
    /**
     * 切点
     */
    pointcutId?: string;
    /**
     * 通知类
     */
    clazz?: unknown;
    /**
     * 通知类型 (before,after,after-return,after-throw,around)
     */
    type: 'before'|'after'|'after-return'|'after-throw'|'around';
    /**
     * 对应的切面方法
     */
    method: string;
}

/**
 * Aop切面类型
 */
export type AopAspect = {
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
    advices: Array<AopAdvice>;
}

/**
 * 切点配置
 */
export type AopPointcutOption = {
    /**
     * 类
     */
    clazz: unknown;
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
 * aop方法配置
 */
export type AopMethodOption = {
    instance:unknown;
    method:string;
}

/**
 * 针对切点的方法集
 */
export type AopAdviceCollection = {
    /**
     * 前置方法集
     */
    before?:AopMethodOption[];
    /**
     * 后置方法集
     */
    after?:AopMethodOption[];
    /**
     * 正确返回方法集
     */
    returns?:AopMethodOption[];
    /**
     * 异常返回方法集
     */
    throws?:AopMethodOption[];
}
