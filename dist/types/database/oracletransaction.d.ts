import { Transaction } from "./transaction";
/**
 * oracle 事务类
 */
declare class OracleTransaction extends Transaction {
    begin(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
}
export { OracleTransaction };
