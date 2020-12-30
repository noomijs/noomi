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
import { ThreadLocal } from "../tools/threadlocal";

class TransactionManager{
    static transactionMap:Map<number,NoomiTransaction> = new Map();  //transaction map
    static transactionMdl:string;                               //transaction 实例名
    static expressions:Array<string>;                           //纳入事务的过滤串
    static pointcutId:string = 'NOOMI_TX_POINTCUT';             //切点名
    static addToAopExpressions:Array<string> = [];              //待添加到transaction aop的表达式串
    static isolationLevel:number=0;                             //隔离级 1read uncommited 2read commited 3repeatable read 4serializable
    static transactionOption:any;                               //事务配置项
    static init(cfg:any){
        //transaction 模块实例名
        this.transactionMdl = cfg.transaction||'noomi_transaction';
        //隔离级
        if(cfg.isolation_level && typeof cfg.isolation_level === 'number'){
            this.isolationLevel = cfg.isolation_level;
        }
        //添加Aspect
        let adviceInstance = InstanceFactory.addInstance({
            name:'NoomiTransactionAdvice',           //实例名
            instance:new TransactionAdvice(),
            class:TransactionAdvice
        });
        AopFactory.addPointcut(this.pointcutId,[]);
        //增加pointcut expression
        process.nextTick(()=>{
            AopFactory.addExpression(TransactionManager.pointcutId,TransactionManager.addToAopExpressions);
        });
        
        //增加advice
        AopFactory.addAdvice({
            pointcut_id:this.pointcutId,
            type:'before',
            method:'before',
            instance:adviceInstance
        });

        AopFactory.addAdvice({
            pointcut_id:this.pointcutId,
            type:'after-return',
            method:'afterReturn',
            instance:adviceInstance
        });

        AopFactory.addAdvice({
            pointcut_id:this.pointcutId,
            type:'after-throw',
            method:'afterThrow',
            instance:adviceInstance
        });
        
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
                    //废弃sequelize    
                    /*case "sequelize":
                        clazz = SequelizeTransaction;
                        //事务选项
                        this.transactionOption = {
                            autocommit:false
                        }
                        const {Transaction} = require('sequelize');
                        //设置隔离级别
                        if(this.isolationLevel !== 0){
                            switch(TransactionManager.isolationLevel){
                                case 1:  
                                    this.transactionOption.isolationLevel = Transaction.ISOLATION_LEVELS.READ_UNCOMMITTED;
                                    break;
                                case 2:
                                    this.transactionOption.isolationLevel = Transaction.ISOLATION_LEVELS.READ_COMMITTED;
                                    break;
                                case 3:
                                    this.transactionOption.isolationLevel = Transaction.ISOLATION_LEVELS.REPEATABLE_READ;
                                    break;
                                case 4:
                                    this.transactionOption.isolationLevel = Transaction.ISOLATION_LEVELS.SERIALIZABLE;
                            }
                        }
                        break;*/
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
     * 添加为事务
     * @param instance      实例 或 类
     * @param methodName    方法名
     */
    static addTransaction(instance:any,methodName:any){
        let pc = AopFactory.getPointcutById(this.pointcutId);
        let name:string = typeof instance === 'string'?instance:instance.__instanceName;
        let expr:string = '^' + name + '.' + methodName + '$';
        if(pc){ //pointcut存在，直接加入表达式
            AopFactory.addExpression(this.pointcutId,expr);
        }else{  //pointcut不存在，加入待处理队列
            this.addToAopExpressions.push(expr);
        }
    }

    /**
     * 获取transaction
     * @param newOne    如果不存在，是否新建
     * @return          transacton
     */
    
    static get(newOne?:boolean):NoomiTransaction{
        let tr:NoomiTransaction;
        //得到当前执行异步id
        
        let id:number = ThreadLocal.getThreadId();
        if(!id){
            if(newOne){
                id = ThreadLocal.newThreadId();
            }else{
                return null;
            }  
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
    static del(tr:NoomiTransaction){
        this.transactionMap.delete(tr.id);
    }
    
    /**
     * 获取connection
     */
    static getConnection(id?:number){
        if(!id){
            id = ThreadLocal.getThreadId();
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
    static async releaseConnection(tr:NoomiTransaction){
        await DBManager.getConnectionManager().release(tr.connection);
    }

    /**
     * 解析实例配置文件
     * @param path      文件路径
     * @param mdlPath   模型路径
     */
    static parseFile(path:string){
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
}

export {TransactionManager}