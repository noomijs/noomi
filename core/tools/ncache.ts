import { NoomiError } from "./errorfactory";
import { RedisFactory } from "./redisfactory";
import { Util } from "./util";
import { App } from "./application";

/**
 * cache类
 */
interface CacheItem{
    key:string;         //键
    subKey?:string;     //子键
    value:any;          //值
    timeout?:number;    //超时时间(秒)
}


interface CacheCfg{
    name:string;        //cache 名
    saveType:number;    //存储类型 0内存，1redis，默认1
    redis?:string;      //redis名
    maxSize?:number;    //最大空间，默认为0，如果saveType=1，设置无效
}

export class NCache{
    redis:string;                                   //redis名，saveType为1时（redis需要）
    memoryCache:MemoryCache;                        //memory cache对象
    name:string;                                    //名字（redis需要）
    saveType:number;                                //存储类型 0内存 1redis     默认0
    redisSizeName:string = 'NCACHE_SIZE_';          //redis存储的cache size名字前缀
    redisPreName:string = 'NCACHE_';                //redis存储前缀
    redisTimeout:string = 'NCACHE_TIMEOUT_';        //timeout redis 前缀

    /**
     * 
     * @param name 
     * @param saveType 
     * @param maxSize 
     */
    constructor(cfg:CacheCfg){
        //如果为App为集群，则saveType为1，否则为设置值
        if(App.isCluster){
            this.saveType = 1;
        }else{
            this.saveType = cfg.saveType || 0;
        }
        
        this.name = App.appName + '_' + cfg.name;
        this.redis = cfg.redis;
        
        if(this.saveType === 0){
            this.memoryCache = new MemoryCache(cfg)
        }else{
            this.redisPreName += this.name + '_';
            this.redisTimeout += this.name + '_';
        }
    }

    /**
     * 添加到cache
     * @param key       键
     * @param value     值
     * @param extra     附加信息
     * @param timeout   超时时间(秒)         
     */
    async set(item:CacheItem,timeout?:number){
        if(this.saveType === 0){ //数据存到内存
            this.memoryCache.set(item,timeout);
        }else{//数据存到redis
            await this.addToRedis(item,timeout);
        }
    }

    /**
     * 获取值
     * @param key           键
     * @param changeExpire  是否更新过期时间
     * @return              value或null
     */
    async get(key:string,subKey?:string,changeExpire?:boolean){
        let ci:CacheItem = null;
        if(this.saveType === 0){
            return this.memoryCache.get(key,subKey,changeExpire);
        }else{
            return await this.getFromRedis(key,subKey,changeExpire);
        }
    }

    /**
     * 获取值
     * @param key           键
     * @param changeExpire  是否更新过期时间
     * @return              value或null
     */
    async getMap(key:string,changeExpire?:boolean){
        let ci:CacheItem = null;
        if(this.saveType === 0){
            return this.memoryCache.getMap(key,changeExpire);
        }else{
            return await this.getMapFromRedis(key,changeExpire);
        }
    }

    /**
     * 删除
     * @param key 键
     */
    async del(key:string,subKey?:string){
        if(this.saveType === 0){
            this.memoryCache.del(key,subKey);
        }else{
            await RedisFactory.del(this.redis,this.redisPreName + key,subKey);
        }
    }

    /**
     * 获取键
     * @param key   键，可以带通配符 
     */
    async getKeys(key:string):Promise<Array<string>>{
        if(this.saveType === 0){
            return this.memoryCache.getKeys(key);
        }else{
            let client = RedisFactory.getClient(this.redis);
            if(client === null){
                throw new NoomiError("2601",this.redis);
            }
            let arr = client.keys(this.redisPreName + key);
            //把前缀去掉
            arr.forEach((item,i)=>{
                arr[i] = item.substr(this.redisPreName.length);
            })
            return arr;
        }
    }
    /**
     * 是否拥有key
     * @param key 
     * @return   true/false
     */
    async has(key:string):Promise<boolean>{
        if(this.saveType === 0){
            return this.memoryCache.has(key);
        }else{
            return await RedisFactory.has(this.redis,this.redisPreName + key);
        }
    }
    

    /**
     * 从redis获取值
     * @param key           键
     * @apram subKey        子键
     * @param changeExpire  是否修改expire
     */
    private async getFromRedis(key:string,subKey?:string,changeExpire?:boolean):Promise<any>{
        let timeout:number = 0;
        if(changeExpire){
            let ts:string = await RedisFactory.get(this.redis,{
                pre:this.redisTimeout,
                key:key
            });
            if(ts !== null){
                timeout = parseInt(ts);
            }
        }
        
        let value = await RedisFactory.get(this.redis,{
            pre:this.redisPreName,
            key:key,
            subKey:subKey,
            timeout:timeout
        });
        return value||null;
    }

