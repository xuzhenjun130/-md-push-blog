
import * as moment from 'moment';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from "child_process";
import * as vscode from 'vscode';
/**
 * 图片处理
 */
export class Image {

    /**
     * 获取图片保存路径
     * @param localDir 图片保存路径
     * @param filePath 操作的修改文件
     * @returns 
     */
    private getImgPath(filePath: string): string {
        // 图片名称
        let imageFileName = moment().format("Y-MM-DD-HH-mm-ss") + '.png';
        // 图片本地保存路径
        let folderPath = path.dirname(filePath);
        let fileName = path.basename(filePath);

        let imagePath = path.join(folderPath, fileName.substring(0, fileName.length - 3) + '.assets', imageFileName);
        return imagePath;
    }
    /**
     * 创建图片目录
     * @param imagePath 图片路径
     */
    private createImgDir(imagePath: string): void {

        let imageDir = path.dirname(imagePath);
        //尝试读取目录，目录不存在则创建，fs.existsSync() 不准确
        try {
            let e = fs.readdirSync(imageDir);
            if (e.length) {
                return;
            }
        } catch (error) {
            fs.mkdirSync(imageDir);
        }
    }

    /**
     * 保存粘贴板图片
     * @param filePath 
     * @param cb 
     * @returns 
     */
    public saveClipboardImageToFile(filePath: string, cb: CallableFunction) {
        let imagePath = this.getImgPath(filePath);

        this.createImgDir(imagePath);

        if (!imagePath) { return ''; }
        let platform = process.platform;
        if (platform === 'win32') {
            // Windows
            const scriptPath = path.join(__dirname, './lib/pc.ps1');
            const params = [
                '-noprofile',
                '-noninteractive',
                '-nologo',
                '-sta',
                '-executionpolicy', 'unrestricted',
                '-windowstyle', 'hidden',
                '-file', scriptPath,
                imagePath
            ];
            const powershell = spawn('powershell', params);
            powershell.stdout.on('data', function (data) {
                cb(data.toString().trim());
            });
        } else if (platform === 'darwin') {
            // Mac
            let scriptPath = path.join(__dirname, './lib/mac.applescript');

            let ascript = spawn('osascript', [scriptPath, imagePath]);
            ascript.on('exit', function (code, signal) {
            });

            ascript.stdout.on('data', function (data) {
                cb(data.toString().trim());
            });
        } else {
            // Linux 

            let scriptPath = path.join(__dirname, './lib/linux.sh');

            let ascript = spawn('sh', [scriptPath, imagePath]);
            ascript.on('exit', function (code, signal) {

            });

            ascript.stdout.on('data', function (data) {
                let result = data.toString().trim();
                if (result === "no xclip") {
                    vscode.window.showErrorMessage("You need to install xclip command first.");
                }
                cb(result);
            });
        }
        return imagePath;
    }
}
