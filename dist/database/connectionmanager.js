"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dbmanager_1 = require("./dbmanager");
/**
 * 获取数据库或数据源连接
 * @return          promise connection
 */
async function getConnection() {
    let instance = dbmanager_1.DBManager.getConnectionManager();
    if (instance && typeof instance.getConnection === 'function') {
        let conn = await instance.getConnection();
        return conn;
    }
    return null;
}
exports.getConnection = getConnection;
;
/**
 * 关闭连接
 * @param conn  待关闭的连接
 */
async function closeConnection(conn) {
    if (!conn) {
        return;
    }
    let cm = dbmanager_1.DBManager.getConnectionManager();
    if (cm) {
        cm.release(conn);
    }
}
exports.closeConnection = closeConnection;
//# sourceMappingURL=connectionmanager.js.map