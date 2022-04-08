import { useState } from "react";
import { io, ManagerOptions, Socket, SocketOptions } from "socket.io-client";

export const useSocket = () => {
    const [socket, setSocket] = useState<Socket>();

    const connect = (opts?: Partial<ManagerOptions & SocketOptions>) => {
        if (socket) return;
        const socketIO = io("http://localhost:8000/", opts);
        setSocket(socketIO);
    };

    return { socket, connect };
};
