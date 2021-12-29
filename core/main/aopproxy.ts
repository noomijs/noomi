import { InstanceFactory } from "./instancefactory";
import { AopFactory } from "./aopfactory";
import { TransactionProxy } from "../database/transactionproxy";
import { App } from "../tools/application";

 /**
 * Aop 代理类
 * @remarks
 * 用于代理切点所匹配的方法，当符合切点表达式匹配的方法时，将统一调用该代理类的invoke方法
 */
class AopProxy{
    /**
     * 代理方法 
     * @param instanceName  实例名
     * @param methodName    方法名
     * @param func          执行函数  
     * @param instance      实例
     */
    static invoke(instanceName:string,methodName:string,func:Function,instance:any):any{
        const util = App.util;
        /**
         * 异步方法
         */
        if(func && util.types.isAsyncFunction(func)){
            return async function(){
                //advices获取
                let advices:any;
                if(AopFactory){
                    advices = AopFactory.getAdvices(instanceName,methodName);
                }
                let params:Array<any> = [];
                for(let p of arguments){
                    params.push(p);
                }

                //参数1为实例名，2是方法名，3是被代理方法自带参数(数组)
                let aopParams:Array<any> = [{
                    instanceName:instanceName,
                    methodName:methodName,
                    params:params  
                }];
                
                let retValue = await foo();
                if(retValue instanceof Error){
                    throw retValue;
                }
                return retValue;
            
                async function foo(){
                    let result:any;
                    //before aop执行
                    if(advices !== null){
                        for(let item of advices.before){
                            await item.instance[item.method].apply(item.instance,aopParams);
                        }
                    }
                    try{
                        //方法是事务
                        if(advices.hasTransaction){
                            result = await TransactionProxy.invoke(func,instance)(params);
                        }else{ //非事务
                            result = await func.apply(instance,params);
                        }
                
                        //带入参数
                        aopParams[0].returnValue = result;
                        //return aop执行
                        if(advices !== null){
                            for(let item of advices.return){
                                //instance可能为实例对象，也可能是实例名
                                await item.instance[item.method].apply(item.instance,aopParams);
                            }
                        }
                    }catch(e){
                        aopParams[0].throwValue = e;
                        //异常aop执行
                        if(advices !== null){
                            for(let item of advices.throw){
                                //instance可能为实例对象，也可能是实例名
                                await item.instance[item.method].apply(item.instance,aopParams);
                            }
                        }
                        result = e;
                    }
        
                    // after aop 调用
                    if(advices !== null && advices.after.length>0){
                        for(let item of advices.after){
                            await item.instance[item.method].apply(item.instance,aopParams);
                        }
                    }
                    return result;
                }
            }
        }
        //非async 拦截
        return function(){
            //advices获取
            let advices:any;
            if(AopFactory){
                advices = AopFactory.getAdvices(instanceName,methodName);
            }
            let params:Array<any> = [];
            for(let p of arguments){
                params.push(p);
            }
            //参数1为实例名，2是方法名，3是被代理方法自带参数(数组)
            let aopParams:Array<any> = [{
                instanceName:instanceName,
                methodName:methodName,
                params:params  
            }];

            let result:any;
            
            //before aop执行
            if(advices !== null){
                for(let item of advices.before){
                    //instance可能为实例对象，也可能是实例名
                    item.instance[item.method].apply(item.instance,aopParams);
                }
            }
            try{
                //方法是事务
                if(advices.hasTransaction){
                    result = TransactionProxy.invoke(func,instance)(params);
                }else{ //非事务
                    result = func.apply(instance,params);
                }
                
                if(util.types.isPromise(result)){  //返回promise调用
                    result.then(re=>{
                        //带入参数
                        aopParams[0].returnValue = re;
                        //return aop执行
                        if(advices !== null){
                            for(let item of advices.return){
                                //instance可能为实例对象，也可能是实例名
                                item.instance[item.method].apply(item.instance,aopParams);
                            }
                        }        
                    }).catch((e)=>{
                        //throw aop执行
                        aopParams[0].throwValue = e;
                        if(advices !== null){
                            for(let item of advices.throw){
                                //instance可能为实例对象，也可能是实例名
                                item.instance[item.method].apply(item.instance,aopParams);
                            }
                        }
                        result = Promise.reject(e);
                    });
                }else{  //普通调用
                    //带入参数
                    aopParams[0].returnValue = result;
                    //return aop执行
                    if(advices !== null){
                        for(let item of advices.return){
                            //instance可能为实例对象，也可能是实例名
                            item.instance[item.method].apply(item.instance,aopParams);
                        }
                    }
                }
            }catch(e){
                aopParams[0].throwValue = e;
                //异常aop执行
                if(advices !== null){
                    for(let item of advices.throw){
                        //instance可能为实例对象，也可能是实例名
                        item.instance[item.method].apply(item.instance,aopParams);
                    }
                }
                result = e;
            }

            // after aop 调用
            if(advices !== null && advices.after.length>0){
                if(util.types.isPromise(result)){  //返回promise
                    result.then(re=>{
                        for(let item of advices.after){
                            item.instance[item.method].apply(item.instance,aopParams);
                        }
                    });
                }else{
                    for(let item of advices.after){
                        InstanceFactory.exec(item.instance,item.method,aopParams);
                    }
                }
            }
            //抛出异常
            if(result instanceof Error){
                throw result;
            }
            return result;
        }
    }
}

export {AopProxy};