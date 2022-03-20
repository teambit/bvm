import React from 'react';
import { versionsManifast } from './versions-manifast';

export function ReturnsCorrectValue() {
  return <div>{versionsManifast()}</div>;
}
