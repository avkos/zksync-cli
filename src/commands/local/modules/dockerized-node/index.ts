import path from "path";

import { Module } from "..";
import {
  composeCreate,
  composeDown,
  composeRestart,
  composeStatus,
  composeStop,
  composeUp,
} from "../../../../utils/docker";
import { cloneRepo, isRepoCloned } from "../../../../utils/git";
import Logger from "../../../../utils/logger";

import type { Config } from "../../config";

export default class SetupModule extends Module {
  constructor(config: Config) {
    super(
      {
        name: "Dockerized node",
        description: "Persistent state, includes L1 and L2 nodes",
        key: "dockerized-node",
        tags: ["node"],
      },
      config
    );
  }

  justInstalled = false;

  git = "https://github.com/matter-labs/local-setup.git";
  composeFile = path.join(this.folder, "docker-compose.yml");

  async isInstalled() {
    if (!isRepoCloned(this.folder)) return false;
    return (await composeStatus(this.composeFile, this.folder)).length ? true : false;
  }

  async install() {
    await cloneRepo(this.git, this.folder);
    await composeCreate(this.composeFile, this.folder);
    this.justInstalled = true;
  }

  async isRunning() {
    if (await this.isInstalled()) return false;

    return (await composeStatus(this.composeFile, this.folder)).some(({ status }) => {
      return status === "running" || status === "restarting";
    });
  }

  async start() {
    await composeUp(this.composeFile, this.folder);
  }

  async onStartCompleted() {
    Logger.info(`${this.name} ready:
 - L1 RPC URL: http://localhost:8545
 - L2 RPC URL: http://localhost:3050`);
    if (this.justInstalled) {
      Logger.warn(" - First start may take a while until zkSync node is actually running, please be patient...");
    }
  }

  async stop() {
    if (!(await this.isInstalled())) return;
    await composeStop(this.composeFile, this.folder);
  }

  async clean() {
    if (!(await this.isInstalled())) return;
    await composeDown(this.composeFile, this.folder);
  }

  async restart() {
    if (!(await this.isInstalled())) return;
    await composeRestart(this.composeFile, this.folder);
  }
}
