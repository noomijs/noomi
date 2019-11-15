import { Transaction } from "./transaction";
declare class TransactionManager {
    static transactionMap: Map<number, Transaction>;
    static transactionMdl: string;
    static expressions: Array<string>;
    static namespace: any;
    static transactionId: number;
    static pointcutId: string;
    static addToAopExpressions: Array<string>;
    static isolationLevel: number;
    static transactionOption: any;
    static init(cfg: any): void;
    /**
     * 添加为事务
     * @param instance      实例 或 类
     * @param methodName    方法名
     */
    static addTransaction(instance: any, methodName: any): void;
    /**
     * 获取transaction
     * @param newOne    如果不存在，是否新建
     * @return          transacton
     */
    static get(newOne?: boolean): Transaction;
    static setIdToLocal(): void;
    static getIdLocal(): any;
    /**
     * 删除事务
     * @param tranId
     */
    static del(tr: Transaction): void;
    /**
     * 获取connection
     */
    static getConnection(id?: number): any;
    /**
     * 释放连接
     * @param tr
     */
    static releaseConnection(tr: Transaction): void;
    /**
     * 解析实例配置文件
     * @param path      文件路径
     * @param mdlPath   模型路径
     */
    static parseFile(path: string): void;
}
export { TransactionManager };
