import net from "node:net";

net.createServer({
    keepAlive: true,
}, (socket) => {

}).listen(1433, "::1");