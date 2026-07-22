import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const hex = process.env.APP_ENCRYPTION_KEY;
  if (!hex) throw new Error("APP_ENCRYPTION_KEY manquant");
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) throw new Error("APP_ENCRYPTION_KEY doit faire 32 bytes (64 caracteres hex)");
  return key;
}

export function encrypt(plain: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decrypt(cipherText: string): string {
  const [ivHex, authTagHex, dataHex] = cipherText.split(":");
  if (!ivHex || !authTagHex || !dataHex) throw new Error("Format de donnee chiffree invalide");
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
}

// Cle secrete d'App (API publique REST, §9) : haute entropie, jamais choisie
// par un humain -- hash simple suffisant (pas de bcrypt/argon2 necessaire).
export function genererCleSecrete(): string {
  return `sk_${randomBytes(24).toString("hex")}`;
}

export function genererClePublique(): string {
  return `pk_${randomBytes(18).toString("hex")}`;
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function verifierSecret(secret: string, hash: string): boolean {
  const attendu = Buffer.from(hashSecret(secret), "hex");
  const recu = Buffer.from(hash, "hex");
  if (attendu.length !== recu.length) return false;
  return timingSafeEqual(attendu, recu);
}
