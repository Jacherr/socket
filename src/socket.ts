import { EventEmitter } from 'events';
import WebSocket, { ClientOptions, Data } from 'ws';

import { SocketEvents, OpCodes } from './constants'

export interface SocketOptions extends ClientOptions {
    autoReconnect?: boolean
    heartbeat?: HeartbeatOptions
    pongData?: any
}

export interface HeartbeatOptions {
    interval: number
    data: any
}

export interface Socket {
    on(event: SocketEvents.CLOSE | 'close', listener: (code: number, reason: string) => void): this;
    on(event: SocketEvents.ERROR | 'error', listener: (err: Error) => void): this;
    on(event: SocketEvents.MESSAGE | 'message', listener: (data: Data) => void): this;
    on(event: SocketEvents.OPEN | 'open', listener: () => void): this;
    on(event: string, listener: Function): this;
}

export class Socket extends EventEmitter {

    private newHeartbeatIntervalTime?: number
    private pong?: Function

    public autoReconnect: boolean
    public heartbeatInterval?: NodeJS.Timeout
    public heartbeatOptions?: HeartbeatOptions
    public options: SocketOptions
    public socket: WebSocket | null = null
    public url: string | null = null

    constructor(options: SocketOptions = {}) {
        super();
        this.autoReconnect = options.autoReconnect ?? true;
        this.heartbeatOptions = options.heartbeat;
        this.options = options;
    }

    set heartbeatIntervalTime(value: number) {
        this.newHeartbeatIntervalTime = value;
    }

    get state() {
        return this.socket?.readyState
    }

    public async connect(address: string): Promise<void> {
        this.url = address;
        return new Promise((resolve) => {
            this.socket = new WebSocket(address, this.options);

            const cb = () => {
                resolve();

                this.onOpen();
                this.emit(SocketEvents.OPEN);

                this.socket?.removeListener(SocketEvents.OPEN, cb);
            };

            this.socket.on(SocketEvents.OPEN, cb);
            this.initListeners();

            if(this.heartbeatOptions) {
                this.setHeartbeatInterval(this.heartbeatOptions.interval)
            }
        })
    }

    private initListeners() {
        this.socket?.on(SocketEvents.CLOSE, (code: number, reason: string) => {
            this.onClose(code, reason);
            this.emit(SocketEvents.CLOSE, code, reason);
        });

        this.socket?.on(SocketEvents.ERROR, (err: Error) => {
            this.onError(err);
            this.emit(SocketEvents.ERROR);
        })

        this.socket?.on(SocketEvents.MESSAGE, (data: Data) => {
            this.onMessage(data);
            this.emit(SocketEvents.MESSAGE, data);
        });
    }

    public onClose(code: number, reason: string): void | Promise<void> {
        this.removeAllListeners();
        if(this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        if (this.autoReconnect) this.connect(this.url as string);
    }

    public onError(err: Error): void | Promise<void> {
        throw err; // unhandled error event
    }

    public onMessage(data: Data): void | Promise<void> {

    }

    public onOpen(): void | Promise<void> {

    }

    public parseMessage(data: Data): any {
        if (typeof data === 'string') return JSON.parse(data);
        return data;
    }

    public async ping(data: string = OpCodes.PING.toString(), timeout: number = 1000): Promise<number> {
        return Promise.race([
            new Promise((resolve) => {
                const start = Date.now();
                this.send(data);

                const cb = (data: Data) => {
                    const pongData = this.options.pongData || OpCodes.PONG.toString();
                    if (data === pongData) { 
                        this.removeListener(SocketEvents.MESSAGE, cb); 
                        resolve(Date.now() - start);
                    };
                }

                this.on(SocketEvents.MESSAGE, cb);
            }),

            new Promise((_, reject) => {
                setTimeout(() => reject(`Ping took longer than ${timeout}ms`), timeout)
            })
        ]) as Promise<number>;
    }

    public send(data: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.socket?.send(data, (err?: Error) => {
                if (err) reject(err);
                resolve();
            })
        })
    }

    private setHeartbeatInterval(interval: number) {
        this.heartbeatInterval = setInterval(() => {
            this.ping(this.heartbeatOptions?.data);
            if(this.newHeartbeatIntervalTime) {
                clearInterval(this.heartbeatInterval as NodeJS.Timeout);
                this.setHeartbeatInterval(this.newHeartbeatIntervalTime);
            }
        }, interval);
    }
}