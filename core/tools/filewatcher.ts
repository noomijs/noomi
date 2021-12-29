import { App } from "./application";
import { FSWatcher, fstat, Dirent } from "fs";
import { StaticResource } from "../web/staticresource";
import { WebCache } from "../web/webcache";
import { Util } from "./util";
import { InstanceFactory } from "../main/instancefactory";
import { WebConfig } from "../web/webconfig";

/**
 * 文件监听类型
 * @since 0.4.4
 */
export enum EWatcherType{
    STATIC = 1,     //静态资源，在web->static中配置
    DYNAMIC = 2     //动态资源，主要为模块
}

/**
 * file watch 类
 * 用于监听 静态文件或instance(动态)文件的改变
 * 静态文件改变后会更新web cache
 * instance文件改变后，更新实例工厂，仅对“注解类”实例有效
 * @since 0.4.4
 */

export class FileWatcher {
    /**
     * 监听目录map，键为路径，值为类型，类型包括static(静态)和dynamic(动态)
     */
    static directoryMap:Map<string,EWatcherType> = new Map();

    /**
     * 添加监听目录
     * @param path      目录路径
     * @param type      类型
     */
    static addDir(path:string,type:EWatcherType){
        //不重复监听
        if(this.directoryMap.has(path)){
            return;
        }
        this.directoryMap.set(path,type);

        switch(type){
            case EWatcherType.STATIC:
                this.watchStatic(path);
                break;
            case EWatcherType.DYNAMIC:
                this.watchDynamic(path);
                break;
        }
    }

    /**
     * 删除监听目录
     * @param path      目录路径
     */
    static removeDir(path:string){
        this.directoryMap.delete(path);
        App.fs.unwatchFile(path);
    }

    /**
     * 监听静态资源目录
     * @param path  目录路径
     */
    private static async watchStatic(path:string){
        //针对使用server cache的配置有效
        if(!WebConfig.useServerCache){
            return;
        }
        //支持recursive
        if(process.platform === 'darwin' || process.platform === 'win32'){
            App.fs.watch(path,{recursive:true},async (eventType,fileName)=>{
                //文件不存在或监听类型为rename，则返回
                if(!fileName || eventType === 'rename'){
                    return;
                }
                await this.handleStaticRes(App.path.resolve(path ,fileName));
            });    
        }else{
            App.fs.watch(path,async (eventType,fileName)=>{
                //文件不存在或监听类型为rename，则返回
                if(!fileName || eventType === 'rename'){
                    return;
                }
                await this.handleStaticRes(App.path.resolve(path ,fileName));
            });

            const dir = App.fs.readdirSync(path,{withFileTypes:true});
            for (let dirent of dir) {
                if(!dirent.isDirectory()){
                    continue;
                }
                //处理子目录
                this.addDir(App.path.resolve(path,dirent.name),EWatcherType.STATIC);
            }
        }
    }

    /**
     * 监听动态资源目录
     * @param path  路径
     */
    private static watchDynamic(path:string){
        App.fs.watch(path,async (eventType,fileName)=>{
            //文件不存在或不为js文件则返回
            if(!fileName || !fileName.endsWith('.js')){
                return;
            }
            let path1:string = App.path.resolve(path ,fileName);
            //删除require 缓存
            delete require.cache[path1];
            //文件不存在，则不需要加载
            if(!App.fs.existsSync(path1)){
                return;
            }
            let r = require(path1);
            let cls;
            //不同生成方法，r对象不同
            //非class，需要取出class
            if(!r.prototype){
                let props = Object.getOwnPropertyNames(r);
                for(let p of props){
                    //类
                    if(typeof r[p] === 'function' && r[p].prototype){
                        cls = r[p];
                        break;
                    }
                }
            }else{
                cls = r;
            }
            if(cls){
                //更新该类注入
                setImmediate(()=>{
                    InstanceFactory.updInject(cls);
                });
            }
        });
    }

    /**
     * 处理单个静态目录
     * @param path  监听目录
     */
    private static async handleStaticRes(path:string){
        let url:string = Util.getRelPath(path);
        url = Util.getUrlPath([url]);
        let obj = await WebCache.getCacheData(url);
        //如果webcache缓存该文件，则需要加入缓存
        if(obj && (obj.data || obj.zipData)){
            let zip = obj.zipData?true:false;
            let data = await StaticResource.readFile(path,zip);
            WebCache.add(url,data);
        }
    }
}