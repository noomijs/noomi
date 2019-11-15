"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const instancefactory_1 = require("./instancefactory");
const aopfactory_1 = require("./aopfactory");
const transactionproxy_1 = require("../database/transactionproxy");
const application_1 = require("../tools/application");
/**
* Aop 代理类
*/
class AopProxy {
    /**
     *
     * @param instanceName  实例名
     * @param methodName    方法名
     * @param func          执行函数
     * @param instance      实例
     */
    static invoke(instanceName, methodName, func, instance) {
        const util = application_1.App.util;
        /**
         * 异步方法
         */
        if (func && util.types.isAsyncFunction(func)) {
            return async (params) => {
                //advices获取
                let advices;
                if (aopfactory_1.AopFactory) {
                    advices = aopfactory_1.AopFactory.getAdvices(instanceName, methodName);
                }
                if (params) {
                    params = [params];
                }
                //参数1为实例名，2是方法名，3是被代理方法自带参数(数组)
                let aopParams = [{
                        instanceName: instanceName,
                        methodName: methodName,
                        params: params
                    }];
                let retValue = await foo();
                if (retValue instanceof Error) {
                    throw retValue;
                }
                return retValue;
                async function foo() {
                    let result;
                    //before aop执行
                    if (advices !== null) {
                        for (let item of advices.before) {
                            //instance可能为实例对象，也可能是实例名
                            await item.instance[item.method].apply(item.instance, aopParams);
                        }
                    }
                    try {
                        //方法是事务
                        if (advices.hasTransaction) {
                            result = await transactionproxy_1.TransactionProxy.invoke(instanceName, methodName, func, instance)(params);
                        }
                        else { //非事务
                            result = await func.apply(instance, params);
                        }
                        //带入参数
                        aopParams[0].returnValue = result;
                        //return aop执行
                        if (advices !== null) {
                            for (let item of advices.return) {
                                //instance可能为实例对象，也可能是实例名
                                await item.instance[item.method].apply(item.instance, aopParams);
                            }
                        }
                    }
                    catch (e) {
                        aopParams[0].throwValue = e;
                        //异常aop执行
                        if (advices !== null) {
                            for (let item of advices.throw) {
                                //instance可能为实例对象，也可能是实例名
                                await item.instance[item.method].apply(item.instance, aopParams);
                            }
                        }
                        result = e;
                    }
                    // after aop 调用
                    if (advices !== null && advices.after.length > 0) {
                        for (let item of advices.after) {
                            await item.instance[item.method].apply(item.instance, aopParams);
                        }
                    }
                    return result;
                }
            };
        }
        //非async 拦截
        return (params) => {
            //advices获取
            let advices;
            if (aopfactory_1.AopFactory) {
                advices = aopfactory_1.AopFactory.getAdvices(instanceName, methodName);
            }
            if (params) {
                params = [params];
            }
            //参数1为实例名，2是方法名，3是被代理方法自带参数(数组)
            let aopParams = [{
                    instanceName: instanceName,
                    methodName: methodName,
                    params: params
                }];
            let result;
            //before aop执行
            if (advices !== null) {
                for (let item of advices.before) {
                    //instance可能为实例对象，也可能是实例名
                    item.instance[item.method].apply(item.instance, aopParams);
                }
            }
            try {
                result = func.apply(instance, params);
                if (util.types.isPromise(result)) { //返回promise调用
                    result.then(re => {
                        //带入参数
                        aopParams[0].returnValue = re;
                        //return aop执行
                        if (advices !== null) {
                            for (let item of advices.return) {
                                //instance可能为实例对象，也可能是实例名
                                item.instance[item.method].apply(item.instance, aopParams);
                            }
                        }
                    }).catch((e) => {
                        //throw aop执行
                        aopParams[0].throwValue = e;
                        if (advices !== null) {
                            for (let item of advices.throw) {
                                //instance可能为实例对象，也可能是实例名
                                item.instance[item.method].apply(item.instance, aopParams);
                            }
                        }
                        result = Promise.reject(e);
                    });
                }
                else { //普通调用
                    //带入参数
                    aopParams[0].returnValue = result;
                    //return aop执行
                    if (advices !== null) {
                        for (let item of advices.return) {
                            //instance可能为实例对象，也可能是实例名
                            item.instance[item.method].apply(item.instance, aopParams);
                        }
                    }
                }
            }
            catch (e) {
                aopParams[0].throwValue = e;
                //异常aop执行
                if (advices !== null) {
                    for (let item of advices.throw) {
                        //instance可能为实例对象，也可能是实例名
                        item.instance[item.method].apply(item.instance, aopParams);
                    }
                }
                result = e;
            }
            // after aop 调用
            if (advices !== null && advices.after.length > 0) {
                if (util.types.isPromise(result)) { //返回promise
                    result.then(re => {
                        for (let item of advices.after) {
                            item.instance[item.method].apply(item.instance, aopParams);
                        }
                    });
                }
                else {
                    for (let item of advices.after) {
                        instancefactory_1.InstanceFactory.exec(item.instance, item.method, aopParams);
                    }
                }
            }
            //抛出异常
            if (result instanceof Error) {
                throw result;
            }
            return result;
        };
    }
}
exports.AopProxy = AopProxy;
//# sourceMappingURL=aopproxy.js.map