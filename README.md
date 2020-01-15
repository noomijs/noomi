# Noomi
一个基于node的企业级框架，基于typescript开发，支持路由、过滤器、IoC、Aop、事务及嵌套、安全框架、缓存、集群。  
Noomi全面支持typescript，提供快捷简单的注解编写方式和丰富的配置处理能力。   
**框架官网：[www.noomi.cn](http://www.nodom.cn:3005)。**
## 快速接入
支持[noomi-cli](https://www.npmjs.com/package/noomi-cli)一键安装，完成noomi及其依赖包的安装，同时建立项目框架。
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
@Inject注解表示把实例工厂中该实例名对应的实例注入到成员变量中。
```javascript
@Instance('instance1')
class Clazz1{
    @Inject('instance2')
    relInstance:Clazz2;
    method1(){
        this.relInstance.***
        ...
    }
}
```
### Aop
把业务无关代码独立出来，做成切面，然后把切面包裹到业务代码上，通常应用场景为日志、事务等。  
```javascript
@Aspect()
class Clazz1{
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
1. 事务代码与业务代码无关；
2. 如果一个事务方法调用了多个事务方法，当非第一个方法出现异常时，则会导致事务回滚错误。  

实际开发中，我们不建议在业务代码中写事务相关代码，建议使用noomi事务，noomi支持事务及嵌套事务。
```javascript
@Transactioner()
class Clazz1{
    @Transactional()
    async method1(){
        ...
    }
    ...
}
```
### 缓存
noomi提供了NCache类，可以提供内存和redis缓存统一处理，使用方便。
```javascript
const cache = new NCache({
    name:'***',
    saveType:0/1,
    max_size:2000000,
    redis:'default'
});
```
### 集群
NCache支持redis缓存，web缓存和session都作为NCache的实例存在，所以可直接存放在redis上，从而实现多核和多机集群，我们建议采用PM2实现集群部署。

### 安全
noomi提供内置安全框架，用户只需提供对应的数据表和配置相应参数即可实现资源访问鉴权。
```
{
    "save_type":1,
    "redis":"default",
    "expressions":["/*"],       
    "dboption":{},
    "auth_fail_url":"***",    
    "login_url":"***"         
}
```
更多使用细节请参考[Noomi官网](http://www.nodom.cn:3005)。