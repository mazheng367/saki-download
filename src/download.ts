import { resolve } from "path";
import axios from "axios";
import { promises as fs, constants } from "fs";
import { parentPort, isMainThread, workerData } from "worker_threads";
import config from "./config";

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
      const res = await axios.get(`${config.imageHost}${path}`, { responseType: "arraybuffer", timeout: 30000, params: { "_": Date.now() } });
      await fs.writeFile(file, res.data);
    } catch (e) {
      errors.push({ path, file });
    } finally {
      if (images.length) {
        await request(images.shift() as string);
      }
    }
  }

  await request(images.shift() as string);

  return errors;
}

function getPageInfo(html: string): any {
  const matches = /eval\((.*)\)$/gmi.exec(html);
  const cInfo: any = {};
  if (matches) {
    const code = "return " + matches[1];
    const newCode = (new Function(code))() + ";return cInfo;";
    Object.assign(cInfo, (new Function(newCode))());
  }
  return cInfo;
}

async function prepareData(data: any) {
  console.log("已接受数据", JSON.stringify(data));
  const detailUrl = `${config.mainHost}/${data.url}`;
  const res = await axios.get(detailUrl);
  const cInfo = getPageInfo(res.data) as any;
  if (cInfo.fs?.length) {
    const errors = await downloadImage(cInfo.fs, data.text);
    if (errors.length) {
      const file = resolve(config.rootDir, data.text, "error.txt");
      await fs.writeFile(file, errors.map(err => JSON.stringify(err)).join("\r\n"));
    }
  }
  console.log("下载完成", JSON.stringify(data));
  parentPort?.postMessage({ status: "OK", index: data.index });
}