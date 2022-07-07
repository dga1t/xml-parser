import path, { dirname } from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import http from "http";
import fs from "fs";

import iconv from "iconv-lite";
import AdmZip from "adm-zip";

const __dirname = dirname(fileURLToPath(import.meta.url));
const URL = "http://www.cbr.ru/s/newbik";
const PATH = path.join(__dirname, "downloads");

let fileName = "";

async function main() {
  fs.mkdirSync(PATH, { recursive: true });

  try {
    const archiveFileName = await download(URL, PATH);
    const xmlFileName = unzipArchive(`${PATH}/${archiveFileName}.zip`, PATH);
    const decodedXml = decodeXml(`${PATH}/${xmlFileName}`);
  } catch (error) {
    console.log("error inside main: ", error);
  }
}

main().catch((err) => console.log(err));

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      if (response.statusCode === 200) {
        fileName = crypto.randomBytes(4).toString("hex");

        const file = fs.createWriteStream(dest + `/${fileName}.zip`, { flags: "wx", });

        file.on("finish", () => resolve(fileName));
        file.on("error", (err) => {
          file.close();
          if (err.code === "EEXIST") reject("File already exists");
          else fs.unlink(dest, () => reject(err.message));
        });

        response.pipe(file);

      } else if (response.statusCode === 302 || response.statusCode === 301) {
        download("http://www.cbr.ru" + response.headers.location, dest).then(() => resolve(fileName));

      } else {
        reject(`Server responded with ${response.statusCode}: ${response.statusMessage}`);
      }
    });

    request.on("error", (err) => reject(err.message));
  });
}

function unzipArchive(src, dest) {
  const zip = new AdmZip(src);
  zip.extractAllTo(dest);
  return zip.getEntries()[0].entryName;
}

function decodeXml(fileName) {
  const data = fs.readFileSync(fileName);
  return iconv.decode(data, "win1251");
}

function parseXmlFile(str) {
  let accounts = [];
}

// const re1 = /\s(BIC="\d{9}")/gm
// const re2 = /(<BICDirectoryEntry (BIC="\d{9}")><ParticipantInfo (NameP="\D*") )/gm
