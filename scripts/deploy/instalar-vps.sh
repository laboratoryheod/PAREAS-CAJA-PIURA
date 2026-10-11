#!/usr/bin/env bash
# Instala o actualiza PAREAS en un VPS con Ubuntu o Debian (por ejemplo, un VPS de Hostinger).
#
# Uso desde su PC (con su llave SSH):
#   ssh -t -i ~/.ssh/SU_LLAVE usuario@IP_DEL_VPS 'curl -fsSL https://raw.githubusercontent.com/laboratoryheod/PAREAS-CAJA-PIURA/master/scripts/deploy/instalar-vps.sh | sudo bash'
# o, ya dentro del VPS como root:
#   curl -fsSL https://raw.githubusercontent.com/laboratoryheod/PAREAS-CAJA-PIURA/master/scripts/deploy/instalar-vps.sh | bash
#
# La primera vez pregunta el dominio, las credenciales del gestor y la clave de OpenAI (se escriben en el servidor y
# quedan solo en /opt/pareas/.env.local). Las siguientes veces actualiza la app sin preguntar.
#
# Convive con lo que ya tenga el VPS: usa su propio Node.js (/opt/pareas-node), su propio usuario (pareas), un puerto
# interno libre, y no detiene ni borra otros sitios web. Ver docs/DESPLIEGUE-VPS.md.
set -euo pipefail

REPO="${PAREAS_REPO:-https://github.com/laboratoryheod/PAREAS-CAJA-PIURA.git}"
RAMA="${PAREAS_RAMA:-master}"
DIR="${PAREAS_DIR:-/opt/pareas}"
NODE_DIR="/opt/pareas-node"
NODE_MAYOR=22
USUARIO_SO="pareas"

paso() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
aviso() { printf '\033[1;33m!  %s\033[0m\n' "$*"; }
error() { printf '\033[1;31mx  %s\033[0m\n' "$*" >&2; exit 1; }
# Las preguntas se leen de la terminal (el script llega por la tubería de curl)
HAY_TTY=0; (exec < /dev/tty) 2>/dev/null && HAY_TTY=1
preguntar() { local __v=""; [ "$HAY_TTY" -eq 1 ] && { read -r -p "$2" __v < /dev/tty || true; }; printf -v "$1" '%s' "$__v"; }
preguntar_oculto() { local __v=""; [ "$HAY_TTY" -eq 1 ] && { read -r -s -p "$2" __v < /dev/tty || true; echo > /dev/tty; }; printf -v "$1" '%s' "$__v"; }
aleatorio() { openssl rand -hex "$1" 2>/dev/null || head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'; }
como_app() { runuser -u "$USUARIO_SO" -- env HOME="/var/lib/$USUARIO_SO" NEXT_TELEMETRY_DISABLED=1 PATH="$NODE_DIR/bin:/usr/local/bin:/usr/bin:/bin" "$@"; }
puerto_ocupado() { ss -ltnH "sport = :$1" 2>/dev/null | grep -q .; }
dueno_puerto() { ss -ltnpH "sport = :$1" 2>/dev/null | sed -E 's/.*users:\(\("([^"]+)".*/\1/' | head -1; }
leer_env() { grep -E "^$1=" "$DIR/.env.local" 2>/dev/null | head -1 | cut -d= -f2- || true; }
# Puerto público alterno (cuando el 80 no se puede usar): el guardado, o el primero libre desde el 8080
puerto_alterno() {
  local p; p="$(leer_env PAREAS_PUERTO_PUBLICO)"
  if [ -z "$p" ]; then
    p=8080; while puerto_ocupado "$p"; do p=$((p + 1)); done
    echo "PAREAS_PUERTO_PUBLICO=$p" >> "$DIR/.env.local"
  fi
  echo "$p"
}

[ "$(id -u)" -eq 0 ] || error "Ejecute este script como root (con sudo)."
command -v apt-get >/dev/null || error "Este instalador es para Ubuntu o Debian (usa apt-get)."
export DEBIAN_FRONTEND=noninteractive
cd /

PRIMERA_VEZ=1
[ -f "$DIR/.env.local" ] && PRIMERA_VEZ=0

# ---------------------------------------------------------------- 1. Preguntas (solo la primera vez)
DOMINIO=""; CORREO=""; HERRAMIENTAS=1; CLAVE_GENERADA=""; BANCO_USUARIO=""; BANCO_CLAVE=""; OPENAI_API_KEY=""; RESP=""
if [ "$PRIMERA_VEZ" -eq 1 ]; then
  paso "Configuración de PAREAS"
  [ "$HAY_TTY" -eq 1 ] || aviso "Sin terminal interactiva: se usan valores por defecto (sin dominio, clave del gestor generada, sin OpenAI)."
  preguntar DOMINIO "Dominio o subdominio de la app (por ejemplo pareas.midominio.com; vacío = usar la IP del VPS): "
  DOMINIO="${DOMINIO// /}"
  [ -n "$DOMINIO" ] && preguntar CORREO "Correo para el certificado HTTPS (Let's Encrypt; puede dejarlo vacío): "
  preguntar BANCO_USUARIO "Usuario del panel del gestor [gestor]: "
  BANCO_USUARIO="${BANCO_USUARIO:-gestor}"
  preguntar_oculto BANCO_CLAVE "Clave del panel del gestor (vacío = generar una segura): "
  if [ -z "$BANCO_CLAVE" ]; then BANCO_CLAVE="$(aleatorio 8)"; CLAVE_GENERADA="$BANCO_CLAVE"; fi
  preguntar_oculto OPENAI_API_KEY "Clave de OpenAI para el chat de Pareas (vacío = el chat responde solo con su FAQ): "
  preguntar RESP "¿Mostrar las herramientas de prueba (Reiniciar y Pasar un día)? Útiles para presentaciones [S/n]: "
  case "${RESP:-s}" in [nN]*) HERRAMIENTAS=0 ;; *) HERRAMIENTAS=1 ;; esac
