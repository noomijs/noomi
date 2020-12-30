import { DBManager } from "./dbmanager";
import { TransactionManager } from "./transactionmanager";
import { getConnection } from "./connectionmanager";
import { InstanceFactory } from "../main/instancefactory";
import { ThreadLocal } from "../tools/threadlocal";
/**
 * 事务Aop代理
 * @remarks
 * 用于事务方法代理
 */
class TransactionProxy{
    /**
     * 代理方法 
     * @param instanceName  实例名
     * @param methodName    方法名
     * @param func          执行函数  
     * @param instance      实例
     */
    static invoke(instanceName:string,methodName:string,func:Function,instance:any):any{
        return async (params)=>{
            let retValue;
            switch(DBManager.product){
                case 'relaen':
                    retValue = await new Promise(async (resolve,reject)=>{
                        let v = await doRelaen();
                        if(v instanceof Error){
                            reject(v);
                        }else{
                            resolve(v);
                        }
                    });
                    break;
                case 'sequelize': //deprecated
                    retValue = await new Promise(async (resolve,reject)=>{
                        let v = await doSequelize();
                        if(v instanceof Error){
                            reject(v)
                        }else{
                            resolve(v);
                        }
                    });
                    break;
                case 'typeorm':
                    retValue = await new Promise(async (resolve,reject)=>{
                        let v = await doTypeorm();
                        if(v instanceof Error){
                            reject(v)
                        }else{
                            resolve(v);
                        }
                    });
                    break;
                default:  //datasource
                    retValue = await new Promise(async (resolve,reject)=>{
                        let v = await doDataScource();
                        if(v instanceof Error){
                            reject(v);
                        }else{
                            resolve(v);
                        }
                    });
            }
            if(retValue instanceof Error){
                throw retValue;
            }
            return retValue;
           
            /**
             * 数据源处理
             */
            async function doDataScource(){
                //初始化thread id
                if(!ThreadLocal.getThreadId()){
                    ThreadLocal.newThreadId();
                }
                //advices获取
                let adviceInstance = InstanceFactory.getInstance('NoomiTransactionAdvice');
                let result:any;
                //before aop执行
                await adviceInstance.before.apply(adviceInstance);
                
                try{
                    result = await func.apply(instance,params);
                    //return aop执行
                    await adviceInstance.afterReturn.apply(adviceInstance);
                }catch(e){
                    //异常aop执行
                    await adviceInstance.afterThrow.apply(adviceInstance);
                    result = handleErr(e);
                }
                return result;
            }

            /**
             * relaen处理
             */
            async function doRelaen(){
                if(!ThreadLocal.getThreadId()){
                    ThreadLocal.newThreadId();
                }
                //advices获取
                let adviceInstance = InstanceFactory.getInstance('NoomiTransactionAdvice');
                let result:any;
                //before aop执行
                await adviceInstance.before.apply(adviceInstance);
                
                try{
                    result = await func.apply(instance,params);
                    //return aop执行
                    await adviceInstance.afterReturn.apply(adviceInstance);
                }catch(e){
                    //异常aop执行
                    await adviceInstance.afterThrow.apply(adviceInstance);
                    result = handleErr(e);
                }
                return result;
            }

            /**
             * sequelize 处理
             * @deprecated v0.4.7
             */
            async function doSequelize(){
                let result:any;
                if(!ThreadLocal.getThreadId()){
                    ThreadLocal.newThreadId();
                    //保存transaction id
                    let trOpt:any = TransactionManager.transactionOption||{};
                    let sequelize = await getConnection();
                    result = await new Promise((res,rej)=>{
                        sequelize.transaction(trOpt,async (t)=>{
                            let v = await func.apply(instance,params);
                            res(v);
                        }).catch((e)=>{
                            res(handleErr(e));
                        });
                    });
                }else{
                    try{
                        result = await func.apply(instance,params);
                    }catch(e){
                        result = handleErr(e);
                    }
                }
                return result;
            }

            /**
             * typeorm 处理
             */
            async function doTypeorm(){
                let result:any;
                if(!ThreadLocal.getThreadId()){
                    ThreadLocal.newThreadId();
                    //保存transaction id
                    let isoLevel:any;
                    if(TransactionManager.transactionOption){
                        isoLevel = TransactionManager.transactionOption.isolationLevel;
                    }
                    let conn = await getConnection();
                    const queryRunner:any = conn.createQueryRunner();
                    await queryRunner.startTransaction(isoLevel);
                    let tr = TransactionManager.get(true);
                    tr.manager = queryRunner.manager;
                    try{
                        result = await func.apply(instance,params);
                        await queryRunner.commitTransaction();
                    }catch(e){
                        result = handleErr(e);
                        await queryRunner.rollbackTransaction();
                    }finally{
                        await queryRunner.release();
                        //从头事务管理器删除事务
                        TransactionManager.del(tr);
                    }
                }else{
                    try{
                        result = await func.apply(instance,params);
                    }catch(e){
                        //异常信息，非error对象
                        result = handleErr(e);
                    }
                }
                return result;
            }

            /**
             * 处理异常
             * @param e     异常对象或异常信息
             */
            function handleErr(e){
                return typeof e === 'string'? new Error(e):e;
            }
        }
    }
}

export {TransactionProxy}