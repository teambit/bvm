import { upload } from './upload';

it('should return the correct value', () => {
  expect(upload()).toBe('Hello world!');
});
