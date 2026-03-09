import { useState, useRef, useEffect, useCallback } from "react";

const CARD_W = 82;
const CARD_H = 118;
const RANKS = "A,2,3,4,5,6,7,8,9,10,J,Q,K".split(",");
const SUITS = ["♠", "♥", "♦", "♣"];
const SC = { "♥": "#f5365c", "♦": "#f57a2b", "♠": "#263566", "♣": "#2a6844" };
const suitColor = s => SC[s] || "#263566";
const isValidPlay = (r1, r2) => { if (!r1 || !r2) return false; const a = RANKS.indexOf(r1), b = RANKS.indexOf(r2); if (a < 0 || b < 0) return false; if (a === b) return true; const d = Math.abs(a - b); return d === 1 || d === 12; };
const makeDeck = () => { const d = []; for (const s of SUITS) for (const r of RANKS) d.push({ rank: r, suit: s }); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[d[i], d[j]] = [d[j], d[i]]; } return d; };

// Sound
let audioCtx = null;
const ensureAudio = () => { if (!audioCtx && typeof AudioContext !== "undefined") audioCtx = new AudioContext(); if (audioCtx && audioCtx.state === "suspended") audioCtx.resume(); return audioCtx; };
const playSound = (type) => {
    const ctx = ensureAudio(); if (!ctx) return; const now = ctx.currentTime;
    const noise = (dur, vol, freq) => { const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++)d[i] = Math.random() * 2 - 1; const src = ctx.createBufferSource(); src.buffer = buf; const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 1.5; const g = ctx.createGain(); g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + dur); src.connect(f); f.connect(g); g.connect(ctx.destination); src.start(now); src.stop(now + dur); };
    const tone = (freq, dur, vol, del = 0) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = "sine"; o.frequency.value = freq; g.gain.setValueAtTime(vol, now + del); g.gain.exponentialRampToValueAtTime(0.001, now + del + dur); o.connect(g); g.connect(ctx.destination); o.start(now + del); o.stop(now + del + dur); };
    if (type === "place") { noise(0.06, 0.15, 300); tone(90, 0.06, 0.12); }
    else if (type === "combo") { [0, 0.05, 0.1].forEach((t, i) => { noise(0.05, 0.1 + i * 0.03, 400 + i * 150); tone(180 + i * 60, 0.08, 0.08, t); }); }
    else if (type === "megacombo") { noise(0.15, 0.3, 400); tone(150, 0.35, 0.35);[0, 0.04, 0.08, 0.12, 0.16].forEach((t, i) => tone(300 + i * 150, 0.15, 0.08 + i * 0.02, t)); setTimeout(() => { const c = ensureAudio(); if (c) { noise(0.2, 0.08, 6000); tone(880, 0.3, 0.06); } }, 200); }
    else if (type === "error") { noise(0.1, 0.18, 150); tone(65, 0.12, 0.15); }
    else if (type === "draw") { noise(0.04, 0.08, 2000); }
    else if (type === "flip") { noise(0.12, 0.25, 250); tone(120, 0.2, 0.3); noise(0.02, 0.12, 4000); }
    else if (type === "ready") { noise(0.03, 0.1, 3000); tone(520, 0.06, 0.06); }
    else if (type === "go") { noise(0.08, 0.2, 600); tone(440, 0.15, 0.15, 0.02); }
    else if (type === "countdown") { noise(0.025, 0.08, 3500); }
    else if (type === "win") { [0, 0.1, 0.2, 0.35].forEach((t, i) => { noise(0.04, 0.06, 2000 + i * 500); tone([330, 440, 550, 660][i], i === 3 ? 0.3 : 0.12, 0.1, t); }); }
    else if (type === "stall") { [0, 0.12].forEach(t => { noise(0.04, 0.1, 1500); tone(380, 0.06, 0.08, t); }); }
    else if (type === "swap") { noise(0.03, 0.06, 1800); }
};

// Pixel font style
const pxf = { fontFamily: "'Courier New', monospace", imageRendering: "pixelated" };

function CardFace({ rank, suit, w = CARD_W, h = CARD_H, selected, dim, style = {} }) {
    if (!rank || !suit) return null;
    const c = suitColor(suit);
    return (<div style={{
        width: w, height: h, flexShrink: 0, userSelect: "none",
        background: "#f0e6d3", border: selected ? "3px solid #ffd639" : "3px solid #2a2540", borderRadius: 6,
        padding: 6, position: "relative", overflow: "hidden",
        boxShadow: selected ? "0 0 0 2px #ffd63988, 0 6px 0 #1a152888, 0 8px 16px #0006" : "0 6px 0 #1a152888, 0 8px 16px #0006",
        opacity: dim ? 0.2 : 1, ...style
    }}>
        {/* Subtle paper texture */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.08, background: "repeating-linear-gradient(0deg,#0001 0px,transparent 1px,transparent 3px)", pointerEvents: "none" }} />
        <div style={{ fontWeight: 900, fontSize: w > 75 ? 19 : 14, color: c, lineHeight: 1, ...pxf, position: "relative", zIndex: 1 }}>
            {rank}<div style={{ fontSize: w > 75 ? 17 : 12, marginTop: 1 }}>{suit}</div>
        </div>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: w > 75 ? 48 : 30, color: c, opacity: 0.12, ...pxf }}>{suit}</div>
        <div style={{ position: "absolute", bottom: 6, right: 8, fontWeight: 900, fontSize: w > 75 ? 19 : 14, color: c, transform: "rotate(180deg)", lineHeight: 1, ...pxf, zIndex: 1 }}>
            {rank}<div style={{ fontSize: w > 75 ? 17 : 12, marginTop: 1 }}>{suit}</div>
        </div>
    </div>);
}

