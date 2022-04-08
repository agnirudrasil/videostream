import { Consumer } from "mediasoup/node/lib/Consumer";
import { Producer } from "mediasoup/node/lib/Producer";
import { Transport } from "mediasoup/node/lib/Transport";

export interface Participant {
    sendTransport: Transport | null;
    recvTransport: Transport | null;
    producers: Producer[];
    consumers: Consumer[];
    name: string;
}