    /**
     * 从redis获取值
     * @param key           键
     * @apram subKey        子键
     * @param changeExpire  是否修改expire
     */
    private async getMapFromRedis(key:string,changeExpire?:boolean):Promise<any>{
        let timeout:number = 0;
        //超时修改expire
        if(changeExpire){
            let ts:string = await RedisFactory.get(this.redis,{
                pre:this.redisTimeout,
                key:key
            });
            if(ts !== null){
                timeout = parseInt(ts);
            }
        }
        
        let value = await RedisFactory.getMap(this.redis,{
            key:key,
            pre:this.redisPreName,
            timeout:timeout
        });
        return value||null;
    }

    /**
     * 存到redis
     * @param item      Redis item
     * @param timeout   超时
     */
    private async addToRedis(item:CacheItem,timeout?:number){
        //存储timeout
        if(typeof timeout==='number' && timeout>0){
            await RedisFactory.set(
                this.redis,
                {
                    pre:this.redisTimeout,
                    key:item.key,
                    value:timeout
                }
            );
        }
        //存储值
        await RedisFactory.set(
            this.redis,
            {
                pre:this.redisPreName,
                key:item.key,
                subKey:item.subKey,
                value:item.value,
                timeout:timeout
            }
        );
    }

   
}

//存储项
class MemoryItem{
    key:string;         //key
    type:number;        //类型0 字符串  1 map
    createTime:number;  //创建时间
    timeout:number;     //超时时间(秒)
    expire:number;      //过期时间
    useRcds:Array<any>; //使用记录
    LRU:number;         //最近最久使用，值越大越不淘汰
    value:any;          //值
    size:number;        //尺寸
    constructor(timeout?:number){
        this.createTime = new Date().getTime();
        if(timeout && typeof timeout === 'number'){
            this.timeout = timeout*1000;
            this.expire = this.createTime + this.timeout;
        }
        this.size = 0;
        this.useRcds = [];
        this.LRU = 1;
    }
}
/**
 * 存储区
 */
class MemoryCache{
    
    maxSize:number;             //最大size
    extraSize:number;           //附加size（对象）
    storeMap:Map<string,any>;   //存储总map
    size:number;                //当前尺寸

    constructor(cfg:any){
        this.storeMap = new Map();
        this.maxSize = cfg.maxSize;
        this.size = 0;
    }

    set(item:CacheItem,timeout?:number){
        //检查空间并清理
        this.checkAndClean(item);
        let ci:MemoryItem = this.storeMap.get(item.key);
        if(ci === undefined){
            ci = new MemoryItem(timeout);
            this.storeMap.set(item.key,ci);
        }
        if(item.subKey){//子键
            if(ci.value){
                //如果key的value不是对象，不能设置subkey
                if(typeof ci.value !== 'object'){
                    throw new NoomiError("3010");
                }
            }else{
                ci.value = Object.create(null);
            }
            let v:string;
            //转字符串
            if(typeof item.value === 'object'){
                v = JSON.stringify(item.value);
            }else{
                v = item.value + '';
            }
            
            //保留原size
            let si:number = ci.size;
            if(ci.value[item.subKey]){
                ci.size -= this.getRealSize(ci.value[item.subKey]);
            }
            ci.value[item.subKey] = v;
            ci.size += this.getRealSize(item.value);
            //更新cache size
            this.size += ci.size - si;
        }else{
            let size:number = this.getRealSize(item.value);
            if(typeof item.value === 'object'){
                ci.size = size;
                //新建value object
                if(!ci.value){
                    ci.value = Object.create(null);
                }
                //追加属性
                for(let k of Object.getOwnPropertyNames(item.value)){
                    ci.value[k] = item.value[k];
                }
                this.size += size;
            }else{
                let si:number = 0;
                if(ci){
                    //保留原size
                    si = ci.size;
                }else{
                    ci = new MemoryItem(timeout);
                    this.storeMap.set(item.key,ci);
                }
                ci.size += size - si;
                ci.value = item.value;
                this.size += size-si;
            }
        }
    }

    /**
     * 取值
     * @param key 
     * @param subKey 
     * @param changeExpire 
     */
    get(key:string,subKey?:string,changeExpire?:boolean){
        if(!this.storeMap.has(key)){
            return null;
        }
            
        let mi:MemoryItem = this.storeMap.get(key);
        const ct:number = new Date().getTime();
        if(mi.expire > 0 && mi.expire < ct){
            this.storeMap.delete(key);
            this.size -= mi.size;
            mi = null;
            return null;
        }
        this.changeLastUse(mi);
        if(subKey){
            if(typeof mi.value === 'object'){
                return mi.value[subKey]||null;
            }
            return null;
        }else{
            return mi.value;
        }
    }

    /**
     * 获取值
     * @param key           键
     * @param changeExpire  是否更新过期时间
     * @return              value或null
     */
    getMap(key:string,changeExpire?:boolean){
        if(!this.storeMap.has(key)){
            return null;
        }
        let mi:MemoryItem = this.storeMap.get(key);
        if(typeof mi.value !== 'object'){
            return null;
        }
        const ct:number = new Date().getTime();
        if(mi.expire > 0 && mi.expire < ct){
            this.storeMap.delete(key);
            this.size -= mi.size;
            mi = null;
            return null;
        }
        
        this.changeLastUse(mi);
        return mi.value;
    }

