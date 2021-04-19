import { Subject } from '../types';

export const subjectToPath = (subject: Subject): string[] => {
  const paths = [];

  let current: Subject | undefined = subject;
  while (current) {
    paths.push(current.subject);

    current = current.parent;
  }

  return paths
    .filter(val => val.trim() !== '')
    .reverse();
};

export const getValueType = (value: string): boolean | number => {
  if (isNaN(Number.parseInt(value.trim()))) {
    return true;
  }
  return Number.parseInt(value.trim());
};
