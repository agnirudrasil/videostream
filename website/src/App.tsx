import {
    ActionIcon,
    AppShell,
    Group,
    SimpleGrid,
    Stack,
    Tooltip,
    Text,
    Kbd,
} from "@mantine/core";
import "./index.css";
import {
    IconMicrophone,
    IconMicrophoneOff,
    IconPhoneOff,
    IconScreenShare,
    IconScreenShareOff,
    IconVideo,
    IconVideoOff,
} from "@tabler/icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Participant } from "./components/Participant";
import { useHotkeys, useLogger } from "@mantine/hooks";
import { JoinModal } from "./components/JoinModal";
import { useSocket } from "./hooks/useSocket";
import { Device } from "mediasoup-client";
import { mySignalingFactory } from "./mysignaling";
import { RtpCapabilities } from "mediasoup-client/lib/RtpParameters";
import type {
    MyParticipant,
    Participant as ParticipantType,
} from "./types/types";
import { createTransport } from "./createTransport";
import { consumeProducer } from "./mediasoup";

const App = () => {
    const nameRef = useRef<{ name: string } | null>(null);
    const [mute, setMute] = useState<MediaStream | null>(null);
    const [video, setVideo] = useState<MediaStream | null>(null);
    const [screen, setScreen] = useState<MediaStream | null>(null);
    const [opened, setOpened] = useState(true);
    const { socket, connect } = useSocket();
    const [participants, setParticipants] = useState<
        Record<string, ParticipantType>
    >({});
    const [me, setMe] = useState<MyParticipant>();

    const num = Object.keys(participants).length;
    const device = useMemo(() => new Device(), []);

    const mySignaling = useCallback(
        () => mySignalingFactory(socket),
        [socket],
    )();

    const toggleMute = async () => {
        if (!mute) {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            const track = stream.getAudioTracks()[0];
            track.onended = () => {
                setMute(null);
            };
            track.applyConstraints({ noiseSuppression: { ideal: true } });
            await me?.sendTransport?.produce({ track });
            const mStream = new MediaStream([track]);
            setMute(mStream);
        } else {
            mute.getTracks()[0].stop();
            setMute(null);
        }
    };

    const toggleVideo = async () => {
        if (!video) {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
            });
            const track = stream.getVideoTracks()[0];
            track.onended = () => {
                setVideo(null);
            };
            await me?.sendTransport?.produce({ track });
            const mStream = new MediaStream([track]);
            setVideo(mStream);
        } else {
            video.getTracks()[0].stop();
            setVideo(null);
        }
    };

    useHotkeys([
        ["alt+a", toggleMute],
        ["alt+v", toggleVideo],
    ]);

    useLogger("Participants", [{ participants }]);

    useEffect(() => {
        if (socket) {
            socket.on(
                "participants",
                async (p: (ParticipantType & { producers: string[] })[]) => {
                    const routerRtpCapabilities =
                        await mySignaling<RtpCapabilities>(
                            "getRouterCapabilities",
                        );

                    await device.load({ routerRtpCapabilities });

                    const sendTransport = await createTransport(
                        device,
                        mySignaling,
                        "send",
                    );

                    const recvTransport = await createTransport(
                        device,
                        mySignaling,
                        "recv",
                    );

                    const myParticipant = p.find(
                        participant => participant.id === socket.id,
                    )!;

                    setMe({
                        ...myParticipant,
                        recvTransport,
                        sendTransport,
                    });

                    const participantObject: Record<string, ParticipantType> =
                        {};

                    for (let participant of p) {
                        console.log(participant.producers);
                        const streams = await Promise.all(
                            participant.producers.map(producer =>
                                consumeProducer(
                                    device.rtpCapabilities,
                                    producer,
                                    recvTransport,
                                    mySignaling,
                                ),
                            ),
                        );

                        let audioStream: MediaStream | null = null;
                        let videoStream: MediaStream | null = null;
                        for (let { kind, stream } of streams) {
                            if (kind === "audio") {
                                audioStream = stream;
                            } else if (kind === "video") {
                                videoStream = stream;
                            }
                        }

                        participantObject[participant.id] = {
                            ...participant,
                            audioStream,
                            videoStream,
                        };
                    }

                    setParticipants(participantObject);
                },
            );

            socket.on("newParticipant", (p: ParticipantType) => {
                setParticipants(participants => ({
                    ...participants,
                    [p.id]: p,
                }));
            });

            socket.on("participantDisconnected", ({ id }: { id: string }) => {
                setParticipants(participants => {
                    const newParticipants = { ...participants };
                    delete newParticipants[id];
                    return newParticipants;
                });
            });

            socket.on(
                "newProducer",
                async ({
                    id,
                    producerId,
                }: {
                    id: string;
                    producerId: string;
                }) => {
                    if (me?.recvTransport) {
                        const { stream, kind } = await consumeProducer(
                            device.rtpCapabilities,
                            producerId,
                            me.recvTransport,
                            mySignaling,
                        );

                        if (kind === "audio") {
                            setParticipants(participants => ({
                                ...participants,
                                [id]: {
                                    ...participants[id],
                                    audioStream: stream,
                                },
                            }));
                        } else {
                            setParticipants(participants => ({
                                ...participants,
                                [id]: {
                                    ...participants[id],
                                    videoStream: stream,
                                },
                            }));
                        }
                    }
                },
            );
        }
    }, [socket, me, setMe, device, mySignaling, setParticipants, participants]);

    const toggleScreen = async () => {
        if (!screen) {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
            });
            console.log(stream.getTracks().length);
            const track = stream.getTracks()[0];

            track.onended = () => {
                setScreen(null);
            };
            const mStream = new MediaStream([track]);
            setScreen(mStream);
        } else {
            screen.getTracks()[0].stop();
            setScreen(null);
        }
    };

    return (
        <AppShell
            padding="md"
            navbar={<></>}
            header={<></>}
            styles={theme => ({
                main: {
                    backgroundColor:
                        theme.colorScheme === "dark"
                            ? theme.colors.dark[8]
                            : theme.colors.gray[0],
                    minHeight: "100vh",
                    maxHeight: "100vh",
                    overflow: "hidden",
                },
            })}
        >
            <JoinModal
                onSubmit={name => {
                    connect({ query: { name } });
                    setOpened(false);
                }}
                ref={nameRef}
                opened={opened}
                setOpened={setOpened}
            />
            <Stack
                sx={{
                    height: "100%",
                    maxHeight: "100%",
                }}
                align="center"
                justify="space-around"
            >
                <SimpleGrid
                    spacing="sm"
                    style={{
                        width: "100%",
                        height: "100%",
                        maxHeight: "100%",
                        overflow: "hidden",
                    }}
                    cols={
                        num > 9 ? 4 : num > 4 && num <= 9 ? 3 : Math.min(num, 2)
                    }
                >
                    {Object.keys(participants).map(k => {
                        const p = participants[k];

                        return k === socket?.id ? (
                            <Participant
                                name={p.name}
                                toggleAudio={toggleMute}
                                audioStream={mute}
                                videoStream={video}
                                key={k}
                            />
                        ) : (
                            <Participant
                                name={p.name}
                                audioStream={p.audioStream}
                                videoStream={p.videoStream}
                                key={k}
                            />
                        );
                    })}
                </SimpleGrid>
                <Group>
                    <Tooltip
                        label={
                            !screen ? "Share Screen" : "Turn off screen share"
                        }
                        transition="pop"
                        radius="xs"
                        withArrow
                    >
                        <ActionIcon
                            onClick={toggleScreen}
                            color={screen ? "red" : "gray"}
                            variant="filled"
                            size="xl"
                        >
                            {screen ? (
                                <IconScreenShareOff />
                            ) : (
                                <IconScreenShare />
                            )}
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip
                        label={
                            <Text>
                                {!video ? "Turn off video" : "Share video"}{" "}
                                <Kbd>Alt</Kbd>+<Kbd>V</Kbd>
                            </Text>
                        }
                        transition="pop"
                        radius="xs"
                        withArrow
                    >
                        <ActionIcon
                            onClick={toggleVideo}
                            color={!video ? "red" : "gray"}
                            variant="filled"
                            size="xl"
                        >
                            {!video ? <IconVideoOff /> : <IconVideo />}
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip
                        label={
                            <Text>
                                {!mute ? "Unmute" : "Mute"} <Kbd>Alt</Kbd>+
                                <Kbd>A</Kbd>
                            </Text>
                        }
                        transition="pop"
                        radius="xs"
                        withArrow
                    >
                        <ActionIcon
                            variant="filled"
                            size="xl"
                            onClick={toggleMute}
                            color={!mute ? "red" : "gray"}
                        >
                            {!mute ? <IconMicrophoneOff /> : <IconMicrophone />}
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip
                        label="Disconnect"
                        transition="pop"
                        radius="xs"
                        withArrow
                    >
                        <ActionIcon variant="filled" size="xl" color="red">
                            <IconPhoneOff />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Stack>
        </AppShell>
    );
};

export default App;
