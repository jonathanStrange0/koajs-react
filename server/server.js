import "@babel/polyfill";
import dotenv from "dotenv";
import "isomorphic-fetch";
import Koa from "koa";
import Router from "@koa/router";
import serve from "koa-static";
import mount from "koa-mount";
import path from 'path'
// const Router = require("@koa/router");
const server = new Koa();
const router = new Router();

const port = parseInt(process.env.PORT, 10) || 3008;
const dev = process.env.NODE_ENV !== "production";

// if (!dev) {
//   console.log("this is a test");
const front_end = new Koa();
front_end.use(serve(`${__dirname}/../client/build`));
server.use(mount("/test", front_end));
// }


router.get("/", async (ctx) => {
  return (ctx.body = "Hello world");
});

server.use(router.allowedMethods());
server.use(router.routes());
server.listen(port, () => {
  console.log(`> Ready on http://localhost:${port}`);
});
