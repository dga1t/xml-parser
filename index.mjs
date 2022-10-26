import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import fs from 'fs';

import fetch from 'node-fetch';
import iconv from 'iconv-lite';
import AdmZip from 'adm-zip';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PATH = path.join(__dirname, 'downloads');
const URL = 'http://www.cbr.ru/s/newbik';

async function downloadFile(url, path) {
  const res = await fetch(url);
  const fileStream = fs.createWriteStream(path);

  return new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on('error', reject);
    fileStream.on('finish', resolve);
  });
}

function unzipArchive(src, dest) {
  const zip = new AdmZip(src);
  zip.extractAllTo(dest);
  return zip.getEntries()[0].entryName;
}

function decodeXmlFile(fileName) {
  const data = fs.readFileSync(fileName);
  return iconv.decode(data, 'win1251');
}

const ENTRIES_RE = /<BICDirectoryEntry BIC="\d{9}">([\s\S]*?)<\/BICDirectoryEntry>/gm;
const ACCOUNTS_RE = /Account="(\d{20})"/g;
const BIC_RE = /<BICDirectoryEntry BIC="(\d{9})">/;
const ENTRY_NAME_RE = /ParticipantInfo NameP="(.*?)" /;

function parseXmlFile(xmlInput) {
  let results = [];

  const bicDirEntries = xmlInput.match(ENTRIES_RE);
  const entriesWithAcc = bicDirEntries.filter((entry) => entry.includes('Account'));

  for (let entry of entriesWithAcc) {
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

  const fileName = crypto.randomBytes(4).toString('hex');

  await downloadFile(URL, `${PATH}/${fileName}.zip`);
  const xmlFileName = unzipArchive(`${PATH}/${fileName}.zip`, PATH);
  const decodedXml = decodeXmlFile(`${PATH}/${xmlFileName}`);
  return parseXmlFile(decodedXml);
}

main().catch((err) => {
  console.log(err);
  process.exit(1);
});
