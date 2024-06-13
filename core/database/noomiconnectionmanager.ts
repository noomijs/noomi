/**
 * 连接管理器基类，数据库包（如：noomi-mysql,noomi-relaen,...）必须继承此基类
 */
export abstract class NoomiConnectionManager {
    /**
     * 获取连接(异步方法)
     * @returns connection对象(具体类型由引入的package如:noomi-relaen,noomi-mysql确定)
     */
    public abstract getConnection(): Promise<any>;

    /**
     * 释放连接(异步方法)
     * @param conn -  connection对象(具体类型由引入的package如:noomi-relaen,noomi-mysql确定)
     */
    public abstract closeConnection(conn):void;
}

