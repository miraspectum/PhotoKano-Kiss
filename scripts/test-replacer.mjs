import * as fs from 'fs';
import * as path from 'path';
import iconv from 'iconv-lite';

var filePath = 'eboot.bin.elf';
var keyword = '果音';
var replaceKey = 'Ｋ';

function id (i) {
    const idStr = `${i}`;
    return '0'.repeat(3 - idStr.length) + idStr;
}

fs.readFile(filePath, (err, data) => {
    if (err) {
        console.error(err);
        return;
    }

    if (data.indexOf(keyword)) {
        console.log('found');
    }

    // Patch
    let count = 0;
    let index = data.indexOf(keyword);
    while (index !== -1) {
        const idStr = replaceKey + id(count);
        const idBuf = Buffer.from(idStr);
        idBuf.forEach((v, i) => data[index + i] = v);
        index = data.indexOf(keyword);
        count++;
    }

    // Save changes
    fs.writeFile(filePath + '_patched', data, err => {
        if (err) {
            console.error(err);
            return;
        }
        console.log('finished');
        });
    
});