import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { RpcClient } from '../rpc/rpc-client';

import { NewCategoryParam, PostStruct } from '../rpc/rpc-package';
import { md2html } from '../lib/md2html';

/**
 * blog config
 */
interface BlogSetting {
    url: string,
    blogid: string,
    username: string,
    password: string,
    isOpen: boolean
}

export function pushBlog(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('push.blog', async (pathInfo) => {
        try {
            let editor = vscode.window.activeTextEditor;
            if (editor === undefined) {
                throw new Error("please active Text Editor");
            }
            //文件必须在工作区内，不然找不到配置文件 setting.js
            let workspaceFolders = vscode.workspace.getWorkspaceFolder(editor.document.uri)?.uri.fsPath + "";
            if (!workspaceFolders) {
                throw new Error("workspaceFolders is empty");

            }
            if (pathInfo.fsPath.indexOf(workspaceFolders) !== 0) {
                throw new Error(pathInfo.fsPath + " must in workspaceFolders: " + workspaceFolders);
            }
            let settingsFile = path.join(workspaceFolders, 'settings.json');
            if (!fs.existsSync(settingsFile)) {
                throw new Error("config file not exists: " + settingsFile);
            }
            //读取配置文件
            let settings: Array<BlogSetting> = JSON.parse(fs.readFileSync(settingsFile).toString());
            settings = settings.filter((rs) => {
                //跳过关闭的
                if (!rs.isOpen) {
                    return false;
                }
                return true;
            });

            if (settings.length === 0) {
                throw new Error("isOpen blog config is empty: " + settingsFile);
            }
            let historyFile = path.resolve(workspaceFolders, 'history.json');
            //当前发布文件的相对路径，用户保存历史记录
            let relativeFile: string = pathInfo.fsPath;
            relativeFile = relativeFile.substring(workspaceFolders.length);

            //读取文件内容
            let currentFileContent = fs.readFileSync(pathInfo.fsPath).toString();


            for (const setting of settings) {
                vscode.window.showInformationMessage('Publishing', setting.url);
                let client = new RpcClient(setting.url);

                let cat = path.basename(path.dirname(pathInfo.fsPath)); //用目录来做分类
                let catParams: NewCategoryParam = {
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    blog_id: setting.blogid,
                    username: setting.username,
                    password: setting.password,
                    category: {
                        name: cat,
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        parent_id: 0
                    }
                };
                let postId: string = isNew(historyFile, relativeFile, setting.url);
                if (!postId) {
                    //创建目录
                    await client.newCategory(catParams);
                }
                //发布文章
                currentFileContent = md2html(currentFileContent, pathInfo.fsPath);

                let post: PostStruct = {
                    title: path.basename(pathInfo.fsPath),
                    description: currentFileContent,
                    categories: [cat]
                };

                let params = {
                    blogid: setting.blogid,
                    username: setting.username,
                    password: setting.password,
                    post,
                    publish: true
                };
                if (postId) {
                    //更新博客
                    let params2 = {
                        postid: postId,
                        username: setting.username,
                        password: setting.password,
                        post,
                        publish: true
                    };
                    await client.editPost(params2);
                } else {
                    //新增博客
                    postId = await client.newPost(params);
                    if (postId) {
                        addLog(historyFile, setting.url, relativeFile, postId);
                    }
                }
                // Display a message box to the user
                vscode.window.showInformationMessage('push complete', setting.url);
            }

        } catch (error) {
            vscode.window.showErrorMessage(error.message);
        }

    });
    context.subscriptions.push(disposable);

}

/**
 * 判断日志中是否存在
 * @param file 
 * @param name 
 * @returns 
 */
function isNew(historyFile:string, file: string, name: string): string {
    try {
        let rs = fs.existsSync(historyFile);
        if (!rs) {
            return '';
        }
        let history = JSON.parse(fs.readFileSync(historyFile).toString());
        if (!history) {
            return '';
        }
        if (!history[name]) {
            return '';
        }
        for (const info of history[name]) {
            if (info.file === file) {
                return info.postId;
            }
        }
        return '';
    } catch (error) {
        return '';
    }
}

/**
 * 添加日志
 * @param file 文件相对路径
 * @param name 文件
 * @param data 
 */
function addLog(file: string, name: string, data: string, postId: string) {
    try {
        let rs = fs.existsSync(file);
        let saveData = {
            "file": data,
            postId
        };
        let content = "";
        if (rs) {
            content = fs.readFileSync(file).toString();
        }
        if (content) {
            var history = JSON.parse(content);
        }
        if (history) {
            if (Array.isArray(history[name])) {
                history[name].push(saveData);
            } else {
                history[name] = [saveData];
            }
        } else {
            history = {};
            history[name] = [saveData];
        }
        fs.writeFileSync(file, JSON.stringify(history));
    } catch (error) {
        vscode.window.showErrorMessage("write history error:" + error.message);
    }
}