function CardBack({ w = CARD_W, h = CARD_H }) {
    const s = w > 70 ? 1 : 0.7;
    return (<div style={{
        width: w, height: h, flexShrink: 0,
        background: "#1a3a8a",
        border: "3px solid #2a2540", borderRadius: 6,
        boxShadow: "0 6px 0 #1a152888, 0 8px 16px #0006",
        display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden"
    }}>
        {/* White border frame */}
        <div style={{ position: "absolute", inset: 4, border: "2px solid #a0b8e8", borderRadius: 3 }} />
        <div style={{ position: "absolute", inset: 7, border: "1px solid #6a8ad0", borderRadius: 2, overflow: "hidden" }}>
            {/* Dot pattern background */}
            <div style={{
                position: "absolute", inset: 0, opacity: 0.12,
                background: "radial-gradient(circle, #fff 0.8px, transparent 0.8px)",
                backgroundSize: "5px 5px"
            }} />
        </div>
        {/* Center SVG pixel art */}
        <svg width={Math.round(54 * s)} height={Math.round(90 * s)} viewBox="0 0 54 90" style={{ imageRendering: "pixelated", position: "relative", zIndex: 1 }}>
            {/* === TOP HALF === */}
            {/* Top center heart/spade ornament */}
            <rect x="25" y="2" width="4" height="3" fill="#a0b8e8" />
            <rect x="24" y="3" width="6" height="2" fill="#a0b8e8" />
            <rect x="26" y="1" width="2" height="1" fill="#a0b8e8" />

            {/* Top corner scrolls - left */}
            <rect x="4" y="4" width="3" height="2" fill="#a0b8e8" />
            <rect x="3" y="5" width="2" height="3" fill="#a0b8e8" />
            <rect x="5" y="6" width="3" height="2" fill="#a0b8e8" />
            <rect x="7" y="4" width="2" height="2" fill="#a0b8e8" />
            {/* Top corner scrolls - right */}
            <rect x="47" y="4" width="3" height="2" fill="#a0b8e8" />
            <rect x="49" y="5" width="2" height="3" fill="#a0b8e8" />
            <rect x="44" y="6" width="3" height="2" fill="#a0b8e8" />
            <rect x="45" y="4" width="2" height="2" fill="#a0b8e8" />

            {/* Top circle frame */}
            <rect x="18" y="8" width="18" height="1" fill="#a0b8e8" />
            <rect x="15" y="9" width="3" height="1" fill="#a0b8e8" />
            <rect x="36" y="9" width="3" height="1" fill="#a0b8e8" />
            <rect x="13" y="10" width="2" height="2" fill="#a0b8e8" />
            <rect x="39" y="10" width="2" height="2" fill="#a0b8e8" />
            <rect x="12" y="12" width="1" height="4" fill="#a0b8e8" />
            <rect x="41" y="12" width="1" height="4" fill="#a0b8e8" />
            <rect x="12" y="16" width="1" height="4" fill="#a0b8e8" />
            <rect x="41" y="16" width="1" height="4" fill="#a0b8e8" />
            <rect x="13" y="20" width="2" height="2" fill="#a0b8e8" />
            <rect x="39" y="20" width="2" height="2" fill="#a0b8e8" />
            <rect x="15" y="22" width="3" height="1" fill="#a0b8e8" />
            <rect x="36" y="22" width="3" height="1" fill="#a0b8e8" />
            <rect x="18" y="23" width="18" height="1" fill="#a0b8e8" />

            {/* Angel/rider figure - top */}
            {/* Head */}
            <rect x="25" y="10" width="4" height="3" fill="#a0b8e8" />
            <rect x="26" y="9" width="2" height="1" fill="#a0b8e8" />
            {/* Wings */}
            <rect x="20" y="12" width="4" height="1" fill="#a0b8e8" />
            <rect x="30" y="12" width="4" height="1" fill="#a0b8e8" />
            <rect x="19" y="13" width="3" height="1" fill="#a0b8e8" />
            <rect x="32" y="13" width="3" height="1" fill="#a0b8e8" />
            <rect x="18" y="14" width="2" height="1" fill="#a0b8e8" />
            <rect x="34" y="14" width="2" height="1" fill="#a0b8e8" />
            {/* Body */}
            <rect x="25" y="13" width="4" height="2" fill="#a0b8e8" />
            <rect x="26" y="15" width="2" height="2" fill="#a0b8e8" />
            {/* Wheel top */}
            <rect x="22" y="17" width="10" height="1" fill="#a0b8e8" />
            <rect x="21" y="18" width="2" height="1" fill="#a0b8e8" />
            <rect x="31" y="18" width="2" height="1" fill="#a0b8e8" />
            <rect x="26" y="18" width="2" height="3" fill="#a0b8e8" />
            <rect x="21" y="20" width="2" height="1" fill="#a0b8e8" />
            <rect x="31" y="20" width="2" height="1" fill="#a0b8e8" />
            <rect x="22" y="21" width="10" height="1" fill="#a0b8e8" />

            {/* Side filigree - left */}
            <rect x="5" y="12" width="2" height="2" fill="#a0b8e8" />
            <rect x="4" y="14" width="1" height="4" fill="#a0b8e8" />
            <rect x="6" y="14" width="2" height="1" fill="#a0b8e8" />
            <rect x="5" y="18" width="2" height="2" fill="#a0b8e8" />
            <rect x="4" y="20" width="1" height="3" fill="#a0b8e8" />
            <rect x="6" y="22" width="2" height="2" fill="#a0b8e8" />
            {/* Side filigree - right */}
            <rect x="46" y="12" width="2" height="2" fill="#a0b8e8" />
            <rect x="49" y="14" width="1" height="4" fill="#a0b8e8" />
            <rect x="46" y="14" width="2" height="1" fill="#a0b8e8" />
            <rect x="46" y="18" width="2" height="2" fill="#a0b8e8" />
            <rect x="49" y="20" width="1" height="3" fill="#a0b8e8" />
            <rect x="46" y="22" width="2" height="2" fill="#a0b8e8" />

            {/* === CENTER DIVIDER === */}
            <rect x="8" y="38" width="38" height="1" fill="#a0b8e8" opacity="0.6" />
            {/* Center diamond */}
            <rect x="26" y="36" width="2" height="1" fill="#a0b8e8" />
            <rect x="25" y="37" width="4" height="1" fill="#a0b8e8" />
            <rect x="24" y="38" width="6" height="1" fill="#a0b8e8" />
            <rect x="25" y="39" width="4" height="1" fill="#a0b8e8" />
            <rect x="26" y="40" width="2" height="1" fill="#a0b8e8" />
            {/* Connecting lines */}
            <rect x="24" y="43" width="6" height="1" fill="#a0b8e8" opacity="0.5" />
            <rect x="8" y="44" width="38" height="1" fill="#a0b8e8" opacity="0.4" />

            {/* Vine details center left */}
            <rect x="10" y="36" width="2" height="1" fill="#a0b8e8" opacity="0.5" />
            <rect x="9" y="37" width="1" height="3" fill="#a0b8e8" opacity="0.5" />
            <rect x="11" y="39" width="2" height="1" fill="#a0b8e8" opacity="0.5" />
            {/* Vine details center right */}
            <rect x="42" y="36" width="2" height="1" fill="#a0b8e8" opacity="0.5" />
            <rect x="44" y="37" width="1" height="3" fill="#a0b8e8" opacity="0.5" />
            <rect x="41" y="39" width="2" height="1" fill="#a0b8e8" opacity="0.5" />

            {/* === BOTTOM HALF (mirrored) === */}
            {/* Bottom center ornament */}
            <rect x="25" y="85" width="4" height="3" fill="#a0b8e8" />
            <rect x="24" y="85" width="6" height="2" fill="#a0b8e8" />
            <rect x="26" y="88" width="2" height="1" fill="#a0b8e8" />

            {/* Bottom corner scrolls - left */}
            <rect x="4" y="84" width="3" height="2" fill="#a0b8e8" />
            <rect x="3" y="82" width="2" height="3" fill="#a0b8e8" />
            <rect x="5" y="82" width="3" height="2" fill="#a0b8e8" />
            <rect x="7" y="84" width="2" height="2" fill="#a0b8e8" />
            {/* Bottom corner scrolls - right */}
            <rect x="47" y="84" width="3" height="2" fill="#a0b8e8" />
            <rect x="49" y="82" width="2" height="3" fill="#a0b8e8" />
            <rect x="44" y="82" width="3" height="2" fill="#a0b8e8" />
            <rect x="45" y="84" width="2" height="2" fill="#a0b8e8" />

            {/* Bottom circle frame */}
            <rect x="18" y="66" width="18" height="1" fill="#a0b8e8" />
            <rect x="15" y="67" width="3" height="1" fill="#a0b8e8" />
            <rect x="36" y="67" width="3" height="1" fill="#a0b8e8" />
            <rect x="13" y="68" width="2" height="2" fill="#a0b8e8" />
            <rect x="39" y="68" width="2" height="2" fill="#a0b8e8" />
            <rect x="12" y="70" width="1" height="4" fill="#a0b8e8" />
            <rect x="41" y="70" width="1" height="4" fill="#a0b8e8" />
            <rect x="12" y="74" width="1" height="4" fill="#a0b8e8" />
            <rect x="41" y="74" width="1" height="4" fill="#a0b8e8" />
            <rect x="13" y="78" width="2" height="2" fill="#a0b8e8" />
            <rect x="39" y="78" width="2" height="2" fill="#a0b8e8" />
            <rect x="15" y="80" width="3" height="1" fill="#a0b8e8" />
            <rect x="36" y="80" width="3" height="1" fill="#a0b8e8" />
            <rect x="18" y="81" width="18" height="1" fill="#a0b8e8" />

            {/* Angel/rider figure - bottom (inverted) */}
            <rect x="25" y="77" width="4" height="3" fill="#a0b8e8" />
            <rect x="26" y="80" width="2" height="1" fill="#a0b8e8" />
            <rect x="20" y="77" width="4" height="1" fill="#a0b8e8" />
            <rect x="30" y="77" width="4" height="1" fill="#a0b8e8" />
            <rect x="19" y="76" width="3" height="1" fill="#a0b8e8" />
            <rect x="32" y="76" width="3" height="1" fill="#a0b8e8" />
            <rect x="18" y="75" width="2" height="1" fill="#a0b8e8" />
            <rect x="34" y="75" width="2" height="1" fill="#a0b8e8" />
            <rect x="25" y="75" width="4" height="2" fill="#a0b8e8" />
            <rect x="26" y="73" width="2" height="2" fill="#a0b8e8" />
            <rect x="22" y="68" width="10" height="1" fill="#a0b8e8" />
            <rect x="21" y="69" width="2" height="1" fill="#a0b8e8" />
            <rect x="31" y="69" width="2" height="1" fill="#a0b8e8" />
            <rect x="26" y="69" width="2" height="3" fill="#a0b8e8" />
            <rect x="21" y="71" width="2" height="1" fill="#a0b8e8" />
            <rect x="31" y="71" width="2" height="1" fill="#a0b8e8" />
            <rect x="22" y="72" width="10" height="1" fill="#a0b8e8" />

            {/* Side filigree bottom - left */}
            <rect x="5" y="76" width="2" height="2" fill="#a0b8e8" />
            <rect x="4" y="72" width="1" height="4" fill="#a0b8e8" />
            <rect x="6" y="75" width="2" height="1" fill="#a0b8e8" />
            <rect x="5" y="70" width="2" height="2" fill="#a0b8e8" />
            <rect x="4" y="67" width="1" height="3" fill="#a0b8e8" />
            <rect x="6" y="66" width="2" height="2" fill="#a0b8e8" />
            {/* Side filigree bottom - right */}
            <rect x="46" y="76" width="2" height="2" fill="#a0b8e8" />
            <rect x="49" y="72" width="1" height="4" fill="#a0b8e8" />
            <rect x="46" y="75" width="2" height="1" fill="#a0b8e8" />
            <rect x="46" y="70" width="2" height="2" fill="#a0b8e8" />
            <rect x="49" y="67" width="1" height="3" fill="#a0b8e8" />
            <rect x="46" y="66" width="2" height="2" fill="#a0b8e8" />

            {/* Side running vines left */}
            {[28, 30, 32, 34, 48, 50, 52, 54].map(y => <rect key={"lv" + y} x="5" y={y} width="1" height="1" fill="#a0b8e8" opacity="0.35" />)}
            {/* Side running vines right */}
            {[28, 30, 32, 34, 48, 50, 52, 54].map(y => <rect key={"rv" + y} x="48" y={y} width="1" height="1" fill="#a0b8e8" opacity="0.35" />)}
        </svg>
    </div>);
}

