import type {CommandModule} from 'yargs';
import path from 'path';

// This command is here in the app component in purpose. it's because it go to it's package.json file.
// We want to make sure it gets to the correct package.json. please do not move to its own component
// It has it own command since we want to change the builtin -v | --version option to show the version command output
export class LocalVersionCmd implements CommandModule {
  aliases = ["local-version"];
  desc = false;
  command = ["local-version"];
  async handler() {
    const pjson = require(path.join(__dirname, "../package.json"));
    return console.log(pjson?.version);
  }
}

export const localVersionCmd = new LocalVersionCmd();