else
  DOMINIO="$(leer_env PAREAS_DOMINIO)"
fi

# ---------------------------------------------------------------- 2. Paquetes del sistema
paso "Instalando paquetes del sistema"
apt-get update -qq
apt-get install -y -qq ca-certificates curl git build-essential python3 openssl xz-utils iproute2 >/dev/null

# Node.js propio de PAREAS: no toca el Node.js que ya use el servidor
if [ ! -x "$NODE_DIR/bin/node" ] || [ "$("$NODE_DIR/bin/node" -p 'process.versions.node.split(".")[0]')" != "$NODE_MAYOR" ]; then
  paso "Instalando Node.js $NODE_MAYOR en $NODE_DIR"
  case "$(uname -m)" in x86_64) ARQ=x64 ;; aarch64|arm64) ARQ=arm64 ;; *) error "Arquitectura no soportada: $(uname -m)" ;; esac
  BASE="https://nodejs.org/dist/latest-v${NODE_MAYOR}.x"
  ARCHIVO="$(curl -fsSL "$BASE/SHASUMS256.txt" | awk -v a="linux-${ARQ}.tar.xz" '$2 ~ a {print $2; exit}')"
  [ -n "$ARCHIVO" ] || error "No se encontró la descarga de Node.js para linux-${ARQ}."
  TMP="$(mktemp -d)"
  curl -fsSL "$BASE/$ARCHIVO" -o "$TMP/$ARCHIVO"
  (cd "$TMP" && curl -fsSL "$BASE/SHASUMS256.txt" | grep " $ARCHIVO\$" | sha256sum -c - >/dev/null) || error "La descarga de Node.js no pasó la verificación."
  rm -rf "$NODE_DIR" && mkdir -p "$NODE_DIR"
  tar -xJf "$TMP/$ARCHIVO" -C "$NODE_DIR" --strip-components=1
  rm -rf "$TMP"
fi
echo "Node $("$NODE_DIR/bin/node" -v)"

# Memoria de intercambio si el VPS tiene poca RAM (la compilación de Next.js la necesita)
MEM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
if [ "$MEM_MB" -lt 2500 ] && ! swapon --show | grep -q .; then
  paso "Creando 2 GB de memoria de intercambio (el VPS tiene ${MEM_MB} MB de RAM)"
  fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ---------------------------------------------------------------- 3. Usuario y código
id "$USUARIO_SO" >/dev/null 2>&1 || useradd --system --create-home --home-dir "/var/lib/$USUARIO_SO" --shell /usr/sbin/nologin "$USUARIO_SO"

if [ -d "$DIR/.git" ]; then
  paso "Actualizando el código ($RAMA)"
  como_app git -C "$DIR" fetch --depth 1 origin "$RAMA"
  como_app git -C "$DIR" reset --hard FETCH_HEAD
else
  paso "Descargando el código ($RAMA)"
  mkdir -p "$DIR" && chown "$USUARIO_SO:$USUARIO_SO" "$DIR"
  como_app git clone --depth 1 --branch "$RAMA" "$REPO" "$DIR"
