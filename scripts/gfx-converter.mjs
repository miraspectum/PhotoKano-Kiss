import * as fs from 'fs';
import { basename, extname } from 'path';
import { Logger } from './logger.mjs';
import { Utils } from './utils.mjs';

const availableLangs = ['en', 'ru', 'de'];
var lang = process.argv && process.argv[2];

if (!availableLangs.includes(lang)) {
    lang = 'en';
}

const gfxPath = `./graphics/${lang}`;

const logger = new Logger('gfx-converter.log');

async function convertFile(moduleName, path) {
    let extension = extname(path).slice(1);

    if (extension.toLocaleLowerCase() !== 'png') {
        return;
    }

    try {
        // Convert to dds
        const ddsPath = path.slice(0, -extension.length) + 'dds';
        await Utils.executeCmd(`magick convert ${path} ${ddsPath}`);
        logger.log('INFO', `Converted to dds ${ddsPath}`);

        // Convert to GXT
        const gxtPath = path.slice(0, -extension.length) + 'gxt';
        await Utils.executeCmd(`psp2gxt -i ${ddsPath} -o ${gxtPath}`);
        logger.log('INFO', `Converted to gxt ${gxtPath}`);

        // Replace in cpk
        const dstPath = `./patched/${lang}/cpks/${moduleName}/${basename(gxtPath).slice(0, -4)}`;
        await Utils.moveFile(gxtPath, dstPath);
        logger.log('INFO', `Moved ${gxtPath} to ${dstPath}`);
    } catch (e) {
        logger.log('FAIL', `${e}`);
    }
}

async function processDir(moduleName, path) {
    const files = await Utils.readDir(path);

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        const filePath = `${path}/${file}`;
        const isFileDir = await Utils.isDir(filePath);

        if (isFileDir) {
            await processDir(moduleName, filePath);
        } else {
            await convertFile(moduleName, filePath);
        }
    }
}

async function main() {
    let result = 0;
    try {
        const files = await Utils.readDir(gfxPath);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            const path = `${gfxPath}/${file}`;
            const isModuleDir = await Utils.isDir(path);

            if (isModuleDir) {
                await processDir(file, path);
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