import { Transaction } from "./transaction";
/**
 * mysql 事务类
 */
class SequelizeTransaction extends Transaction{
    async begin():Promise<void>{}

    async commit():Promise<void>{}

    async rollback():Promise<void>{}
}

export {SequelizeTransaction};