import {
    Card,
    Stack,
    Center,
    ActionIcon,
    Group,
    Badge,
    Tooltip,
    ThemeIcon,
} from "@mantine/core";
import {
    IconUserCircle,
    IconMicrophoneOff,
    IconMicrophone,
} from "@tabler/icons";
import hark, { Harker } from "hark";
import React, { useEffect, useRef, useState } from "react";

interface Props {
    videoStream: MediaStream | null;
    audioStream: MediaStream | null;
    toggleAudio?: () => any;
    name: string;
}

interface DecorateProps {
    style?: React.CSSProperties;
    toggleAudio?: () => any;
    audio: boolean;
    name: string;
}

const Decorations: React.FC<DecorateProps> = ({
    style,
    toggleAudio,
    audio,
    name,
}) => {
    return (
        <Group
            position="apart"
            style={{
                marginBottom: 5,
                ...style,
            }}
        >
            <Badge color="gray" size="lg" radius="xs">
                {name}
            </Badge>
            <Tooltip label={audio ? "Mute" : "Unmute"} withArrow>
                <ActionIcon
                    onClick={toggleAudio}
                    size="sm"
                    variant="filled"
                    color="gray"
                >
                    {audio ? (
                        <IconMicrophone size="16px" />
                    ) : (
                        <IconMicrophoneOff size="16px" />
                    )}
                </ActionIcon>
            </Tooltip>
        </Group>
    );
};

export const Participant: React.FC<Props> = ({
    videoStream,
    audioStream,
    toggleAudio,
    name,
}) => {
    const [speaking, setSpeaking] = useState(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const audioRef = useRef<HTMLVideoElement | null>(null);

    let e: Harker | null = null;
    useEffect(() => {
        if (videoStream) {
            videoRef.current!.srcObject = videoStream;
        }
    }, [videoStream]);

    useEffect(() => {
        if (audioStream) {
            audioRef.current!.srcObject = audioStream;
            e = hark(audioStream);
            e.on("speaking", () => {
                setSpeaking(true);
            });

            e.on("speaking", () => {
                setSpeaking(true);
            });
            e.on("stopped_speaking", () => {
                setSpeaking(false);
            });
        } else {
            e?.stop();
        }
    }, [audioStream]);

    return (
        <Card
            withBorder
            shadow="sm"
            sx={theme => ({
                padding: theme.breakpoints.lg,
                width: "100%",
                height: "100%",
                minHeight: "250px",
                maxHeight: "100%",
                border: speaking ? `4px solid ${theme.colors.green[8]}` : "",
            })}
        >
            {audioStream && <audio ref={audioRef} autoPlay />}
            {videoStream && (
                <>
                    <Card.Section
                        sx={{
                            height: "100%",
                            width: "100%",
                            maxHeight: "100%",
                            position: "relative",
                        }}
                    >
                        <Center sx={{ width: "100%", height: "100%" }}>
                            <video
                                style={{ height: "100%" }}
                                ref={videoRef}
                                autoPlay
                                muted
                            />
                        </Center>
                        <Decorations
                            name={name}
                            toggleAudio={toggleAudio}
                            audio={!!audioStream}
                            style={{
                                position: "absolute",
                                bottom: "0px",
                                left: "0px",
                                right: "0px",
                            }}
                        />
                    </Card.Section>
                </>
            )}
            <Stack sx={{ height: "100%" }} justify="space-between">
                <div></div>
                {!videoStream && (
                    <Center>
                        <ThemeIcon size="xl" variant="filled" color="gray">
                            <IconUserCircle />
                        </ThemeIcon>
                    </Center>
                )}
                <Decorations
                    name={name}
                    toggleAudio={toggleAudio}
                    audio={!!audioStream}
                />
            </Stack>
        </Card>
    );
};
