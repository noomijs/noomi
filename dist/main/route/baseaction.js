"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * base action
 */
class BaseAction {
    setModel(data) {
        this.model = data;
    }
    setRequest(req) {
        this.request = req;
    }
    setResponse(res) {
        this.response = res;
    }
}
exports.BaseAction = BaseAction;
//# sourceMappingURL=baseaction.js.map