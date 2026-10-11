// Libera el puerto (por defecto 3000) cerrando lo que esté escuchando ahí y levanta la app en modo desarrollo.
// Uso: npm run levantar            · otro puerto: npm run levantar -- 3001
// Funciona en Windows, macOS y Linux. Solo cierra el proceso que ocupa ESE puerto.
import { execSync, spawn } from "node:child_process";
import net from "node:net";

const puerto = Number(process.argv[2] ?? process.env.PORT ?? 3000);
const esWindows = process.platform === "win32";

function pidsEnPuerto(p) {
  try {
    if (esWindows) {
      const out = execSync(`netstat -ano -p tcp`, { encoding: "utf8" });
      return [...new Set(out.split(/\r?\n/).filter((l) => /LISTENING/i.test(l) && new RegExp(`[:.]${p}\\s`).test(l)).map((l) => l.trim().split(/\s+/).pop()).filter((x) => x && x !== "0"))];
    }
    const out = execSync(`lsof -nP -iTCP:${p} -sTCP:LISTEN -t`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return [...new Set(out.split(/\s+/).filter(Boolean))];
  } catch { return []; }
}

const libre = (p) => new Promise((ok) => { const s = net.createServer().once("error", () => ok(false)).once("listening", () => s.close(() => ok(true))).listen(p); });

const pids = pidsEnPuerto(puerto).filter((pid) => Number(pid) !== process.pid);
for (const pid of pids) {
  try {
    if (esWindows) execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
    else process.kill(Number(pid), "SIGKILL");
    console.log(`Se cerró el proceso ${pid} que ocupaba el puerto ${puerto}.`);
  } catch { console.log(`No se pudo cerrar el proceso ${pid} (pruebe abrir la terminal como administrador).`); }
}
for (let i = 0; i < 20 && !(await libre(puerto)); i++) await new Promise((r) => setTimeout(r, 250));
if (!(await libre(puerto))) { console.error(`El puerto ${puerto} sigue ocupado. Use otro: npm run levantar -- ${puerto + 1}`); process.exit(1); }

console.log(`Levantando PAREAS en http://localhost:${puerto} …`);
const hijo = spawn(esWindows ? "npx.cmd" : "npx", ["next", "dev", "-p", String(puerto)], { stdio: "inherit", shell: esWindows });
hijo.on("exit", (code) => process.exit(code ?? 0));
