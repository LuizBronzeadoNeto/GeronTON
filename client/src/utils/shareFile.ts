import { Platform, Share } from "react-native";

/**
 * Hands a text file to the user. On the web it downloads the file. On a phone
 * there is no file picker without extra native modules, so it opens the share
 * sheet with the content, which can be sent by e-mail or saved to Drive.
 */
export async function shareTextFile(
  fileName: string,
  content: string,
  mimeType = "text/csv",
): Promise<void> {
  if (Platform.OS === "web") {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return;
  }

  await Share.share({ title: fileName, message: content });
}
