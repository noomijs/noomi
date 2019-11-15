import { HttpRequest } from "../httprequest";
import { HttpResponse } from "../httpresponse";
export declare class SecurityFilter {
    do(request: HttpRequest, response: HttpResponse): Promise<boolean>;
}
