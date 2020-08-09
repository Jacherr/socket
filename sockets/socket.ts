import { EventEmitter } from 'events';
import WebSocket, { ClientOptions } from 'ws';

import { SocketEvents } from './constants'

export interface SocketOptions extends ClientOptions {
    autoReconnect?: boolean
}

export interface Socket {
    on(event: SocketEvents.CLOSE | 'close', listener: (code: number, reason: string) => void): this;
    on(event: SocketEvents.ERROR | 'error', listener: (err: Error) => void): this;
    on(event: SocketEvents.MESSAGE | 'message', listener: (data: any) => void): this;
    on(event: SocketEvents.OPEN | 'open', listener: () => void): this;
    on(event: string, listener: Function): this;
}

export class Socket extends EventEmitter {
    private openResolve?: Function

    public autoReconnect: boolean
    public options: SocketOptions
    public socket: WebSocket | null = null

    constructor(options: SocketOptions = {}) {
        super();
        this.autoReconnect = options.autoReconnect ?? true;
        this.options = options;
    }

    public async connect(address: string): Promise<void> {
        return new Promise((resolve) => {
            this.socket = new WebSocket(address, this.options);
            this.openResolve = resolve;
            this.socket.on(SocketEvents.OPEN, function () {
                resolve();
            })
        })
    }
}