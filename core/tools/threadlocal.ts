
const{AsyncLocalStorage} = require("async_hooks");
/**
 * 线程安全（threadlocal）
 * @since 0.4.7
 */
class NoomiThreadLocal{
    /**
     * 线程id
     */
    private static threadId:number = 1;

    /**
     * 异步线程存储器
     */
    private static localStorage = new AsyncLocalStorage();
    
    /**
     * 新建thread id
     * @returns     新threadId
     */
    public static newThreadId():number{
        let sid = this.threadId++;
        this.localStorage.enterWith(sid);
        return sid;
    }

    /**
     * 获取当前thread id
     * @returns     当前threadId
     */
    public static getThreadId():number{
        return this.localStorage.getStore();
    }
}

export{NoomiThreadLocal}