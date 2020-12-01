import { Util } from '../tools/util';
import { IConnectionManager } from './connectionmanager';


/**
 * typeorm连接管理器
 */
class TypeormConnectionManager implements IConnectionManager{
    /**
     * typeorm connection
     */
    connection:any;
    /**
     * 事务管理器
     */
    transactionManager:any;

    /**
     * 构造器
     * @param cfg 配置对象，配置如下：
     * ```
     * {
     *  "type": "mysql",
     *   "host": "localhost",
     *   "port": 3306,
     *   "username": "your user",
     *   "password": "your password",
     *   "database": "your db",
     *   "logging": true,
     *   "entities": [
     *       "your entity js file directory/*.js"
     *   ]
     * }
     * ```
     */
    constructor(cfg){
        //entity路径换成绝对路径
        if(cfg.entities){
            cfg.entities.forEach((item,i)=>{
                if(typeof item === 'string'){
                    cfg.entities[i] = Util.getAbsPath([item]);
                }
            });
        }
        const {getConnectionManager} = require('typeorm');
        this.connection = getConnectionManager().create(cfg);
    }
 
    /**
     * 获取连接
     * @returns connection（已连接）
     */
    async getConnection():Promise<any>{
        if(!this.connection.isConnected){
            await this.connection.connect();
        }
        return this.connection;
    }

    /**
     * 获取manager
     * @returns     EntityManager
     */
    async getManager():Promise<any>{
        let conn = await this.getConnection();
        return conn.manager;
    }

    /**
     * 释放连接，typeorm无需手动释放连接
     * @param conn 
     */
    async release(conn?:any){
    }

    /**
     * 关闭连接，应用结束时执行
     */
    async close(){
        if(this.connection){
            this.connection.close();
        }
    }
}


export{TypeormConnectionManager}