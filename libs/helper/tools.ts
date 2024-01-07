export function copyTextToClipboard(text: string) {
  return navigator.clipboard.writeText(text);
}

// 复制图片到剪贴板
export function copyImageToClipboard(blob: Blob) {
  const clipboardItem = new ClipboardItem({ "image/png": blob });
  return navigator.clipboard.write([clipboardItem]);
}

export function copyTextToClipboard2(text: string) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);

  textArea.select();
  document.execCommand("copy");

  document.body.removeChild(textArea);
}
