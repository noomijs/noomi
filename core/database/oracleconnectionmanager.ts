import { IConnectionManager } from "./connectionmanager";
import { TransactionManager } from "./transactionmanager";
/**
 * oracle连接管理器
 */
class OracleConnectionManager implements IConnectionManager{
    /**
     * 连接池
     */
    pool:any;
    /**
     * 是否使用连接池
     */
    usePool:boolean;
    /**
     * connection对象
     */
    connection:any;
    /**
     * 数据库配置项，示例如下：
     * ```
     * {
     *   "user":"your user",
     *   "password":"your password",
     *   "connectString":"localhost/your db",
     *   "poolMin":5,
     *   "poolMax":20
     * }
     * ```
     * 更多细节参考npm oracle
     */
    options:object;
    /**
     * module oracle
     */
    dbMdl:any;
    /**
     * pool别名
     */
    poolAlias:string;
    
    /**
     * 构造器
     * @param cfg 配置对象 {usePool:使用连接池,useTransaction:是否启用事务机制,其它配置参考options属性说明}
     */
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
     * @returns connection 对象
     */
    async getConnection(){
        let conn = await TransactionManager.getConnection();
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
     * @param conn connection对象
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
                console.error(e);
            }
        }
    }
}


export{OracleConnectionManager}