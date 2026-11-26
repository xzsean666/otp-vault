import { TotpAccount, TotpAlgorithm } from '../types/vault';
import { base32ToUint8Array, uint8ArrayToBase32, isValidBase32, normalizeBase32 } from './base32';
import { base64ToUint8Array, uint8ArrayToBase64 } from './crypto';

export type GoogleMigrationAccount = Omit<TotpAccount, 'id' | 'createdAt' | 'updatedAt'>;

export interface GoogleMigrationSkippedItem {
  name: string;
  issuer?: string;
  reason: string;
}

export interface GoogleMigrationParseResult {
  accounts: GoogleMigrationAccount[];
  skipped: GoogleMigrationSkippedItem[];
  version: number;
  batchSize: number;
  batchIndex: number;
  batchId: number;
}

export interface GoogleMigrationChunk {
  uri: string;
  batchIndex: number;
  batchSize: number;
  batchId: number;
  accounts: Array<Pick<TotpAccount, 'label' | 'issuer' | 'secret' | 'algorithm' | 'digits' | 'period'>>;
}

// Protobuf enum values from Google Authenticator MigrationPayload
const enum ProtoAlgorithm {
  UNSPECIFIED = 0,
  SHA1 = 1,
  SHA256 = 2,
  SHA512 = 3,
  MD5 = 4,
}

const enum ProtoDigitCount {
  UNSPECIFIED = 0,
  SIX = 1,
  EIGHT = 2,
}

const enum ProtoOtpType {
  UNSPECIFIED = 0,
  HOTP = 1,
  TOTP = 2,
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: false });

/**
 * Check whether a string is a Google Authenticator migration URI
 */
export function isGoogleMigrationUri(rawUri: string): boolean {
  return rawUri.trim().toLowerCase().startsWith('otpauth-migration://');
}

// --- Minimal Zero-Dependency Protobuf Wire Reader / Writer ---

class ProtoReader {
  private pos = 0;

  constructor(private readonly buf: Uint8Array) {}

  hasMore(): boolean {
    return this.pos < this.buf.length;
  }

  readVarintBigInt(): bigint {
    let result = 0n;
    let shift = 0n;
    while (this.pos < this.buf.length) {
      const byte = this.buf[this.pos++];
      result |= BigInt(byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) {
        return result;
      }
      shift += 7n;
      if (shift > 70n) {
        throw new Error('Malformed varint in Google migration payload');
      }
    }
    throw new Error('Unexpected end of Google migration payload while reading varint');
  }

  readInt32(): number {
    return Number(BigInt.asIntN(32, this.readVarintBigInt()));
  }

  readTag(): { fieldNumber: number; wireType: number } {
    const key = Number(this.readVarintBigInt());
    const fieldNumber = key >>> 3;
    const wireType = key & 0x07;
    if (fieldNumber === 0) {
      throw new Error('Invalid protobuf field number 0 in Google migration payload');
    }
    return { fieldNumber, wireType };
  }

  readBytes(): Uint8Array {
    const lenBig = this.readVarintBigInt();
    if (lenBig < 0n || lenBig > BigInt(this.buf.length - this.pos)) {
      throw new Error('Invalid length-delimited field in Google migration payload');
    }
    const len = Number(lenBig);
    const slice = this.buf.subarray(this.pos, this.pos + len);
    this.pos += len;
    return slice;
  }

  readString(): string {
    return textDecoder.decode(this.readBytes());
  }

  skipField(wireType: number): void {
    switch (wireType) {
      case 0:
        this.readVarintBigInt();
        break;
      case 1:
        if (this.pos + 8 > this.buf.length) {
          throw new Error('Unexpected end of payload skipping fixed64');
        }
        this.pos += 8;
        break;
      case 2:
        this.readBytes();
        break;
      case 5:
        if (this.pos + 4 > this.buf.length) {
          throw new Error('Unexpected end of payload skipping fixed32');
        }
        this.pos += 4;
        break;
      default:
        throw new Error(`Unsupported protobuf wire type: ${wireType}`);
    }
  }
}

class ProtoWriter {
  private bytes: number[] = [];

