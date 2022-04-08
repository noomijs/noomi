import { AopFactory } from "../main/aopfactory";
import { LogAdvice } from "./logadvice";

export class LogManager {
    public static logger: any;

    /**
     * 切点名
     */
    public static pointcutId: string = '__NOOMI_LOG_POINTCUT';

    static init(cfg: any) {
        const  log4js = require('log4js');
        log4js.configure({
            // 配置日志的输出源
            appenders: {
                // 日志输出到控制台，默认方式 
                consoleout: { type: "console" },
                // 日志输出到文件
                fileout: { type: "file", filename: "noomilogger.log" },
                // 日志输出到文件，并按特定的日期模式滚动
                datefileout: {
                    type: "dateFile",
                    filename: "datefileout.log",
                    pattern: ".yyyy-MM-dd-hh-mm-ss-SSS"
                }
            },
            categories: {
                default: { appenders: ["consoleout"], level: "info" },
                toFile: { appenders: ["fileout"], level: "info" }
            }
        });
        this.logger = log4js.getLogger(cfg.cateName);
        this.initAdvice(cfg.expression);
    }

    static initAdvice(expression: string[]) {
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