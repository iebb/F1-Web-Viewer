const express = require("express");
const serverless = require("serverless-http");
const compression = require("compression");
const helmet = require("helmet");
const cors = require("cors");
const history = require("connect-history-api-fallback");
const fetch = require("node-fetch");

require("dotenv").config();

const app = express();
const PORT = process.env.SERVER_PORT || 3000;

if (app.get("env") === "production") {
  app.set("trust proxy", 1);
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(compression());
app.use(cors({ origin: true }));
app.use(history());

app.use(
  express.static("dist/web", {
    maxAge: process.env.CACHE_MAX_AGE || "1d"
  })
);

app.post(
  process.env.AWS_EXECUTION_ENV ? "/.netlify/functions/server/authenticate" : "/authenticate",
  async (req, res) => {
    try {
      const data = await fetch("https://api.formula1.com/v2/account/subscriber/authenticate/by-password", {
        method: "POST",
        body: JSON.stringify({
          Login: req.body.Login,
          Password: req.body.Password
        }),
        headers: {
          apiKey: "fCUCjWrKPu9ylJwRAv8BpGLEgiAuThx7",
          "Content-Type": "application/json",
          "Cookie": req.headers['cookie'],
        }
      });

      const json = await data.json();

      res.status(json.Status || 200).json(json);
    } catch (err) {
      console.error(err);

      res.status(500).json(err);
    }
  }
);

if (!process.env.AWS_EXECUTION_ENV) {
  const cors_proxy = require("cors-for-dev").createServer({
    originWhitelist: [],
    requireHeaders: [],
    removeHeaders: [],
    allowCredentials: true,
  });

  app.all("/proxy/:url*", (req, res) => {
    req.url = req.url.replace("/proxy/", "/");
    res._writeHead = res.writeHead
    res.writeHead = (a, b, c) => {
      const headers = res.getHeaders();
      if (headers['set-cookie']) {
        const { location } = req.corsAnywhereRequestState;
        const patched = headers['set-cookie'][0].replaceAll(
          "Path=", `Path=/proxy/${location.protocol}//${location.host}`
        ).replaceAll(
          /Domain=[^;]+/g, ''
        ).replaceAll(
          /SameSite=[^;]+/g, ''
        ).replaceAll(
          "Secure", ''
        ).replaceAll(
          /;+/g, ';'
        )
        res.set('set-cookie', patched)
      }
      res._writeHead(a, b, c);
    }
    cors_proxy.emit("request", req, res);
  });

  app.listen(PORT, () => console.info(`Server running on port ${PORT}`));
}

process.on("unhandledReject", console.warn);
process.on("uncaughtException", console.error);

module.exports.handler = serverless(app);