function PileStack({ count, w = CARD_W, h = CARD_H, label, showLabel = false, pulseLabel = false }) {
    const n = Math.min(Math.max(count || 0, 0), 5);

    return (
        <div
            style={{
                position: "relative",
                width: w + 10,
                height: h + 10,
                flexShrink: 0,

                // Always reserve label space so layout never jumps
                marginBottom: 24,
            }}
        >
            {n === 0 ? (
                <div style={{ width: w, height: h, border: "2px dashed #4a3a6a44", borderRadius: 6 }} />
            ) : (
                Array.from({ length: n }).map((_, i) => (
                    <div key={i} style={{ position: "absolute", top: i * 2, left: i * 1.5, zIndex: i }}>
                        <CardBack w={w} h={h} />
                    </div>
                ))
            )}

            {label && (
                <div
                    style={{
                        position: "absolute",
                        bottom: -24,
                        left: "50%",
                        transform: "translateX(-50%)",
                        fontSize: 12,
                        color: pulseLabel ? "#fbbf24" : "#8aaa9a",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: 3,
                        ...pxf,

                        // Fade instead of changing layout
                        opacity: showLabel ? 1 : 0,
                        transition: "opacity .15s ease",
                        pointerEvents: "none",

                        animation: pulseLabel ? "pulse 1s infinite" : "none",
                        textShadow: pulseLabel ? "0 0 8px #fbbf2466" : "0 1px 3px #000a",
                        whiteSpace: "nowrap",
                    }}
                >
                    {label}
                </div>
            )}
        </div>
    );
}

