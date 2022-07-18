import * as fs from 'fs';
import { basename, extname } from 'path';
import { Logger } from './logger.mjs';
import { Utils } from './utils.mjs';

const availableLangs = ['en', 'ru', 'de'];
var lang = process.argv && process.argv[2];

if (!availableLangs.includes(lang)) {
    lang = 'en';
}

const deltaPath = `./gfx-deltas/${lang}`;
const gfxPath = `./graphics/${lang}`;

const logger = new Logger('gfx-restore-deltas.log');

async function convertFile(path) {
    let extension = extname(path).slice(1);

    if (extension.toLocaleLowerCase() !== 'xdelta') {
        return;
    }

    try {
        const originalFilePath = path.replace(deltaPath, 'original/converted/').slice(0, -extension.length) + 'png';

        const pngPath = path.replace(deltaPath, gfxPath).slice(0, -extension.length) + 'png';
        await fs.promises.mkdir(pngPath.slice(0, -(basename(pngPath).length)), { recursive: true });
        if (await Utils.isExists(pngPath)) {
            await Utils.removeFile(pngPath);
        }
        await Utils.executeCmd(`xdelta -d -s ${originalFilePath} ${path} ${pngPath}`);
        logger.log('INFO', `Restored delta ${path}`);
    } catch (e) {
        logger.log('FAIL', `${e}`);
    }
}

async function processDir(path) {
    const files = await Utils.readDir(path);

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        const filePath = `${path}/${file}`;
        const isFileDir = await Utils.isDir(filePath);

        if (isFileDir) {
            await processDir(filePath);
        } else {
            await convertFile(filePath);
        }
    }
}

async function main() {
    let result = 0;
    try {
        const files = await Utils.readDir(deltaPath);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            const path = `${deltaPath}/${file}`;
            const isModuleDir = await Utils.isDir(path);

            if (isModuleDir) {
                await processDir(path);
            }
        }

    } catch (e) {
        logger.log('FAIL', `${e}`);
        result = 1;
    }

    await logger.saveLogs();
    process.exit(result);
}

main();