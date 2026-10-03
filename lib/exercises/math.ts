const units = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
function small(n: number): string {
  if (n <= 16) return units[n];
  if (n < 20) return 'dix-' + units[n - 10];
  if (n < 70) { const t = ['','','vingt','trente','quarante','cinquante','soixante'][Math.floor(n / 10)], r = n % 10; return t + (r === 1 ? ' et un' : r ? '-' + small(r) : ''); }
  if (n < 80) return 'soixante' + (n === 71 ? ' et onze' : '-' + small(n - 60));
  return 'quatre-vingt' + (n === 80 ? 's' : '-' + small(n - 80));
}
function hundred(n: number, followedByMille = false): string {
  if (n < 100) return followedByMille && n === 80 ? 'quatre-vingt' : small(n);
  const h = Math.floor(n / 100), r = n % 100;
  return (h > 1 ? units[h] + ' ' : '') + 'cent' + (h > 1 && !r && !followedByMille ? 's' : '') + (r ? ' ' + hundred(r, followedByMille) : '');
}
export function numberWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999999999) throw new Error('Nombre hors limites.');
  if (!n) return units[0];
  const m = Math.floor(n / 1000000), k = Math.floor(n / 1000) % 1000, r = n % 1000;
  return [m ? hundred(m) + (m > 1 ? ' millions' : ' million') : '', k ? (k === 1 ? '' : hundred(k, true) + ' ') + 'mille' : '', r ? hundred(r) : ''].filter(Boolean).join(' ');
}
export function decimalText(n: number, scale: number): string {
  if (!scale) return String(n);
  const s = String(n).padStart(scale + 1, '0'); return s.slice(0, -scale) + ',' + s.slice(-scale);
}
export function gcd(a: number, b: number): number { return b ? gcd(b, a % b) : a; }
export function fraction(n: number, d: number) {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || d <= 0 || n < 0) throw new Error('Fraction invalide.');
  const g = gcd(n, d); return { numerator: n / g, denominator: d / g };
}
export function fractionText(n: number, d: number) { const f = fraction(n, d); return f.denominator === 1 ? String(f.numerator) : `${f.numerator}/${f.denominator}`; }
export function decompose(n: number, scale = 0): string {
  return String(n).padStart(scale + 1, '0').split('').map((digit, i, digits) => ({ digit: Number(digit), power: digits.length - i - 1 - scale })).filter(x => x.digit).map(x => x.power >= 0 ? String(x.digit * 10 ** x.power) : `${x.digit}/${10 ** -x.power}`).join(' + ') || '0';
}
export function strictBounds(n: number, step: number): [number, number] { return [Math.floor((n - 1) / step) * step, (Math.floor(n / step) + 1) * step]; }
export function roundInteger(n: number, step: number) { return Math.floor((n + step / 2) / step) * step; }
export function equivalentFraction(input:string,numerator:number,denominator:number): boolean {
  const value=input.trim().replaceAll(' ','').replace('.',',');
  const f=/^(\d+)\/(\d+)$/.exec(value),decimal=/^(\d+)(?:,(\d{1,6}))?$/.exec(value);
  if(f&&BigInt(f[2])>BigInt(0))return BigInt(f[1])*BigInt(denominator)===BigInt(f[2])*BigInt(numerator);
  if(decimal){const digits=decimal[2]??'',scale=BigInt(10)**BigInt(digits.length);return BigInt(decimal[1]+digits)*BigInt(denominator)===scale*BigInt(numerator);}
  return false;
}
