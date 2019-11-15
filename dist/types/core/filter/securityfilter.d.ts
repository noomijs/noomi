import { HttpRequest } from "../web/httprequest";
import { HttpResponse } from "../web/httpresponse";
export declare class SecurityFilter {
    do(request: HttpRequest, response: HttpResponse): Promise<boolean>;
}
