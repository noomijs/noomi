import { NoomiTransaction } from "./noomitransaction";
/**
 * sequelize 事务类
 * @deprecated  0.4.7 
 *              sequelize-typescript没与sequelize同步升级，导致安装时需要降级安装
 */
class SequelizeTransaction extends NoomiTransaction{
    /**
     * 事务开始
     */
    async begin(){}

    /**
     * 事务提交
     */
    async commit(){}

    /**
     * 事务回滚
     */
    async rollback(){}
}

export {SequelizeTransaction};