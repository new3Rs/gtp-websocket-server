const { spawn } = require("child_process");
const WebSocket = require("ws");

class GoAIServer {
    constructor(command, options, workDirectory) {
        this.gtp = spawn(command, options, {
            cwd: workDirectory,
            env: process.env
        });
        this.gtp.on("error", (err) => {
            console.log("error", err);
        });
        this.gtp.on("exit", (code, signal) => {
            console.log("exit", code, signal);
        });
        this.gtp.on("close", (code, signal) => {
            console.log("close", code, signal);
        });
        this.gtp.on("disconnect", () => {
            console.log("disconnect");
        });
        this.gtp.on("message", (message, sendHandle) => {
            console.log("close", message, sendHandle);
        });
        this.gtp.stdout.setEncoding("utf8");
        this.gtp.stderr.setEncoding("utf8");
        this.gtp.stderr.on("data", data => {
            console.error(data);
        });

        this.server = new WebSocket.Server({ port: 5001 });

        this.server.on('connection', ws => {
            if (this.server.clients.length > 1) { // do not support multiple connections
                ws.close();
                return;
            }
            const callback = data => {
                if (ws.readyState === WebSocket.CLOSED) {
                    this.gtp.stdout.removeListener("data", callback);
                    return;
                }
                ws.send(data);
            };
            this.gtp.stdout.on("data", callback);
            ws.on("message", message => {
                this.gtp.stdin.write(message);
            });
            ws.on('close', () => {
                this.gtp.stdin.write("clear_board\n");
            });
        });
    }
}

if (require.main === module) {
    if (process.argv.length < 3) {
        console.log("Usage: GTP_PATH=<path for gtp_program> node server.js <gtp_program> <program_arguments>");
        process.exit(1);
    }
    const server = new GoAIServer(process.argv[2], process.argv.slice(3), process.env.GTP_PATH || "./");
}