  writeVarint(value: number | bigint): void {
    let v = typeof value === 'bigint' ? BigInt.asUintN(64, value) : BigInt.asUintN(64, BigInt(value));
    while (v >= 0x80n) {
      this.bytes.push(Number(v & 0x7fn) | 0x80);
      v >>= 7n;
    }
    this.bytes.push(Number(v));
  }

  writeTag(fieldNumber: number, wireType: number): void {
    this.writeVarint((fieldNumber << 3) | wireType);
  }

  writeInt32(fieldNumber: number, value: number): void {
    if (value === 0) return; // proto3 default
    this.writeTag(fieldNumber, 0);
    this.writeVarint(BigInt.asIntN(32, BigInt(value)));
  }

  writeBytes(fieldNumber: number, data: Uint8Array): void {
    if (data.length === 0) return;
    this.writeTag(fieldNumber, 2);
    this.writeVarint(data.length);
    for (let i = 0; i < data.length; i++) {
      this.bytes.push(data[i]);
    }
  }

  writeString(fieldNumber: number, str: string): void {
    if (!str) return;
    this.writeBytes(fieldNumber, textEncoder.encode(str));
  }

  toUint8Array(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}

interface RawOtpParam {
  secret: Uint8Array;
  name: string;
  issuer: string;
  algorithm: number;
  digits: number;
  type: number;
}

function decodeOtpParameters(data: Uint8Array): RawOtpParam {
  const reader = new ProtoReader(data);
  const param: RawOtpParam = {
    secret: new Uint8Array(0),
    name: '',
    issuer: '',
    algorithm: ProtoAlgorithm.UNSPECIFIED,
    digits: ProtoDigitCount.UNSPECIFIED,
    type: ProtoOtpType.UNSPECIFIED,
  };

  while (reader.hasMore()) {
    const { fieldNumber, wireType } = reader.readTag();
    switch (fieldNumber) {
      case 1:
        if (wireType !== 2) throw new Error('Invalid secret wire type');
        param.secret = reader.readBytes();
        break;
      case 2:
        if (wireType !== 2) throw new Error('Invalid name wire type');
        param.name = reader.readString();
        break;
      case 3:
        if (wireType !== 2) throw new Error('Invalid issuer wire type');
        param.issuer = reader.readString();
        break;
      case 4:
        if (wireType !== 0) throw new Error('Invalid algorithm wire type');
        param.algorithm = reader.readInt32();
        break;
      case 5:
        if (wireType !== 0) throw new Error('Invalid digits wire type');
        param.digits = reader.readInt32();
        break;
      case 6:
        if (wireType !== 0) throw new Error('Invalid type wire type');
        param.type = reader.readInt32();
        break;
      default:
        reader.skipField(wireType);
        break;
    }
  }

  return param;
}

function normalizeMigrationLabelAndIssuer(
  rawName: string,
  rawIssuer: string
): { label: string; issuer?: string } {
  const cleanIssuer = rawIssuer.trim();
  const cleanName = rawName.trim();

  if (cleanName.includes(':')) {
    const idx = cleanName.indexOf(':');
    const prefix = cleanName.slice(0, idx).trim();
    const rest = cleanName.slice(idx + 1).trim();

    if (!cleanIssuer) {
      return {
        issuer: prefix || undefined,
        label: rest || cleanName,
      };
    }

    if (prefix.toLowerCase() === cleanIssuer.toLowerCase() && rest) {
      return {
        issuer: cleanIssuer,
        label: rest,
      };
    }
  }

  return {
    issuer: cleanIssuer || undefined,
    label: cleanName || 'Account',
  };
}

function mapProtoAlgorithm(algo: number): TotpAlgorithm | null {
  switch (algo) {
    case ProtoAlgorithm.UNSPECIFIED:
    case ProtoAlgorithm.SHA1:
      return 'SHA-1';
    case ProtoAlgorithm.SHA256:
      return 'SHA-256';
    case ProtoAlgorithm.SHA512:
      return 'SHA-512';
    default:
      return null;
  }
}

function mapTotpAlgorithmToProto(algo?: TotpAlgorithm): number {
  switch (algo) {
    case 'SHA-256':
      return ProtoAlgorithm.SHA256;
    case 'SHA-512':
      return ProtoAlgorithm.SHA512;
    case 'SHA-1':
    default:
      return ProtoAlgorithm.SHA1;
  }
}

function mapProtoDigits(digitEnum: number): number {
  switch (digitEnum) {
    case ProtoDigitCount.EIGHT:
      return 8;
    case ProtoDigitCount.UNSPECIFIED:
    case ProtoDigitCount.SIX:
    default:
      return 6;
  }
}

function normalizeBase64DataParam(raw: string): string {
  // URLSearchParams turns '+' into ' ', and some tools emit URL-safe base64 ('-' / '_')
  let normalized = raw.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '');
  const mod = normalized.length % 4;
  if (mod === 2) normalized += '==';
  else if (mod === 3) normalized += '=';
  else if (mod === 1) {
    throw new Error('Invalid Base64 length in Google migration data');
  }
  return normalized;
}

