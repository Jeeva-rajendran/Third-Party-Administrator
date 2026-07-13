declare module '@playwright/test' {
  type Annotation = {
    type: string;
    description?: string;
  };

  type TestInfo = {
    annotations: Annotation[];
  };

  type TestFunction = {
    (title: string, fn: () => void | Promise<void>): void;
    describe(title: string, fn: () => void): void;
    info(): TestInfo;
  };

  export const test: TestFunction;
  export const expect: (actual: unknown) => {
    toBeTruthy(): void;
  };
  export const devices: Record<string, unknown>;
  export function defineConfig(config: unknown): unknown;
}

declare const process: {
  env: Record<string, string | undefined>;
};
