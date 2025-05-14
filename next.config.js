/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.module.rules.push({
      test: /test\/.*\.js$/,
      use: 'null-loader'
    });

    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: [{
        loader: '@svgr/webpack',
        options: {
          // Opzionale: configurazioni per SVGR
          // Ad esempio, per preservare il colore originale degli SVG e poterlo modificare con CSS/Tailwind:
          // icon: true, // Rende l'SVG più flessibile per lo styling (es. usa currentColor)
          // svgoConfig: {
          //   plugins: [
          //     { 
          //       name: 'preset-default',
          //       params: {
          //         overrides: { removeViewBox: false },
          //       },
          //     },
          //     { name: 'removeAttrs', params: { attrs: '(fill|stroke)' } } // Rimuove fill/stroke per permettere lo styling con CSS
          //   ]
          // }
        }
      }],
    });

    return config;
  }
};

module.exports = nextConfig; 