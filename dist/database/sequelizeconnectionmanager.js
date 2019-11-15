"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const sequelize_typescript_1 = require("sequelize-typescript");
const transactionmanager_1 = require("./transactionmanager");
/**
 * 连接管理器
 */
class SequelizeConnectionManager {
    constructor(cfg) {
        //使用cli-hooked
        // sequelize-typescript不支持cls，要用sequelize
        sequelize_1.Sequelize.useCLS(transactionmanager_1.TransactionManager.namespace);
        this.sequelize = new sequelize_typescript_1.Sequelize(cfg);
    }
    /**
     * 获取连接
     */
    async getConnection() {
        return this.sequelize;
    }
    /**
     * 释放连接
     * @param conn
     */
    async release(conn) {
    }
}
exports.SequelizeConnectionManager = SequelizeConnectionManager;
//# sourceMappingURL=sequelizeconnectionmanager.js.map