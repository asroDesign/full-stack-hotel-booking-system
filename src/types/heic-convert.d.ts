declare module "heic-convert" {
  type Options = { buffer: Buffer | ArrayBuffer | Uint8Array; format: "JPEG" | "PNG"; quality?: number };
  const convert: (o: Options) => Promise<ArrayBuffer>;
  export default convert;
}
