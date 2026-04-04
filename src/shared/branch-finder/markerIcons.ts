import L from 'leaflet'

const BASE_ICON_SIZE: [number, number] = [32, 42]

function svgToDataUrl(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function createPinSvg(opts: { fill: string; stroke: string; dot: string }) {
  const { fill, stroke, dot } = opts

  // NOTE(map-marker): Simple pin with a center dot. Uses brand colors.
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42" fill="none">
      <path d="M16 41C16 41 29 27.6 29 16C29 8.268 23.18 2 16 2C8.82 2 3 8.268 3 16C3 27.6 16 41 16 41Z"
        fill="${fill}" stroke="${stroke}" stroke-width="2" />
      <circle cx="16" cy="16" r="5.5" fill="${dot}" />
    </svg>
  `.trim()
}

function createIcon(svg: string) {
  return new L.Icon({
    iconUrl: svgToDataUrl(svg),
    iconSize: BASE_ICON_SIZE,
    iconAnchor: [16, 41],
    popupAnchor: [0, -34],
    tooltipAnchor: [16, -28],
  })
}

const defaultIcon = createIcon(
  // Default: neutral gray with dark border.
  createPinSvg({ fill: '#e2e8f0', stroke: '#0a1628', dot: '#64748b' }),
)

const selectedIcon = createIcon(
  // Selected: brand green with gold border.
  createPinSvg({ fill: '#0d4d56', stroke: '#d4af37', dot: '#fefdfb' }),
)

export function getBranchMarkerIcon(isSelected: boolean) {
  return isSelected ? selectedIcon : defaultIcon
}
