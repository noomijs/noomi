export declare class TransactionAdvice {
    /**
     * 事务方法调用前
     */
    before(): Promise<void>;
    /**
     * 事务方法返回时
     */
    afterReturn(): Promise<void>;
    /**
     * 事务方法抛出异常时
     */
    afterThrow(): Promise<void>;
}
