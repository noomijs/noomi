import { TransactionManager } from "./transactionmanager";
import { App } from "../tools/application";
import { getConnection } from "./connectionmanager";
import { Transaction } from "./transaction";

export class TransactionAdvice{
    /**
     * 事务方法调用前
     */
    async before(){
        let tr:Transaction = await TransactionManager.get(true);
        //connection 未初始化，初始化connection
        if(!tr.connection){
            tr.connection = await getConnection();
        }
        tr.trIds.push(tr.id);
        if(tr.isBegin){
            return;
        }
        tr.isBegin = true;
        await tr.begin();
    }

    /**
     * 事务方法返回时
     */
    async afterReturn(){
        let tr:Transaction = await TransactionManager.get();
        if(!tr || !tr.isBegin){
            return;
        }
        
        tr.trIds.pop();
        //当前id为事务头，进行提交
        if(tr.trIds.length===0){
            await tr.commit();
            //删除事务
            TransactionManager.del(tr);
            //释放连接
            TransactionManager.releaseConnection(tr);
        }
    }


    /**
     * 事务方法抛出异常时
     */
    async afterThrow(){
        let tr:Transaction = await TransactionManager.get();
        if(!tr || !tr.isBegin){
            return;
        }
        if(tr){
            tr.trIds.pop();
            await tr.rollback();
            //释放连接
            await TransactionManager.releaseConnection(tr);
            TransactionManager.del(tr);
        }
    }
}