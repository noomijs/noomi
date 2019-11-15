import { HttpRequest } from "./httprequest";
import { HttpResponse } from "./httpresponse";

interface Filter{
    do(request:HttpRequest,response:HttpResponse):Function;
}

export {Filter}