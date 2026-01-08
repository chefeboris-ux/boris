
export const XOR_KEY_SUFFIX = "nexus_enterprise_2025";

/**
 * Criptografa uma string usando XOR e Base64 (UTF-8 safe)
 */
export const encrypt = (data: string, userId: string): string => {
  const key = userId + XOR_KEY_SUFFIX;
  const utf8Encoded = encodeURIComponent(data);
  const encrypted = utf8Encoded.split('').map((char, i) =>
    String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
  ).join('');
  return btoa(encrypted);
};

/**
 * Descriptografa uma string
 */
export const decrypt = (encodedData: string, userId: string): string => {
  try {
    const key = userId + XOR_KEY_SUFFIX;
    const encrypted = atob(encodedData);
    const decrypted = encrypted.split('').map((char, i) =>
      String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
    ).join('');
    return decodeURIComponent(decrypted);
  } catch (e) {
    console.error("Falha ao descriptografar dados do cache", e);
    return "";
  }
};

/**
 * Verifica se o timestamp de expiração já passou
 */
export const isExpired = (expiresAt: number): boolean => {
  return Date.now() > expiresAt;
};
