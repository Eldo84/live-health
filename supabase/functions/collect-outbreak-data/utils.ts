const normalize = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export const isLikelySameString = (s1: string, s2: string) =>
  normalize(s1) === normalize(s2);
