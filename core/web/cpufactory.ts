import { App } from "../tools/application";
import { RequestQueue } from "../web/requestqueue";

export class CpuFactory{
    /**
     * setInterval对象
     */
    private static iterval:any;
    /**
     * 上一次CPU信息
     */
    private static oldcpu:any;
    /**
     * 记录requestQuene.quene连续为空的秒数，不连续置0
     */
    public static quenelen:number = 0;
    /**
     * 创建Interval对象
     * @returns 
     */
    public static openInterval(){
        if(this.iterval){
            return ;
        }
        this.oldcpu = this.getCpu();
        this.iterval = setInterval(this.getCpuUseRate,1000); 
    }
    /**
     * 关闭Interval对象
     */
    public static closeInterval(){
        if(this.iterval){
            clearInterval(this.iterval)
            this.iterval = null;
        }
    }
    /**
     * 30秒服务器没请求关闭定时器
     * 获取CPU使用率，更改RequestQuene中的canHandle
     */
    public static getCpuUseRate(){
        let now = CpuFactory.getCpu();
        let idle = now.idle - CpuFactory.oldcpu.idle;
        let total = now.total - CpuFactory.oldcpu.total;
        let rate = 1 - idle/total;
        CpuFactory.oldcpu = now;
        // console.log("cpu rate",rate,'----',CpuFactory.oldcpu);
        CpuFactory.quenelen = RequestQueue.queue.length === 0 ? CpuFactory.quenelen+1 : 0;
        if(rate >0.75){
            RequestQueue.setCanHandle(false);
        }
        else {
            RequestQueue.setCanHandle(true)
            if(CpuFactory.quenelen === 30){
                CpuFactory.quenelen = 0;
                CpuFactory.closeInterval();
            }
        }
    }
    /**
     * 获取cpu 信息
     * @returns 
     */
    public static getCpu(){
        let cpus:Array<any> = App.os.cpus();
        let idle:number = 0;
        let total:number = 0;
        let item:any;
        for(let i=0;i<cpus.length;i++){
            item = cpus[i].times;
            idle += item.idle;
            total = total + item.user + item.nice +item.sys + item.irq;
        }
        return {idle:idle,total:total+idle};
        
    }
    public static getMemory(){

    }
    
}