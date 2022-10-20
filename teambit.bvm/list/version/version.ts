import { ReleaseType } from "../gcp";

export class Version {
  constructor(
    public version: string,
    public releasetype?: ReleaseType
  ){}
}