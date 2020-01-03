import { NoomiTransaction } from "./noomitransaction";
/**
 * sequelize 事务类
 * @remarks
 * typeorm事务通过事务代理完成开始、提交和回滚操作，不需要重载方法
 */
class SequelizeTransaction extends NoomiTransaction{
    async begin(){}

    async commit(){}

    async rollback(){}
}

export {SequelizeTransaction};