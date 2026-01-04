import { defineConfig } from 'tsup';
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Função para copiar templates HTML
function copyTemplates() {
  const templatesSrc = join(process.cwd(), 'src', 'server', 'templates');
  const templatesDest = join(process.cwd(), 'dist', 'server', 'templates');
  
  if (existsSync(templatesSrc)) {
    // Cria o diretório de destino se não existir
    if (!existsSync(templatesDest)) {
      mkdirSync(templatesDest, { recursive: true });
    }
    
    // Copia todos os arquivos HTML
    const files = readdirSync(templatesSrc);
    files.forEach(file => {
      const srcPath = join(templatesSrc, file);
      const destPath = join(templatesDest, file);
      
      if (statSync(srcPath).isFile() && file.endsWith('.html')) {
        copyFileSync(srcPath, destPath);
        console.log(`✓ Copiado: ${file}`);
      }
    });
    
    console.log('[tsup] Templates HTML copiados com sucesso!');
  }
}

export default defineConfig({
  entry: ['src/**/*.ts'],
  format: ['cjs'],
  target: 'es2020',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  onSuccess: () => {
    // Copia os templates HTML após o build
    copyTemplates();
  },
});

