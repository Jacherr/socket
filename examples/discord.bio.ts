import { Socket } from '../src/socket';
import { Data } from 'ws';
import { inspect } from 'util'

class DiscordBioSocket extends Socket {
    constructor() {
        super({
            autoReconnect: true,
            perMessageDeflate: false,
            headers: {
                connection: 'upgrade'
            },
            pongData: '3',
            heartbeat: {
                data: '2',
                interval: 25000
            }
        });
    }

    extractPacketData(data: string) {
        let jsonStartIndex = 0;
        let jsonStarted = false;
  
        data.split('').forEach(char => {
          if (!isNaN(parseInt(char)) && !jsonStarted) jsonStartIndex++;
          else jsonStarted = true;
        });
  
        data = data.slice(jsonStartIndex);
  
        if (!data) return null;
        return data;
    }

    onClose(code: number, reason: string) {
        console.log(`Connection closed (${code}) with reason ${reason}`)
    }

    onMessage(data: string) {
        const packet = this.parseMessage(data);
        if(!packet) return;
        console.log(`Packet recieved - name: ${packet[0]}, value: ${inspect(packet[1])}`)
    }

    onOpen() {
        console.log('Connection opened!');
    }

    parseMessage(data: Data): [string, any] | null {
        // discord.bio uses socket.io, so packets are sent in the form CODE[EVENT_NAME, EVENT_DATA]

        if(typeof data !== 'string') return null;   // clean useless packets

        const packet = this.extractPacketData(data);  // remove CODE part

        if(!packet) return null; // if packet has no data

        try {
            const parsedPacket = JSON.parse(packet);

            if(Array.isArray(parsedPacket)) {
                return parsedPacket as [string, any];
            }
            else {
                if(parsedPacket.pingInterval) {
                    this.heartbeatIntervalTime = parsedPacket.pingInterval;     // set heartbeat interval to recommended value
                }
                return null;
            }
        } catch {
            // not a valid packet

            return null;
        }
    }
}

const socket = new DiscordBioSocket();

(async () => {
   await socket.connect('https://api.discord.bio/bio_ws/?EIO=3&transport=websocket');   // connect to ws server
   await socket.send('42["VIEWING", "233667448887312385"]');    // identify the connection
   const p = await socket.ping('2');
   console.log(`Socket ping: ${p}ms`);
})();