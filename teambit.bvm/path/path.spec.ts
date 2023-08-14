import { findCurrentBvmDir } from './path';

it('should find the current BVM directory', () => {
  expect(findCurrentBvmDir('/Users/bob/.bvm/links/bit/node_modules/@teambit/bit/bin/bit')).toBe('/Users/bob/.bvm/links/bit');
  expect(findCurrentBvmDir('/Users/bob/.bvm/links/bb/node_modules/@teambit/bit/bin/bit')).toBe('/Users/bob/.bvm/links/bb');
});

it('should not find the current BVM directory if bit is executed from "versions"', () => {
  expect(findCurrentBvmDir('/Users/bob/.bvm/versions/0.2.8/bit-0.2.8/node_modules/@teambit/bit/bin/bit')).toBe(null);
});

it('should not find the current BVM directory', () => {
  expect(findCurrentBvmDir('/Users/bob/src/teambit/bit/node_modules/@teambit/bit/bin/bit')).toBe(null);
});
