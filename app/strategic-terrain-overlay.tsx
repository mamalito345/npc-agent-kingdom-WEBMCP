export default function StrategicTerrainOverlay() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1536 1024"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="forest-hatch"
          width="18"
          height="18"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M9 1 L4 11 H14 Z"
            fill="rgba(36,67,46,0.15)"
          />
        </pattern>

        <pattern
          id="mountain-hatch"
          width="26"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M2 18 L12 3 L22 18"
            fill="none"
            stroke="rgba(90,78,63,0.20)"
            strokeWidth="2"
          />
        </pattern>

        <pattern
          id="dune-hatch"
          width="30"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 12 Q8 5 16 12 T32 12"
            fill="none"
            stroke="rgba(140,99,47,0.15)"
            strokeWidth="2"
          />
        </pattern>
      </defs>

      <path
        d="M0 0 H1536 V292 C1300 270 1120 305 930 285 C720 260 540 310 350 275 C210 250 110 270 0 255 Z"
        fill="rgba(195,219,230,0.12)"
      />

      <path
        d="M0 250 C180 235 340 270 520 345 L500 650 C335 690 160 650 0 610 Z"
        fill="rgba(40,78,50,0.13)"
      />

      <path
        d="M0 250 C180 235 340 270 520 345 L500 650 C335 690 160 650 0 610 Z"
        fill="url(#forest-hatch)"
      />

      <path
        d="M455 285 C680 250 840 285 1015 300 L1010 610 C835 640 635 625 490 600 Z"
        fill="rgba(119,139,74,0.08)"
      />

      <path
        d="M980 260 C1190 230 1370 255 1536 315 V610 C1370 625 1180 620 1010 585 Z"
        fill="rgba(129,151,84,0.07)"
      />

      <path
        d="M0 585 C220 570 430 620 610 590 C800 565 990 590 1170 565 C1325 545 1440 575 1536 600 V1024 H0 Z"
        fill="rgba(173,117,56,0.10)"
      />

      <path
        d="M0 585 C220 570 430 620 610 590 C800 565 990 590 1170 565 C1325 545 1440 575 1536 600 V1024 H0 Z"
        fill="url(#dune-hatch)"
      />

      <path
        d="M420 245 C610 215 770 235 910 230 C1060 225 1180 255 1340 245 L1390 305 C1190 292 1040 300 900 300 C700 300 560 305 405 320 Z"
        fill="url(#mountain-hatch)"
      />

      <path
        d="M470 565 C650 535 820 545 990 540 C1120 535 1230 550 1320 570 L1290 635 C1130 610 985 610 840 625 C680 640 560 630 455 620 Z"
        fill="url(#mountain-hatch)"
      />
    </svg>
  );
}
