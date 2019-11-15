/// <reference types="node" />
import { Server } from "net";
declare class Noomi {
    port: number;
    server: Server;
    constructor(port?: number, configPath?: string);
    /**
     * 初始化
     */
    init(basePath: string): Promise<void>;
}
declare function noomi(port?: number, contextPath?: string): Noomi;
export { noomi, Noomi };
