import {LogManager} from "./logmanager";

/**
 * 日志通知
 * 
 * @public
 */
export class LogAdvice {
    /**
     * 前置通知
     */
    public async before(...args) {
        LogManager.logger.log({levelStr: 'info'}, args[0].clazz.name + '.' + args[0].methodName + '执行', '开始时间：' + new Date(), '方法参数：' + args[0].params);
    }

    /**
     * 返回通知
     */
    public async afterReturn(...args) {
        LogManager.logger.log({levelStr: 'info'}, '返回时间：' + new Date(), '返回值：' + args[0].returnValue);
    }

    /**
     * 异常通知
     */
    public async afterThrow(...args) {
        LogManager.logger.log({levelStr: 'info'}, '异常时间：' + new Date(), '异常值：' + args[0].throwValue);
    }
}