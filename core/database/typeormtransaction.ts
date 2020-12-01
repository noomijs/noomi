import { NoomiTransaction } from "./noomitransaction";
/**
 * typeorm 事务类
 */
class TypeormTransaction extends NoomiTransaction{
    /**
     * entity manager
     */
    manager:any;
    
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

export {TypeormTransaction};