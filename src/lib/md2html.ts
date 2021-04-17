import * as MarkdownIt from 'markdown-it';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
/**
 * markdown 转 html
 * @param content markdown 内容
 * @param mdFile  当前发布的文件 
 * @returns 
 */
export function md2html(content: string, mdFile: string) {
    let md = new MarkdownIt();
    let body: string = md.render(content);
    const imgTagRegex = /(<img[^>]+src=")([^"]+)("[^>]*>)/g;  // Match '<img...src="..."...>'
    //图片处理
    body = body.replace(imgTagRegex, function (_, p1, p2, p3) {
        if (p2.startsWith('http') || p2.startsWith('data:')) {
            return _;
        }

        const imgSrc = path.resolve(path.dirname(mdFile), p2);
        try {
            let imgExt = path.extname(imgSrc).slice(1);
            if (imgExt === "jpg") {
                imgExt = "jpeg";
            } else if (imgExt === "svg") {
                imgExt += "+xml";
            }
            const file = fs.readFileSync(imgSrc.replace(/%20/g, '\ ')).toString('base64');
            return `${p1}data:image/${imgExt};base64,${file}${p3}`;
        } catch (e) {
            vscode.window.showErrorMessage("md2html error:" + e.message);
        }
        return _;
    });
    return body;
}