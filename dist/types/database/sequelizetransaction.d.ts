import { Transaction } from "./transaction";
/**
 * mysql 事务类
 */
declare class SequelizeTransaction extends Transaction {
    begin(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
}
export { SequelizeTransaction };
