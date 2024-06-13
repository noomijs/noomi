/**
 * 事务类，数据库包（如：noomi-mysql,noomi-relaen,...）必须继承此基类
 */
export abstract class NoomiTransaction {
    /**
     * begin次数
     */
    public beginTimes: number;

    /**
     * 实际的事务对象
     */
    protected tx: {begin,commit,rollback};

    constructor() {
        this.beginTimes = 0;
    }

    /**
     * 开始事务,继承类需要重载
     */
    public abstract begin() : void;

    /**
     * 事务提交,继承类需要重载
     */
    public abstract commit() : void;

    /**
     * 事务回滚,继承类需要重载
     */
    public abstract rollback() : void;
}