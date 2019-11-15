"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errorfactory_1 = require("../tools/errorfactory");
const mysqlconnectionmanager_1 = require("./mysqlconnectionmanager");
const instancefactory_1 = require("../main/instancefactory");
const transactionmanager_1 = require("./transactionmanager");
const sequelizeconnectionmanager_1 = require("./sequelizeconnectionmanager");
const application_1 = require("../tools/application");
const oracleconnectionmanager_1 = require("./oracleconnectionmanager");
const mssqlconnectionmanager_1 = require("./mssqlconnectionmanager");
class DBManager {
    static init(cfg) {
        //数据库默认mysql
        let product = cfg.product || 'mysql';
        this.product = product;
        //connection manager配置
        let cm;
        let cmName = cfg.connection_manager || 'noomi_connection_manager';
        //先查询是否有自定义的connection manager
        if (cfg.connection_manager) {
            cm = instancefactory_1.InstanceFactory.getInstance(cmName);
        }
        //新建connection manager
        if (!cm && product) {
            let opt = cfg.options;
            opt.usePool = cfg.use_pool;
            //设置是否使用transaction标志
            opt.useTransaction = cfg.transaction ? true : false;
            switch (product) {
                case "mysql":
                    cm = new mysqlconnectionmanager_1.MysqlConnectionManager(opt);
                    instancefactory_1.InstanceFactory.addInstance({
                        name: cmName,
                        instance: cm,
                        class: mysqlconnectionmanager_1.MysqlConnectionManager
                    });
                    break;
                case "mssql":
                    cm = new mssqlconnectionmanager_1.MssqlConnectionManager(opt);
                    instancefactory_1.InstanceFactory.addInstance({
                        name: cmName,
                        instance: cm,
                        class: mssqlconnectionmanager_1.MssqlConnectionManager
                    });
                    break;
                case "oracle":
                    cm = new oracleconnectionmanager_1.OracleConnectionManager(opt);
                    instancefactory_1.InstanceFactory.addInstance({
                        name: cmName,
                        instance: cm,
                        class: oracleconnectionmanager_1.OracleConnectionManager
                    });
                    break;
                case "mongodb":
                    break;
                case "sequelize":
                    cm = new sequelizeconnectionmanager_1.SequelizeConnectionManager(opt);
                    instancefactory_1.InstanceFactory.addInstance({
                        name: cfg.cmName,
                        instance: cm,
                        class: sequelizeconnectionmanager_1.SequelizeConnectionManager,
                        singleton: true
                    });
                    break;
                case "typeorm":
                    break;
            }
        }
        this.connectionManagerName = cmName;
        //事务配置
        if (cfg.transaction) {
            let opt = cfg.transaction;
            opt.product = product;
            transactionmanager_1.TransactionManager.init(opt);
        }
    }
    /**
     * 获取connection manager
     */
    static getConnectionManager() {
        return instancefactory_1.InstanceFactory.getInstance(this.connectionManagerName);
    }
    static parseFile(path) {
        //读取文件
        let json = null;
        try {
            let jsonStr = application_1.App.fs.readFileSync(application_1.App.path.posix.join(process.cwd(), path), 'utf-8');
            json = application_1.App.JSON.parse(jsonStr);
            this.init(json);
        }
        catch (e) {
            throw new errorfactory_1.NoomiError("2800") + '\n' + e;
        }
    }
}
exports.DBManager = DBManager;
//# sourceMappingURL=dbmanager.js.map