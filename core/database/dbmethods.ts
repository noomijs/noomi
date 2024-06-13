import { DBManager } from "./dbmanager";
import { NoomiTransaction } from "./noomitransaction";

/**
 * 数据库暴露方法集
 */

/**
 * 获取数据库或数据源连接
 * @returns    数据库connection，针对不同的product返回不同:
 *              mysql:      返回connection对象
 *              oracle:     返回connection对象
 *              mssql:      返回request对象
 *              relaen:     返回connection对象
 *              typeorm:    返回connection（已连接）
 */
export async function getConnection(): Promise<any> {
    return await DBManager.getConnection();
}

/**
 * 关闭数据库连接
 */
export async function closeConnection() {
    await DBManager.closeConnection();
}

/**
 * 获取事务对象
 * @returns     事务对象
 */
export async function getTransaction():Promise<NoomiTransaction>{
    return await DBManager.getTransaction();
}

/**
 * 开始事务
 */
export async function txBegin(){
    const tx = await getTransaction();
    //首次begin，进行实际begin，否则只做计数器+1
    if(tx.beginTimes++ === 0){
        await tx.begin();
    }
}

/**
 * 提交事务
 * @param close -   关闭连接   
 * @returns         提交成功返回true，否则返回false
 */
export async function txCommit(close?:boolean):Promise<boolean>{
    const tx = await getTransaction();
    if(--tx.beginTimes === 0){
        await tx.commit();
        DBManager.removeTransaction();
        if(close){
            await closeConnection();
        }
        return true;
    }
    return false;
}

/**
 * 回滚事务
 * @param close -   是否关闭connection
 * @returns         回滚成功返回true，否则返回false
 */
export async function txRollback(close?:boolean){
    const tx = await getTransaction();
    if(--tx.beginTimes === 0){
        await tx.rollback();
        DBManager.removeTransaction();
        if(close){
            await closeConnection();
        }
        return true;
    }
    return false;
}