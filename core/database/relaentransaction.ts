import { NoomiTransaction, ETransactionType } from "./noomitransaction";
/**
 * relaen 事务类
 * @since 0.4.7
 */
class RelaenTransaction extends NoomiTransaction{
    // private tr:any;
    constructor(id:number,connection?:any,type?:ETransactionType){
        super(id,connection,type);
    }
    
    /**
     * 事务开始
     */
    async begin(){
        if(!this.tr){
            this.tr = this.connection.createTransaction();
        }
        await this.tr.begin();
    }

    /**
     * 事务提交
     */
    async commit(){
        if(!this.tr){
            return;
        }
        await this.tr.commit();
    }

    /**
     * 事务回滚
     */
    async rollback(){
        if(!this.tr){
            return;
        }
        try{
            await this.tr.rollback();
        }catch(e){
            console.log(e);
        }
    }
}

export {RelaenTransaction};