import {LogManager} from "./logmanager";

/**
 * 日志类
 */
export class LogAdvice {
    /**
     * 作为前置通知
     */
    async beforeLogger(...args) {
        LogManager.logger.log({levelStr: 'info'}, args[0].clazz.name + '.' + args[0].methodName + '执行', '开始时间：' + new Date(), '方法参数：' + args[0].params);
    }

    /**
     * 作为返回通知
     */
    async returnLogger(...args) {
        LogManager.logger.log({levelStr: 'info'}, '返回时间：' + new Date(), '返回值：' + args[0].returnValue);
    }

    /**
     * 作为异常通知
     */
    async throwLogger(...args) {
        LogManager.logger.log({levelStr: 'info'}, '异常时间：' + new Date(), '异常值：' + args[0].throwValue);
    }
}