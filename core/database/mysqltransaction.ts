import { NoomiTransaction } from "./noomitransaction";
import { getConnection } from "./connectionmanager";
/**
 * mysql 事务类
 */
class MysqlTransaction extends NoomiTransaction{
    /**
     * 开始事务
     */
    async begin(){
        if(!this.connection){
            this.connection = await getConnection();
        }
        
        await new Promise((resolve,reject)=>{
            this.connection.beginTransaction((err,conn)=>{
                if(err){
                    reject(err);
                }
                resolve();
            });
        });
    }

    /**
     * 事务提交
     */
    async commit(){
        await new Promise((resolve,reject)=>{
            this.connection.commit((err)=>{
                if(err){
                    reject(err);
                }
                resolve();
            });
        });
    }

    /**
     * 事务回滚
     */
    async rollback(){
        await new Promise((resolve,reject)=>{
            this.connection.rollback((err)=>{
                if(err){
                    reject(err);
                }
                resolve();
            });
        });
    }
}

export {MysqlTransaction};