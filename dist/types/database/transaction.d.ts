/**
 * 事务类
 */
declare class Transaction {
    id: number;
    connection: any;
    src: TransactionSource;
    type: TransactionType;
    isBegin: boolean;
    asyncIds: Array<number>;
    trIds: Array<number>;
    constructor(id: number, connection?: any, type?: TransactionType);
    begin(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
}
declare enum TransactionType {
    NESTED = 0,
    NEW = 1
}
declare enum TransactionSource {
    MYSQL = "mysql",
    ORACLE = "oracle",
    MSSQL = "mssql",
    MONGODB = "mongodb",
    SEQUALIZE = "sequalize",
    TYPEORM = "typeorm"
}
export { Transaction, TransactionType };