/**
 * Parse a Google Authenticator `otpauth-migration://offline?data=...` URI
 */
export function parseGoogleMigrationUri(rawUri: string): GoogleMigrationParseResult {
  const trimmed = rawUri.trim();
  if (!isGoogleMigrationUri(trimmed)) {
    throw new Error('Invalid URI: must start with otpauth-migration://');
  }

  let dataParam: string | null = null;
  try {
    const url = new URL(trimmed);
    dataParam = url.searchParams.get('data');
  } catch {
    const match = trimmed.match(/[?&]data=([^&]+)/i);
    if (match) {
      dataParam = decodeURIComponent(match[1]);
    }
  }

  if (!dataParam) {
    throw new Error('Google migration URI is missing the "data" parameter');
  }

  let payloadBytes: Uint8Array;
  try {
    payloadBytes = base64ToUint8Array(normalizeBase64DataParam(dataParam));
  } catch {
    throw new Error('Failed to decode Base64 payload in Google migration URI');
  }

  const reader = new ProtoReader(payloadBytes);
  const rawParams: RawOtpParam[] = [];
  let version = 1;
  let batchSize = 1;
  let batchIndex = 0;
  let batchId = 0;

  while (reader.hasMore()) {
    const { fieldNumber, wireType } = reader.readTag();
    switch (fieldNumber) {
      case 1:
        if (wireType !== 2) throw new Error('Invalid otp_parameters wire type');
        rawParams.push(decodeOtpParameters(reader.readBytes()));
        break;
      case 2:
        if (wireType !== 0) throw new Error('Invalid version wire type');
        version = reader.readInt32();
        break;
      case 3:
        if (wireType !== 0) throw new Error('Invalid batch_size wire type');
        batchSize = reader.readInt32();
        break;
      case 4:
        if (wireType !== 0) throw new Error('Invalid batch_index wire type');
        batchIndex = reader.readInt32();
        break;
      case 5:
        if (wireType !== 0) throw new Error('Invalid batch_id wire type');
        batchId = reader.readInt32();
        break;
      default:
        reader.skipField(wireType);
        break;
    }
  }

  const accounts: GoogleMigrationAccount[] = [];
  const skipped: GoogleMigrationSkippedItem[] = [];

  for (const param of rawParams) {
    const { label, issuer } = normalizeMigrationLabelAndIssuer(param.name, param.issuer);

    if (param.type === ProtoOtpType.HOTP) {
      skipped.push({ name: label, issuer, reason: '暂不支持 HOTP 计次型令牌' });
      continue;
    }

    if (!param.secret || param.secret.length === 0) {
      skipped.push({ name: label, issuer, reason: '缺少密钥数据' });
      continue;
    }

    const algorithm = mapProtoAlgorithm(param.algorithm);
    if (!algorithm) {
      skipped.push({ name: label, issuer, reason: '不支持的哈希算法 (如 MD5)' });
      continue;
    }

    const base32Secret = normalizeBase32(uint8ArrayToBase32(param.secret));
    if (!isValidBase32(base32Secret)) {
      skipped.push({ name: label, issuer, reason: '密钥编码无效' });
      continue;
    }

    accounts.push({
      label,
      issuer,
      secret: base32Secret,
      algorithm,
      digits: mapProtoDigits(param.digits),
      period: 30,
    });
  }

  return {
    accounts,
    skipped,
    version: version || 1,
    batchSize: batchSize > 0 ? batchSize : 1,
    batchIndex: batchIndex >= 0 ? batchIndex : 0,
    batchId,
  };
}

