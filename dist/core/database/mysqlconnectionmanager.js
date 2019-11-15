"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const transactionmanager_1 = require("./transactionmanager");
/**
 * 连接管理器
 */
class MysqlConnectionManager {
    constructor(cfg) {
        this.dbMdl = require('mysql');
        this.usePool = cfg.usePool || false;
        if (this.usePool) {
            delete cfg.usePool;
            delete cfg.useTransaction;
            this.pool = this.dbMdl.createPool(cfg);
        }
        this.options = cfg;
    }
    /**
     * 获取连接
     */
    async getConnection() {
        let conn = transactionmanager_1.TransactionManager.getConnection();
        if (conn) {
            return conn;
        }
        if (this.pool) {
            return new Promise((resolve, reject) => {
                this.pool.getConnection((err, conn) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(conn);
                });
            });
        }
        else {
            return await this.dbMdl.createConnection(this.options);
        }
    }
    /**
     * 释放连接
     * @param conn
     */
    async release(conn) {
        if (!conn) {
            return;
        }
        if (this.pool) {
            conn.release(err => {
                console.log(err);
            });
        }
        else {
            conn.end(err => {
                console.log(err);
            });
        }
    }
}
exports.MysqlConnectionManager = MysqlConnectionManager;
//# sourceMappingURL=mysqlconnectionmanager.js.map