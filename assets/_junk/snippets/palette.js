
    // Reçoit: array de hex (#rrggbb ou #rgb). Retourne une NOUVELLE liste réordonnée.
    spreadPalette: function (colors) {
        if (!Array.isArray(colors) || colors.length < 3) return colors?.slice?.() ?? colors;

        // --- Helpers couleurs ---
        const hexToRgb = (hex) => {
            let h = String(hex).replace(/^#/, '').trim();
            if (h.length === 3) h = h.split('').map(ch => ch + ch).join('');
            const n = parseInt(h, 16);
            return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        };
        const rgbToLab = ([r, g, b]) => {
            // sRGB -> lin
            r /= 255; g /= 255; b /= 255;
            const lin = v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
            r = lin(r); g = lin(g); b = lin(b);
            // linRGB -> XYZ (D65)
            const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
            const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
            const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;
            // XYZ -> Lab
            const xn = 0.95047, yn = 1.00000, zn = 1.08883, eps = 216 / 24389, k = 24389 / 27;
            const f = t => t > eps ? Math.cbrt(t) : (k * t + 16) / 116;
            const fx = f(x / xn), fy = f(y / yn), fz = f(z / zn);
            return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]; // [L,a,b]
        };
        const lab = colors.map(c => ({ c, lab: rgbToLab(hexToRgb(c)) }));

        // Distances (Lab) au carré (pas de sqrt, on compare seulement)
        const n = lab.length;
        const D = Array.from({ length: n }, () => Array(n).fill(0));
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
            const [L1, a1, b1] = lab[i].lab, [L2, a2, b2] = lab[j].lab;
            const d = (L1 - L2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2;
            D[i][j] = D[j][i] = d;
        }

        // Démarre avec la paire la plus éloignée
        let a = 0, b = 1, maxd = -1;
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
            if (D[i][j] > maxd) { maxd = D[i][j]; a = i; b = j; }
        }
        const order = [a, b];
        const remaining = new Set([...Array(n).keys()].filter(k => k !== a && k !== b));

        // Insertion gloutonne: à chaque étape, on place la couleur k dans l’intervalle
        // (i -> i+1) qui maximise min( d(k,i), d(k,i+1) ), en considérant l’ordre circulaire.
        while (remaining.size) {
            let bestK = null, bestPos = 0, bestScore = -1;
            for (const k of remaining) {
                const m = order.length;
                for (let i = 0; i < m; i++) {
                    const j = (i + 1) % m;
                    const s = Math.min(D[k][order[i]], D[k][order[j]]);
                    if (s > bestScore) { bestScore = s; bestK = k; bestPos = j; }
                }
            }
            order.splice(bestPos, 0, bestK);
            remaining.delete(bestK);
        }

        // Retourne la palette réordonnée
        return order.map(i => lab[i].c);
    },
