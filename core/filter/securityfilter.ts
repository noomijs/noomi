import { HttpRequest } from "../web/httprequest";
import { HttpResponse } from "../web/httpresponse";
import { SecurityFactory } from "../tools/securityfactory";
import { Session } from "../web/sessionfactory";

export class SecurityFilter{
    async do(request:HttpRequest,response:HttpResponse){
        let session:Session = await request.getSession();
        let result = await SecurityFactory.check(request.url,session);
        let page:string;
        switch(result){
            case 0:
                return Promise.resolve(true);
            case 1:
                //未登录
                page = SecurityFactory.getSecurityPage('login_url');
                //保存登录前信息
                await SecurityFactory.setPreLoginInfo(session,request);
                break;
            case 2:
                // 无权限
                page = SecurityFactory.getSecurityPage('auth_fail_url');
                break;
        }
        if(page){
            response.redirect(page);
        }
        return Promise.resolve(false);
    }
}