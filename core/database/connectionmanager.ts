import { DBManager } from "./dbmanager";
import { TransactionManager } from "./transactionmanager";
import { EntityManager } from "typeorm";


interface ConnectionManager{
    //获取连接
    getConnection():Promise<any>;
    //释放连接
    release(conn:any):Promise<any>;
}

/**
 * 获取数据库或数据源连接
 * @return          promise connection
 */
async function getConnection():Promise<any>{
    let instance = DBManager.getConnectionManager();
    if(instance && typeof instance.getConnection === 'function'){
        let conn = await instance.getConnection();
        return conn;
    }
    return null;
};

/**
 * 关闭连接
 * @param conn  待关闭的连接 
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
 * 获取当前EntityManager
 */
async function getManager():Promise<EntityManager>{
    let tr = TransactionManager.get(false);
    //事务不存在或事务manager不存在，则从connection manager中获取
    if(!tr || !tr.manager){
        let cm = DBManager.getConnectionManager();
        if(typeof cm.getManager === 'function'){
            return await cm.getManager();
        }  
        return null;
    }
    return tr.manager;
}

export{ConnectionManager,getConnection,closeConnection,getManager}