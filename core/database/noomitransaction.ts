import { getConnection } from "./connectionmanager";

/**
 * 事务类
 */
class NoomiTransaction{
    /**
     * 事务id
     */
    id:number;
    /**
     * 事务所属连接
     */
    connection:any;
    /**
     * 
     */
    manager:any;
    /**
     * 事务类型
     */
    type:ETransactionType;
    /**
     * 事务是否开始
     */
    isBegin:boolean;
    
    /**
     * 事务id数组，当事务嵌套时需要通过该数组判断是否执行commit和rollback
     */
    invokeNum:number;
    
    /**
     * 实际的事务对象
     */
    tr:any;
    /**
     * 构造器
     * @param id            事务id 
     * @param connection    所属连接
     * @param type          事务类型
     */
    constructor(id:number,connection?:any,type?:ETransactionType){
        this.id = id; 
        this.connection = connection;
        this.invokeNum = 0;
        this.type = type || ETransactionType.NESTED;
    }
    /**
     * 开始事务,继承类需要重载
     */
    async begin(){
        this.isBegin = true;
        if(!this.connection){
            await getConnection();
        }
    }
    /**
     * 事务提交,继承类需要重载
     */
    async commit(){}

    /**
     * 事务回滚,继承类需要重载
     */
    async rollback(){}
}

/**
 * 事务类型枚举
 */
enum ETransactionType {
    /**
     * 嵌套
     */
    NESTED=1,        
    /**
     * 新建
     */ 
    NEW=2             
}

/**
 * 事务源枚举类型
 */
enum ETransactionSource{
    /**
     * mysql
     */
    MYSQL='mysql',
    /**
     * oracle
     */
    ORACLE='oracle',
    /**
     * mssql
     */
    MSSQL='mssql',
    /**
     * mongodb
     */
    MONGODB='mongodb',
    /**
     * relaen
     */
    RELAEN='relaen',
    /**
     * typeorm
     */
    TYPEORM='typeorm'
}

export{NoomiTransaction,ETransactionType}