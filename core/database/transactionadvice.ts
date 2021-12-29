import { TransactionManager } from "./transactionmanager";
import { getConnection } from "./connectionmanager";
import { NoomiTransaction } from "./noomitransaction";

/**
 * 事务通知
 */
export class TransactionAdvice{
    /**
     * 事务方法调用前通知
     */
    async before(){
        let tr:NoomiTransaction = await TransactionManager.get(true);
        //connection 未初始化，初始化connection
        if(!tr.connection){
            tr.connection = await getConnection();
        }
        //调用数+1
        tr.invokeNum++;
        if(tr.isBegin){
            return;
        }
        tr.isBegin = true;
        await tr.begin();
    }

    /**
     * 事务方法返回时通知
     */
    async afterReturn(){
        let tr:NoomiTransaction = await TransactionManager.get();
        if(!tr || !tr.isBegin){
            return;
        }
        
        //当前id为事务头，进行提交
        if(--tr.invokeNum === 0){
            await tr.commit();
            //删除事务
            TransactionManager.del(tr);
            //释放连接
            await TransactionManager.releaseConnection(tr);
        }
    }

    /**
     * 事务方法抛出异常时通知
     */
    async afterThrow(){
        let tr:NoomiTransaction = await TransactionManager.get();
        if(!tr || !tr.isBegin){
            return;
        }
        
        if(tr){
            //最外层rollback
            if(--tr.invokeNum === 0){
                await tr.rollback();
                TransactionManager.del(tr);
                //释放连接
                await TransactionManager.releaseConnection(tr);
            }
        }
    }
}