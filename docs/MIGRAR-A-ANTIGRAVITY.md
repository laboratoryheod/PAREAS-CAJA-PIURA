# Cómo pasar el proyecto a Google Antigravity

El proyecto ya trae lo que Antigravity lee al abrirlo:
- `AGENTS.md` en la raíz: contexto general y reglas que no se rompen.
- `.agents/rules/`: reglas de negocio, diseño y asistente.
- `.agents/workflows/`: `/levantar` y `/verificar` (se invocan en el panel del agente como comandos).
- `.agents/skills/`: skills de diseño traídas de cult-ui.

## Pasos
1. **Instala Antigravity** desde la web oficial de Google e inicia sesión.
2. **Trae el código** (elige una):
   - Desde GitHub: en Antigravity elige *Clone repository* y pega `https://github.com/laboratoryheod/PAREAS-CAJA-PIURA`. Luego cambia a la rama `claude/dreamy-hamilton-fz0ouj` (o a `main` si ya se fusionó).
   - Desde tu PC: `git clone https://github.com/laboratoryheod/PAREAS-CAJA-PIURA.git`, `git checkout claude/dreamy-hamilton-fz0ouj` y en Antigravity *Open Folder*.
3. **Instala y levanta**: en la terminal integrada, `npm install`, `npm run seed` y `npm run dev`. O pídele al agente: `/levantar`.
4. **Variables (opcional)**: copia `.env.example` a `.env.local` y pon `GEMINI_API_KEY` si quieren que Pareas use Gemini. Sin clave, Pareas responde con su FAQ.
5. **Comprueba que leyó las reglas**: pregúntale al agente "¿qué reglas tiene este proyecto sobre el CHICOTAZO y los iconos?". Debe citar `AGENTS.md` y `.agents/rules/`.

## Notas
- Requisitos: Node 20 o superior. `better-sqlite3` se compila al instalar; si falla en Windows, instala las "Build Tools" de Visual Studio o usa WSL.
- No hace falta subir `node_modules`, `.next` ni `data/ponte.db` (están en `.gitignore`; la base se recrea sola).
- Si Antigravity no carga `AGENTS.md`, actualízalo a una versión reciente o copia su contenido a `.agents/rules/proyecto.md`.
