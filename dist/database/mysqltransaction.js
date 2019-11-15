"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const transaction_1 = require("./transaction");
const connectionmanager_1 = require("./connectionmanager");
/**
 * mysql 事务类
 */
class MysqlTransaction extends transaction_1.Transaction {
    async begin() {
        if (!this.connection) {
            this.connection = await connectionmanager_1.getConnection();
        }
        return new Promise((resolve, reject) => {
            this.connection.beginTransaction((err, conn) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    }
    async commit() {
        return new Promise((resolve, reject) => {
            this.connection.commit((err) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    }
    async rollback() {
        return new Promise((resolve, reject) => {
            this.connection.rollback((err) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    }
}
exports.MysqlTransaction = MysqlTransaction;
//# sourceMappingURL=mysqltransaction.js.map