    /**
     * 获取键
     * @param key   键，可以带通配符 
     */
    getKeys(key:string):Array<string>{
        let keys = this.storeMap.keys();
        let reg:RegExp = Util.toReg(key);
        let k:string;
        let arr:Array<string> = [];
        for(let k of keys){
            if(reg.test(k)){
                arr.push(k);
            }
        }
        return arr;
    }
    
    
    /**
     * 删除键
     * @param key       键 
     * @param subKey    子键
     */
    del(key:string,subKey?:string){
        let mi:MemoryItem = this.storeMap.get(key);
        if(!mi){
            return;
        }
        if(!subKey){
            this.size -= mi.size;
            this.storeMap.delete(key);
            mi = null;
        }else{ //删除子键
            let v = mi.value[subKey];
            if(v){
                mi.size -= this.getRealSize(v);
                delete mi.value[subKey];
            }
        }
    }

    /**
     * 是否拥有key
     * @param key 
     * @return   true/false
     */
    has(key:string):boolean{
        return this.storeMap.has(key);
    }

    /**
     * 修改最后使用状态
     * @param item              memory item
     * @param changeExpire      释放修改expire
     */
    changeLastUse(item:MemoryItem,changeExpire?:boolean){
        let ct:number = new Date().getTime();
        //修改过期时间
        if(changeExpire && item.timeout){
            item.expire = ct + item.timeout * 1000;
        }
        //最大长度为5
        if(item.useRcds.length===5){
            item.useRcds.shift();
        }
        item.useRcds.push(ct);
        //计算lru
        this.cacLRU(item);
    }

    /**
     * 获取内容实际size utf8
     * @param value     待检测值
     * @return          size
     */
    getRealSize(value:any):number{
        let tp = typeof value;
        switch(tp){
            case 'string':
                return strSize(value);
            case 'number':
                return 8;
            case 'boolean':
                return 2;
            case 'object':
                let len:number = 0;
                for(let p of Object.getOwnPropertyNames(value)){
                    len += this.getRealSize(value[p]);
                }
                return len;
            default:
                return 4;

        }
        
        /**
         * 计算字符串尺寸
         * @param v     字符串
         * @return      size
         */
        function strSize(v:string){
            let totalLength:number = 0;
            for (let i = 0; i < v.length; i++) {
                let charCode = v.charCodeAt(i);
                if (charCode < 0x007f) {
                    totalLength = totalLength + 1;
                } else if ((0x0080 <= charCode) && (charCode <= 0x07ff)) {
                    totalLength += 2;
                } else if ((0x0800 <= charCode) && (charCode <= 0xffff)) {
                    totalLength += 3;
                }
            }
            return totalLength;
        }
        
    }


    /**
     * 清理缓存
     * @param size  清理大小，为0仅清除超时元素
     */
    cleanup(size:number){
        //无可清理对象
        if(this.storeMap.size === 0){
            return;
        }
        let ct = new Date().getTime();
        //清理超时的
        for(let item of this.storeMap){
            let key:string = item[0];
            let mi:MemoryItem = item[1];
            if(mi.expire>0 && mi.expire<ct){
                this.storeMap.delete(key);
                this.size -= mi.size;
                size -= mi.size;
                mi = null;
            }
        }
        //重复清理直到size符合要求
        while(size>0){
            size -= this.clearByLRU();
        }
    }

    /**
     * 通过lru进行清理
     * @return      清理的尺寸
     */
    clearByLRU(){
        //随机取10个，删除其中lru最小的3个
        let delArr:Array<MemoryItem> = [];
        let delKeys:Array<string> = [];
        let keys = this.storeMap.keys();
        
        for(let i=0;i<10;i++){
            let key:string = keys[Math.random()*this.storeMap.size|0];
            delKeys.push(key);
            delArr.push(this.storeMap.get(key));
        }
        //升序排序
        delArr.sort((a,b)=>{
            return a.LRU - b.LRU;
        });
        //释放前三个
        let size:number = 0;
        for(let i=0;i<delKeys.length&&i<3;i++){
            size += delArr[i].size;
            this.storeMap.delete(delKeys[i]);
        }
        return size;
    }
    /**
     * 检查和清理空间
     * @param item  cacheitem
     */
    checkAndClean(item:CacheItem){
        let size:number = this.getRealSize(item.value);
        if(this.maxSize>0 && size + this.size>this.maxSize){
            this.cleanup(size + this.size - this.maxSize);
            if(size + this.size > this.maxSize){
                throw new NoomiError("3002");
            }
        }
    }
    /**
     * 计算LRU
     * timeout 的权重为5（先保证timeout由时间去清理）
     * right = sum(1-(当前时间-使用记录)/当前时间) + timeout?5:0
     * @param item 
     */
    cacLRU(item:MemoryItem){
        let ct = new Date().getTime();
        let right:number = item.timeout>0?5:0;
        for(let i=0;i<item.useRcds.length;i++){
            right += 1-(ct-item.useRcds[i])/ct;
        }
        item.LRU = right;
    }
}
