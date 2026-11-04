"use client";
import { useId } from "react";
export default function Scene({
  kind = "coast",
  progress = 0,
  flow = 0,
  mini = false,
}: {
  kind?: string;
  progress?: number;
  flow?: number;
  mini?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <div
      className={`scene scene-${kind} ${mini ? "scene-mini" : ""}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1200 650"
        preserveAspectRatio="xMidYMid slice"
        role="presentation"
      >
        <defs>
          <linearGradient id={`${id}-sky`} x2=".2" y2="1">
            <stop stopColor={kind === "ascent" ? "#394d52" : "#283a3d"} />
            <stop offset=".55" stopColor="#627272" />
            <stop offset="1" stopColor="#c1c1a5" />
          </linearGradient>
          <linearGradient id={`${id}-sea`} x2="0" y2="1">
            <stop stopColor="#617b79" />
            <stop offset="1" stopColor="#162e31" />
          </linearGradient>
          <linearGradient id={`${id}-rock`} x2=".8" y2="1">
            <stop stopColor="#34433d" />
            <stop offset="1" stopColor="#101d20" />
          </linearGradient>
          <linearGradient id={`${id}-beam`}>
            <stop stopColor="#ffedba" stopOpacity=".7" />
            <stop offset="1" stopColor="#fff0bb" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`${id}-glow`}>
            <stop stopColor="#fff4c3" stopOpacity=".65" />
            <stop offset="1" stopColor="#ffdf88" stopOpacity="0" />
          </radialGradient>
          <filter id={`${id}-mist`}>
            <feGaussianBlur stdDeviation="13" />
          </filter>
          <pattern
            id={`${id}-rain`}
            width="53"
            height="79"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(22)"
          >
            <path
              d="M12 0v18M39 49v12"
              stroke="#d2e2d9"
              strokeWidth=".65"
              opacity=".28"
            />
          </pattern>
          <filter id={`${id}-grain`}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency=".7"
              numOctaves="3"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope=".075" />
            </feComponentTransfer>
            <feBlend in="SourceGraphic" mode="soft-light" />
          </filter>
        </defs>
        <rect width="1200" height="650" fill={`url(#${id}-sky)`} />
        <g fill="#b6b9a7" opacity=".16" filter={`url(#${id}-mist)`}>
          <ellipse cx="190" cy="126" rx="360" ry="38" />
          <ellipse cx="970" cy="200" rx="320" ry="23" />
          <ellipse cx="720" cy="75" rx="460" ry="30" />
        </g>
        {kind === "ascent" ? (
          <>
            <path
              d="M0 470L170 245l89 68L480 73l174 212 100-141 220 236 116-142 110 102v310H0Z"
              fill="#647a7c"
            />
            <path
              d="M258 313L480 73l174 212-117-66-48 18-30-48-50 71-40-4-38 58-33-20Z"
              fill="#cbd3c8"
            />
            <path
              d="M600 409l154-265 220 236-108-77-65-101-36 73-21-18-48 110Z"
              fill="#bdcbc4"
            />
            <path
              d="M0 650V488L215 382l172 90 196-133 161 87 230-101 226 106v219Z"
              fill="#2e454a"
            />
            <path
              d="M0 650l324-131 110 16 188-111 168 61 176-62 234 107v120Z"
              fill="#24373b"
            />
            <path
              className="ascent-rope"
              d="M520 405l50-45 40-6 35-55 52-15 27-45 36-19"
              stroke="#c3ab78"
              fill="none"
              strokeDasharray="4 8"
              opacity=".75"
            />
            <g
              className="climber"
              style={{
                transform: `translate(${550 + progress * 210}px,${360 - progress * 140}px)`,
              }}
              fill="#e8c078"
            >
              <circle cy="-15" r="5" />
              <path
                d="M-4-8h9l4 18H-7ZM-3 10l-5 15M3 10l7 13"
                stroke="#e8c078"
                strokeWidth="4"
              />
            </g>
            <g fill="#c6d5d0" opacity=".4">
              {Array.from({ length: 45 }, (_, i) => (
                <circle
                  key={i}
                  cx={(i * 137) % 1200}
                  cy={(i * 83) % 650}
                  r={(i % 3) + 1}
                />
              ))}
            </g>
          </>
        ) : (
          <>
            <path
              d="M0 350l140-39 87 15 143-35 91 33 143-43 110 50 107-22 80 33 161-33 138 39v76H0Z"
              fill="#6a8080"
              opacity=".6"
            />
            <path
              d="M0 393l180-38 113 19 106-21 92 34 157-28 159 23 128-15 143 31 122-15v91H0Z"
              fill="#627d7d"
              opacity=".6"
            />
            <path
              d="M0 410q300 380 600 409t1200 393v650h0z"
              fill={`url(#${id}-sea)`}
            />
            <g fill="none" stroke="#a6c0b2" strokeWidth="1.3" opacity=".32">
              {Array.from({ length: 26 }, (_, i) => (
                <path
                  key={i}
                  d={`M${((i * 127) % 1200) - 90} ${420 + i * 9}q75 -12 145 -2t170 0`}
                />
              ))}
            </g>
            <path
              d="M0 650V499l100-10 70-40 64 8 45-64 53-23 23-90 52-25 71 45 41 36 27 74 60 22 41 76 93 58 71 84Z"
              fill={`url(#${id}-rock)`}
            />
            <path
              d="M0 499l100-10 70-40 64 8 45-64 53-23 23-90 52-25 71 45 41 36-103-25-37 24-34-5-37 83-48 17-45 43-53 4-47 30Z"
              fill="#4b5b4c"
            />
            <g stroke="#6c7662" fill="none" opacity=".35">
              <path d="M330 380l-39 105-77 61-24 104M406 334l-23 137 57 59 37 120M456 330l5 98 63 70M340 470l37 37 12 143M120 528l-46 122" />
              <path d="M550 480l-55 46 106 124" />
            </g>
            <path
              d="M352 312l27-19 36 10 26-5 27 15"
              fill="none"
              stroke="#aaa18a"
              strokeWidth="2"
              opacity=".6"
            />
            <g transform="translate(394 157)">
              <path d="M-25 145h62L22 30H-10Z" fill="#d1cab0" />
              <path d="M12 35h10l15 110H12Z" fill="#929b89" />
              <path d="M-10 30h32L30 1H-17Z" fill="#a6aa92" />
              <path d="M-20 1h53v-7L7-21Z" fill="#243735" />
              <rect x="-15" y="2" width="42" height="27" fill="#d4bb78" />
              <g stroke="#3c4c42" strokeWidth="3">
                <path d="M-14 1v28M0 1v28M13 1v28M27 1v28" />
              </g>
              <path d="M-19 30h51M-22 33h57" stroke="#4a5c4e" strokeWidth="3" />
              <path d="M1 124h12v21H1Z" fill="#273b34" />
              <path d="M3 62h7v12H3ZM3 92h7v12H3Z" fill="#5d6a58" />
              <path d="M-21 142h54v8h-54Z" fill="#a2a28b" />
              <path d="M-39 150v-8l-27-17h-42l-15 16v18h84Z" fill="#a2a68d" />
              <path d="M-126 142l20-24h44l26 24Z" fill="#35453e" />
              <rect x="-99" y="143" width="10" height="10" fill="#d4b673" />
              <circle cx="7" cy="16" r="65" fill={`url(#${id}-glow)`} />
            </g>
            <g
              className="lighthouse-beam"
              style={{ opacity: 0.45 + progress * 0.5 + flow / 400 }}
            >
              <path d="M400 170L1170 33v307Z" fill={`url(#${id}-beam)`} />
              <path
                d="M398 170L0 107v135Z"
                fill={`url(#${id}-beam)`}
                opacity=".35"
              />
            </g>
            <g
              className="ship"
              style={{
                transform: `translate(${950 - progress * 360}px, ${443 - progress * 18}px)`,
              }}
            >
              <path d="M-48 0h93L30 17h-60Z" fill="#182f31" />
              <path d="M-19-12h37V0h-37Z" fill="#a2ac99" />
              <path d="M-9-23h17v11H-9Z" fill="#9eaa98" />
              <path d="M0-42v19M-26-4v-17" stroke="#263e3d" strokeWidth="2" />
              <rect x="1" y="-20" width="4" height="4" fill="#ffd995" />
              <path
                d="M-53 20q44 5 91 0"
                stroke="#a1bbb0"
                fill="none"
                opacity=".5"
              />
            </g>
            <g fill="#0e2023">
              <path d="M0 650v-75l89 4 38 35 99 36ZM1000 650l59-47 55-7 43-37 43 8v83Z" />
            </g>
            <g fill="none" stroke="#283a39" strokeWidth="2" opacity=".7">
              <path d="M699 119q7-6 14 0 7-6 14 0M765 143q6-5 12 0 6-5 12 0M739 102q4-4 8 0 4-4 8 0" />
            </g>
            <rect
              className="rain-layer"
              width="1200"
              height="740"
              y="-80"
              fill={`url(#${id}-rain)`}
            />
          </>
        )}
      </svg>
      <div className="scene-shade" />
    </div>
  );
}
