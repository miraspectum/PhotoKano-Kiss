import { Utils } from './utils.mjs';
import { Logger } from './logger.mjs';

const logger = new Logger('gen-unique.log');
const filesDescCsv = './text/files.csv';

async function getPhrases(patch) {
    return (await Utils.readCsv(`./text/${patch}.csv`)).map(r => r[2]);
}

async function updateUnique(uniquePhrases) {
    const csvPath = './text/unique.csv';
    let skipped = 0;

    try {
        if (await Utils.isExists(csvPath)) {
            const oldCsv = await Utils.readCsv(csvPath);
            uniquePhrases.forEach(phrase => {
                if (!oldCsv.find(row => row[0] === phrase)) {
                    oldCsv.push([phrase, '', '', '']);
                } else {
                    skipped++;
                }
            });

            await Utils.saveLines(csvPath, oldCsv.map(row => `\"${row[0]}\",\"${row[1]}\",\"${row[2]}\",\"${row[3]}\"`));
            return skipped;
        } else {
            await Utils.saveLines(csvPath, uniquePhrases.map(row => `\"${row}\",\"\",\"\",\"\"`));
            return 0;
        }
    } catch (e) {
        throw `Unable to save unique phrases ${csvPath}!`;
    }
}

async function main() {
    let result = 0;

    try {
        const patches = await Utils.readCsv(filesDescCsv);
        const uniquePhrases = [];
        let total = 0;
        let charCount = 0;
    
        for (let i = 0; i < patches.length; i++) {
            const [patch, ...other] = patches[i];
            const patchPhrases = await getPhrases(patch);
            charCount += patchPhrases.reduce((prev, cur) => prev + cur.length, 0);
            total += patchPhrases.length;
            uniquePhrases.push(...patchPhrases.filter(p => !uniquePhrases.includes(p)));
        }

        let skipped = await updateUnique(uniquePhrases);

        logger.log('INFO', `Total: ${total}, Chars: ${charCount}, Unique: ${uniquePhrases.length}, Skipped: ${skipped}`);
    
    } catch (e) {
        logger.log('FAIL', `${e.error || e}`);
        result = 1;
    }

    await logger.saveLogs();
    process.exit(result);
}

main();