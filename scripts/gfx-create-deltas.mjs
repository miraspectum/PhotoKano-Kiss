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

const logger = new Logger('gfx-create-deltas.log');

async function convertFile(path) {
    let extension = extname(path).slice(1);

    if (extension.toLocaleLowerCase() !== 'png') {
        return;
    }

    try {
        const originalFilePath = path.replace(gfxPath, 'original/converted/');

        const deltaPatchPath = path.replace(gfxPath, deltaPath).slice(0, -extension.length) + 'xdelta';
        await fs.promises.mkdir(deltaPatchPath.slice(0, -(basename(deltaPatchPath).length)), { recursive: true });

        if (await Utils.isExists(deltaPatchPath)) {
            await Utils.removeFile(deltaPatchPath);
        }

        await Utils.executeCmd(`xdelta -e -s ${originalFilePath} ${path} ${deltaPatchPath}`);
        logger.log('INFO', `Created delta for ${path}`);
        
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
        await fs.promises.mkdir(gfxPath, { recursive: true });
        const files = await Utils.readDir(gfxPath);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            const path = `${gfxPath}/${file}`;
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