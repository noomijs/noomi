"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const securityfactory_1 = require("../tools/securityfactory");
class SecurityFilter {
    async do(request, response) {
        let session = await request.getSession();
        let result = await securityfactory_1.SecurityFactory.check(request.url, session);
        let page;
        switch (result) {
            case 0:
                return Promise.resolve(true);
            case 1:
                //未登录
                page = securityfactory_1.SecurityFactory.getSecurityPage('login_url');
                //保存登录前信息
                await securityfactory_1.SecurityFactory.setPreLoginInfo(session, request);
                break;
            case 2:
                // 无权限
                page = securityfactory_1.SecurityFactory.getSecurityPage('auth_fail_url');
                break;
        }
        if (page) {
            response.redirect(page);
        }
        return Promise.resolve(false);
    }
}
exports.SecurityFilter = SecurityFilter;
//# sourceMappingURL=securityfilter.js.map