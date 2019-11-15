import { ConnectionManager } from "./connectionmanager";
/**
 * 连接管理器
 */
declare class OracleConnectionManager implements ConnectionManager {
    pool: any;
    connection: any;
    options: object;
    dbMdl: any;
    usePool: boolean;
    poolAlias: string;
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
export { OracleConnectionManager };
