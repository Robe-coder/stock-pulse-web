# 💎 Stock Pulse — Hidden Gems Analyzer

Aplicación de análisis de stocks para swing trading con detección de beneficiarios de segundo orden.

## Cómo funciona

1. **Análisis macro** — Escanea tendencias globales (aranceles, regulaciones, tech, geopolítica)
2. **Descarta obvias** — Mega-caps como NVDA, AAPL ya están priced-in
3. **Encuentra hidden gems** — Proveedores, partners, cadena de valor (small/mid-cap)
4. **Verifica** — Precios reales, catalizadores, opiniones de expertos
5. **Tracking** — Monitorea predicciones y calibra la precisión de la IA

## Setup

```bash
# 1. Instalar dependencias
npm install

# 2. Ejecutar en desarrollo
npm run dev

# 3. Abrir http://localhost:3000
```

## API Key

Necesitas una API key de Anthropic con acceso a Claude Sonnet:
1. Ve a [console.anthropic.com](https://console.anthropic.com/settings/keys)
2. Crea una key
3. Pégala en la app al abrir

La key se guarda en localStorage (solo en tu navegador, no se envía a ningún sitio excepto la API de Anthropic).

## Desplegar

```bash
# Build para producción
npm run build

# Los archivos quedan en /dist — subir a Vercel, Netlify, o cualquier hosting estático
```

### Vercel (más fácil)
1. Sube a GitHub
2. Ve a [vercel.com](https://vercel.com)
3. Importa el repo
4. Deploy automático

## Estructura

```
stock-pulse/
├── package.json
├── vite.config.js
├── index.html
├── src/
│   ├── main.jsx        # Entry point
│   └── App.jsx         # Componente principal (toda la app)
├── .gitignore
└── README.md
```

## Tech Stack

- React 18
- Vite
- Anthropic Claude API (Sonnet) con web search
- localStorage para persistencia
- CSS-in-JS (estilos inline)

## Disclaimer

⚠️ No es asesoría financiera. Herramienta de análisis con datos públicos. Siempre verifica en tu broker antes de operar.
