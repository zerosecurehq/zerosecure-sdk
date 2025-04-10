const FIELD_MODULUS =
  8444461749428370424248824938781546531375899335154063827935233455917409239040n;

export function stringToBigInt(
  input: string,
  reverse: boolean = false
): bigint {
  const encoder = new TextEncoder();
  const encodedBytes = encoder.encode(input);
  reverse && encodedBytes.reverse();

  let bigIntValue = BigInt(0);
  for (let i = 0; i < encodedBytes.length; i++) {
    const byteValue = BigInt(encodedBytes[i]);
    const shiftedValue = byteValue << BigInt(8 * i);
    bigIntValue = bigIntValue | shiftedValue;
  }

  return bigIntValue;
}

export function bigIntToString(bigIntValue: bigint, reverse: boolean = false) {
  const bytes = [];
  let tempBigInt = bigIntValue;

  while (tempBigInt > BigInt(0)) {
    const byteValue = Number(tempBigInt & BigInt(255));
    bytes.push(byteValue);
    tempBigInt = tempBigInt >> BigInt(8);
  }

  reverse && bytes.reverse();

  const decoder = new TextDecoder();
  const asciiString = decoder.decode(Uint8Array.from(bytes));
  return asciiString;
}

export function fieldsToString(fields: bigint[]) {
  let bigIntValue = BigInt(0);
  let multiplier = BigInt(1);
  for (const fieldElement of fields) {
    bigIntValue += fieldElement * multiplier;
    multiplier *= FIELD_MODULUS;
  }
  return bigIntToString(bigIntValue, true);
}
