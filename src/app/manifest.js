export default function manifest() {
    return {
      name: 'OnDot Next App',
      short_name: 'OnDot Next',
      description: 'A Web App to track attendance of Vidya Academy students',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#000000',
      icons: [
        {
          src: '/OnDotNext.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/OnDotNext.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    }
  }