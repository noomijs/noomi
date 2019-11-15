declare class DBManager {
    static connectionManagerName: string;
    static transactionName: string;
    static product: string;
    static init(cfg: any): void;
    /**
     * 获取connection manager
     */
    static getConnectionManager(): any;
    static parseFile(path: string): void;
}
export { DBManager };
