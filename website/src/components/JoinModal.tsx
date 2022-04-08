import { Button, Group, Modal, Space, TextInput } from "@mantine/core";
import { IconAt } from "@tabler/icons";
import { forwardRef, useImperativeHandle, useState } from "react";

interface Props {
    opened: boolean;
    setOpened: (opened: boolean) => any;
    onSubmit: (name: string) => any;
}

export const JoinModal = forwardRef<{ name: string }, Props>(
    ({ opened, setOpened, onSubmit }, ref) => {
        const [name, setName] = useState("");

        useImperativeHandle(ref, () => ({ name }));

        return (
            <Modal
                opened={opened}
                onClose={() => {
                    if (name) {
                        setOpened(false);
                    }
                }}
                title="Join a meeting"
            >
                <TextInput
                    placeholder="Please enter your name..."
                    label="Your Name"
                    radius="md"
                    size="sm"
                    required
                    value={name}
                    icon={<IconAt />}
                    onChange={e => setName(e.target.value)}
                />
                <Space h="xl" />
                <Group position="right">
                    <Button
                        onClick={() => onSubmit(name)}
                        disabled={!name}
                        uppercase
                    >
                        Connect
                    </Button>
                </Group>
            </Modal>
        );
    },
);
