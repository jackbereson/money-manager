import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return { name: 'Sổ Thu Chi — Money Quest', short_name: 'Sổ Thu Chi', description: 'Thu chi gọn gàng, mỗi ngày lên một cấp.', lang: 'vi', start_url: '/', scope: '/', display: 'standalone', background_color: '#f5f6ff', theme_color: '#23b9db', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }] };
}
