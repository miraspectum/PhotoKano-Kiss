import * as fs from 'fs';
import { parse } from 'csv-parse';

var inputFile='E:\\Development\\GT\\PSVITA\\PhotoKanoKiss\\patched\\en\\data\\app\\00_GMV.csv';

var lines = [];
var parser = parse({delimiter: ','}, function (err, data) {
  data.forEach(element => {
    // "00_GMV/ID00000", "/ID00000",        0, Uncompress, "/bin", ""
    const id = element[1].replace(/\s/g, '');
    element[9] = '/ID' + '0'.repeat(5 - id.length) + id;
    const line = `00_GMV${element[9]},${element[9]},${id},Uncompress,${element[6]},""`;
    lines.push(line);
  });

  var file = fs.createWriteStream('E:\\Development\\GT\\PSVITA\\PhotoKanoKiss\\patched\\en\\data\\app\\00_GMV_CPK.csv');
file.on('error', function(err) { /* error handling */ });
lines.forEach(function(line) { file.write(line + '\n'); });
file.end();
});

fs.createReadStream(inputFile).pipe(parser);