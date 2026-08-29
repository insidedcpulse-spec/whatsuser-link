from pathlib import Path

def generate_hero_svg(output_path: Path, icon_type: str = "message", title: str = ""):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Diferentes grafismos baseados no tipo de conteúdo
    icons = {
        "message": """
            <rect x="520" y="240" width="160" height="110" rx="24" fill="#ffffff" opacity="0.95"/>
            <path d="M540 350 L520 380 L570 350 Z" fill="#ffffff" opacity="0.95"/>
            <circle cx="560" cy="295" r="10" fill="#25D366"/>
            <circle cx="600" cy="295" r="10" fill="#25D366"/>
            <circle cx="640" cy="295" r="10" fill="#25D366"/>
        """,
        "tiktok": """
            <rect x="500" y="220" width="200" height="150" rx="30" fill="#000000" opacity="0.8"/>
            <path d="M620 250 c5 15 18 25 35 25 v25 c-15 0-28-5-35-12 v60 c0 30-25 50-50 50 s-50-20-50-50 25-50 50-50 c5 0 10 1 15 2 v25 c-5-2-10-2-15-2 -15 0-25 10-25 25 s10 25 25 25 25-10 25-25 v-115 h25 z" fill="#25D366"/>
        """,
        "shopping": """
            <rect x="500" y="230" width="200" height="140" rx="20" fill="#ffffff" opacity="0.95"/>
            <path d="M550 230 c0-30 20-50 50-50 s50 20 50 50" fill="none" stroke="#25D366" stroke-width="12" stroke-linecap="round"/>
            <circle cx="560" cy="390" r="15" fill="#ffffff"/>
            <circle cx="640" cy="390" r="15" fill="#ffffff"/>
            <path d="M570 290 h60 M600 260 v60" stroke="#075E54" stroke-width="8" stroke-linecap="round"/>
        """,
        "shield": """
            <path d="M600 200 L680 240 v80 c0 60-40 100-80 120 -40-20-80-60-80-120 v-80 Z" fill="#ffffff" opacity="0.95"/>
            <path d="M570 310 L590 330 L635 280" fill="none" stroke="#25D366" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
        """,
        "users": """
            <circle cx="550" cy="270" r="35" fill="#ffffff" opacity="0.95"/>
            <path d="M490 370 c0-35 30-60 60-60 s60 25 60 60 Z" fill="#ffffff" opacity="0.95"/>
            <circle cx="650" cy="270" r="35" fill="#25D366" opacity="0.95"/>
            <path d="M590 370 c0-35 30-60 60-60 s60 25 60 60 Z" fill="#25D366" opacity="0.95"/>
        """
    }
    
    icon_svg = icons.get(icon_type, icons["message"])
    
    svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" role="img" aria-hidden="true">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#075E54"/>
      <stop offset="50%" stop-color="#128C7E"/>
      <stop offset="100%" stop-color="#25D366"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  
  <!-- Background with Depth -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="600" cy="315" r="450" fill="url(#glow)"/>
  
  <!-- Decorative Modern Geometry -->
  <circle cx="1050" cy="120" r="280" fill="#ffffff" opacity="0.04"/>
  <circle cx="150" cy="530" r="220" fill="#ffffff" opacity="0.04"/>
  <rect x="90" y="80" width="80" height="80" rx="18" fill="#ffffff" opacity="0.06"/>
  <rect x="1020" y="470" width="100" height="100" rx="24" fill="#ffffff" opacity="0.06"/>
  
  <!-- Center Glow Backplate -->
  <circle cx="600" cy="310" r="160" fill="#000000" opacity="0.15"/>
  
  <!-- Content Graphic -->
  <g transform="translate(0, 0)">
    {icon_svg}
  </g>
</svg>"""
    
    output_path.write_text(svg_content, encoding="utf-8")
    return output_path
