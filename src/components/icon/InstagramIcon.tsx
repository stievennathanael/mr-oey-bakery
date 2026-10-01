import React from 'react'

interface InstagramIconProps {
  size?: number
  className?: string
}

export const InstagramIcon = ({
  size = 26,
  className = '',
}: InstagramIconProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="6"
        fill="url(#instagramGradient1)"
      />

      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="6"
        fill="url(#instagramGradient2)"
      />

      <rect
        x="2"
        y="2"
        width="28"
        height="28"
        rx="6"
        fill="url(#instagramGradient3)"
      />

      <path
        d="M23 10.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"
        fill="#fff"
      />

      <path
        fill="#fff"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16 21a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
      />

      <path
        fill="#fff"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.6 6h.8c3.36 0 5.04 0 6.324.654a6 6 0 0 1 2.622 2.622C26 10.56 26 12.24 26 15.6v.8c0 3.36 0 5.04-.654 6.324a6 6 0 0 1-2.622 2.622C21.44 26 19.76 26 16.4 26h-.8c-3.36 0-5.04 0-6.324-.654a6 6 0 0 1-2.622-2.622C6 21.44 6 19.76 6 16.4v-.8c0-3.36 0-5.04.654-6.324a6 6 0 0 1 2.622-2.622C10.56 6 12.24 6 15.6 6Zm.8 2h-.8c-1.713 0-2.878.002-3.778.075-.877.072-1.325.202-1.638.361a4 4 0 0 0-1.748 1.748c-.159.313-.289.761-.361 1.638C8.002 12.722 8 13.887 8 15.6v.8c0 1.713.002 2.878.075 3.778.072.877.202 1.325.361 1.638a4 4 0 0 0 1.748 1.748c.313.159.761.289 1.638.361.9.073 2.065.075 3.778.075h.8c1.713 0 2.878-.002 3.778-.075.877-.072 1.325-.202 1.638-.361a4 4 0 0 0 1.748-1.748c.159-.313.289-.761.361-1.638.073-.9.075-2.065.075-3.778v-.8c0-1.713-.002-2.878-.075-3.778-.072-.877-.202-1.325-.361-1.638a4 4 0 0 0-1.748-1.748c-.313-.159-.761-.289-1.638-.361C19.278 8.002 18.113 8 16.4 8Z"
      />

      <defs>
        <radialGradient
          id="instagramGradient1"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(12 23) rotate(-55.4) scale(25.5)"
        >
          <stop stopColor="#B13589" />
          <stop offset="0.79" stopColor="#C62F94" />
          <stop offset="1" stopColor="#8A3AC8" />
        </radialGradient>

        <radialGradient
          id="instagramGradient2"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(11 31) rotate(-65) scale(22.6)"
        >
          <stop stopColor="#E0E8B7" />
          <stop offset="0.44" stopColor="#FB8A2E" />
          <stop offset="0.71" stopColor="#E2425C" />
          <stop offset="1" stopColor="#E2425C" stopOpacity="0" />
        </radialGradient>

        <radialGradient
          id="instagramGradient3"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(.5 3) rotate(-8) scale(38.9 8.3)"
        >
          <stop offset="0.15" stopColor="#406ADC" />
          <stop offset="0.47" stopColor="#6A45BE" />
          <stop offset="1" stopColor="#6A45BE" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  )
}