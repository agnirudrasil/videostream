import { MantineProvider } from "@mantine/core";
import React from "react";
import ReactDOM from "react-dom";
import App from "./App";

ReactDOM.render(
    <React.StrictMode>
        <MantineProvider theme={{ colorScheme: "dark" }}>
            <App />
        </MantineProvider>
    </React.StrictMode>,
    document.getElementById("root")
);
