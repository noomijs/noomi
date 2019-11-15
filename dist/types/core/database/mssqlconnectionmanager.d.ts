import { ConnectionManager } from "./connectionmanager";
/**
 * mssql连接管理器
 */
declare class MssqlConnectionManager implements ConnectionManager {
    pool: any;
    connection: any;
    options: object;
    dbMdl: any;
    usePool: boolean;
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
export { MssqlConnectionManager };
