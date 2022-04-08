import { Device } from "mediasoup-client";
import { Transport } from "mediasoup-client/lib/Transport";
import { mySignalingFactory } from "./mysignaling";
import { ServerTransport } from "./types/types";

export const createTransport = async (
    device: Device,
    mySignaling: ReturnType<typeof mySignalingFactory>,
    type: "send" | "recv",
) => {
    const serverTransport = await mySignaling<ServerTransport>(
        "createTransport",
        type,
    );

    let transport: Transport | null = null;
    if (type === "send") {
        transport = device.createSendTransport({
            ...serverTransport,
        });
    } else {
        transport = device.createRecvTransport({
            ...serverTransport,
        });
    }

    transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
        try {
            await mySignaling("connectTransport", {
                dtlsParameters,
                type,
            });
            callback();
        } catch (e) {
            errback(e);
        }
    });

    if (type === "send") {
        transport.on(
            "produce",
            async ({ kind, rtpParameters, appData }, callback, errback) => {
                try {
                    const { id } = (await mySignaling<{ id: string }>(
                        "produce",
                        {
                            transportId: transport!.id,
                            kind,
                            rtpParameters,
                            appData,
                        },
                    ))!;

                    callback({ id });
                } catch (error) {
                    errback(error);
                }
            },
        );
    }

    return transport;
};
