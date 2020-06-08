import axios from "axios";
import { Parser } from "htmlparser2";
import { promises as fs, constants } from "fs";

import config from "./config";
import Handler from "./utils/wuqimh";
import { Worker } from "worker_threads";

const chapterUrl = `${config.mainHost}/${config.chapterId}/`;

let colors = require("colors");

(async () => {
  const res = await axios.get(chapterUrl);
  const handler = new Handler(onParseEnd, { chapterId: config.chapterId });
  const parser = new Parser(handler);
  parser.write(res.data);
  parser.end();
})();


function onParseEnd(data: Array<{ url: string, text: string }>) {
  if (!data || !data.length) {
    return;
  }
  // @ts-ignore
  console.log("开始下载...".green);
  start(data);
}

async function existsItem(path: string) {
  let exists: boolean;
  try {
    await fs.access(path, constants.F_OK);
    exists = true;
  } catch (e) {
    exists = false;
  }
  return exists;
}

async function createFolder() {
  const exists = await existsItem(config.rootDir);
  if (!exists) {
    await fs.mkdir(config.rootDir);
  }
}

async function start(data: Array<{ url: string, text: string }>) {
  await createFolder();
  const map = new Map<string, Worker>();

  function onMessage(args: any) {
    if (!data.length) {
      return
    }
    const item = data.shift();
    if (item) {
      map.get(args.index)?.postMessage({ index: args.index, ...item });
    }
  }

  for (let i = 0; i < 1; i++) {
    const worker = new Worker("./dist/download.js");
    const key = (i + 1).toString();
    worker.on("message", onMessage);
    map.set(key, worker);
  }

  for (let [key, worker] of map) {
    if (!data.length) {
      break;
    }
    const item = data.shift();
    if (item) {
      console.log(`下载：${item.text}  worker:${key}`);
      worker.postMessage({ index: key, ...item });
    }
  }
}