import { InstanceFactory } from "../main/instancefactory";
import { AopFactory } from "../main/aopfactory";
import { TransactionAdvice } from "./transactionadvice";
import { NoomiError } from "../tools/errorfactory";
import { MysqlTransaction } from "./mysqltransaction";
import { NoomiTransaction } from "./noomitransaction";

import { DBManager } from "./dbmanager";
import { OracleTransaction } from "./oracletransaction";
import { App } from "../tools/application";
import { MssqlTransaction } from "./mssqltransaction";
import { TypeormTransaction } from "./typeormtransaction";
import { RelaenTransaction } from "./relaentransaction";
import { NoomiThreadLocal } from "../tools/threadlocal";

class TransactionManager{
    /**
     * transaction map，用于维护事务，键为事务id，值为事务对象
     */
    private static transactionMap:Map<number,NoomiTransaction> = new Map(); 
    /**
     * transaction 实例名
     */
    private static transactionMdl:string;
    
    /**
     * 切点名
     */
    public static pointcutId:string = '__NOOMI_TX_POINTCUT';   
    
    /**
     * 切面名
     */
    public static aspectName:string = '__NOOMI_TX_ASPECT';
    
    /**
     * 隔离级 1read uncommited 2read commited 3repeatable read 4serializable
     */
    public static isolationLevel:number=0;                             
    
    /**
     * 事务配置项
     */
    public static transactionOption:any;                               
    
    /**
     * 事务注册map，键为事务类名，值为[methodName1,methodName2,...]
     */
    private static registTransactionMap:Map<string,any[]> = new Map();

    static init(cfg:any){
        this.initAdvice();
        //transaction实例名
        this.transactionMdl = cfg.transaction||'__noomi_transaction';
        //隔离级
        if(cfg.isolation_level && typeof cfg.isolation_level === 'number'){
            this.isolationLevel = cfg.isolation_level;
        }
        
        //添加transaction到实例工厂，已存在则不再添加
        let tn:string = this.transactionMdl;
        //事务类
        let clazz:any;
        if(tn){
            let ins = InstanceFactory.getInstance(tn);
            if(ins === null){
                switch(cfg.product){
                    case "relaen":
                        clazz = RelaenTransaction;
                        break;    
                    case "mysql":
                        clazz = MysqlTransaction;
                        break;
                    break;
                    case "mssql":
                        clazz = MssqlTransaction;
                        break;
                    case "oracle":
                        clazz = OracleTransaction;
                        break;
                    case 'typeorm': //typeorm
                        clazz = TypeormTransaction;
                        this.transactionOption = {};
                        //设置隔离级别
                        if(this.isolationLevel !== 0){
                            switch(TransactionManager.isolationLevel){
                                case 1:  
                                    this.transactionOption.isolationLevel = "READ UNCOMMITTED";
                                    break;
                                case 2:
                                    this.transactionOption.isolationLevel = "READ COMMITTED";
                                    break;
                                case 3:
                                    this.transactionOption.isolationLevel = "REPEATABLE READ";
                                    break;
                                case 4:
                                    this.transactionOption.isolationLevel = "SERIALIZABLE";
                            }
                        }
                        break;
                }
                InstanceFactory.addInstance({
                    name:tn,
                    class:clazz,
                    singleton:false
                }); 
            }
        }
    }

    /**
     * 注册事务，在addInstance时正式添加到aop
     * @param className     类名
     * @param methodName    方法名或方法名串，支持通配符"*"
     */
    public static registTransaction(className:string,methodName:string|string[]){
        let arr = typeof methodName === 'string'?[methodName]:methodName;
        if(this.registTransactionMap.has(className)){
            arr = this.registTransactionMap.get(className).concat(arr);
        }
        this.registTransactionMap.set(className,arr);
    }

