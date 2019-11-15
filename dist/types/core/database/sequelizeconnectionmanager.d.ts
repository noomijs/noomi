import { Sequelize } from "sequelize-typescript";
/**
 * 连接管理器
 */
declare class SequelizeConnectionManager {
    sequelize: Sequelize;
    connection: any;
    options: object;
    dbMdl: any;
    usePool: boolean;
    poolAlias: string;
    constructor(cfg: any);
    /**
     * 获取连接
     */
    getConnection(): Promise<Sequelize>;
    /**
     * 释放连接
     * @param conn
     */
    release(conn?: any): Promise<void>;
}
export { SequelizeConnectionManager };
