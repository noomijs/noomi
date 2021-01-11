import { DBManager } from "./dbmanager";
import { TransactionManager } from "./transactionmanager";

/**
 * 数据库连接管理器
 * @remarks
 * 用于管理connection
 */
interface IConnectionManager{
    /**
     * 数据库连接池
     */
    pool?:any;
    /**
     * 数据库module，可以是 mysql module,mssql module, oracle module
     */
    dbMdl?:any;
    /**
     * 获取连接
     */
    getConnection:Function;

    /**
     * 释放连接
     * @param conn  待释放的连接
     */
    release:Function;

    /**
     * 获取EntityManager，TypeormConnectionManager有效
     * @returns 
     */
    getManager?:Function;
}

/**
 * 获取数据库或数据源连接
 * @returns    数据库connection，针对不同的product返回不同:
 *              mysql:      返回connection对象
 *              oracle:     返回connection对象
 *              mssql:      返回request对象
 *              relaen:     返回connection对象
 *              typeorm:    返回connection（已连接）
 */
async function getConnection():Promise<any>{
    let instance = DBManager.getConnectionManager();
    if(instance && typeof instance.getConnection === 'function'){
        return await instance.getConnection();
    }
    return null;
};

/**
 * 关闭数据库连接
 * @param conn  待关闭的连接，product为原生数据库(mysql、mssql、oracle) 时有效
 */
async function closeConnection(conn:any){
    if(!conn){
        return;
    }
    let cm = DBManager.getConnectionManager();
    if(cm){
        cm.release(conn);
    }
}

/**
 * 获取EntityManager
 * @returns  实体管理器,product为relaen、typeorm时有效
 */
async function getManager():Promise<any>{
    let tr = await TransactionManager.get(false);
    //事务不存在或事务manager不存在，则从connection manager中获取
    if(!tr || !tr.manager){
        let cm:IConnectionManager = DBManager.getConnectionManager();
        if(typeof cm.getManager === 'function'){
            return await cm.getManager();
        }
        return null;
    }
    return tr.manager;
}

export{IConnectionManager,getConnection,closeConnection,getManager}