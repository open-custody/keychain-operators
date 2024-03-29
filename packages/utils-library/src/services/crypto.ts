import { v5 } from 'uuid';

export function uuid(input: string, namespace: string) {
  v5(input, namespace);
}
