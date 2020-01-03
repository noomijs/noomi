import { TransactionManager } from "./transactionmanager";
import { ConnectionManager } from "./connectionmanager";
import { EntityManager } from "typeorm";


/**
 * mysql连接管理器
 */
class MysqlConnectionManager implements ConnectionManager{
    /**
     * 连接池
     */
    pool:any;
    /**
     * 是否使用连接池
     */
    usePool:boolean;
    /**
     * mysql connection对象
     */
    connection:any;
    /**
     * 数据库配置项，示例如下：
     * ```
     * {
     *   "host":"localhost",
     *   "port":3306,
     *   "user":"your user",
     *   "password":"your password",
     *   "database":"your db",
     *   "connectionLimit":10       
     * }
     * ```
     * 更多细节参考npm mysql
     */
    options:object;
    /**
     * module mysql
     */
    dbMdl:any;
    /**
     * 构造器
     * @param cfg 配置对象 {usePool:使用连接池,useTransaction:是否启用事务机制,其它配置参考options属性说明}
     */
    constructor(cfg:any){
        this.dbMdl = require('mysql');
        this.usePool = cfg.usePool || false;
        if(this.usePool){
            delete cfg.usePool;
            delete cfg.useTransaction;
            this.pool = this.dbMdl.createPool(cfg);
        }
        this.options = cfg;
    }

    /**
     * 获取连接
     * @returns mysql connection 对象
     */
    async getConnection(){
        let conn = TransactionManager.getConnection();
        if(conn){
            return conn;
        }
        if(this.pool){
            return new Promise((resolve,reject)=>{
                this.pool.getConnection((err,conn)=>{
                    if(err){
                        reject(err);
                    }
                    resolve(conn);
                });
            });
        }else{
            return  await this.dbMdl.createConnection(this.options);
        }
    }

    /**
     * 释放连接
     * @param conn mysql connection对象
     */
    async release(conn:any){
        if(!conn){
            return;
        }
        if(this.pool){
            conn.release(err=>{
                console.log(err);
            });
        }else{
            conn.end(err=>{
                console.log(err);
            });
        }
    }

    /**
     * 获取EntityManager，TypeormConnectionManager有效，其它返回null
     * @returns 
     */
    async getManager():Promise<EntityManager>{
        return null;
    };
}


export{MysqlConnectionManager}