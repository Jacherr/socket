export enum SocketEvents {
    CLOSE = 'close',
    ERROR = 'error',
    MESSAGE = 'message',
    OPEN = 'open',
}

export enum OpCodes {
    PING = 0x9,
    PONG = 0xA
}