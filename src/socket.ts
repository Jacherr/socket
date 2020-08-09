import { EventEmitter } from 'events';
import WebSocket, { ClientOptions, Data } from 'ws';

import { SocketEvents } from './constants'

export interface SocketOptions extends ClientOptions {
    autoReconnect?: boolean
    onClose?: (code: number, reason: string) => void | Promise<void>,
    onError?: (err: Error) => void | Promise<void>,
    onMessage?: (data: Data) => void | Promise<void>,
    onOpen?: () => void | Promise<void>,
    parseMessage?: <T> (data: Data) => T
}

export interface Socket {
    on(event: SocketEvents.CLOSE | 'close', listener: (code: number, reason: string) => void): this;
    on(event: SocketEvents.ERROR | 'error', listener: (err: Error) => void): this;
    on(event: SocketEvents.MESSAGE | 'message', listener: (data: Data) => void): this;
    on(event: SocketEvents.OPEN | 'open', listener: () => void): this;
    on(event: string, listener: Function): this;
}

export class Socket extends EventEmitter {

    public autoReconnect: boolean
    public options: SocketOptions
    public socket: WebSocket | null = null

    constructor(options: SocketOptions = {}) {
        super();
        this.autoReconnect = options.autoReconnect ?? true;
        this.options = options;
    }

    get state() {
        return this.socket?.readyState
    }

    public async connect(address: string): Promise<void> {
        return new Promise((resolve) => {
            this.socket = new WebSocket(address, this.options);

            const cb = () => {
                resolve();

                this.onOpen();
                this.emit(SocketEvents.OPEN);

                this.socket?.removeListener(SocketEvents.OPEN, cb);
            };
            this.socket.on(SocketEvents.OPEN, cb);

            this.socket.on(SocketEvents.CLOSE, (code: number, reason: string) => { 
                this.onClose(code, reason);
                this.emit(SocketEvents.CLOSE, code, reason);
            });

            this.socket.on(SocketEvents.ERROR, (err: Error) => {
                this.onError(err);
                this.emit(SocketEvents.ERROR);
            })

            this.socket.on(SocketEvents.MESSAGE, (data: Data) => { 
                this.onMessage(data);
                this.emit(SocketEvents.MESSAGE, data);
            });
        })
    }

    public onClose(code: number, reason: string): void | Promise<void> {
        this.removeAllListeners();
        this.options.onClose?.(code, reason);
    }

    public onError(err: Error) {
        if(this.options.onError)  { 
            this.options.onError(err);
        } else {
            throw err; // unhandled error event
        }
    }

    public onMessage(data: Data) {
        this.options.onMessage?.(data);
    }

    public onOpen(): void | Promise<void> {
        this.options.onOpen?.()
    }

    public parseMessage<T>(data: Data): T | Data {
        if(this.options.parseMessage) {
            return this.options.parseMessage<T>(data);
        } else {
            return data;
        }
    }
}