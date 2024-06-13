import {InstanceFactory} from "../instancefactory";
import {AopFactory} from "./aopfactory";
import {App} from "../../tools/application";
import { UnknownClass } from "../../types/other";
import { AopAdviceCollection } from "../../types/aoptypes";

/**
 * Aop 代理类
 * @remarks
 * 用于代理切点所匹配的方法，当符合切点表达式匹配的方法时，将统一调用该代理类的invoke方法
 */
export class AopProxy {
    /**
     * 代理方法
     * @param clazz -         类
     * @param methodName -    方法名
     */
    static invoke(clazz: UnknownClass, methodName: string): unknown {
        const util = App.util;
        const func = clazz.prototype[methodName];
        if (!func) {
            return;
        }
        /**
         * 异步方法
         */
        if (util.types.isAsyncFunction(func)) {
            return async function (...args) {
                const instance = InstanceFactory.getInstance(clazz);
                //advices获取
                let advices:AopAdviceCollection;
                if (AopFactory) {
                    advices = AopFactory.getAdvices(clazz, methodName);
                }
                const aopParams = {
                    //类
                    clazz: clazz,
                    //方法名
                    methodName: methodName,
                    //参数
                    params: args,
                    //返回值
                    returnValue:undefined,
                    //异常值
                    throwValue:undefined
                };
                let result: unknown;
                //before aop执行
                if (advices !== null) {
                    for (const item of advices.before) {
                        await item.instance[item.method](aopParams);
                    }
                }
                try {
                    result = await func.apply(instance, args);
                    //带入参数
                    aopParams.returnValue = result;
                    //return aop执行
                    if (advices !== null) {
                        for (const item of advices.returns) {
                            await item.instance[item.method](aopParams);
                        }
                    }
                } catch (e) {
                    aopParams.throwValue = e;
                    //throw aop执行
                    if (advices !== null) {
                        for (const item of advices.throws) {
                            await item.instance[item.method](aopParams);
                        }
                    }
                    // 抛出异常
                    throw e;
                }
                // after aop 调用
                if (advices !== null && advices.after.length > 0) {
                    for (const item of advices.after) {
                        await item.instance[item.method](aopParams);
                    }
                }
                return result;
            }
        }
        //非async 拦截
        return function (...args) {
            const instance = InstanceFactory.getInstance(clazz);
            //advices获取
            const advices = AopFactory.getAdvices(clazz, methodName);
            const aopParams = {
                methodName: methodName,     //方法名
                params: args,             //被代理参数数组
                returnValue:undefined,      //返回值
                throwValue:undefined        //异常值
            };
            let result: unknown;
            //before aop执行
            if (advices !== null) {
                for (const item of advices.before) {
                    //instance可能为实例对象，也可能是实例名
                    item.instance[item.method](aopParams);
                }
            }
            try {
                result = func.apply(instance, args);
                if (util.types.isPromise(result)) {  //返回promise
                    (<Promise<unknown>>result).then(re => {
                        //带入参数
                        aopParams.returnValue = re;
                        //return aop执行
                        if (advices !== null) {
                            for (const item of advices.returns) {
                                //instance可能为实例对象，也可能是实例名
                                item.instance[item.method](aopParams);
                            }
                        }
                    }).catch((e) => {
                        //throw aop执行
                        aopParams.throwValue = e;
                        if (advices !== null) {
                            for (const item of advices.throws) {
                                //instance可能为实例对象，也可能是实例名
                                item.instance[item.method](aopParams);
                            }
                        }
                        result = Promise.reject(e);
                    });
                } else {  //普通调用
                    //带入参数
                    aopParams.returnValue = result;
                    //return aop执行
                    if (advices !== null) {
                        for (const item of advices.returns) {
                            //instance可能为实例对象，也可能是实例名
                            item.instance[item.method](aopParams);
                        }
                    }
                }
            } catch (e) {
                aopParams.throwValue = e;
                //异常aop执行
                if (advices !== null) {
                    for (const item of advices.throws) {
                        //instance可能为实例对象，也可能是实例名
                        item.instance[item.method](aopParams);
                    }
                }
                //抛出异常
                throw e;
            }
            // after aop 调用
            if (advices !== null && advices.after.length > 0) {
                if (util.types.isPromise(result)) {  //返回promise
                    (<Promise<unknown>>result).then(() => {
                        for (const item of advices.after) {
                            item.instance[item.method](aopParams);
                        }
                    });
                } else {
                    for (const item of advices.after) {
                        item.instance[item.method](aopParams);
                    }
                }
            }
            return result;
        }
    }
}