fi
mkdir -p "$DIR/data" && chown -R "$USUARIO_SO:$USUARIO_SO" "$DIR"

# ---------------------------------------------------------------- 4. Puerto interno y variables de entorno
PUERTO="$(leer_env PAREAS_PUERTO)"
if [ -z "$PUERTO" ]; then
  PUERTO=3000
  while puerto_ocupado "$PUERTO"; do PUERTO=$((PUERTO + 1)); done
fi

if [ "$PRIMERA_VEZ" -eq 1 ]; then
  paso "Guardando la configuración en $DIR/.env.local"
  umask 077
  cat > "$DIR/.env.local" <<EOF
# Configuración de PAREAS en este servidor (no se sube a git). Tras editarla, vuelva a ejecutar el instalador.
OPENAI_API_KEY=${OPENAI_API_KEY}
OPENAI_MODEL=gpt-4o-mini
BANCO_USUARIO=${BANCO_USUARIO}
BANCO_CLAVE=${BANCO_CLAVE}
SESION_SECRETO=$(aleatorio 32)
SQLITE_PATH=${DIR}/data/ponte.db
NEXT_PUBLIC_HERRAMIENTAS_PRUEBA=${HERRAMIENTAS}
PAREAS_DOMINIO=${DOMINIO}
PAREAS_PUERTO=${PUERTO}
EOF
  umask 022
  chown "$USUARIO_SO:$USUARIO_SO" "$DIR/.env.local" && chmod 600 "$DIR/.env.local"
fi

# ---------------------------------------------------------------- 5. Dependencias y compilación
paso "Instalando dependencias y compilando (puede tardar unos minutos)"
systemctl stop pareas 2>/dev/null || true
como_app bash -c "cd '$DIR' && npm ci --no-audit --no-fund --loglevel=error && rm -rf .next && npm run build"

# ---------------------------------------------------------------- 6. Publicación: Nginx en el puerto 80, o puerto propio
# Si el puerto 80 lo usa otro programa (Apache, otro panel, Docker…), no se toca: PAREAS se publica en el puerto 8080.
MODO="nginx"; PUERTO_PUBLICADO=""
if puerto_ocupado 80 && [ "$(dueno_puerto 80)" != "nginx" ]; then
  MODO="directo"
  PUERTO_PUBLICADO="$(puerto_alterno)"
  aviso "El puerto 80 lo usa '$(dueno_puerto 80)'. No se modifica; PAREAS se publicará en el puerto $PUERTO_PUBLICADO."
fi

ESCUCHA="127.0.0.1"; PUERTO_APP="$PUERTO"
if [ "$MODO" = "directo" ]; then ESCUCHA="0.0.0.0"; PUERTO_APP="$PUERTO_PUBLICADO"; fi

paso "Configurando el servicio pareas"
cat > /etc/systemd/system/pareas.service <<EOF
[Unit]
Description=PAREAS · Caja Piura
After=network.target

[Service]
Type=simple
User=${USUARIO_SO}
WorkingDirectory=${DIR}
Environment=NODE_ENV=production
ExecStart=${NODE_DIR}/bin/node ${DIR}/node_modules/next/dist/bin/next start -p ${PUERTO_APP} -H ${ESCUCHA}
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable pareas >/dev/null 2>&1
systemctl restart pareas

if [ "$MODO" = "nginx" ]; then
  paso "Configurando Nginx"
  command -v nginx >/dev/null || apt-get install -y -qq nginx >/dev/null
  # Sin dominio, PAREAS responde en la IP: solo se desactiva el sitio "default" si es el de fábrica
  OTROS_SITIOS="$(find /etc/nginx/sites-enabled -mindepth 1 -maxdepth 1 ! -name pareas ! -name default 2>/dev/null | wc -l)"
  DEFAULT_DE_FABRICA=0
  if [ -e /etc/nginx/sites-enabled/default ] && grep -q "root /var/www/html;" /etc/nginx/sites-enabled/default && grep -q "server_name _;" /etc/nginx/sites-enabled/default; then
    DEFAULT_DE_FABRICA=1
  fi
  ESCUCHA_NGINX="listen 80;"; ESCUCHA_NGINX6="listen [::]:80;"; NOMBRE="$DOMINIO"
  if [ -z "$DOMINIO" ]; then
    if [ "$OTROS_SITIOS" -eq 0 ] && { [ ! -e /etc/nginx/sites-enabled/default ] || [ "$DEFAULT_DE_FABRICA" -eq 1 ]; }; then
      rm -f /etc/nginx/sites-enabled/default
      ESCUCHA_NGINX="listen 80 default_server;"; ESCUCHA_NGINX6="listen [::]:80 default_server;"; NOMBRE="_"
    else
      PUERTO_PUBLICADO="$(puerto_alterno)"
      aviso "Nginx ya tiene otros sitios: sin dominio, PAREAS se publica en el puerto $PUERTO_PUBLICADO para no tocarlos."
      ESCUCHA_NGINX="listen ${PUERTO_PUBLICADO};"; ESCUCHA_NGINX6="listen [::]:${PUERTO_PUBLICADO};"; NOMBRE="_"
    fi
  fi
  [ -f /proc/net/if_inet6 ] || ESCUCHA_NGINX6=""
  cat > /etc/nginx/sites-available/pareas <<EOF
