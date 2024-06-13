import { NoomiError } from "../../tools/noomierror";
import { Util } from "../../tools/util";
import { AopAdvice } from "../../types/aoptypes";

/**
 * Aop 切点类
 */
export class AopPointcut {
    /**
     * 切点id
     */
    id: string;
    /**
     * 切面类
     */
    aspectClazz: unknown;
    /**
     * 正则表达式数组
     */
    expressions: RegExp[] = [];
    /**
     * 通知数组
     */
    advices?: Array<AopAdvice> = [];

    /**
     * 构造器
     * @param id -            切点id(实例内唯一)
     * @param expressions -   表达式串数组，支持通配符'*'
     * @param clazz -         切面类
     */
    constructor(id: string, expressions: Array<string>, clazz: unknown) {
        this.id = id;
        this.aspectClazz = clazz;
        if (expressions) {
            this.addExpression(expressions);
        }
    }

    /**
     * 给切点添加通知
     * @param advice -    通知对象
     */
    public addAdvice(advice: AopAdvice): void {
        this.advices.push(advice);
    }

    /**
     * 添加表达式串
     * @param expr -  表达式串或数组
     */
    addExpression(expr: string | string[]) {
        if (!Array.isArray(expr)) {
            this.expressions.push(Util.toReg(<string>expr));
        }else{
            expr.forEach((item) => {
                if (typeof item !== 'string') {
                    throw new NoomiError("2001");
                }
                this.expressions.push(Util.toReg(item));
            });
        }
    }
}
