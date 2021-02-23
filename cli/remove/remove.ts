import type {CommandModule, Argv} from 'yargs';

export class RemoveCmd implements CommandModule {
  aliases = ['r', 'remove'];
  describe = 'remove installed bit versions';
  command = [
    'remove [versions..]'
  ];
  builder(yargs: Argv) {
    yargs.positional('versions', {
      describe: 'bit versions to remove',
      default: 'latest'
    })
    .option({
      all: {
        describe: 'remove all installed versions',
        default: false,
        type: 'boolean'
      },
      'keep-versions': {
        describe: 'keep specific versions',
        array: true,
        type: 'string',
        requiresArg: true
      },
      'keep-latest-versions': {
        describe: 'keep the last <number> of versions',
        type: 'number',
        requiresArg: true
      }
    })
    .example('$0 remove 0.0.200', 'remove version 0.0.200 of bit')
    .example('$0 remove latest', 'remove the latest version that already installed')
    .example('$0 remove all', 'remove all installed versions')
    .example('$0 remove all --keep-versions 0.0.200', 'remove all installed versions except v0.0.200')
    .example('$0 remove all --keep-latest-versions 3', 'remove all installed versions except the last 3 installed versions')
    return yargs;
  }
  handler(args) {
    return console.log(`run remove command with version ${args.versions}`);
  };
}

export const command =  new RemoveCmd();