"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const transaction_1 = require("./transaction");
const connectionmanager_1 = require("./connectionmanager");
const dbmanager_1 = require("./dbmanager");
/**
 * mssql 事务类
 */
class MssqlTransaction extends transaction_1.Transaction {
    constructor(id, connection, type) {
        super(id, connection, type);
        let cm = dbmanager_1.DBManager.getConnectionManager();
        let pool = cm.pool;
        this.tr = new cm.dbMdl.Transaction(pool);
    }
    async begin() {
        if (!this.connection) {
            this.connection = await connectionmanager_1.getConnection();
        }
        await this.tr.begin();
    }
    async commit() {
        await this.tr.commit();
    }
    async rollback() {
        await this.tr.rollback();
    }
}
exports.MssqlTransaction = MssqlTransaction;
//# sourceMappingURL=mssqltransaction.js.map