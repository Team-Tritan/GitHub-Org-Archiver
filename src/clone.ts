import axios from 'axios';
import simpleGit from 'simple-git';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import pLimit from 'p-limit';
import chalk from 'chalk';
import { config } from '../config';


function smbMkdirRecursive(remotePath: string) {
  const parts = remotePath.split('/');
  let script = '';

  for (const part of parts) {
    script += `mkdir "${part}"\ncd "${part}"\n`;
  }

  try {
    console.log(chalk.cyan(`[*] Ensuring remote SMB path exists: ${remotePath}`));

    execSync(
      `smbclient "//${config.smbServer}/${config.smbShare}" "${config.smbPass}" -U "${config.smbUser}" -c '${script}'`,
      { stdio: 'pipe' }
    );

    console.log(chalk.green('[+] SMB path created or already exists.'));

  } catch (err) {
    const msg: any = (err as Error).message || err;

    if (!msg.includes('NT_STATUS_OBJECT_NAME_COLLISION')) {
      console.log(chalk.red('[!] Failed to create remote directory path:'), msg);
    } else {
      console.log(chalk.yellow('[*] Remote directory already exists.'));
    }
  }
}


function debugListRemotePath(share: string, user: string, pass: string, pathParts: string[]) {
  const cmds = ['cd /'];

  pathParts.forEach(dir => {
    cmds.push(`cd "${dir}"`);
    cmds.push('ls');
  });

  cmds.push('quit');

  const cmdStr = cmds.join('\n');

  console.log(chalk.magenta(`[DEBUG] Listing SMB remote path step-by-step: ${pathParts.join('/')}`));

  try {
    execSync(
      `smbclient "//${config.smbServer}/${share}" "${pass}" -U "${user}" -c '${cmdStr}'`,
      { stdio: 'inherit' }
    );
  } catch (e) {
    console.log(chalk.red('[DEBUG] Failed listing:'), e);
  }
}


async function fetchRepos() {
  const repos: any[] = [];
  let page = 1;

  while (true) {
    const res = await axios.get(`https://api.github.com/orgs/${config.orgName}/repos`, {
      auth: { username: config.githubUser, password: config.githubToken },
      params: { per_page: 100, page },
    });

    if (res.data.length === 0) break;

    repos.push(...res.data);
    page++;
  }

  return repos;
}


async function processRepo(repo: any) {
  const git = simpleGit();

  const repoDir = path.join(config.tmpDir, repo.name);
  const zipPath = `${repoDir}.zip`;
  const cloneUrl = repo.clone_url.replace('https://', `https://${config.githubUser}:${config.githubToken}@`);

  try {
    console.log(chalk.blue(`[>] Cloning ${repo.name}...`));
    await git.clone(cloneUrl, repoDir);

    console.log(chalk.yellow(`[~] Zipping ${repo.name}...`));
    execSync(`zip -r "${zipPath}" "${repoDir}"`);

    console.log(chalk.yellow(`[~] Debugging remote SMB folder structure before upload...`));
    const remoteDirs = config.smbRemotePath.split('/');
    debugListRemotePath(config.smbShare, config.smbUser, config.smbPass, remoteDirs);

    console.log(chalk.yellow(`[~] Uploading ${repo.name}.zip via smbclient...`));
    const uncRemotePath = `\\\\${config.smbRemotePath.replace(/\//g, '\\')}\\${repo.name}.zip`;
    const smbCommands = [
      `put "${zipPath}" "${uncRemotePath}"`,
      'quit'
    ].join('\n');

    execSync(
      `smbclient "//${config.smbServer}/${config.smbShare}" "${config.smbPass}" -U "${config.smbUser}" -c '${smbCommands}'`,
      { stdio: 'inherit' }
    );

    console.log(chalk.yellow(`[~] Verifying upload location for ${repo.name}.zip...`));
    const verifyCmd = [
      'cd /',
      ...remoteDirs.map(dir => `cd "${dir}"`),
      'ls',
      'quit'
    ].join('\n');

    execSync(
      `smbclient "//${config.smbServer}/${config.smbShare}" "${config.smbPass}" -U "${config.smbUser}" -c '${verifyCmd}'`,
      { stdio: 'inherit' }
    );

    console.log(chalk.green(`[✓] ${repo.name} uploaded successfully.`));

  } catch (err) {
    console.log(chalk.red(`[!] Failed processing ${repo.name}:`), (err as Error).message || err);
  } finally {
    try {
      fs.removeSync(repoDir);
      fs.removeSync(zipPath);
    } catch { }
  }
}


async function main() {
  fs.removeSync(config.tmpDir);
  fs.mkdirpSync(config.tmpDir);

  smbMkdirRecursive(config.smbRemotePath);

  console.log(chalk.cyan('[*] Fetching repo list...'));
  const repos = await fetchRepos();
  console.log(chalk.green(`[+] Found ${repos.length} repositories.`));

  const limit = pLimit(config.concurrency);
  const jobs = repos.map(repo => limit(() => processRepo(repo)));

  await Promise.all(jobs);

  console.log(chalk.green('[✔] All done.'));
}


main().catch(e => console.log(chalk.red('Fatal error:', e)));
