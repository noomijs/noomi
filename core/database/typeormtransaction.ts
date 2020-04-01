import { NoomiTransaction } from "./noomitransaction";
/**
 * typeorm 事务类
 * @remarks
 * sequelize事务通过事务代理完成开始、提交和回滚操作，不需要重载方法
 */
class TypeormTransaction extends NoomiTransaction{
    /**
     * entity manager
     */
    manager:any;
    
    async begin(){}

    async commit(){}

    async rollback(){}
}

export {TypeormTransaction};