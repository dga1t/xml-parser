import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import fetch from 'node-fetch';
import iconv from 'iconv-lite';
import AdmZip from 'adm-zip';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PATH = path.join(__dirname, 'downloads');
const URL = 'http://www.cbr.ru/s/newbik';

async function download(url, path) {
  const res = await fetch(url);

  if (res.status == 403) throw new Error('Forbidden');
  
  const fileName = res.headers.get('content-disposition').match(/filename=(.*);/)[1];
  const fileStream = fs.createWriteStream(`${path}/${fileName}`);

  return new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on('error', reject);
    fileStream.on('finish', resolve(fileName));
  });
}

function unzip(src, path) {
  const zip = new AdmZip(src);
  zip.extractAllTo(path);
  return zip.getEntries()[0].entryName;
}

function decode(fileName) {
  const data = fs.readFileSync(fileName);
  return iconv.decode(data, 'win1251');
}

function parse(xmlInput) {
  let results = [];

  const ENTRIES_RE = /<BICDirectoryEntry BIC="\d{9}">([\s\S]*?)<\/BICDirectoryEntry>/gm;
  const ACCOUNTS_RE = /Account="(\d{20})"/g;
  const BIC_RE = /<BICDirectoryEntry BIC="(\d{9})">/;
  const ENTRY_NAME_RE = /ParticipantInfo NameP="(.*?)" /;

  const bicDirEntries = xmlInput.match(ENTRIES_RE);
  const entriesWithAcc = bicDirEntries.filter((entry) => entry.includes('Account'));

  for (const entry of entriesWithAcc) {
    const accounts = [...entry.matchAll(ACCOUNTS_RE)];

    for (const account of accounts) {
      const entryBIC = entry.match(BIC_RE)[1];
      const entryName = entry.match(ENTRY_NAME_RE)[1];

      results.push({
        bic: entryBIC,
        name: entryName,
        corrAccount: account[1],
      });
    }
  }
  return results;
}

async function main() {
  fs.mkdirSync(PATH, { recursive: true });

  const zipFileName = await download(URL, PATH);
  await new Promise(r => setTimeout(r, 1000));
  const xmlFileName = unzip(`${PATH}/${zipFileName}`, PATH);
  const decodedXml = decode(`${PATH}/${xmlFileName}`);
  return parse(decodedXml);
}

main().catch((err) => {
  console.log(err);
  process.exit(1);
});
