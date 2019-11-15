"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const connectionmanager_1 = require("./connectionmanager");
/**
 * 事务类
 */
class Transaction {
    constructor(id, connection, type) {
        this.asyncIds = []; //绑定的的async id
        this.trIds = []; //有开始事务的async id数组
        this.id = id;
        this.connection = connection;
        this.type = type || TransactionType.NESTED;
        this.asyncIds.push(id);
    }
    async begin() {
        this.isBegin = true;
        if (!this.connection) {
            await connectionmanager_1.getConnection();
        }
    }
    async commit() { }
    async rollback() { }
}
exports.Transaction = Transaction;
var TransactionType;
(function (TransactionType) {
    TransactionType[TransactionType["NESTED"] = 0] = "NESTED";
    TransactionType[TransactionType["NEW"] = 1] = "NEW"; //新建
})(TransactionType || (TransactionType = {}));
exports.TransactionType = TransactionType;
var TransactionSource;
(function (TransactionSource) {
    TransactionSource["MYSQL"] = "mysql";
    TransactionSource["ORACLE"] = "oracle";
    TransactionSource["MSSQL"] = "mssql";
    TransactionSource["MONGODB"] = "mongodb";
    TransactionSource["SEQUALIZE"] = "sequalize";
    TransactionSource["TYPEORM"] = "typeorm";
})(TransactionSource || (TransactionSource = {}));
//# sourceMappingURL=transaction.js.map