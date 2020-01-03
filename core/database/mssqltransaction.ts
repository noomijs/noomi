import { NoomiTransaction, TransactionType } from "./noomitransaction";
import { getConnection } from "./connectionmanager";
import { DBManager } from "./dbmanager";

/**
 * mssql 事务类
 */
class MssqlTransaction extends NoomiTransaction{
    /**
     * mysql 事务对象
     */
    tr:any;

    /**
     * 构造器
     * @param id            事务id
     * @param connection    所属连接
     * @param type          事务类型
     */
    constructor(id:number,connection?:any,type?:TransactionType){
        super(id,connection,type);
        let cm = DBManager.getConnectionManager();
        let pool = cm.pool;
        this.tr = new cm.dbMdl.Transaction(pool);
    }
    
    /**
     * 开始事务
     */
    async begin(){
        if(!this.connection){
            this.connection = await getConnection();
        }
        await this.tr.begin();
    }

    /**
     * 事务提交
     */
    async commit(){
        await this.tr.commit();
    }

    /**
     * 事务回滚
     */
    async rollback(){
        await this.tr.rollback();
    }
}

export {MssqlTransaction};