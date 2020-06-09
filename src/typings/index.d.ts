declare interface ChapterItem {
  path: string
  text: string
}

declare interface WorkerTransferData {
  workerId: string

  [K: string]: string
}