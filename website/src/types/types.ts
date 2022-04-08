import {
    IceParameters,
    IceCandidate,
    DtlsParameters,
    Transport,
} from "mediasoup-client/lib/Transport";

export interface ServerTransport {
    id: string;
    iceParameters: IceParameters;
    iceCandidates: IceCandidate[];
    dtlsParameters: DtlsParameters;
}

export interface Participant {
    id: string;
    name: string;
    audioStream: MediaStream | null;
    videoStream: MediaStream | null;
}

export type MyParticipant = Participant & {
    sendTransport: null | Transport;
    recvTransport: null | Transport;
};
