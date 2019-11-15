"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const transaction_1 = require("./transaction");
const connectionmanager_1 = require("./connectionmanager");
/**
 * oracle 事务类
 */
class OracleTransaction extends transaction_1.Transaction {
    async begin() {
        if (!this.connection) {
            this.connection = await connectionmanager_1.getConnection();
        }
    }
    async commit() {
        await this.connection.commit();
    }
    async rollback() {
        await this.connection.rollback();
    }
}
exports.OracleTransaction = OracleTransaction;
//# sourceMappingURL=oracletransaction.js.map