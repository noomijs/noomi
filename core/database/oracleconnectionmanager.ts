import { ConnectionManager } from "./connectionmanager";
import { TransactionManager } from "./transactionmanager";
/**
 * 连接管理器
 */
class OracleConnectionManager implements ConnectionManager{
    pool:any;
    connection:any;
    options:object;
    dbMdl:any;
    usePool:boolean;
    poolAlias:string;       //pool别名
    constructor(cfg){
        this.dbMdl = require('oracledb');
        this.usePool = cfg.usePool || false;
        this.poolAlias = cfg.poolAlias;
        //设置自动提交为false
        if(cfg.useTransaction){
            this.dbMdl.autoCommit = false;
        }
        delete cfg.useTransaction;
        delete cfg.usePool;
        this.options = cfg;
    }

    /**
     * 获取连接
     */
    async getConnection(){
        let conn = TransactionManager.getConnection();
        if(conn){
            return conn;
        }

        if(this.usePool){
            if(!this.pool){
                this.pool = await this.dbMdl.createPool(this.options);
            }
            let pool = this.poolAlias?this.dbMdl.getPool(this.poolAlias):this.dbMdl.getPool();
            return await pool.getConnection();
        }else{
            return await this.dbMdl.createConnection(this.options);
        }
    }

    /**
     * 释放连接
     * @param conn 
     */
    async release(conn:any){
        if(!conn){
            return;
        }
        if(this.pool){
            conn.close({drop:false});
        }else{
            try{
                await conn.close();
            }catch(e){
                console.log(e);
            }
        }
    }
}


export{OracleConnectionManager}