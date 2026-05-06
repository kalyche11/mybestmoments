import { mkdir, writeFile } from 'node:fs/promises'

await mkdir('dist', { recursive: true })
await writeFile('dist/_redirects', '/* /index.html 200\n')
