"use strict";
// WebSocket proxy: the browser connects to ws://<host>/ws and we pipe the raw
// connection to the Hermes gateway adapter, which only listens on 127.0.0.1
// inside this container.
const net = require("net");

const attachWsProxy = (server, adapterPort) => {
  server.on("upgrade", (req, socket, head) => {
    if (!(req.url || "").startsWith("/ws")) {
      socket.destroy();
      return;
    }
    const upstream = net.connect(adapterPort, "127.0.0.1", () => {
      // replay the original upgrade request (with all its headers) to the adapter
      let raw = "GET / HTTP/1.1\r\n";
      for (let i = 0; i < req.rawHeaders.length; i += 2) raw += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
      upstream.write(`${raw}\r\n`);
      if (head && head.length) upstream.write(head);
      socket.pipe(upstream).pipe(socket);
    });
    upstream.on("error", () => socket.destroy());
    socket.on("error", () => upstream.destroy());
  });
};

module.exports = { attachWsProxy };
