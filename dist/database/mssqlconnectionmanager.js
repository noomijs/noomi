"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const transactionmanager_1 = require("./transactionmanager");
/**
 * mssql连接管理器
 */
class MssqlConnectionManager {
    constructor(cfg) {
        this.dbMdl = require('mssql');
        this.usePool = cfg.usePool || false;
        delete cfg.useTransaction;
        delete cfg.usePool;
        this.options = cfg;
        this.pool = new this.dbMdl.ConnectionPool(this.options);
    }
    /**
     * 获取连接
     */
    async getConnection() {
        let conn = transactionmanager_1.TransactionManager.getConnection();
        if (conn) {
            return conn;
        }
        let tr = transactionmanager_1.TransactionManager.get(false);
        let co;
        if (tr) {
            co = new this.dbMdl.Request(tr.tr);
        }
        else {
            let c = await this.pool.connect();
            co = c.request();
        }
        return co;
    }
    /**
     * 释放连接
     * @param conn
     */
    async release(conn) {
        if (!conn) {
            return;
        }
        conn._currentRequest.connection.close({ drop: false });
    }
}
exports.MssqlConnectionManager = MssqlConnectionManager;
//# sourceMappingURL=mssqlconnectionmanager.js.map