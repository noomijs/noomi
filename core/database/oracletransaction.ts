import { Transaction } from "./transaction";
import { getConnection } from "./connectionmanager";

/**
 * oracle 事务类
 */
class OracleTransaction extends Transaction{
    async begin():Promise<void>{
        if(!this.connection){
            this.connection = await getConnection();
        }
    }

    async commit():Promise<void>{
        await this.connection.commit();
    }

    async rollback():Promise<void>{
        await this.connection.rollback();
    }
}


export {OracleTransaction};