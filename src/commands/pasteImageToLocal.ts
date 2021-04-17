import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as image from '../lib/image';

/**
 * 粘贴板图片保存到本地
 * @param context 
 */
export function pasteImageToLocal(context: vscode.ExtensionContext) {
    //粘贴板图片保存到本地
    let pasteImageToLocal = vscode.commands.registerCommand('push.pasteImageToLocal', async (pathInfo) => {
        let img = new image.Image();
        img.saveClipboardImageToFile(pathInfo.fsPath, (imgFile:string)=>{
            let rs = fs.existsSync(imgFile);
            if (!rs) {
                vscode.window.showWarningMessage("no image in clipboard:\n");
                return ;
            }
           
            let markdownImg = `![image](${path.basename(path.dirname(imgFile))}/${path.basename(imgFile)})\n`;
            //将图片markdown插入当前文档
            let editor = vscode.window.activeTextEditor;
            if (editor === undefined) {
                vscode.window.showErrorMessage("please active Text Editor");
                return;
            }
            editor.edit((editBuilder) => {
                if (editor === undefined) {
                    vscode.window.showErrorMessage("please active Text Editor");
                    return;
                }
                let position = editor.selection.active;
                editBuilder.insert(position, markdownImg);
            });
            vscode.window.showInformationMessage("image saved to:\n" + imgFile);
        });
    });
    context.subscriptions.push(pasteImageToLocal);
}