export const chapterTitleCache = new Map<string, string>()

export function clearChapterTitleCache(filePath?: string) {
  if (filePath) {
    chapterTitleCache.delete(filePath)
  } else {
    chapterTitleCache.clear()
  }
}
