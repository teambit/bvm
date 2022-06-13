import { renderPathExtenderReport } from './reporter';
import chalk from 'chalk';

it('renderPathExtenderReport', () => {
  expect(renderPathExtenderReport({
    configFile: {
      path: '~/.bashrc',
      changeType: 'modified',
    },
    oldSettings: '',
    newSettings: 'PATH=bvm',
  })).toBe(`Replaced configuration in ~/.bashrc
The following configuration changes were made:
PATH=bvm
${chalk.blueBright('Setup complete. Open a new terminal to start using Bit.')}`);
});
