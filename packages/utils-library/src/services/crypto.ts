import { v5 } from 'uuid';

export function uuid(input: string, namespace: string): string {
  return v5(input, namespace);
}
