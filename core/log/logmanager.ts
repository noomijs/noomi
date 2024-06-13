import {AopFactory} from "../main/aop/aopfactory";
import { LogOption } from "../types/logtypes";
import {LogAdvice} from "./logadvice";

/**
 * 日志管理类
 * @remarks
 * 用于管理各类日志
 */
export class LogManager {
    /**
     * 日志对象
     */
    public static logger: {log:(level:object,time:string,msg:string,msg1?:string)=>void};
    /**
     * 切点名
     */
    public static pointcutId: string = '__NOOMI_LOG_POINTCUT';

    /**
     * 日志配置初始化
     * @param cfg -   配置对象
     * @remarks
     * type: default表示输出到控制台，file表示输出到文件
     * 
     * expression: 表达式字符串数组
     */
    static init(cfg: LogOption) {
        const log4js = require('log4js');
        log4js.configure({
            // 配置日志的输出源
            appenders: {
                // 日志输出到控制台，默认方式 
                consoleout: {type: "console"},
                // 日志输出到文件
                fileout: {type: "file", filename: "noomilogger.log"},
                // 日志输出到文件，并按特定的日期模式滚动
                datefileout: {
                    type: "dateFile",
                    filename: "datefileout.log",
                    pattern: ".yyyy-MM-dd-hh-mm-ss-SSS"
                }
            },
            categories: {
                default: {appenders: ["consoleout"], level: "info"},
                file: {appenders: ["fileout"], level: "info"}
            }
        });
        this.logger = log4js.getLogger(cfg.type);
        let expr = cfg.expression;
        if(expr){
            if(!Array.isArray(expr)){
                expr = [expr];
            }
        }
        this.initAdvice(<string[]>expr);
    }

    /**
     * 初始化通知
     * @param expression - 表达式数组
     */
    private static initAdvice(expression: string[]) {
        AopFactory.registPointcut({
            clazz: LogAdvice,
            id: this.pointcutId,
            expressions: expression
        });
        AopFactory.registAdvice({
            clazz: LogAdvice,
            pointcutId: this.pointcutId,
            method: 'beforeLogger',
            type: 'before'
        });
        AopFactory.registAdvice({
            clazz: LogAdvice,
            pointcutId: this.pointcutId,
            method: 'returnLogger',
            type: 'after-return'
        });
        AopFactory.registAdvice({
            clazz: LogAdvice,
            pointcutId: this.pointcutId,
            method: 'throwLogger',
            type: 'after-throw'
        });
        AopFactory.addAspect(LogAdvice);
    }
}