import { ConnectionManager } from "./connectionmanager";
import { TransactionManager } from "./transactionmanager";
/**
 * mssql连接管理器
 */
class MssqlConnectionManager implements ConnectionManager{
    pool:any;
    connection:any;
    options:object;
    dbMdl:any;
    usePool:boolean;
    constructor(cfg){
        this.dbMdl = require('mssql');
        this.usePool = cfg.usePool || false;
        delete cfg.useTransaction;
        delete cfg.usePool;
        this.options = cfg;
        this.pool = new this.dbMdl.ConnectionPool(this.options);
    }

    /**
     * 获取连接
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
     * @param conn 
     */
    async release(conn:any){
        if(!conn){
            return;
        }
        conn._currentRequest.connection.close({drop:false});
    }
}

export{MssqlConnectionManager}