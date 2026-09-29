// Logo affiché dans l'app (Navbar, Footer) — identique au dessin de l'icône
// de l'application (sac aux couleurs ivoiriennes), pour une identité visuelle
// cohérente entre l'icône du téléphone et l'intérieur de l'app.
export default function AppLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 192 192" className="shrink-0">
      <rect width="192" height="192" rx="42" fill="#14283A" />
      <path d="M 67 78 L 67 64 C 67 53 74 44 82 44" fill="none" stroke="#EDE4D3" strokeWidth="7.5" strokeLinecap="round" />
      <path d="M 125 78 L 125 64 C 125 53 118 44 110 44" fill="none" stroke="#EDE4D3" strokeWidth="7.5" strokeLinecap="round" />
      <defs>
        <clipPath id="applogo-bagclip">
          <path d="M 44 75 L 148 75 L 139 148 C 138 155 132 160 125 160 L 67 160 C 60 160 54 155 53 148 Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#applogo-bagclip)">
        <rect x="44" y="75" width="35" height="90" fill="#F77F00" />
        <rect x="79" y="75" width="35" height="90" fill="#FFFFFF" />
        <rect x="114" y="75" width="35" height="90" fill="#009E60" />
      </g>
      <path d="M 44 75 L 148 75 L 139 148 C 138 155 132 160 125 160 L 67 160 C 60 160 54 155 53 148 Z" fill="none" stroke="#14283A" strokeWidth="3.2" />
    </svg>
  );
}
