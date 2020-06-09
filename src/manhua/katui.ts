import config from "../config";
import { Handler } from "htmlparser2/lib/Parser";
import axios from "axios";
import { decode as iconVDecode } from "iconv-lite";
import { Parser } from "htmlparser2";
import { resolve } from "url";

export async function getChapterList() {
  const chapterUrl = resolve(config.mainHost, `/manhua/${config.chapterId}`);
  const res = await axios.get(chapterUrl, { responseType: "arraybuffer" });
  const pending = new Promise((resolve => {
    const handler = getParserHandler((data: Array<ChapterItem>) => resolve(data));
    const parser = new Parser(handler);
    parser.write(iconVDecode(res.data, "gb2312"));
    parser.end();
  }));
  return await pending;
}

function getParserHandler(cb: (data: Array<ChapterItem>) => void): Partial<Handler> {
  let isStart = false;
  let isContent = false;
  const stack: Array<string> = [];
  const chapters: Array<ChapterItem> = [];

  return {
    onopentag(name: string, attrs: { [p: string]: string }) {
      if (attrs.id === "play_0") {
        isStart = true;
      }
      if (!isStart) {
        return;
      }
      stack.push(name);
      const chapterId = config.chapterId;
      if (isStart && name === "a" && chapterId && attrs.href.indexOf(chapterId) > -1) {
        isContent = true;
        chapters.push({ path: attrs.href, text: "" });
      }
    },

    ontext(data: string) {
      if (isContent) {
        const item = chapters[chapters.length - 1];
        if (item) {
          item.text = data;
          isContent = false;
        }
      }
    },

    onclosetag(name: string) {
      if (!isStart) {
        return
      }
      stack.pop();
      if (!stack.length) {
        isStart = false;
      }
    },

    onend() {
      cb?.(chapters);
    }
  };
}

export function getPageInfo(html: string): any {
  const matches = /^packed="([^";]+)";/gmi.exec(html);
  const pics: Array<string> = [];
  if (matches) {
    const code = "return " + Buffer.from(matches[1], "base64").toString("utf8").replace("eval", "");
    const newCode = (new Function(code))();
    (new Function("photosr", newCode))(pics);
    if (pics && pics.length) {
      pics.shift();
    }
  }
  return pics;
}

export async function getComicDetail(path: string) {
  const res = await axios.get(resolve(config.imageHost, path), { responseType: "arraybuffer" });
  return iconVDecode(res.data, "gb2312");
}