import { createWorker } from "mediasoup";
import { config } from "./config";
import { Server } from "socket.io";
import { Router } from "mediasoup/node/lib/Router";
import type { Participant } from "./types/Participant";
import { closeParticipant } from "./utils/closeParticipant";

const createProducerTransport = async (router: Router) => {
    const { maxIncomingBitrate, initialAvailableOutgoingBitrate } =
        config.mediasoup.webRtcTransport;

    const sendTransport = await router.createWebRtcTransport({
        listenIps: config.mediasoup.webRtcTransport.listenIps,
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate,
    });

    if (maxIncomingBitrate) {
        try {
            await sendTransport.setMaxIncomingBitrate(maxIncomingBitrate);
        } catch (error) {}
    }

    sendTransport.on("dtlsstatechange", dtlsState => {
        if (dtlsState === "closed") {
            sendTransport.close();
        }
    });
    return sendTransport;
};

type TransportType = "recvTransport" | "sendTransport";

(async () => {
    const io = new Server();
    const worker = await createWorker({
        logLevel: "debug",
    });

    const router = await worker.createRouter({
        ...config.mediasoup.router,
    });

    const participants: Record<string, Participant> = {};

    io.on("connection", socket => {
        participants[socket.id] = {
            consumers: [],
            producers: [],
            recvTransport: null,
            sendTransport: null,
            name: socket.handshake.query.name as string,
        };

        console.log(
            `${socket.id} connected with name ${socket.handshake.query.name}`,
        );

        socket.emit(
            "participants",
            Object.keys(participants).map(id => ({
                id,
                name: participants[id].name,
                producers:
                    id !== socket.id
                        ? participants[id].producers.map(p => p.id)
                        : [],
            })),
        );

        socket.broadcast.emit("newParticipant", {
            id: socket.id,
            name: socket.handshake.query.name,
        });

        socket.on("getRouterCapabilities", callback => {
            callback(router.rtpCapabilities);
        });

        socket.on(
            "createTransport",
            async (type: "send" | "recv", callback) => {
                const transport = await createProducerTransport(router);
                participants[socket.id][
                    (type + "Transport") as "recvTransport" | "sendTransport"
                ] = transport;
                callback({
                    id: transport.id,
                    iceParameters: transport.iceParameters,
                    iceCandidates: transport.iceCandidates,
                    dtlsParameters: transport.dtlsParameters,
                });
            },
        );

        socket.on(
            "connectTransport",
            async ({ dtlsParameters, type }, callback) => {
                await participants[socket.id][
                    (type + "Transport") as TransportType
                ]?.connect({ dtlsParameters });
                callback("success");
            },
        );

        socket.on("produce", async ({ kind, rtpParameters }: any, callback) => {
            if (participants[socket.id].sendTransport) {
                const producer = await participants[
                    socket.id
                ].sendTransport!.produce({
                    kind,
                    rtpParameters,
                });

                participants[socket.id].producers.push(producer);

                callback({
                    id: producer.id,
                });

                socket.broadcast.emit("newProducer", {
                    producerId: producer.id,
                    id: socket.id,
                });
            }
        });

        socket.on("getProducers", callback => {
            const producers = Object.keys(participants)
                .filter(k => k !== socket.id)
                .flatMap(k => {
                    return participants[k].producers;
                });

            callback(producers.map(p => p.id));
        });

        socket.on(
            "consume",
            async ({ producerId, rtpCapabilities }: any, callback) => {
                if (!participants[socket.id].recvTransport) {
                    callback("failed");
                    return;
                }

                const consumer = await participants[
                    socket.id
                ].recvTransport!.consume({
                    producerId,
                    rtpCapabilities,
                    paused: false,
                });

                participants[socket.id].consumers.push(consumer);

                consumer.on("transportclose", () => {});

                callback({
                    producerId: producerId,
                    id: consumer.id,
                    kind: consumer.kind,
                    rtpParameters: consumer.rtpParameters,
                    type: consumer.type,
                    producerPaused: consumer.producerPaused,
                });
            },
        );

        socket.on("disconnect", () => {
            closeParticipant(participants[socket.id]);
            delete participants[socket.id];
            socket.broadcast.emit("participantDisconnected", { id: socket.id });
        });
    });

    io.listen(8000, {
        cors: {
            origin: ["http://localhost:3000", "http://192.168.0.106:3000"],
        },
    });
})();
