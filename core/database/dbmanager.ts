import { NoomiError } from "../tools/errorfactory";
import { MysqlConnectionManager } from "./mysqlconnectionmanager";
import { InstanceFactory } from "../main/instancefactory";
import { TransactionManager } from "./transactionmanager";
import { SequelizeConnectionManager } from "./sequelizeconnectionmanager";
import { App } from "../tools/application";
import { OracleConnectionManager } from "./oracleconnectionmanager";
import { MssqlConnectionManager } from "./mssqlconnectionmanager";
import { TypeormConnectionManager } from "./typeormconnectionmanager";
import { ConnectionManager } from "./connectionmanager";

/**
 * 数据库管理器
 * @remarks
 * 用于管理数据库相关配置
 */
class DBManager{
    /**
     * 连接管理器实例名
     */
    static connectionManagerName:string;
    /**
     * 事务类名
     */
    static transactionName:string;  
    /**
     * 数据库产品 包括:mysql,mssql,oracle,typeorm,sequelize
     */    
    static product:string; 
    
    /**
     * 初始化
     * @param cfg   配置项,参考数据库配置 
     */
    static init(cfg:any){
        //数据库默认mysql
        let product:string = cfg.product||'mysql';
        this.product = product;
        //connection manager配置
        let cm:any;
        let cmName:string = cfg.connection_manager || 'noomi_connection_manager';
        //先查询是否有自定义的connection manager
        if(cfg.connection_manager){
            cm = InstanceFactory.getInstance(cmName);
        }
        //新建connection manager
        if(!cm && product){
            let opt = cfg.options;
            opt.usePool = cfg.use_pool;
            //设置是否使用transaction标志
            opt.useTransaction = cfg.transaction?true:false;
        
            switch(product){
                case "mysql":
                    cm = new MysqlConnectionManager(opt);
                    InstanceFactory.addInstance({
                        name:cmName,
                        instance:cm,
                        class:MysqlConnectionManager
                    });
                    break;
                case "mssql":
                    cm = new MssqlConnectionManager(opt);
                    InstanceFactory.addInstance({
                        name:cmName,
                        instance:cm,
                        class:MssqlConnectionManager
                    });
                    break;
                case "oracle":
                    cm = new OracleConnectionManager(opt);
                    InstanceFactory.addInstance({
                        name:cmName,
                        instance:cm,
                        class:OracleConnectionManager
                    });
                    break;
                case "sequelize":
                    cm = new SequelizeConnectionManager(opt);
                    InstanceFactory.addInstance({
                        name:cmName,
                        instance:cm,
                        class:SequelizeConnectionManager
                    });
                    break;
                case "typeorm":
                    cm = new TypeormConnectionManager(opt);
                    InstanceFactory.addInstance({
                        name:cmName,
                        instance:cm,
                        class:TypeormConnectionManager
                    });
                    break;
            }
        }
        this.connectionManagerName = cmName;
        //事务配置
        if(cfg.transaction){
            let opt = cfg.transaction;
            opt.product = product;
            TransactionManager.init(opt);
        }
    }

    /**
     * 获取connection manager
     * @returns    connection manager
     */
    static getConnectionManager():ConnectionManager{
        return InstanceFactory.getInstance(this.connectionManagerName);
    }

    /**
     * @exclude
     * 解析文件
     * @param path  文件路径 
     */
    static parseFile(path:string){
        //读取文件
        let json:any = null;
        try{
            let jsonStr:string = App.fs.readFileSync(path,'utf-8');
            json = App.JSON.parse(jsonStr);
            this.init(json);    
        }catch(e){
            throw new NoomiError("2800") + '\n' + e;
        }
    }
}

export{DBManager}