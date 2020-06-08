import { DefaultHandler } from "htmlparser2";

export default class ChapterHelper {
  private readonly cb: (data: Array<{ url: string, text: string }>) => void;
  private readonly options: any;

  isStart = false;
  isContent = false;
  stack: Array<string> = [];
  chapters: Array<{ url: string, text: string }> = [];

  constructor(callback: (data: Array<{ url: string, text: string }>) => void, options?: any) {
    this.cb = callback;
    this.options = options;
  }

  onopentag(name: string, attrs: { [p: string]: string }) {
    if (attrs.id === "chpater-list-1") {
      this.isStart = true;
    }
    if (!this.isStart) {
      return;
    }

    this.stack.push(name);

    const chapterId = this.options?.chapterId;
    if (this.isStart && name === "a" && chapterId && attrs.href.indexOf(chapterId) > -1) {
      this.isContent = true;
      this.chapters.push({ url: attrs.href, text: "" });
    }
  }

  ontext(data: string) {
    if (this.isContent) {
      const item = this.chapters[this.chapters.length - 1];
      if (item) {
        item.text = data;
        this.isContent = false;
      }
    }
  }

  onclosetag(name: string) {
    if (!this.isStart) {
      return
    }
    this.stack.pop();
    if (!this.stack.length) {
      this.isStart = false;
    }
  }

  onend() {
    this.cb?.(this.chapters);
  }
}