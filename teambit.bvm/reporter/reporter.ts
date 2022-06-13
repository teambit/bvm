import { ConfigReport, PathExtenderReport } from '@pnpm/os.env.path-extender';
import chalk from 'chalk';

export function renderPathExtenderReport (report: PathExtenderReport): string | undefined {
  if (report.oldSettings === report.newSettings) {
    return undefined
  }
  const output = []
  if (report.configFile) {
    output.push(reportConfigChange(report.configFile))
  }
  output.push(`The following configuration changes were made:
${report.newSettings}
${chalk.blueBright('Setup complete. Open a new terminal to start using Bit.')}`)
  return output.join('\n')
}

function reportConfigChange (configReport: ConfigReport): string {
  switch (configReport.changeType) {
  case 'created': return `Created ${configReport.path}`
  case 'appended': return `Appended new lines to ${configReport.path}`
  case 'modified': return `Replaced configuration in ${configReport.path}`
  case 'skipped': return `Configuration already up-to-date in ${configReport.path}`
  }
}

