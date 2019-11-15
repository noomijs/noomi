import { Transaction } from "./transaction";
/**
 * mysql 事务类
 */
declare class MysqlTransaction extends Transaction {
    begin(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
}
export { MysqlTransaction };
