import { IConnectionManager } from "./connectionmanager";
import { TransactionManager } from "./transactionmanager";
/**
 * mssql连接管理器
 * @remarks
 * mssql直接启动连接池，不需要单独配置
 */
class MssqlConnectionManager implements IConnectionManager{
    /**
     * 连接池
     */
    pool:any;
    /**
     * connection对象
     */
    connection:any;
    /**
     * 数据库配置项，示例如下：
     * ```
     *{
     *  "server":"localhost",
     *   "port":1434,
     *   "user":"your user",
     *   "password":"your password",
     *   "database":"your db"   
     * }
     * ```
     * 更多细节参考npm mssql
     */
    options:object;
    /**
     * module mssql
     */
    dbMdl:any;
    /**
     * 构造器
     * @param cfg 配置对象 {usePool:使用连接池,useTransaction:是否启用事务机制,其它配置参考options属性说明}
     */
    constructor(cfg){
        this.dbMdl = require('mssql');
        delete cfg.useTransaction;
        this.options = cfg;
        this.pool = new this.dbMdl.ConnectionPool(this.options);
    }

    /**
     * 获取连接
     * @returns mssql request对象
     */
    async getConnection(){
        let conn = TransactionManager.getConnection();
        if(conn){
            return conn;
        }
        let tr:any = TransactionManager.get(false);
        let co:any;
        if(tr){
            co = new this.dbMdl.Request(tr.tr);
        }else{
            let c = await this.pool.connect();
            co = c.request();
        }
        return co;
    }

    /**
     * 释放连接
     * @param request mssql request对象
     */
    async release(request:any){
        if(!request){
            return;
        }
        request.connection.close({drop:false});
    }
}

export{MssqlConnectionManager}