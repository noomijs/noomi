import { NoomiTransaction } from "./noomitransaction";
import { getConnection } from "./connectionmanager";

/**
 * oracle 事务类
 */
class OracleTransaction extends NoomiTransaction{
    /**
     * 开始事务
     */
    async begin(){
        if(!this.connection){
            this.connection = await getConnection();
        }
    }

    /**
     * 事务提交
     */
    async commit(){
        await this.connection.commit();
    }

    /**
     * 事务回滚
     */
    async rollback(){
        await this.connection.rollback();
    }
}


export {OracleTransaction};