    /**
     * 处理实例事务，用于把事务注册map的事务添加到事务aop
     * @param instanceName      实例名
     * @param className         类名
     */
    public static handleInstanceTranstraction(instanceName:string,className:string){
        if(!this.registTransactionMap.has(className)){
            return;
        }
        const methods = this.registTransactionMap.get(className);
        if(methods){
            this.addTransaction(instanceName,methods);
        }
        //删除已处理的class
        this.registTransactionMap.delete(className);
    }

    /**
     * 添加为事务
     * @param instance      实例 或 类
     * @param methodName    方法名
     */
    public static addTransaction(instance:any,methodName:any){
        let pc = AopFactory.getPointcutById(this.pointcutId);
        let name:string = typeof instance === 'string'?instance:instance.__instanceName;
        //数组
        if(Array.isArray(methodName)){
            for(let n of methodName){
                let expr:string = '^' + name + '.' + n + '$';
                AopFactory.addExpression('TransactionAdvice',this.pointcutId,expr);
            }
        }else{
            let expr:string = '^' + name + '.' + methodName + '$';
            AopFactory.addExpression('TransactionAdvice',this.pointcutId,expr);
        }
    }

    /**
     * 获取transaction
     * @param newOne    如果不存在，是否新建
     * @return          transacton
     */
    public static async get(newOne?:boolean):Promise<NoomiTransaction>{
        let tr:NoomiTransaction;
        //得到当前执行异步id
        let id:number = NoomiThreadLocal.getThreadId();
        if(!id && newOne){
            id = NoomiThreadLocal.newThreadId();
        }
        if(!id){
            return null;
        }

        if(this.transactionMap.has(id)){
            tr = this.transactionMap.get(id);
        }else if(newOne){          //父亲对象不存在，则新建
            tr = InstanceFactory.getInstance(this.transactionMdl,[id]);
            // 保存到transaction map
            this.transactionMap.set(id,tr);
        }
        return tr;
    }

    /**
     * 删除事务
     * @param tr    事务 
     */
    public static del(tr:NoomiTransaction){
        this.transactionMap.delete(tr.id);
    }
    
    /**
     * 获取connection
     */
    public static getConnection(id?:number){
        if(!id){
            id = NoomiThreadLocal.getThreadId();
        }
        if(!this.transactionMap.has(id)){
            return null;
        }
        let tr:NoomiTransaction = this.transactionMap.get(id);
        return tr.connection;
    }

    /**
     * 释放连接
     * @param tr 
     */
    public static async releaseConnection(tr:NoomiTransaction){
        await DBManager.getConnectionManager().release(tr.connection);
    }

    /**
     * 解析实例配置文件
     * @param path      文件路径
     * @param mdlPath   模型路径
     */
    public static parseFile(path:string){
        interface InstanceJSON{
            files:Array<string>;        //引入文件
            instances:Array<any>;       //实例配置数组
        }
        //读取文件
        let jsonStr:string = App.fs.readFileSync(path,'utf-8');
        let json:InstanceJSON = null;
        try{
            json = App.JSON.parse(jsonStr);
        }catch(e){
            throw new NoomiError("2800") + '\n' + e;
        }
        this.init(json);
    }

    /**
     * 初始化transaction advice
     * @since 1.0.0
     */
    private static initAdvice(){
        AopFactory.registPointcut({
            className:'TransactionAdvice',
            id:this.pointcutId
        });

        AopFactory.registAdvice({
            pointcutId:this.pointcutId,
            type:'before',
            method:'before',
            className:'TransactionAdvice'
        });

        AopFactory.registAdvice({
            pointcutId:this.pointcutId,
            type:'after-return',
            method:'afterReturn',
            className:'TransactionAdvice'
        });

        AopFactory.registAdvice({
            pointcutId:this.pointcutId,
            type:'after-throw',
            method:'afterThrow',
            className:'TransactionAdvice'
        });

        AopFactory.registAspect('TransactionAdvice');
        //添加Aspect
        InstanceFactory.addInstance({
            name:this.aspectName,
            class:TransactionAdvice,
            singleton:true
        });

    }
}

export {TransactionManager}