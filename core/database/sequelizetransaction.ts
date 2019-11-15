import { Transaction } from "./transaction";
import { getConnection } from "./connectionmanager";
/**
 * mysql 事务类
 */
class SequelizeTransaction extends Transaction{
    async begin():Promise<void>{}

    async commit():Promise<void>{}

    async rollback():Promise<void>{}
}

export {SequelizeTransaction};