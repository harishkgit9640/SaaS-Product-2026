const VALID_IDENTIFIER_REGEX = /^[a-z_][a-z0-9_]*$/;

export const assertSafeDbIdentifier = (identifier: string): string => {
  if (!VALID_IDENTIFIER_REGEX.test(identifier)) {
    throw new Error(`Unsafe database identifier: ${identifier}`);
  }

  return identifier;
};
