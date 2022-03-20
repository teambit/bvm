import React from 'react';
import { upload } from './upload';

export function ReturnsCorrectValue() {
  return <div>{upload()}</div>;
}
