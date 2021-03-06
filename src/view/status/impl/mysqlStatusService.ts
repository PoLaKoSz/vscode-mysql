import { FieldInfo } from "mysql";
import { Console } from "../../../common/outputChannel";
import { ConnectionNode } from "../../../model/database/connectionNode";
import { ConnectionManager } from "../../../service/connectionManager";
import { AbstractStatusService, DashBoardResponse, ProcessListResponse, DashBoardItem } from "../abstractStatusService";
import { QueryUnit } from "../../../service/queryUnit";
import format = require('date-format');

interface QueryResponse {
    Variable_name: string,
    Value: string
}

export class MysqlStatusService extends AbstractStatusService {

    private responseToObj(resArray: QueryResponse[]): any {
        const response = {}
        for (const res of resArray) {
            let value: any = parseInt(res.Value)
            if (isNaN(value)) {
                value = res.Value
            }
            response[res.Variable_name] = value
        }
        return response;
    }

    protected async onProcessList(connectionNode: ConnectionNode): Promise<ProcessListResponse> {
        const connection = await ConnectionManager.getConnection(connectionNode)
        return new Promise((resovle, rej) => {
            connection.query('show processlist', (err, rows, fields: FieldInfo[]) => {
                if (err) {
                    Console.log(err);
                    rej(err)
                } else {
                    resovle({
                        fields: fields.map((field) => field.name),
                        list: rows
                    })
                }
            })
        })
    }

    protected async onDashBoard(connectionNode: ConnectionNode): Promise<DashBoardResponse> {

        const connection = await ConnectionManager.getConnection(connectionNode)
        const now = format('hh:mm:ss', new Date())

        const status = this.responseToObj((await QueryUnit.queryPromise(connection, "show global status ")) as QueryResponse[]);

        const sessions = await this.buildSession(status, now);
        const queries = await this.buildQueries(status, now);
        const traffic = await this.buildTraffic(status, now);

        return {
            sessions,
            queries,
            traffic
        };
    }

    private async buildTraffic(resposne, now: any): Promise<DashBoardItem[]> {
        return [
            { now, type: 'received', value: resposne.Bytes_received },
            { now, type: 'sent', value: resposne.Bytes_sent }
        ];
    }

    private async buildSession(resposne, now: any): Promise<DashBoardItem[]> {
        return [
            { now, type: 'count', value: resposne.Threads_connected },
            { now, type: 'running', value: resposne.Threads_running },
            { now, type: 'sleep', value: resposne.Threads_connected - resposne.Threads_running }
        ];
    }

    private async buildQueries(resposne, now: any): Promise<DashBoardItem[]> {
        return [
            { now, type: 'insert', value: resposne.Com_insert },
            { now, type: 'update', value: resposne.Com_update },
            { now, type: 'delete', value: resposne.Com_delete },
            { now, type: 'select', value: resposne.Com_select },
            { now, type: 'read', value: resposne.Innodb_rows_read },
        ];

    }



}




