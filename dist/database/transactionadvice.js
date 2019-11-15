"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const transactionmanager_1 = require("./transactionmanager");
const connectionmanager_1 = require("./connectionmanager");
class TransactionAdvice {
    /**
     * 事务方法调用前
     */
    async before() {
        let tr = await transactionmanager_1.TransactionManager.get(true);
        //connection 未初始化，初始化connection
        if (!tr.connection) {
            tr.connection = await connectionmanager_1.getConnection();
        }
        tr.trIds.push(tr.id);
        if (tr.isBegin) {
            return;
        }
        tr.isBegin = true;
        await tr.begin();
    }
    /**
     * 事务方法返回时
     */
    async afterReturn() {
        let tr = await transactionmanager_1.TransactionManager.get();
        if (!tr || !tr.isBegin) {
            return;
        }
        tr.trIds.pop();
        //当前id为事务头，进行提交
        if (tr.trIds.length === 0) {
            await tr.commit();
            //删除事务
            transactionmanager_1.TransactionManager.del(tr);
            //释放连接
            transactionmanager_1.TransactionManager.releaseConnection(tr);
        }
    }
    /**
     * 事务方法抛出异常时
     */
    async afterThrow() {
        let tr = await transactionmanager_1.TransactionManager.get();
        if (!tr || !tr.isBegin) {
            return;
        }
        if (tr) {
            tr.trIds.pop();
            await tr.rollback();
            //释放连接
            await transactionmanager_1.TransactionManager.releaseConnection(tr);
            transactionmanager_1.TransactionManager.del(tr);
        }
    }
}
exports.TransactionAdvice = TransactionAdvice;
//# sourceMappingURL=transactionadvice.js.map