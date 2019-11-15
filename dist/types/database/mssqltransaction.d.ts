import { Transaction, TransactionType } from "./transaction";
/**
 * mssql 事务类
 */
declare class MssqlTransaction extends Transaction {
    tr: any;
    constructor(id: number, connection?: any, type?: TransactionType);
    begin(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
}
export { MssqlTransaction };
