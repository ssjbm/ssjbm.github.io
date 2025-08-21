const path = require('path');
const { writeFile } = require('fs/promises');
const cwd = process.cwd();


// Mets à jour le fichier secrets.json
(async () => {
  const url = process.env.SECRETS_URL || 'https://docs.ssjb.com/secrets.json';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  await writeFile(path.join(cwd, 'secrets.json'), await res.text());
  console.log('✔ secrets.json updated');
})();


