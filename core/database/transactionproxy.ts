import { DBManager } from "./dbmanager";
import { TransactionManager } from "./transactionmanager";
import { getConnection } from "./connectionmanager";
import { InstanceFactory } from "../main/instancefactory";
import { Sequelize } from "sequelize";


class TransactionProxy{
    /**
     *  
     * @param instanceName  实例名
     * @param methodName    方法名
     * @param func          执行函数  
     * @param instance      实例
     */
    static invoke(instanceName:string,methodName:string,func:Function,instance:any):any{
        return async (params)=>{
            if(!Array.isArray(params)){
                params = [params];
            }
            let retValue;
            switch(DBManager.product){
                case 'sequelize':
                    retValue = await new Promise(async (resolve,reject)=>{
                        TransactionManager.namespace.run(async ()=>{
                            let v = await doSequelize();
                            resolve(v);
                        });
                    });
                    break;
                default:  //datasource
                    retValue = await new Promise((resolve,reject)=>{
                        TransactionManager.namespace.run(async ()=>{
                            let v = await doDataScource();
                            resolve(v);
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
                if(!TransactionManager.getIdLocal()){
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
                    result = e;
                }
                return result;
            }

            /**
             * sequelize 处理
             */
            async function doSequelize(){
                let result:any;
                if(!TransactionManager.getIdLocal()){
                    //保存transaction id
                    TransactionManager.setIdToLocal();
                    let trOpt:any = TransactionManager.transactionOption||{};
                    
                    let sequelize = await getConnection();
                    result = await new Promise((res,rej)=>{
                        sequelize.transaction(trOpt,async (t)=>{
                            let v = await func.apply(instance,params);
                            res(v);
                        }).catch((e)=>{
                            res(e);
                        });
                    });
                }else{
                    try{
                        result = await func.apply(instance,params);
                    }catch(e){
                        result = e;
                    }
                }
                return result;
            }
        }
    }
}

export {TransactionProxy}