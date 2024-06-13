import { closeConnection, txBegin, txCommit, txRollback } from "./dbmethods";

/**
 * 事务通知
 */
export class TransactionAdvice {
    /**
     * 事务方法调用前通知
     */
    async before() {
        await txBegin();
    }

    /**
     * 事务方法返回时通知
     */
    async afterReturn() {
        if(await txCommit()){
            await closeConnection();
        }
    }

    /**
     * 事务方法抛出异常时通知
     */
    async afterThrow() {
        if(await txRollback()){
            await closeConnection();
        }
    }
}