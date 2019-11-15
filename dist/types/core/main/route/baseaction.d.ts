import { HttpRequest } from "../../web/httprequest";
import { HttpResponse } from "../../web/httpresponse";
/**
 * base action
 */
declare class BaseAction {
    model: any;
    request: HttpRequest;
    response: HttpResponse;
    setModel(data: any): void;
    setRequest(req: HttpRequest): void;
    setResponse(res: HttpResponse): void;
}
export { BaseAction };
