import { getConnection } from "./connectionmanager";

/**
 * 事务类
 */
class Transaction{
    id:number;
    connection:any;
    src:TransactionSource;
    type:TransactionType;
    isBegin:boolean;
    asyncIds:Array<number>=[];      //绑定的的async id
    trIds:Array<number>=[];         //有开始事务的async id数组
    constructor(id:number,connection?:any,type?:TransactionType){
        this.id = id; 
        this.connection = connection;
        this.type = type || TransactionType.NESTED;
        this.asyncIds.push(id);
    }
    async begin():Promise<void>{
        this.isBegin = true;
        if(!this.connection){
            await getConnection();
        }
    }
    async commit():Promise<void>{}
    async rollback():Promise<void>{}
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

export{Transaction,TransactionType}