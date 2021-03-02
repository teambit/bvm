import {installVersion} from '@teambit/bvm.install.api'

export async function upgrade() {
  return installVersion('latest', {override: false, replace: true});
}
