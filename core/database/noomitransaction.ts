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
    type:TransactionType;
    /**
     * 事务是否开始
     */
    isBegin:boolean;
    
    /**
     * 事务id数组，当事务嵌套时需要通过该数组判断是否执行commit和rollback
     */
    trIds:Array<number>=[];         
    
    /**
     * 构造器
     * @param id            事务id 
     * @param connection    所属连接
     * @param type          事务类型
     */
    constructor(id:number,connection?:any,type?:TransactionType){
        this.id = id; 
        this.connection = connection;
        this.type = type || TransactionType.NESTED;
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

enum TransactionType {
    NESTED,         //嵌套（默认）
    NEW             //新建
}

enum TransactionSource{
    MYSQL='mysql',
    ORACLE='oracle',
    MSSQL='mssql',
    MONGODB='mongodb',
    SEQUALIZE='sequalize',
    TYPEORM='typeorm'
}

export{NoomiTransaction,TransactionType}