import { Aspect, Pointcut } from "../tools/decorator";
import { LogManager } from "./logmanager";

export class LogAdvice {
    // 作为前置通知
    async beforeLogger() {
        LogManager.logger.log({ levelStr: 'info' }, arguments[0].clazz.name+'.'+arguments[0].methodName+'执行', '开始时间：'+new Date(), '方法参数：'+arguments[0].params);
    }
    // 作为返回通知
    async returnLogger() {
        LogManager.logger.log({ levelStr: 'info' }, '返回时间：'+new Date(), '返回值：'+arguments[0].returnValue);
    }
    // 作为异常通知
    async throwLogger() {
        LogManager.logger.log({ levelStr: 'info' }, '异常时间：'+new Date(), '异常值：'+arguments[0].throwValue);
    }
}