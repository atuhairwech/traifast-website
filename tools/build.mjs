import { mkdir, copyFile, rm, realpath } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PUBLIC_FILES } from './public-files.mjs';
import { ROOT, checkConfiguration, checkArtifact, checkSource } from './check-deployment.mjs';

export async function build(root = ROOT) {
  await checkConfiguration(root);
  // Fail rather than silently erase unexpected files. Validate links before cleanup.
  await checkArtifact(root, { allowMissing: true, compareSource: false });
  for (const file of PUBLIC_FILES) await checkSource(root, file);
  const destination = resolve(root, 'dist');
  const safeRoot = await realpath(root);
  if (destination !== join(safeRoot, 'dist')) throw new Error('Unsafe build output path');
  // The exact absolute target and its complete existing tree were checked above.
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination);
  for (const file of PUBLIC_FILES) {
    await mkdir(dirname(join(destination, file)), { recursive: true });
    await copyFile(join(root, file), join(destination, file));
  }
  await checkArtifact(root);
  return PUBLIC_FILES.length;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 2) throw new Error('Build overrides are not permitted');
    console.log(`Built and validated ${await build()} approved public files in clean dist.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
