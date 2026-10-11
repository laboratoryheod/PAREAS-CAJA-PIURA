# Despliegue en un VPS (Hostinger u otro con Ubuntu o Debian)

PAREAS se instala con un solo comando: `scripts/deploy/instalar-vps.sh`. Ese mismo comando sirve después para actualizar la app.

## 1. Requisitos
- Un VPS con Ubuntu 22.04/24.04 o Debian 12, con acceso SSH y un usuario con `sudo` (o root).
- Opcional, para tener HTTPS: un dominio o subdominio, por ejemplo `pareas.midominio.com`, con un registro DNS **A** que apunte a la IP del VPS. En Hostinger se crea en hPanel › Dominios › DNS.

## 2. Instalar
Desde la terminal de su PC, con su llave SSH:

```bash
ssh -t -i ~/.ssh/SU_LLAVE usuario@IP_DEL_VPS 'curl -fsSL https://raw.githubusercontent.com/laboratoryheod/PAREAS-CAJA-PIURA/master/scripts/deploy/instalar-vps.sh | sudo bash'
```

O bien, desde la terminal del navegador de hPanel (VPS › Terminal), ya como root:

```bash
curl -fsSL https://raw.githubusercontent.com/laboratoryheod/PAREAS-CAJA-PIURA/master/scripts/deploy/instalar-vps.sh | bash
```

La primera vez el instalador pregunta:

| Pregunta | Si la deja vacía |
|---|---|
| Dominio o subdominio | Se usa la IP del VPS, sin HTTPS |
| Correo para el certificado HTTPS | El certificado se pide sin correo |
| Usuario del gestor | `gestor` |
| Clave del gestor | Se genera una segura y se muestra al final |
| Clave de OpenAI | El chat responde solo con su FAQ |
| ¿Mostrar herramientas de prueba? | Sí (Reiniciar y Pasar un día, útiles para presentaciones) |

Las claves se escriben en el servidor y quedan solo en `/opt/pareas/.env.local` (permisos 600). Nunca pasan por el repositorio.

Al terminar, el instalador muestra las direcciones del cliente (`/cliente`) y del gestor (`/banco`).

## 3. Qué hace el instalador
1. Instala los paquetes del sistema y un **Node.js 22 propio** en `/opt/pareas-node`. No toca el Node.js que ya use el servidor.
2. Si el VPS tiene menos de 2.5 GB de RAM y no tiene swap, crea 2 GB de memoria de intercambio, porque la compilación la necesita.
3. Crea el usuario de sistema `pareas` y descarga el código (rama `master`) en `/opt/pareas`.
4. Guarda la configuración en `.env.local`: credenciales, `SESION_SECRETO` aleatorio, base SQLite en `/opt/pareas/data/ponte.db` y un puerto interno libre (desde el 3000).
5. Instala las dependencias y compila (`npm ci` y `npm run build`).
6. Crea el servicio `pareas` (systemd). La app arranca sola al reiniciar el VPS y se levanta sola si se cae.
7. Publica la app:
   - **Puerto 80 libre o con Nginx**: agrega un sitio de Nginx. Con dominio, pide el certificado HTTPS (Let's Encrypt) y redirige http → https.
   - **Puerto 80 ocupado por otro programa** (Apache, un panel, Docker): no lo toca y publica PAREAS en el puerto 8080.
   - **Nginx ya tiene otros sitios y no se dio un dominio**: tampoco los toca y publica PAREAS en el puerto 8080.
8. Si `ufw` está activo, abre los puertos necesarios, y comprueba que la app responda.

## 4. Operación diaria
| Para | Comando |
|---|---|
| Actualizar a la última versión de `master` | el mismo comando de instalación |
| Ver el estado | `sudo systemctl status pareas` |
| Ver los registros en vivo | `sudo journalctl -u pareas -f` |
| Reiniciar la app | `sudo systemctl restart pareas` |
| Cambiar una clave o la configuración | `sudo nano /opt/pareas/.env.local` y luego el comando de instalación |
| Respaldar los datos | copiar `/opt/pareas/data/ponte.db` (con la app detenida o con `sqlite3 .backup`) |

Si usó el puerto 8080 y no abre desde fuera, habilítelo en el firewall de Hostinger (hPanel › VPS › Firewall).

## 5. Antes de abrirlo al público
- Apague las herramientas de prueba: `NEXT_PUBLIC_HERRAMIENTAS_PRUEBA=0` en `/opt/pareas/.env.local` y vuelva a ejecutar el instalador.
- Use un dominio con HTTPS: la cookie de sesión del gestor viaja como `secure` solo por https.
- Para conectar el core de Caja Piura, implemente la interfaz `Repo` (`lib/db/repo.ts`).
