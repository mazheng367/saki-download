import { resolve } from "path";
import { resolve as urlResolve } from "url";
import axios from "axios";
import { promises as fs, constants } from "fs";
import { parentPort, isMainThread, workerData } from "worker_threads";
import config from "./config";
import { getComicDetail, getPageInfo } from "./manhua/katui";
import "colors";

if (!isMainThread) {
  parentPort?.on("message", prepareData);
}

async function downloadImage(images: Array<string>, chapterText: string) {
  const errors: Array<{ path: string, file: string }> = [];
  if (!images || !images.length) {
    return errors;
  }

  let page = 1;
  const dir = resolve(config.rootDir, chapterText);

  try {
    await fs.mkdir(dir);
  } catch (e) {

  }

  async function request(path: string) {
    const file = resolve(dir, `${page++}.jpg`);
    let exists = false;
    try {
      // 检查文件是否存在
      try {
        await fs.access(file, constants.F_OK);
        exists = true;
      } catch {
        exists = false;
      }
      if (exists) {
        return;
      }
      const res = await axios.get(urlResolve(config.imageHost, path), { responseType: "arraybuffer", timeout: 30000, params: { "_": Date.now() } });
      await fs.writeFile(file, res.data);
    } catch (e) {
      errors.push({ path, file });
    } finally {
      if (images.length) {
        await new Promise((resolve1 => setTimeout(resolve1, config.wait * 1000)));
        await request(images.shift() as string);
      }
    }
  }

  await request(images.shift() as string);

  return errors;
}

async function prepareData(data: WorkerTransferData) {
  let status = "OK";
  try {
    console.log(`已接受数据:${JSON.stringify(data)}`.cyan);
    const url = `${config.mainHost}/${data.path}`;
    const html = await getComicDetail(url);
    const files = getPageInfo(html) as Array<string>;
    if (files?.length) {
      console.log(`下载中，共${files.length}页`.cyan);
      const errors = await downloadImage(files, data.text);
      if (errors.length) {
        const file = resolve(config.rootDir, data.text, "error.txt");
        await fs.writeFile(file, errors.map(err => JSON.stringify(err)).join("\r\n"));
      }
    }
    console.log(`下载完成:${JSON.stringify(data)}`.cyan);
  } catch (e) {
    console.error(e);
    status = `error:${e.message}`;
  } finally {
    parentPort?.postMessage({ status: status, workerId: data.workerId });
  }
}