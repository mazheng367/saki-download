import { promises as fs, constants } from "fs";
import config from "./config";

import { Worker } from "worker_threads";

import "colors";

const manga = require("./manhua/katui");

manga.getChapterList().then(onParseEnd);

function onParseEnd(data: Array<ChapterItem>) {
  if (!data || !data.length) {
    return;
  }
  console.log("开始下载...".green);
  start(data).then(() => console.log("等待下载"));
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

async function start(data: Array<ChapterItem>) {
  await createFolder();
  const map = new Map<string, Worker>();

  function onDownloadWorkerCompleted(args: WorkerTransferData) {
    const worker = map.get(args.workerId);
    if (!data.length) {
      map.delete(args.workerId);
      worker?.terminate();
      if (map.size === 0) {
        console.log("下载完成".rainbow);
      }
      return;
    }
    const item = data.shift();
    if (item) {
      console.log(`下载：${item.text}  worker:${args.workerId}`.yellow);
      worker?.postMessage({ workerId: args.workerId, ...item });
    }
  }

  for (let i = 0; i < config.maxWorker; i++) {
    const worker = new Worker("./dist/download.js");
    const workerId = `worker-${i + 1}`;
    worker.on("message", onDownloadWorkerCompleted);
    map.set(workerId, worker);
  }

  for (let [workerId, worker] of map) {
    if (!data.length) {
      break;
    }
    const item = data.shift();
    if (item) {
      console.log(`下载：${item.text}  worker:${workerId}`.yellow);
      worker.postMessage({ workerId, ...item });
    }
  }
}