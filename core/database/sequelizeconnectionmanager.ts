import {Sequelize as SequelizeOrigin} from 'sequelize';
import { Sequelize } from "sequelize-typescript";
import { TransactionManager } from "./transactionmanager";
import { Util } from '../tools/util';
import { EntityManager } from 'typeorm';
import { IConnectionManager } from './connectionmanager';

/**
 * sequelize连接管理器
 */
class SequelizeConnectionManager implements IConnectionManager{
    /**
     * sequelize对象
     */
    sequelize:Sequelize;
    /**
     * 数据库配置项，示例如下：
     * ```
     * {
     *   "dialect":"mysql",
     *   "host":"localhost",
     *   "port":3306,
     *   "username":"your user",
     *   "password":"your password",
     *   "database":"your db",
     *   "pool": {
     *       "max": 5,
     *       "min": 0,
     *       "acquire": 30000,
     *       "idle": 10000
     *   },
     *   "define": {
     *       "timestamps": false
     *   },
     *   "models":["your model js file directory"],
     *   "repositoryMode":true 
     * }
     * ```
     * 更多细节参考npm sequelize
     */
    options:object;
    
    
    /**
     * 构造器
     * @param cfg 配置对象 {usePool:使用连接池,useTransaction:是否启用事务机制,其它配置参考options属性说明}
     */
    constructor(cfg){
        //使用cli-hooked
        // sequelize-typescript不支持cls，要用sequelize
        SequelizeOrigin.useCLS(TransactionManager.namespace);
        //处理models路径
        if(cfg.models && Array.isArray(cfg.models)){
            cfg.models.forEach((item,i)=>{
                if(typeof item === 'string'){
                    cfg.models[i] = Util.getAbsPath([item]);
                }
            });
        }
        this.sequelize = new Sequelize(cfg);
    }

    /**
     * 获取连接
     * @returns sequelize对象
     */
    async getConnection(){
        return this.sequelize;
    }

    /**
     * 释放连接，不做任何操作
     * @param conn 
     */
    async release(conn?:any){
    }

    /**
     * 关闭连接，整个应用结束时执行
     */
    async close(){
        if(this.sequelize){
            this.sequelize.close();
        }
    }

    /**
     * 获取EntityManager，TypeormConnectionManager有效，其它返回null
     * @returns 
     */
    async getManager():Promise<EntityManager>{
        return null;
    };
}

export{SequelizeConnectionManager}