import { HttpRequest} from "../../web/httprequest";
import { HttpResponse } from "../../web/httpresponse";
/**
 * base action
 */
class BaseAction{
    model:any;
    request:HttpRequest;          //request obj
    response:HttpResponse;        //response obj

    setModel(data:any){
        this.model = data;
    }

    setRequest(req:HttpRequest):void{
        this.request = req;
    }

    setResponse(res:HttpResponse):void{
        this.response = res;
    }
}

export{BaseAction};