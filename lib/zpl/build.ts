export interface BuildEan13ZplInput {
  ean13: string;
  quantity: number;
  widthDots: number;
  heightDots: number;
}

export function buildEan13Zpl({
  ean13,
  quantity,
  widthDots,
  heightDots,
}: BuildEan13ZplInput): string {
  const dataDigits = ean13.slice(0, 12);

  return [
    "^XA",
    `^PW${widthDots}^LL${heightDots}`,
    "^LH0,0",
    "^BY2,3,120",
    "^FO70,30^BEN,120,Y,N",
    `^FD${dataDigits}^FS`,
    `^PQ${quantity}`,
    "^XZ",
  ].join("\r\n");
}