import { DBManager } from "./dbmanager";
import { TransactionManager } from "./transactionmanager";
import { EntityManager, Connection } from "typeorm";
import { Sequelize } from "sequelize-typescript";
import { SqlInMemory } from "typeorm/driver/SqlInMemory";

/**
 * 数据库连接管理器
 * @remarks
 * 用于管理connection
 */
interface ConnectionManager{
    /**
     * 数据库连接池
     */
    pool:any;
    /**
     * 数据库module，包括mysql,mssql,oracle,sequelize,typeorm
     */
    dbMdl:any;
    /**
     * 获取连接
     */
    getConnection():Promise<any>;

    /**
     * 释放连接
     * @param conn  待释放的连接
     */
    release(conn:any):Promise<any>;

    /**
     * 获取EntityManager，TypeormConnectionManager有效
     * @returns 
     */
    getManager():Promise<EntityManager>;
}

/**
 * 获取数据库或数据源连接
 * @returns    数据库connection，针对不同的product返回不同:
 *              mysql:      返回connection对象
 *              oracle:     返回connection对象
 *              mssql:      返回request对象
 *              sequelize:  返回sequelize对象
 *              typeorm:    返回connection（已连接）
 */
async function getConnection():Promise<Sequelize|Connection|any>{
    let instance = DBManager.getConnectionManager();
    if(instance && typeof instance.getConnection === 'function'){
        let conn = await instance.getConnection();
        return conn;
    }
    return null;
};

/**
 * 关闭连接
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
 * 获取当前EntityManager
 * @returns  实体管理器,product为typeorm时有效
 */
async function getManager():Promise<EntityManager>{
    let tr = TransactionManager.get(false);
    //事务不存在或事务manager不存在，则从connection manager中获取
    if(!tr || !tr.manager){
        let cm:ConnectionManager = DBManager.getConnectionManager();
        return await cm.getManager();
    }
    return tr.manager;
}

export{ConnectionManager,getConnection,closeConnection,getManager}