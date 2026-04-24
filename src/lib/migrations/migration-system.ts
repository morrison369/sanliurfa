export interface Migration {
  version: string;
  name: string;
  description?: string;
  up: (client: any) => Promise<void>;
  down?: (client: any) => Promise<void>;
}
