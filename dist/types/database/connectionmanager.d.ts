interface ConnectionManager {
    getConnection(): Promise<any>;
    release(conn: any): Promise<any>;
}
/**
 * 获取数据库或数据源连接
 * @return          promise connection
 */
declare function getConnection(): Promise<any>;
/**
 * 关闭连接
 * @param conn  待关闭的连接
 */
declare function closeConnection(conn: any): Promise<void>;
export { ConnectionManager, getConnection, closeConnection };
