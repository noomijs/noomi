import { ConnectionManager } from "./connectionmanager";
/**
 * 连接管理器
 */
declare class MysqlConnectionManager implements ConnectionManager {
    pool: any;
    usePool: boolean;
    connection: any;
    options: object;
    dbMdl: any;
    constructor(cfg: any);
    /**
     * 获取连接
     */
    getConnection(): Promise<any>;
    /**
     * 释放连接
     * @param conn
     */
    release(conn: any): Promise<void>;
}
export { MysqlConnectionManager };
