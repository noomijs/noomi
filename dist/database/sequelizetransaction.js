"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const transaction_1 = require("./transaction");
/**
 * mysql 事务类
 */
class SequelizeTransaction extends transaction_1.Transaction {
    async begin() { }
    async commit() { }
    async rollback() { }
}
exports.SequelizeTransaction = SequelizeTransaction;
//# sourceMappingURL=sequelizetransaction.js.map