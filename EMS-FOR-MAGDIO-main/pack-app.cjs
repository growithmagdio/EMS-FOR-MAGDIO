const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;
const cacheDir = path.join(process.env.LOCALAPPDATA || '', 'electron/Cache');

function findZipFile(dir) {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findZipFile(fullPath);
      if (found) return found;
    } else if (entry.name.startsWith('electron-v') && entry.name.endsWith('.zip')) {
      return fullPath;
    }
  }
  return null;
}

const zipPath = findZipFile(cacheDir) || path.join(
  process.env.LOCALAPPDATA,
  'electron/Cache/a791fa12f2db1c58c084ec41c5caf1ac518de84788ba857a6bebef2fe9349ed3/electron-v43.1.0-win32-x64.zip'
);

const outDir = path.join(rootDir, 'dist-electron');
const appTargetDir = path.join(outDir, 'MAGDIO-EMS-win32-x64');
const resourcesAppDir = path.join(appTargetDir, 'resources/app');

console.log('1. Cleaning output directory...');
if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });

console.log(`2. Unpacking cached Electron zip (${path.basename(zipPath)})...`);
execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${appTargetDir}' -Force"`);

console.log('3. Renaming electron.exe to MAGDIO-EMS.exe...');
const oldExe = path.join(appTargetDir, 'electron.exe');
const newExe = path.join(appTargetDir, 'MAGDIO-EMS.exe');
if (fs.existsSync(oldExe)) {
  fs.renameSync(oldExe, newExe);
}

console.log('4. Copying built web app into resources/app...');
fs.mkdirSync(resourcesAppDir, { recursive: true });

// Copy dist folder
fs.cpSync(path.join(rootDir, 'dist'), path.join(resourcesAppDir, 'dist'), { recursive: true });

// Copy main.cjs, preload.cjs, package.json
['main.cjs', 'preload.cjs', 'package.json'].forEach((file) => {
  const src = path.join(rootDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(resourcesAppDir, file));
  }
});

console.log('✅ MAGDIO EMS Executable created successfully at:');
console.log(newExe);