function encodeSingleMigrationPayload(
  accounts: Array<Pick<TotpAccount, 'label' | 'issuer' | 'secret' | 'algorithm' | 'digits' | 'period'>>,
  meta: { version: number; batchSize: number; batchIndex: number; batchId: number }
): string {
  const payloadWriter = new ProtoWriter();

  for (const account of accounts) {
    const paramWriter = new ProtoWriter();
    const secretBytes = base32ToUint8Array(account.secret);
    paramWriter.writeBytes(1, secretBytes);
    paramWriter.writeString(2, account.label?.trim() || 'Account');
    if (account.issuer?.trim()) {
      paramWriter.writeString(3, account.issuer.trim());
    }
    paramWriter.writeInt32(4, mapTotpAlgorithmToProto(account.algorithm));
    paramWriter.writeInt32(5, account.digits === 8 ? ProtoDigitCount.EIGHT : ProtoDigitCount.SIX);
    paramWriter.writeInt32(6, ProtoOtpType.TOTP);

    payloadWriter.writeBytes(1, paramWriter.toUint8Array());
  }

  payloadWriter.writeInt32(2, meta.version);
  payloadWriter.writeInt32(3, meta.batchSize);
  payloadWriter.writeInt32(4, meta.batchIndex);
  payloadWriter.writeInt32(5, meta.batchId);

  const base64 = uint8ArrayToBase64(payloadWriter.toUint8Array());
  return `otpauth-migration://offline?data=${encodeURIComponent(base64)}`;
}

function generateBatchId(): number {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const arr = new Uint32Array(1);
    globalThis.crypto.getRandomValues(arr);
    const id = arr[0] & 0x7fffffff;
    return id === 0 ? 1 : id;
  }
  return Math.floor(Math.random() * 0x7ffffffe) + 1;
}

/**
 * Serialize accounts into one or more Google Authenticator compatible
 * `otpauth-migration://offline?data=...` QR payloads.
 *
 * Automatically splits large vaults into multiple chunks (default max 10 accounts
 * and <= 1800 URI characters per QR code) so mobile cameras can scan them reliably.
 */
export function buildGoogleMigrationPayloads(
  accounts: Array<Pick<TotpAccount, 'label' | 'issuer' | 'secret' | 'algorithm' | 'digits' | 'period'>>,
  options: {
    maxAccountsPerBatch?: number;
    maxUriLength?: number;
    batchId?: number;
  } = {}
): GoogleMigrationChunk[] {
  if (accounts.length === 0) return [];

  const maxAccountsPerBatch = Math.max(1, options.maxAccountsPerBatch ?? 10);
  const maxUriLength = Math.max(400, options.maxUriLength ?? 1800);
  const batchId = options.batchId ?? generateBatchId();

  // Partition accounts into QR-friendly chunks
  const buckets: Array<typeof accounts> = [];
  let current: typeof accounts = [];

  for (const account of accounts) {
    if (current.length >= maxAccountsPerBatch) {
      buckets.push(current);
      current = [account];
      continue;
    }

    const candidate = [...current, account];
    // Estimate length using worst-case non-zero batch meta values
    const estimatedUri = encodeSingleMigrationPayload(candidate, {
      version: 1,
      batchSize: Math.max(2, accounts.length),
      batchIndex: Math.max(1, buckets.length),
      batchId,
    });

    if (current.length > 0 && estimatedUri.length > maxUriLength) {
      buckets.push(current);
      current = [account];
    } else {
      current = candidate;
    }
  }

  if (current.length > 0) {
    buckets.push(current);
  }

  const batchSize = buckets.length;
  return buckets.map((bucket, batchIndex) => ({
    uri: encodeSingleMigrationPayload(bucket, {
      version: 1,
      batchSize,
      batchIndex,
      batchId,
    }),
    batchIndex,
    batchSize,
    batchId,
    accounts: bucket,
  }));
}
