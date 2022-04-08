import { Participant } from "../types/Participant";

export const closeParticipant = (participant: Participant) => {
    participant.sendTransport?.close();
    participant.recvTransport?.close();
    participant.producers.forEach(p => p.close());
    participant.consumers.forEach(c => c.close());
};