server {
    ${ESCUCHA_NGINX}
    ${ESCUCHA_NGINX6}
    server_name ${NOMBRE};
    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:${PUERTO};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
  ln -sf /etc/nginx/sites-available/pareas /etc/nginx/sites-enabled/pareas
  if ! nginx -t >/dev/null 2>&1; then
    nginx -t || true
    rm -f /etc/nginx/sites-enabled/pareas
    error "La configuración de Nginx no es válida; se retiró el sitio de PAREAS y no se tocó nada más."
  fi
  systemctl enable nginx >/dev/null 2>&1
  systemctl reload nginx 2>/dev/null || systemctl restart nginx
fi

if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  if [ -n "$PUERTO_PUBLICADO" ]; then ufw allow "$PUERTO_PUBLICADO/tcp" >/dev/null; else ufw allow 'Nginx Full' >/dev/null 2>&1 || ufw allow 80,443/tcp >/dev/null; fi
fi

# ---------------------------------------------------------------- 7. HTTPS (con dominio y Nginx en el puerto 80)
if [ "$MODO" = "nginx" ] && [ -n "$DOMINIO" ] && [ ! -d "/etc/letsencrypt/live/$DOMINIO" ]; then
  paso "Solicitando el certificado HTTPS para $DOMINIO"
  apt-get install -y -qq certbot python3-certbot-nginx >/dev/null
  if [ -n "$CORREO" ]; then OPC_CORREO=(-m "$CORREO"); else OPC_CORREO=(--register-unsafely-without-email); fi
  if ! certbot --nginx -d "$DOMINIO" --non-interactive --agree-tos "${OPC_CORREO[@]}" --redirect >/dev/null 2>&1; then
    aviso "No se pudo obtener el certificado. Revise que el registro DNS (A) de $DOMINIO apunte a la IP de este VPS"
    aviso "y luego ejecute: sudo certbot --nginx -d $DOMINIO --redirect"
  fi
fi

# ---------------------------------------------------------------- 8. Verificación
paso "Verificando"
LOCAL="http://127.0.0.1:${PUERTO_APP}/cliente"
for _ in $(seq 1 30); do curl -fsS -o /dev/null "$LOCAL" && break; sleep 2; done
curl -fsS -o /dev/null "$LOCAL" || { journalctl -u pareas -n 40 --no-pager; error "La app no respondió. Arriba están los últimos registros."; }

IP_PUBLICA="$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
if [ -n "$PUERTO_PUBLICADO" ]; then URL="http://${DOMINIO:-$IP_PUBLICA}:$PUERTO_PUBLICADO"
elif [ -n "$DOMINIO" ] && [ -d "/etc/letsencrypt/live/$DOMINIO" ]; then URL="https://$DOMINIO"
else URL="http://${DOMINIO:-$IP_PUBLICA}"; fi

printf '\n\033[1;32mPAREAS está en línea.\033[0m\n'
echo "  Cliente:  $URL/cliente"
echo "  Gestor:   $URL/banco"
[ -n "$CLAVE_GENERADA" ] && echo "  Usuario del gestor: ${BANCO_USUARIO} · clave generada: ${CLAVE_GENERADA} (guárdela; también está en $DIR/.env.local)"
[ -n "$PUERTO_PUBLICADO" ] && echo "  Si no abre, habilite el puerto $PUERTO_PUBLICADO en el firewall del VPS (en Hostinger: hPanel > VPS > Firewall)."
echo
echo "  Estado:        sudo systemctl status pareas"
echo "  Registros:     sudo journalctl -u pareas -f"
echo "  Actualizar:    vuelva a ejecutar este mismo comando"
echo "  Configuración: $DIR/.env.local (tras editarla, vuelva a ejecutar el instalador)"
