import * as fs from 'fs';
import { parse } from 'csv-parse';
import { exec, spawn } from 'child_process';
import request from 'request';
import { dirname } from 'path';

export class Utils {
    static async readDir(path) {
        return new Promise((resolve, reject) => {
            fs.readdir(path, (err, files) => {
                if (err)
                  reject(err);
                else {
                  resolve(files);
                }
              });
        });
    }

    static async isDir(path) {
        return new Promise((resolve, reject) => {
            fs.lstat(path, (err, stats) => {
                if (err)
                  reject(err);
                else {
                  resolve(stats.isDirectory());
                }
              });
        });
    }

    static async isExists(path) {
        return new Promise((resolve, reject) => {
            fs.access(path, fs.F_OK, (err) => {
                if (err) {
                    resolve(false);
                } else {
                    resolve(true);
                }
              });
        });
    }

    static async executeCmd(cmd) {
        return new Promise((resolve, reject) => {
            exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    return reject(error);
                }
    
                if (stderr) {
                    return reject(stderr);
                }
    
                resolve(stdout);
            });
        });
    }

    static async spawnCmd(cmd, params) {
        return new Promise((resolve, reject) => {
            const spawned = spawn(cmd, params);
            
            spawned.stdout.on('data', (data) => {
                resolve(data);
            });
            
            spawned.stderr.on('data', (data) => {
                reject(data.toString());
            });
        });
    }

    static async moveFile(oldPath, newPath) {
        return new Promise((resolve, reject) => {
            fs.rename(oldPath, newPath, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
              })
        });
    }

    static fixShiftJisCarriageReturn(buffer) {
        return buffer.filter((byte, index) => {
            if (index >= buffer.length) { return true; }
            return byte !== 0x0d || buffer[index + 1] !== 0x0a;
        });
    }

    static async readCsv(path) {
        return new Promise((resolve, reject) => {
            var parser = parse({delimiter: ','}, async function (err, data) {
                resolve(data);
            });
            
            fs.createReadStream(path).on('error', function(err) {
                reject(err);
            }).pipe(parser);
        });
    }

    static async readFile(path) {
        return new Promise((resolve, reject) => {
            fs.readFile(path, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    static async saveBuffer(path, data) {
        await fs.promises.mkdir(dirname(path), { recursive: true });
        return new Promise((resolve, reject) => {
            fs.writeFile(path, data, err => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    static replaceWord(dst, src, offset, oldWordSize) {
        src.forEach((v, i) => dst[offset + i] = v);
    
        if (oldWordSize > src.length) {
            const diff = oldWordSize - src.length;
            for (let i = 0; i < diff; i++) {
                dst[offset + src.length + i] = 0;
            }
        }
    }

    static async saveLines(path, lines) {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(path);
            file.on('error', function(err) { reject(); });
            file.on('finish', function() { resolve(); });
            lines.forEach(function(line) { file.write(line + '\n'); });
            file.end();
        });
    }

    static async removeFile(path) {
        return new Promise((resolve, reject) => {
            fs.unlink(path, (err) => {
                if (err) {
                  reject(err);
                } else {
                    resolve();
                }
              });
        });
    }

    static async httpPost(url, data) {
        return new Promise((resolve, reject) => {
            request.post(url, { json: data }, (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    resolve(body);
                } else {
                    reject(error);
                }
            });
        });
    }

    static customTextSplitter(text, maxLineLength = 45) {
        const words = text.replace(/[\n\r]/gi, '').split(' ');
        const lines = [];
    
        let line = words[0];
        if (line.length > 15) { line = line.slice(0, 15); }

        for (let i = 1; i < words.length; i++) {
            let word = words[i];
            if (word.length > 15) { word = word.slice(0, 15); }
            const tmpLine = [line, word].join(' ');
    
            if (tmpLine.length > maxLineLength) {
                lines.push(line.trim());
                line = word;
                continue;
            }
    
            line = tmpLine;
        }
    
        if (line !== '') {
            lines.push(line.trim());
        }
    
        return lines.join('\n');
    }
}