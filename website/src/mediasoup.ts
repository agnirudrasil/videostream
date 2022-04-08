import type {
    RtpCapabilities,
    MediaKind,
    RtpParameters,
} from "mediasoup-client/lib/RtpParameters";
import type { Transport } from "mediasoup-client/lib/Transport";
import type { ConsumerType } from "mediasoup/node/lib/Consumer";
import { mySignalingFactory } from "./mysignaling";

export const consumeProducer = async (
    rtpCapabilities: RtpCapabilities,
    producerId: string,
    recvTransport: Transport,
    mySignaling: ReturnType<typeof mySignalingFactory>,
) => {
    const { id, kind, rtpParameters } = await mySignaling<{
        producerId: string;
        id: string;
        kind: MediaKind;
        rtpParameters: RtpParameters;
        type: ConsumerType;
        producerPaused: boolean;
    }>("consume", {
        rtpCapabilities,
        producerId,
    });

    const { track } = await recvTransport.consume({
        id,
        kind,
        rtpParameters,
        producerId,
    });

    const stream = new MediaStream();

    stream.addTrack(track);

    return { stream, kind };
};
