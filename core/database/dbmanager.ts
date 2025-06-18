import {App} from "../tools/application";
import {NoomiError} from "../tools/noomierror";
import {InstanceFactory} from "../main/instancefactory";
import {TransactionManager} from "./transactionmanager";
import { ConnectionConfig } from "../types/dbtypes";
import { NoomiThreadLocal } from "../tools/threadlocal";
import { NoomiTransaction } from "./noomitransaction";
import { NoomiConnectionManager } from "./noomiconnectionmanager";
import { Util } from "../tools/util";

/**
 * 数据库管理器
 * @remarks
 * 用于管理数据库配置、连接对象、事务对象等
 */
export class DBManager {
    /**
     * 连接管理器类
     */
    private static connectionManager:NoomiConnectionManager;

    /**
     * 事务类
     */
    private static transactionClazz;

    /**
     * 连接和事物map
     * @remarks
     * 存放connection和transaction实例，键为thread id，值为object，格式为
     * ```json
     * {
     *      conn:连接对象
     *      tx:事务对象
     * }
     * ```
     */
    private static map:Map<number,{conn?,tx?:NoomiTransaction}> = new Map();

    /**
     * 初始化
     * @param cfg -   配置项,参考数据库配置
     */
    public static init(cfg: ConnectionConfig){
        if(!cfg.package){
            throw new NoomiError("4001");
        }
        //从配置的noomi数据库包获取transaction和connection manager类
        const {Transaction,ConnectionManager} = require(cfg.package);
        if(!Transaction || !ConnectionManager){
            throw new NoomiError("4002",cfg.package);
        }
        //记录transaction class
        this.transactionClazz = Transaction;
        //实例化connection manager
        this.connectionManager = new ConnectionManager(cfg.options);
    
        //添加transaction class 到InstanceFactory
        InstanceFactory.addInstance(this.transactionClazz,false);

        //事务通知初始化
        TransactionManager.initAdvice();
    }

    /**
     * 解析文件
     * @param path -  文件路径
     */
    public static parseFile(path: string) {
        try {
            const jsonStr: string = App.fs.readFileSync(path, 'utf-8');
            const json = <ConnectionConfig>Util.eval(jsonStr);
            this.init(json);
        } catch (e) {
            throw new NoomiError("2800") + '\n' + e;
        }
    }

    /**
     * 获取连接
     * @returns     connection对象(具体connection对象由package确定)
     */
    public static async getConnection(): Promise<any>{
        const id = this.getAsyncId();
        const obj = this.map.get(id);
        if(obj && obj.conn){
            return obj.conn;
        }
        //从package对应包中获取connection
        obj.conn = await this.connectionManager.getConnection();
        return obj.conn;
    }

    /**
     * 释放连接
     */
    public static async closeConnection(){
        const id = this.getAsyncId();
        const obj = this.map.get(id);
        if(!obj || !obj.conn){
            return;
        }
        if(obj.tx){
            obj.tx.commit();
        }
        //调用实际conn关闭方法
        await this.connectionManager.closeConnection(obj.conn);
        //从map移除
        this.map.delete(id);
    }

    /**
     * 获取事务，类型由具体package确定
     * @returns     事务对象 
     */
    public static async getTransaction():Promise<NoomiTransaction>{
        const id = this.getAsyncId();
        let tx = this.map.get(id).tx;
        if(!tx){
            tx = <NoomiTransaction>InstanceFactory.getInstance(this.transactionClazz);
            this.map.get(id).tx = tx;
        }
        return tx;
    }

    /**
     * 移除事务
     */
    public static async removeTransaction(){
        const id = NoomiThreadLocal.getThreadId();
        if(id && this.map.has(id)){
            delete this.map.get(id).tx;
        }
    }

    /**
     * 获取异步id
     * @returns     异步id
     */
    private static getAsyncId():number{
        let id = NoomiThreadLocal.getThreadId();
        if(!id) {
            id = NoomiThreadLocal.newThreadId();
        }
        if(!this.map.has(id)){
            this.map.set(id,{});
        }
        return id;
    }
}