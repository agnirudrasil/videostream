import { Socket } from "socket.io-client";

export const mySignalingFactory = (socket?: Socket) => {
    return async <T>(ev: string, args?: any) => {
        if (socket) {
            return new Promise<T>(res => {
                if (args) {
                    socket.emit(ev, args, async (args: any) => {
                        res(args);
                    });
                } else {
                    socket.emit(ev, async (args: any) => {
                        res(args);
                    });
                }
            });
        } else {
            return new Promise<T>(res => res(args as T));
        }
    };
};
