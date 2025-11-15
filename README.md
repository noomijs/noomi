# Noomi
一个基于node的企业级框架，基于typescript开发，支持路由、过滤器、IoC、Aop、事务及嵌套、安全框架、缓存、集群。  
Noomi全面支持typescript，提供快捷简单的注解编写方式和丰富的配置处理能力。   

## 快速接入
支持[noomi-cli](https://www.npmjs.com/package/noomi-cli)一键安装，完成noomi及其依赖包的安装，同时建立项目框架。

### API
更多使用细节参考[API](./api/noomi.md)。

### 版本
版本信息参考[版本信息](./update.md)。

## 核心模块
主要包括以下部分：
### 路由
路由作为web服务器与浏览器交互的桥梁，把js方法以RESTful方式暴露给客户端（浏览器）。
```javascript
@Router()
class Clazz1{
    @Route('/path')
    method1(){
        ...
    }
    ...
}
```
### 过滤器
过滤器为路由进行过滤，可针对不同的路由，设置不同的过滤方法，对路由及请求参数进行预处理。
```javascript
class Clazz1{
    @WebFilter(path,priority)
    do(request,resonpse){
        ...
        return true/false;
    }
}
```
### IoC
IoC（依赖注入）在需要依赖某个实例时，由注入器进行注入，不需要进行new操作。     
所有实例通过实例工厂统一管理，便于实例重用，降低实例创建和释放的消耗。   
@Instance注解表示该类所创建的实例由实例工厂进行管理。  
@Inject注解表示把实例工厂中类对应的实例注入到成员变量中。

```javascript

// Class A
// 保存为 classa.ts
@Instance()
export class ClassA{
    public doSomething(){
        // your code
    }
}

//Class B
//保存为classb.ts
import {ClassA} from 'yourpath/classa.ts'
@Instance()
export class ClazzB{
    @Inject(ClassA)
    instance:ClazzA;
    
    method1(){
        // your code
        this.instance.doSomething();
        // your code
    }
}

```
### Aop
把业务无关代码独立出来，做成切面，然后把切面包裹到业务代码上，通常应用场景为日志、事务等。  
```javascript
@Aspect()
class TestAspect{
    @Pointcut(["test1.*","test2.*"])
    testPointcut(){}
    @Before("testPointcut()")
    method1(){
        ...
    }
    @After("testPointcut()")
    method2(){
        ...
    }
    @Around("testPointcut()")
    method3(){
        ...
    }
    @AfterThrow("testPointcut()")
    method4(){
        ...
    }
    @AfterReturn("testPointcut()")
    method5(args){
        ...
    }
```

### 事务
事务主要针对数据库操作，事务操作可以在业务代码中编写，这样用有两个缺点：  
1. 事务代码与业务代码无关，导致代码冗余；
2. 如果一个事务方法调用了多个事务方法，当其中任一方法出现异常时，会导致事务回滚错误。  

实际开发中，我们不建议在业务代码中写事务相关代码，建议使用noomi事务，noomi支持事务及嵌套事务。   
#### 事务相关装饰器
1. @Transactioner: 修饰类，表示该类所有方法都为事务方法
2. @Transaction:   修饰方法，表示该方法为事务方法。

```javascript

@Transactioner()
class Clazz1{
    // @Transaction()
    async method1(){
        ...
    }
    ...
}
```
### 缓存
noomi提供了NCache类，可以提供内存和redis缓存统一处理。   
```javascript
const cache = new NCache({
    name:'***',
    saveType:0,
    max_size:2000000,
    redis:'default'
});
```
注：saveType 取值包括0 和 1，0 表示启用内存，1表示启用redis，当选择1时，需要配置redis。

### 集群
NCache支持redis缓存，web缓存和session都作为NCache的实例存在，所以可直接存放在redis上，从而实现多核和多机集群，我们建议采用PM2实现集群部署。
