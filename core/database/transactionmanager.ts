import {InstanceFactory} from "../main/instancefactory";
import {AopFactory} from "../main/aop/aopfactory";
import { UnknownClass } from "../types/other";
import { TransactionAdvice } from "./transactionadvice";

export class TransactionManager {
    /**
     * 事务切点名
     */
    private static pointcutId: string = '__NOOMI_TX_POINTCUT';
    
    /**
     * 添加为事务
     * @param clazz -       事务类
     * @param methodName -  方法名或方法名数组，支持通配符'*'
     */
    public static addTransaction(clazz: UnknownClass, methodName: string | string[]) {
        if (!InstanceFactory.hasClass(clazz)) {
            InstanceFactory.addInstance(clazz);
        }
        const pointcutId = 'TransactionAdvice.' + this.pointcutId;
        //数组
        if (Array.isArray(methodName)) {
            for (const n of methodName) {
                const expr: string = '^' + clazz.name + '.' + n + '$';
                AopFactory.addExpression(pointcutId, expr);
            }
        } else {
            const expr: string = '^' + clazz.name + '.' + methodName + '$';
            AopFactory.addExpression(pointcutId, expr);
        }
    }

    /**
     * 初始化transaction advice
     */
    public static initAdvice() {
        AopFactory.registPointcut({
            clazz: TransactionAdvice,
            id: this.pointcutId
        });
        AopFactory.registAdvice({
            pointcutId: this.pointcutId,
            type: 'before',
            method: 'before',
            clazz: TransactionAdvice
        });
        AopFactory.registAdvice({
            pointcutId: this.pointcutId,
            type: 'after-return',
            method: 'afterReturn',
            clazz: TransactionAdvice
        });
        AopFactory.registAdvice({
            pointcutId: this.pointcutId,
            type: 'after-throw',
            method: 'afterThrow',
            clazz: TransactionAdvice
        });
        AopFactory.addAspect(TransactionAdvice);
    }
}