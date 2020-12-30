import { IConnectionManager } from "./connectionmanager";
import { TransactionManager } from "./transactionmanager";

/**
 * relaen连接管理器
 * @since 0.4.7
 */
class RelaenConnectionManager implements IConnectionManager{
    /**
     * 连接池
     */
    pool:any;
    /**
     * 是否使用连接池
     */
    usePool:boolean;
    /**
     * relaen connection对象
     */
    connection:any;
    /**
     * 数据库配置项，示例如下：
     * ```
     * {
     *    "dialect":"mysql",
     *    "host":"localhost",
     *    "port":3306,
     *    "username":"your user name",
     *    "password":"your password",
     *    "database":"your database",
     *    "pool":{
     *        "min":0,
     *        "max":10  
     *    },
     *    "entities": [
     *        "your entity js directory"
     *     ],
     *    "cache":true,
     *    "debug":true
     * }
     * ```
     * 更多细节参考npm relaen
     */
    options:object;
    
    /**
     * 构造器
     * @param cfg 配置对象 {usePool:使用连接池,useTransaction:是否启用事务机制,其它配置参考options属性说明}
     */
    constructor(cfg:any){
        const {RelaenManager} = require('relaen');
        //entity路径换成绝对路径
        this.options = cfg;
        //relan 初始化
        try{
            RelaenManager.init(cfg);
        }catch(e){
            console.log(e);
        }
    }

    /**
     * 获取连接
     * @returns sequelize对象
     */
    async getConnection(){
        let conn = TransactionManager.getConnection();
        if(conn){
            return conn;
        }
        //从 relaen获取
        const {getConnection} = require('relaen');
        return getConnection();
    }

    /**
     * 释放连接，不做任何操作
     * @param conn 
     */
    async release(conn?:any){
        if(conn){
            await conn.close();
        }
    }
}
export{RelaenConnectionManager}