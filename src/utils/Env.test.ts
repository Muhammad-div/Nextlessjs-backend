import { Env } from './Env';

describe('Environment variable', () => {
  describe('Get environment variable', () => {
    it('should return an empty string with non-required and undefined environment variable', () => {
      const value = Env.getValue(
        'RANDOM_UNDEFINED_KEY_FOR_JEST_TESTING',
        false,
      );

      expect(value).toEqual('');
    });

    it('should throw an exception with required and undefined environment variable', () => {
      expect(() =>
        Env.getValue('RANDOM_UNDEFINED_KEY_FOR_JEST_TESTING2'),
      ).toThrow(/is not defined/);
    });

    it('should return the value from the environment variable', () => {
      // Save the original process.env
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        RANDOM_DEFINED_KEY_FOR_JEST_TESTING: 'random_string',
      };

      const value = Env.getValue('RANDOM_DEFINED_KEY_FOR_JEST_TESTING');
      expect(value).toEqual('random_string');

      // Restore the original process.env
      process.env = originalEnv;
    });

    it('should return the value from the environment variable even if not required', () => {
      // Save the original process.env
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        RANDOM_DEFINED_KEY_FOR_JEST_TESTING2: 'random_string2',
      };

      const value = Env.getValue('RANDOM_DEFINED_KEY_FOR_JEST_TESTING2', false);
      expect(value).toEqual('random_string2');

      // Restore the original process.env
      process.env = originalEnv;
    });
  });
});