function CenterPile({ card, history, rot, slamming }) {
    const w = 96, h = 136;
    return (<div style={{ position: "relative", width: w + 24, height: h + 16 }}>
        {history.slice(-3).map((hc, i) => (<div key={i} style={{ position: "absolute", top: 8 + (hc.offY || 0), left: 12 + (hc.offX || 0), transform: `rotate(${hc.rot || 0}deg)`, zIndex: i, opacity: 0.4 - i * 0.08 }}><CardFace rank={hc.rank} suit={hc.suit} w={w} h={h} /></div>))}
        <div style={{ position: "absolute", top: 0, left: 12, zIndex: 10, transform: `rotate(${rot}deg)${slamming ? " scale(1.06)" : ""}`, transition: "transform 0.15s" }}><CardFace rank={card.rank} suit={card.suit} w={w} h={h} /></div>
    </div>);
}

function initGame() { const d = makeDeck(); return { pH: d.splice(0, 5), pD: d.splice(0, 15), cH: d.splice(0, 5), cD: d.splice(0, 15), fL: d.splice(0, 5), fR: d.splice(0, 5), cL: d[0], cR: d[1] }; }

export default function App() {

    const [gs, setGs] = useState("ready"); const [cd, setCd] = useState(3); const [pRdy, setPRdy] = useState(false); const [cRdy, setCRdy] = useState(false); const [rev, setRev] = useState(false);
    const [ph, setPh] = useState([null, null, null, null, null]); const [pd, setPd] = useState([]); const [ch, setCh] = useState([null, null, null, null, null]); const [cdr, setCdr] = useState([]);
    const [fl, setFl] = useState([]); const [fr, setFr] = useState([]); const [cL, setCL] = useState(null); const [cR, setCR] = useState(null);
    const [combo, setCombo] = useState([]); const [pen, setPen] = useState(false); const [penC, setPenC] = useState(null);
    const [slam, setSlam] = useState(null); const [fb, setFb] = useState(null);
    const [gP, setGP] = useState(null); const [gC, setGC] = useState([]); const [gT, setGT] = useState(null); const [drag, setDrag] = useState(false); const [dI, setDI] = useState(null);
    const [win, setWin] = useState(null); const [cpuA, setCpuA] = useState(null);
    const [slA, setSlA] = useState(null); const [insP, setInsP] = useState(null);
    const [stT, setStT] = useState(10); const [pF, setPF] = useState(false); const [cF, setCF] = useState(false); const [fCd, setFCd] = useState(null);
    const [cLH, setCLH] = useState([]); const [cRH, setCRH] = useState([]); const [sR, setSR] = useState({ l: 0, r: 0 });

    const s = useRef({}); s.current = { ph, pd, ch, cdr, fl, fr, cL, cR, combo, pen, gs, pRdy, cRdy, pF, cF, insP };
    const aR = useRef(false), dR = useRef(null), oR = useRef({ x: 0, y: 0 }), rR = useRef(false), rects = useRef({});

    const uR = () => { const m = {}; document.querySelectorAll("[data-drop]").forEach(el => { const r = el.getBoundingClientRect(); const id = el.getAttribute("data-drop"); const p = id.startsWith("slot") ? 28 : 24; m[id] = { l: r.left - p, r: r.right + p, t: r.top - p, b: r.bottom + p }; }); rects.current = m; };
    const hT = (x, y) => { for (const id of ["center-left", "center-right"]) { const r = rects.current[id]; if (r && x >= r.l && x <= r.r && y >= r.t && y <= r.b) return id; } for (const [id, r] of Object.entries(rects.current)) { if (id.startsWith("slot") && x >= r.l && x <= r.r && y >= r.t && y <= r.b) return id; } return null; };

    const flash = useCallback((m, c) => { setFb({ m, c }); setTimeout(() => setFb(null), 800); }, []);
    const doSlam = useCallback(p => {
        setSlam(p); setTimeout(() => setSlam(null), 160); const rot = (Math.random() - 0.5) * 18, oX = (Math.random() - 0.5) * 12, oY = (Math.random() - 0.5) * 8;
        if (p === "center-left") { setSR(pr => ({ ...pr, l: rot })); setCLH(pr => { const c = s.current; return c.cL ? [...pr.slice(-3), { ...c.cL, rot: pr.length ? (pr[pr.length - 1]?.rot || 0) : 0, offX: oX, offY: oY }] : pr; }); }
        else { setSR(pr => ({ ...pr, r: rot })); setCRH(pr => { const c = s.current; return c.cR ? [...pr.slice(-3), { ...c.cR, rot: pr.length ? (pr[pr.length - 1]?.rot || 0) : 0, offX: oX, offY: oY }] : pr; }); }
    }, []);
    const doP = useCallback(i => { setPen(true); setPenC(i); playSound("error"); setTimeout(() => { setPen(false); setPenC(null); }, 250); }, []);
    const ckW = useCallback((p, d, c, cd) => { if (p.filter(Boolean).length + d.length === 0) return "player"; if (c.filter(Boolean).length + cd.length === 0) return "cpu"; return null; }, []);
    const ckS = useCallback(() => { const v = s.current; if (!v.cL || !v.cR) return false; if (v.ph.filter(c => c === null).length > 0 && v.pd.length > 0) return false; if (v.ch.filter(c => c === null).length > 0 && v.cdr.length > 0) return false; return ![...v.ph.filter(Boolean), ...v.ch.filter(Boolean)].some(c => c && (isValidPlay(c.rank, v.cL.rank) || isValidPlay(c.rank, v.cR.rank))); }, []);

    const start = useCallback(() => { const g = initGame(); setPh(g.pH); setPd(g.pD); setCh(g.cH); setCdr(g.cD); setFl(g.fL); setFr(g.fR); setCL(g.cL); setCR(g.cR); setWin(null); setGs("ready"); setCd(3); setPRdy(false); setCRdy(false); setRev(false); setCombo([]); setPen(false); setPenC(null); setFb(null); setStT(10); setPF(false); setCF(false); setFCd(null); setCLH([]); setCRH([]); setSR({ l: 0, r: 0 }); }, []);
    useEffect(() => { start(); }, [start]);
    useEffect(() => { const f = () => { ensureAudio(); window.removeEventListener("mousedown", f); }; window.addEventListener("mousedown", f); return () => window.removeEventListener("mousedown", f); }, []);

    useEffect(() => { if (gs !== "ready") return; const t = setTimeout(() => { setCRdy(true); playSound("ready"); }, 1e3 + Math.random() * 2e3); return () => clearTimeout(t); }, [gs]);
    useEffect(() => { if (gs === "ready" && pRdy && cRdy) setGs("countdown"); }, [gs, pRdy, cRdy]);
    useEffect(() => { if (gs !== "countdown") return; if (cd <= 0) { setRev(true); setGs("playing"); playSound("go"); return; } playSound("countdown"); const t = setTimeout(() => setCd(c => c - 1), 800); return () => clearTimeout(t); }, [gs, cd]);

    useEffect(() => {
        if (gs !== "playing") return; const tick = () => {
            const v = s.current; if (v.gs !== "playing") return; const h = [...v.ch], dr = [...v.cdr];
            for (let i = 0; i < h.length; i++) {
                const c = h[i]; if (!c) continue; const t = []; if (v.cL && isValidPlay(c.rank, v.cL.rank)) t.push("left"); if (v.cR && isValidPlay(c.rank, v.cR.rank)) t.push("right");
                if (t.length) {
                    const tg = t[Math.floor(Math.random() * t.length)]; h[i] = null; setCh([...h]); setCpuA({ idx: i }); setTimeout(() => setCpuA(null), 200); if (tg === "left") setCL(c); else setCR(c); doSlam("center-" + tg); playSound("place");
                    const w = ckW(v.ph, v.pd, h, dr); if (w) { setTimeout(() => { setWin(w); playSound("win"); }, 100); setGs("gameover"); return; }
                    if (dr.length) setTimeout(() => { const v2 = s.current; const h2 = [...v2.ch], d2 = [...v2.cdr]; if (d2.length) { const e = h2.findIndex(x => x === null); if (e >= 0) { h2[e] = d2.pop(); setCh(h2); setCdr([...d2]); } } }, 200 + Math.random() * 300); return;
                }
            }
            if (dr.length) { const e = h.findIndex(x => x === null); if (e >= 0) { h[e] = dr.pop(); setCh([...h]); setCdr([...dr]); } }
        };
        const id = setInterval(tick, 800 + Math.random() * 1200); return () => clearInterval(id);
    }, [gs, doSlam, ckW]);

    useEffect(() => { if (gs !== "playing") return; const id = setInterval(() => { if (ckS()) { setGs("stall"); setStT(10); setPF(false); setCF(false); playSound("stall"); flash("GET READY TO FLIP!", "#fbbf24"); } }, 1500); return () => clearInterval(id); }, [gs, ckS, flash]);
    useEffect(() => { if (gs !== "stall") return; if (stT <= 0 && fCd === null) { setPF(true); setCF(true); setFCd(3); return; } const t = setTimeout(() => setStT(v => v - 1), 1e3); return () => clearTimeout(t); }, [gs, stT, fCd]);
    useEffect(() => { if (gs !== "stall" || cF) return; const t = setTimeout(() => setCF(true), 2e3 + Math.random() * 3e3); return () => clearTimeout(t); }, [gs, cF]);
    useEffect(() => { if (gs === "stall" && pF && cF && fCd === null) setFCd(3); }, [gs, pF, cF, fCd]);
    useEffect(() => { if (fCd === null) return; if (fCd <= 0) { doFlip(); setFCd(null); return; } playSound("countdown"); const t = setTimeout(() => setFCd(v => v - 1), 600); return () => clearTimeout(t); }, [fCd]);

    const doFlip = useCallback(() => { const v = s.current; const a = [...v.fl], b = [...v.fr]; let did = false; if (a.length) { setCL(a.pop()); did = true; } if (b.length) { setCR(b.pop()); did = true; } setFl([...a]); setFr([...b]); if (did) { doSlam("center-left"); setTimeout(() => doSlam("center-right"), 100); playSound("flip"); flash("FLIP!", "#fbbf24"); } setPF(false); setCF(false); setStT(10); setFCd(null); if (!did) { setWin("draw"); setGs("gameover"); return; } setGs("playing"); }, [doSlam, flash]);

    useEffect(() => { const p = e => e.preventDefault(); window.addEventListener("contextmenu", p); window.addEventListener("selectstart", p); window.addEventListener("dragstart", p); return () => { window.removeEventListener("contextmenu", p); window.removeEventListener("selectstart", p); window.removeEventListener("dragstart", p); }; }, []);
    useEffect(() => { setTimeout(uR, 60); }, [ph]);
    useEffect(() => { window.addEventListener("resize", uR); return () => window.removeEventListener("resize", uR); }, []);

    useEffect(() => {
        const onM = e => { if (aR.current) { setGP({ x: e.clientX - oR.current.x, y: e.clientY - oR.current.y }); const d = dR.current; if (d && d.type === "single" && d.src === "hand") { const sl = document.querySelectorAll("[data-drop^='slot-']"); let b = null, bD = Infinity; sl.forEach(el => { const r = el.getBoundingClientRect(); if (e.clientY >= r.top - 60 && e.clientY <= r.bottom + 60) { const cx = r.left + r.width / 2; const idx = parseInt(el.getAttribute("data-drop").split("-")[1]); if (!isNaN(idx)) { if (e.clientX < cx) { const d = Math.abs(e.clientX - r.left); if (d < bD) { bD = d; b = idx; } } else { const d = Math.abs(e.clientX - r.right); if (d < bD) { bD = d; b = idx + 1; } } } } }); if (b !== null && b !== d.idx && b !== d.idx + 1) setInsP(b); else setInsP(null); } else setInsP(null); } if (rR.current) { document.querySelectorAll("[data-hi]").forEach(el => { const r = el.getBoundingClientRect(); if (e.clientX >= r.left - 10 && e.clientX <= r.right + 10 && e.clientY >= r.top - 10 && e.clientY <= r.bottom + 10) { const i = parseInt(el.getAttribute("data-hi")); if (!isNaN(i)) setCombo(p => p.includes(i) ? p : [...p, i].sort((a, b) => a - b)); } }); } };
        const onU = e => {
            if (e.button === 2) { rR.current = false; return; } if (e.button !== 0 || !aR.current) return; aR.current = false; const d = dR.current; dR.current = null; setGP(null); setGC([]); setGT(null); setDrag(false); setDI(null); setInsP(null); if (!d) return; uR(); const tgt = hT(e.clientX, e.clientY); const v = s.current; if (!["ready", "playing", "stall"].includes(v.gs)) return; const cp = v.gs === "playing"; const nh = [...v.ph];
            try {
                if (d.type === "draw") { let ok = false; if (tgt && tgt.startsWith("slot-")) { const si = parseInt(tgt.split("-")[1]); if (!isNaN(si) && si >= 0 && si < nh.length && nh[si] === null && v.pd.length > 0) { const nd = [...v.pd]; nh[si] = nd.pop(); setPh(nh); setPd(nd); ok = true; playSound("draw"); } } if (!ok && v.pd.length > 0) { for (let i = nh.length - 1; i >= 0; i--) { if (nh[i] === null) { const nd = [...v.pd]; nh[i] = nd.pop(); setPh(nh); setPd(nd); playSound("draw"); break; } } } return; }
                if (d.type === "combo") { if (!cp) { setCombo([]); return; } if ((tgt === "center-left" || tgt === "center-right") && d.cards && d.cards.length >= 2) { const pl = tgt === "center-left" ? v.cL : v.cR; if (pl && d.cards[0] && isValidPlay(d.cards[0].rank, pl.rank)) { let ok = true; for (let i = 1; i < d.cards.length; i++) { if (!d.cards[i] || !d.cards[i - 1] || !isValidPlay(d.cards[i].rank, d.cards[i - 1].rank)) { ok = false; break; } } if (ok) { const last = d.cards[d.cards.length - 1]; if (tgt === "center-left") setCL(last); else setCR(last); d.indices.forEach(i => { if (i >= 0 && i < nh.length) nh[i] = null; }); setPh(nh); setCombo([]); doSlam(tgt); const hs = v.ph.filter(Boolean).length; if (d.cards.length >= hs && hs >= 4) { playSound("megacombo"); flash("MEGA COMBO x" + d.cards.length + "!!", "#f57a2b"); } else { playSound("combo"); flash("COMBO x" + d.cards.length + "!", "#fbbf24"); } const w = ckW(nh, v.pd, v.ch, v.cdr); if (w) { setTimeout(() => { setWin(w); playSound("win"); }, 100); setGs("gameover"); } return; } } doP(d.indices ? d.indices[0] : null); } setCombo([]); return; }
                if (d.type === "single" && d.card) { if (cp && (tgt === "center-left" || tgt === "center-right")) { const pl = tgt === "center-left" ? v.cL : v.cR; if (pl && isValidPlay(d.card.rank, pl.rank)) { if (tgt === "center-left") setCL(d.card); else setCR(d.card); if (d.idx >= 0 && d.idx < nh.length) nh[d.idx] = null; setPh(nh); doSlam(tgt); playSound("place"); const w = ckW(nh, v.pd, v.ch, v.cdr); if (w) { setTimeout(() => { setWin(w); playSound("win"); }, 100); setGs("gameover"); } } else doP(d.idx); } else { const ip = v.insP; if (ip !== null) { const card = nh[d.idx], from = d.idx; nh.splice(from, 1); const ins = ip > from ? ip - 1 : ip; if (ins >= 0 && ins <= nh.length) { nh.splice(ins, 0, card); setSlA({ from, to: ins, ss: Math.min(from, ins), se: Math.max(from, ins), a: false }); setPh([...nh]); playSound("swap"); requestAnimationFrame(() => requestAnimationFrame(() => { setSlA(p => p ? { ...p, a: true } : null); setTimeout(() => setSlA(null), 140); })); } } } }
            } catch (err) { console.error(err); }
        };
        window.addEventListener("mousemove", onM); window.addEventListener("mouseup", onU); return () => { window.removeEventListener("mousemove", onM); window.removeEventListener("mouseup", onU); };
    }, [flash, doSlam, doP, ckW]);

    const bD = (e, d, c) => { if (s.current.pen) return; const g = s.current.gs; if (!["ready", "playing", "stall"].includes(g)) return; e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); oR.current = { x: e.clientX - r.left, y: e.clientY - r.top }; dR.current = d; aR.current = true; setDrag(true); setDI(d); setGC(c); setGT(d.type); setGP({ x: r.left, y: r.top }); uR(); };
    const onCD = (e, i) => { if (e.button !== 0) return; const c = s.current.ph[i]; if (!c) return; const cb = s.current.combo; if (cb.length && cb.includes(i)) { const cs = cb.map(j => s.current.ph[j]).filter(Boolean); if (cs.length) bD(e, { type: "combo", indices: [...cb], cards: cs }, cs); } else { setCombo([]); bD(e, { type: "single", idx: i, card: c, src: "hand" }, [c]); } };
    const onDD = e => { if (e.button !== 0 || s.current.pd.length <= 0 || !s.current.ph.some(c => c === null)) return; bD(e, { type: "draw" }, []); };
    const onRD = e => { if (e.button !== 2) return; e.preventDefault(); if (s.current.combo.length) setCombo([]); else { rR.current = true; setCombo([]); } };

    const fanA = 7, handN = ph.length;
    const getFan = (i, n) => { const m = (n - 1) / 2; return { rot: (i - m) * fanA, ty: Math.abs(i - m) * 5 }; };

    return (
        <div
            style={{
                width: "100vw",
                minHeight: "100vh",
                position: "fixed",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px 16px 24px",
                overflowX: "hidden",
                overflowY: "auto",
                cursor: drag ? "grabbing" : "default",
                background: "#1a3a28",
                backgroundImage:
                    "radial-gradient(ellipse at 50% 55%, #2a6a3a 0%, #1a4a28 35%, #0a2a14 100%)",
            }}
        >

            {/* CRT / felt overlays */}
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 65%, transparent 30%, #041a0acc 100%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 0, opacity: 0.035, pointerEvents: "none", backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,#000 2px,#000 4px)" }} />

            <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}50%{transform:translateX(5px)}75%{transform:translateX(-3px)}}@keyframes popIn{0%{transform:scale(.5);opacity:0}100%{transform:scale(1);opacity:1}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}@keyframes glow{0%,100%{box-shadow:0 0 8px #fbbf24,0 0 16px #fbbf2444}50%{box-shadow:0 0 16px #fbbf24,0 0 32px #fbbf2466}}*{user-select:none!important;-webkit-user-select:none!important;-webkit-user-drag:none!important}`}</style>

            {/* Ghost */}
            {gP && <div style={{ position: "fixed", left: gP.x, top: gP.y, zIndex: 1000, pointerEvents: "none", transform: "scale(1.06) rotate(-2deg)", display: "flex", gap: 4, opacity: .9, filter: "drop-shadow(0 10px 20px #000a)" }}>{gT === "draw" ? <CardBack /> : gC.map((c, i) => c ? <CardFace key={i} rank={c.rank} suit={c.suit} /> : null)}</div>}
            {fb && <div style={{ position: "fixed", top: "32%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 999, fontSize: 36, fontWeight: 900, color: fb.c, textShadow: `0 0 24px ${fb.c}, 0 0 48px ${fb.c}66, 0 4px 0 #0008`, pointerEvents: "none", letterSpacing: 3, animation: "popIn .2s ease-out", ...pxf }}>{fb.m}</div>}
            {(gs === "countdown" || fCd !== null) && <div style={{ position: "absolute", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "#000a" }}><div style={{ fontSize: 100, fontWeight: 900, color: "#fbbf24", textShadow: "0 0 60px #fbbf24, 0 0 120px #fbbf2466, 0 6px 0 #000a", animation: "popIn .3s ease-out", ...pxf }}>{gs === "countdown" ? (cd > 0 ? cd : "GO!") : (fCd > 0 ? fCd : "FLIP!")}</div></div>}
            {win && <div style={{ position: "absolute", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#000b", gap: 28 }}>
                <div style={{ fontSize: 64, fontWeight: 900, color: "#fbbf24", textShadow: "0 0 40px #fbbf24, 0 6px 0 #000a", ...pxf }}>{win === "draw" ? "DRAW!" : "SPEED!"}</div>
                <div style={{ fontSize: 30, fontWeight: 900, color: win === "player" ? "#4ade80" : win === "draw" ? "#fbbf24" : "#f5365c", ...pxf }}>{win === "player" ? "YOU WIN!" : win === "draw" ? "NO MOVES LEFT" : "CPU WINS!"}</div>
                <button onClick={start} style={{ padding: "14px 44px", fontSize: 18, fontWeight: 900, cursor: "pointer", background: "linear-gradient(180deg,#fbbf24,#f59e0b)", color: "#1a1528", border: "3px solid #1a1528", borderRadius: 8, boxShadow: "0 6px 0 #92400e, 0 8px 16px #0006", ...pxf, letterSpacing: 3 }}>REMATCH</button>
            </div>}

            <div
                style={{
                    position: "relative",
                    zIndex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 16,
                    width: "100%",
                    maxWidth: 960,
                }}
            >

                {/* Opponent — same card size, no perspective shrink */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, opacity: .9 }}>
                    <div style={{ color: "#c4b5d8", fontSize: 13, letterSpacing: 4, fontWeight: 900, ...pxf }}>OPPONENT</div>
                    <PileStack count={cdr.length} label="draw" showLabel={false} />
                    <div style={{ display: "flex", gap: 8 }}>{ch.map((c, i) => <div key={i} style={{ transition: "all .15s", transform: cpuA?.idx === i ? "translateY(20px) scale(.8)" : "none", opacity: cpuA?.idx === i ? 0 : 1 }}>{c ? <CardBack /> : <div style={{ width: CARD_W, height: CARD_H, border: "2px dashed #4a3a6a33", borderRadius: 6 }} />}</div>)}</div>
                </div>

                {/* Spacer between opponent and center */}
                <div style={{ height: 16 }} />

                {/* Center area */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, padding: "20px 36px", borderRadius: 12, background: "#0002", border: "1px solid #ffffff08" }}>

                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        {gs === "stall" && <div style={{ fontSize: stT <= 3 ? 36 : 24, fontWeight: 900, color: stT <= 3 ? "#f5365c" : "#6aaa7a", textShadow: stT <= 3 ? "0 0 16px #f5365c" : "0 2px 4px #0006", animation: stT <= 3 ? "pulse .5s infinite" : "none", width: 44, textAlign: "center", ...pxf }}>{stT}</div>}
                        <div style={{ position: "relative" }}>
                            <PileStack count={fl.length} w={CARD_W} h={CARD_H} label="flip" showLabel={gs === "stall"} pulseLabel={gs === "stall" && !cF} />
                            {gs === "stall" && cF && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#000a", borderRadius: 6 }}><div style={{ fontSize: 20, color: "#4ade80", ...pxf }}>✓</div></div>}
                            {gs === "stall" && !cF && fl.length > 0 && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#0008", borderRadius: 6, animation: "pulse 2s infinite" }}><div style={{ fontSize: 11, color: "#fbbf24", opacity: .6, ...pxf }}>...</div></div>}
                        </div>
                    </div>

                    <div data-drop="center-left" style={{ padding: 8, borderRadius: 10, background: slam === "center-left" ? "#fbbf2422" : drag ? "#fff06" : "transparent", border: drag ? "2px dashed #4a9a5a55" : "2px solid transparent", position: "relative" }}>
                        {cL && rev ? <CenterPile card={cL} history={cLH} rot={sR.l} slamming={slam === "center-left"} />
                            : <div style={{ position: "relative" }}><CardBack w={96} h={136} />
                                {gs === "ready" && cRdy && <div style={{ position: "absolute", inset: -6, borderRadius: 10, border: "3px solid #4ade80", boxShadow: "0 0 12px #4ade8066", pointerEvents: "none" }} />}
                            </div>}
                        {gs === "ready" && !rev && <div style={{ position: "absolute", bottom: -28, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
                            {cRdy ? <div style={{ fontSize: 12, fontWeight: 900, color: "#4ade80", textShadow: "0 0 8px #4ade8088", letterSpacing: 3, ...pxf }}>READY ✓</div>
                                : <div style={{ fontSize: 11, fontWeight: 900, color: "#6aaa7a", letterSpacing: 3, animation: "pulse 2s infinite", ...pxf }}>WAITING...</div>}
                        </div>}
                    </div>

                    <div data-drop="center-right" onClick={() => { if (gs === "ready" && !pRdy) { setPRdy(true); playSound("ready"); } }} style={{ padding: 8, borderRadius: 10, background: slam === "center-right" ? "#fbbf2422" : drag ? "#fff06" : "transparent", border: drag ? "2px dashed #4a9a5a55" : "2px solid transparent", cursor: gs === "ready" && !pRdy ? "pointer" : "default", position: "relative" }}>
                        {cR && rev ? <CenterPile card={cR} history={cRH} rot={sR.r} slamming={slam === "center-right"} />
                            : <div style={{ position: "relative" }}>
                                <CardBack w={96} h={136} />
                                {gs === "ready" && !pRdy && <div style={{ position: "absolute", inset: -6, borderRadius: 10, border: "3px solid #fbbf24", boxShadow: "0 0 16px #fbbf24, 0 0 32px #fbbf2444", animation: "glow 1.5s infinite", pointerEvents: "none" }} />}
                            </div>}
                        {gs === "ready" && !rev && <div style={{ position: "absolute", bottom: -28, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
                            {!pRdy ? <div style={{ fontSize: 14, fontWeight: 900, color: "#fbbf24", textShadow: "0 0 10px #fbbf2488", letterSpacing: 3, animation: "pulse 1.5s infinite", cursor: "pointer", ...pxf }}>CLICK TO READY</div>
                                : <div style={{ fontSize: 12, fontWeight: 900, color: "#4ade80", textShadow: "0 0 8px #4ade8088", letterSpacing: 3, ...pxf }}>READY ✓</div>}
                        </div>}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div onClick={() => { if (gs === "stall" && !pF) { setPF(true); playSound("ready"); } }} style={{ cursor: gs === "stall" && !pF ? "pointer" : "default", position: "relative" }}>
                            <PileStack count={fr.length} w={CARD_W} h={CARD_H} label="flip" showLabel={gs === "stall"} pulseLabel={gs === "stall" && !pF} />
                            {gs === "stall" && !pF && fr.length > 0 && <div style={{ position: "absolute", inset: -5, borderRadius: 8, border: "3px solid #fbbf24", animation: "glow 1s infinite", display: "flex", alignItems: "center", justifyContent: "center", background: "#000a", cursor: "pointer" }}><div style={{ fontSize: 14, fontWeight: 900, color: "#fbbf24", ...pxf }}>FLIP?</div></div>}
                            {gs === "stall" && pF && <div style={{ position: "absolute", inset: -5, borderRadius: 8, border: "3px solid #4ade80", boxShadow: "0 0 12px #4ade80", display: "flex", alignItems: "center", justifyContent: "center", background: "#000a" }}><div style={{ fontSize: 20, color: "#4ade80", ...pxf }}>✓</div></div>}
                        </div>
                        {gs === "stall" && <div style={{ fontSize: stT <= 3 ? 36 : 24, fontWeight: 900, color: stT <= 3 ? "#f5365c" : "#6aaa7a", textShadow: stT <= 3 ? "0 0 16px #f5365c" : "0 2px 4px #0006", animation: stT <= 3 ? "pulse .5s infinite" : "none", width: 44, textAlign: "center", ...pxf }}>{stT}</div>}
                    </div>
                </div>

                {/* Player hand — fanned */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, marginTop: 16 }}>
                    <div onMouseDown={onRD} style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", minHeight: CARD_H + 50 }}>
                        {ph.map((c, i) => {
                            const dg = (dI?.type === "single" && dI?.idx === i) || (dI?.type === "combo" && dI?.indices?.includes(i));
                            const sel = combo.includes(i); const sI = insP === i; const sIAfter = i === ph.length - 1 && insP === ph.length;
                            const { rot: fR2, ty: fY } = getFan(i, handN);
                            let sO = 0, sh = false;
                            if (slA && !slA.a) { if (slA.from < slA.to && i >= slA.ss && i < slA.se && i !== slA.to) { sO = CARD_W + 12; sh = true; } else if (slA.from > slA.to && i > slA.ss && i <= slA.se && i !== slA.to) { sO = -(CARD_W + 12); sh = true; } }
                            return (<div key={i} style={{ display: "flex", alignItems: "flex-end", position: "relative" }}>
                                {sI && <div style={{ position: "absolute", left: -6, top: "15%", bottom: "15%", width: 5, background: "#fbbf24", borderRadius: 3, boxShadow: "0 0 12px #fbbf24, 0 0 24px #fbbf2466", zIndex: 20 }} />}
                                <div data-drop={`slot-${i}`} data-hi={i} onMouseDown={e => { if (e.button === 0 && c) onCD(e, i); }}
                                    style={{
                                        transform: `rotate(${fR2}deg) translateY(${sel && !drag ? fY - 16 : fY}px)${sh ? ` translateX(${sO}px)` : ""}`,
                                        transition: slA?.a && sh ? "transform .12s ease-out" : sh ? "none" : "transform .15s",
                                        cursor: c ? "grab" : "default", position: "relative", animation: penC === i ? "shake .25s" : "none",
                                        zIndex: dg ? 0 : sh ? 5 : sel ? 10 : 1, margin: "0 -6px", transformOrigin: "center bottom"
                                    }}>
                                    {c ? (<><CardFace rank={c.rank} suit={c.suit} selected={sel} dim={dg} />
                                        {penC === i && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 10 }}><div style={{ fontSize: 48, fontWeight: 900, color: "#f5365c", textShadow: "0 0 14px #f5365c", ...pxf }}>✕</div></div>}</>)
                                        : (<div style={{ width: CARD_W, height: CARD_H, border: "2px dashed #4a8a5a", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(74,138,90,0.06)" }}><span style={{ color: "#4a8a5a", fontSize: 22, fontWeight: 900 }}>+</span></div>)}
                                </div>
                                {sIAfter && <div style={{ position: "absolute", right: -6, top: "15%", bottom: "15%", width: 5, background: "#fbbf24", borderRadius: 3, boxShadow: "0 0 12px #fbbf24, 0 0 24px #fbbf2466", zIndex: 20 }} />}
                            </div>);
                        })}
                    </div>
                    {/* Draw pile underneath hand */}
                    <div onMouseDown={onDD} style={{ cursor: pd.length ? "grab" : "default" }}>
                        <PileStack count={pd.length} label="draw" showLabel={ph.some(c => c === null) && pd.length > 0} pulseLabel={ph.some(c => c === null) && pd.length > 0} />
                    </div>
                </div>
            </div>
        </div>
    );
}
