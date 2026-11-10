/** Shared constants for chunked media storage. */
export const CHUNK_SIZE = 768 * 1024; // < 1MB so default nginx client_max_body_size works
export const MAX_IMAGE = 25 * 1024 * 1024; // originals (incl. HEIC from phones); stored as optimized WebP
export const MAX_VIDEO = 150 * 1024 * 1024;
