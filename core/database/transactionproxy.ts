import { DBManager } from "./dbmanager";
import { TransactionManager } from "./transactionmanager";
import { getConnection } from "./connectionmanager";
import { InstanceFactory } from "../main/instancefactory";
import { QueryRunner } from "typeorm";

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
                case 'sequelize':
                    retValue = await new Promise(async (resolve,reject)=>{
                        TransactionManager.namespace.run(async ()=>{
                            let v = await doSequelize();
                            if(v instanceof Error){
                                reject(v)
                            }else{
                                resolve(v);
                            }
                        });
                    });
                    break;
                case 'typeorm':
                    retValue = await new Promise(async (resolve,reject)=>{
                        TransactionManager.namespace.run(async ()=>{
                            let v = await doTypeorm();
                            if(v instanceof Error){
                                reject(v)
                            }else{
                                resolve(v);
                            }
                        });
                    });
                    break;
                default:  //datasource
                    retValue = await new Promise((resolve,reject)=>{
                        TransactionManager.namespace.run(async ()=>{
                            let v = await doDataScource();
                            if(v instanceof Error){
                                reject(v)
                            }else{
                                resolve(v);
                            }
                        });
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
                if(!TransactionManager.getIdFromLocal()){
                    //保存transaction id
                    TransactionManager.setIdToLocal();
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
             */
            async function doSequelize(){
                let result:any;
                if(!TransactionManager.getIdFromLocal()){
                    //保存transaction id
                    TransactionManager.setIdToLocal();
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
                if(!TransactionManager.getIdFromLocal()){
                    //保存transaction id
                    TransactionManager.setIdToLocal();
                    let isoLevel:any;
                    if(TransactionManager.transactionOption){
                        isoLevel = TransactionManager.transactionOption.isolationLevel;
                    }
                    let conn = await getConnection();
                    const queryRunner:QueryRunner = conn.createQueryRunner();

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
             * @param e 
             */
            function handleErr(e){
                //异常信息，非error对象
                if(typeof e === 'string'){
                    return new Error(e);
                }else{
                    return e;
                }
            }
        }
    }
}

export {TransactionProxy}