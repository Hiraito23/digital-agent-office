#!/usr/bin/env python3
"""Hitung rasio kontras WCAG 2.1.

Pakai:  python3 kontras.py "#1B2B26/#FAF8F4" "#FFFFFF/#1E5B4B"
Format tiap argumen: depan/latar (hex 6 digit). Cetak rasio dan lulus/tidak
untuk teks normal (4.5) dan non-teks/teks besar (3).
"""
import sys


def lum(h):
    h = h.lstrip('#')
    r, g, b = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def ratio(a, b):
    la, lb = lum(a), lum(b)
    if la < lb:
        la, lb = lb, la
    return (la + 0.05) / (lb + 0.05)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    for pair in sys.argv[1:]:
        fg, bg = pair.split('/')
        r = ratio(fg, bg)
        print(f"{fg} / {bg}: {r:.2f}  teks 4.5: {'LULUS' if r >= 4.5 else 'GAGAL'}  non-teks 3: {'LULUS' if r >= 3 else 'GAGAL'}")
