/// <reference types="vite/client" />

declare module "*.html?raw" {
  const src: string;
  export default src;
}

declare module "*.json" {
  const value: Record<string, unknown>;
  export default value;
}
