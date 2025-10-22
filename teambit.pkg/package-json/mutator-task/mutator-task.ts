import fs from 'fs';
import path from 'path';
import {
  BuildTask,
  BuiltTaskResult,
  BuildContext,
  TaskHandler,
} from '@teambit/builder';
import { EnvContext } from '@teambit/envs';

export type PackageJsonMutatorTaskOptions = {
  mutator: PackageJsonMutator;

  /**
   * name of the task.
   */
  name?: string;

  /**
   * description of what the task does.
   * if available, the logger will log it show it in the status-line.
   */
  description?: string;
};

type PackageJsonMutator = (pkgJson: any) => any;

export class PackageJsonMutatorTask implements BuildTask {
  // Set it as empty so it will take the env id by default
  readonly aspectId = '';

  constructor(
    readonly name = 'MutatePackageJsonFilesOfComponents',
    readonly description = 'mutates package.json files of components',
    private mutator: PackageJsonMutator
  ) {}

  async execute(context: BuildContext): Promise<BuiltTaskResult> {
    context.capsuleNetwork.originalSeedersCapsules.forEach((capsule) => {
      const pkgJsonPath = path.join(capsule.path, 'package.json');
      if (!fs.existsSync(pkgJsonPath)) return;
      const raw = fs.readFileSync(pkgJsonPath, 'utf8');
      let pkg: any;
      try {
        pkg = JSON.parse(raw);
      } catch {
        // skip malformed package.json to avoid breaking the build
        return;
      }
      const patched = this.mutator(pkg);
      // Only write if changed to avoid unnecessary FS churn
      const nextStr = JSON.stringify(patched, null, 2);
      if (nextStr !== raw) {
        fs.writeFileSync(pkgJsonPath, nextStr + '\n', 'utf8');
      }
    });
    return {
      componentsResults: [],
    };
  }

  static from(options: PackageJsonMutatorTaskOptions): TaskHandler {
    const name = options.name || 'MutatePackageJsonFilesOfComponents';

    const handler = (context: EnvContext) => {
      return new PackageJsonMutatorTask(name, options.description, options.mutator);
    };
    return {
      name,
      handler,
    };
  }
}
