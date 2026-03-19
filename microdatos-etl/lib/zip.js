'use strict';

const AdmZip = require('adm-zip');

function extractTxtFromZip(zipBuf) {
  const zip = new AdmZip(zipBuf);
  const entry = zip.getEntries().find((e) => /\.txt$/i.test(e.entryName));
  if (!entry) throw new Error('No .txt file found in ZIP');
  return entry.getData().toString('latin1');
}

module.exports = { extractTxtFromZip };
