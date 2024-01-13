import { join, resolve } from 'path';
import type { Config } from 'tailwindcss';

import tailwindcssAnimate from 'tailwindcss-animate';

const content = [
  resolve(join(__dirname, '..', '..', '{apps,packages}', '*', 'index.html')),
  resolve(join(__dirname, '..', '..', '{apps,packages}', '*', 'src', '**', '*.{js,ts,jsx,tsx}')),
];

const config: Config = {
  content,
  plugins: [tailwindcssAnimate],
};

export default config;
