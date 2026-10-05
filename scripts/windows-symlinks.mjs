import fs from 'node:fs';
import path from 'node:path';
import { syncBuiltinESMExports } from 'node:module';

// Directory junctions avoid requiring Administrator/Developer Mode on Windows.
if (process.platform === 'win32') {
  const original = fs.symlinkSync;
  fs.symlinkSync = (target, destination, type) => {
    const absolute = path.resolve(path.dirname(destination), target);
    if (fs.statSync(absolute).isDirectory()) return original(absolute, destination, 'junction');
    try { return original(target, destination, type); }
    catch (error) {
      if (error.code !== 'EPERM') throw error;
      return fs.copyFileSync(absolute, destination);
    }
  };
  syncBuiltinESMExports();
}
