"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const instancefactory_1 = require("../main/instancefactory");
const aopfactory_1 = require("../main/aopfactory");
const transactionadvice_1 = require("./transactionadvice");
const errorfactory_1 = require("../tools/errorfactory");
const mysqltransaction_1 = require("./mysqltransaction");
const sequelizetransaction_1 = require("./sequelizetransaction");
const dbmanager_1 = require("./dbmanager");
const sequelize_1 = require("sequelize");
const oracletransaction_1 = require("./oracletransaction");
const application_1 = require("../tools/application");
const mssqltransaction_1 = require("./mssqltransaction");
class TransactionManager {
    static init(cfg) {
        //transaction 模块实例名
        this.transactionMdl = cfg.transaction || 'noomi_transaction';
        //隔离级
        if (cfg.isolation_level && typeof cfg.isolation_level === 'number') {
            this.isolationLevel = cfg.isolation_level;
        }
        //添加Aspect
        let adviceInstance = instancefactory_1.InstanceFactory.addInstance({
            name: 'NoomiTransactionAdvice',
            instance: new transactionadvice_1.TransactionAdvice(),
            class: transactionadvice_1.TransactionAdvice
        });
        aopfactory_1.AopFactory.addPointcut(this.pointcutId, []);
        //增加pointcut expression
        setImmediate(() => {
            aopfactory_1.AopFactory.addExpression(TransactionManager.pointcutId, TransactionManager.addToAopExpressions);
        });
        //增加advice
        aopfactory_1.AopFactory.addAdvice({
            pointcut_id: this.pointcutId,
            type: 'before',
            method: 'before',
            instance: adviceInstance
        });
        aopfactory_1.AopFactory.addAdvice({
            pointcut_id: this.pointcutId,
            type: 'after-return',
            method: 'afterReturn',
            instance: adviceInstance
        });
        aopfactory_1.AopFactory.addAdvice({
            pointcut_id: this.pointcutId,
            type: 'after-throw',
            method: 'afterThrow',
            instance: adviceInstance
        });
        //添加transaction到实例工厂，已存在则不再添加
        let tn = this.transactionMdl;
        if (tn) {
            let ins = instancefactory_1.InstanceFactory.getInstance(tn);
            if (ins === null) {
                switch (cfg.product) {
                    case "mysql":
                        instancefactory_1.InstanceFactory.addInstance({
                            name: tn,
                            class: mysqltransaction_1.MysqlTransaction,
                            singleton: false
                        });
                        break;
                    case "mssql":
                        instancefactory_1.InstanceFactory.addInstance({
                            name: tn,
                            class: mssqltransaction_1.MssqlTransaction,
                            singleton: false
                        });
                        break;
                    case "oracle":
                        instancefactory_1.InstanceFactory.addInstance({
                            name: tn,
                            class: oracletransaction_1.OracleTransaction,
                            singleton: false
                        });
                        break;
                    case "sequelize":
                        instancefactory_1.InstanceFactory.addInstance({
                            name: tn,
                            class: sequelizetransaction_1.SequelizeTransaction,
                            singleton: false
                        });
                        //事务选项
                        this.transactionOption = {
                            autocommit: false
                        };
                        //设置隔离级别
                        if (this.isolationLevel !== 0) {
                            switch (TransactionManager.isolationLevel) {
                                case 1:
                                    this.transactionOption.isolationLevel = sequelize_1.Transaction.ISOLATION_LEVELS.READ_UNCOMMITTED;
                                    break;
                                case 2:
                                    this.transactionOption.isolationLevel = sequelize_1.Transaction.ISOLATION_LEVELS.READ_COMMITTED;
                                    break;
                                case 3:
                                    this.transactionOption.isolationLevel = sequelize_1.Transaction.ISOLATION_LEVELS.REPEATABLE_READ;
                                    break;
                                case 4:
                                    this.transactionOption.isolationLevel = sequelize_1.Transaction.ISOLATION_LEVELS.SERIALIZABLE;
                            }
                        }
                        break;
                }
            }
        }
    }
    /**
     * 添加为事务
     * @param instance      实例 或 类
     * @param methodName    方法名
     */
    static addTransaction(instance, methodName) {
        let pc = aopfactory_1.AopFactory.getPointcutById(this.pointcutId);
        let name = typeof instance === 'string' ? instance : instance.__name;
        let expr = name + '.' + methodName;
        if (pc) { //pointcut存在，直接加入表达式
            aopfactory_1.AopFactory.addExpression(this.pointcutId, expr);
        }
        else { //pointcut不存在，加入待处理队列
            this.addToAopExpressions.push(expr);
        }
    }
    /**
     * 获取transaction
     * @param newOne    如果不存在，是否新建
     * @return          transacton
     */
    static get(newOne) {
        let tr;
        //得到当前执行异步id
        let id = this.namespace.get('tr_id');
        if (!id) {
            if (!newOne) {
                return null;
            }
            else {
                id = this.transactionId++;
            }
        }
        if (this.transactionMap.has(id)) {
            tr = this.transactionMap.get(id);
        }
        else if (newOne) { //父亲对象不存在，则新建
            tr = instancefactory_1.InstanceFactory.getInstance(this.transactionMdl, [id]);
            // 保存到transaction map
            this.transactionMap.set(id, tr);
        }
        return tr;
    }
    static setIdToLocal() {
        try {
            this.namespace.set('tr_id', this.transactionId++);
        }
        catch (e) {
            console.log(e);
        }
    }
    static getIdLocal() {
        return this.namespace.get('tr_id');
    }
    /**
     * 删除事务
     * @param tranId
     */
    static del(tr) {
        for (let id of tr.asyncIds) {
            this.transactionMap.delete(id);
        }
    }
    /**
     * 获取connection
     */
    static getConnection(id) {
        if (!id) {
            id = this.namespace.get('tr_id');
        }
        if (!this.transactionMap.has(id)) {
            return null;
        }
        let tr = this.transactionMap.get(id);
        return tr.connection;
    }
    /**
     * 释放连接
     * @param tr
     */
    static releaseConnection(tr) {
        dbmanager_1.DBManager.getConnectionManager().release(tr.connection);
    }
    /**
     * 解析实例配置文件
     * @param path      文件路径
     * @param mdlPath   模型路径
     */
    static parseFile(path) {
        //读取文件
        let jsonStr = application_1.App.fs.readFileSync(application_1.App.path.posix.join(process.cwd(), path), 'utf-8');
        let json = null;
        try {
            json = application_1.App.JSON.parse(jsonStr);
        }
        catch (e) {
            throw new errorfactory_1.NoomiError("2800") + '\n' + e;
        }
        this.init(json);
    }
}
exports.TransactionManager = TransactionManager;
TransactionManager.transactionMap = new Map(); //transaction map
TransactionManager.namespace = require('cls-hooked')
    .createNamespace('NOOMI_TX_NAMESPACE'); //cls namespace
TransactionManager.transactionId = 1; //transaction id;
TransactionManager.pointcutId = 'NOOMI_TX_POINTCUT'; //切点名
TransactionManager.addToAopExpressions = []; //待添加到transaction aop的表达式串
TransactionManager.isolationLevel = 0; //隔离级 1read uncommited 2read commited 3repeatable read 4serializable
//# sourceMappingURL=transactionmanager.js.map