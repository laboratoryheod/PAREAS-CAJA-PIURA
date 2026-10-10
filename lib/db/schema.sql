-- Esquema del prototipo (SQLite). JSON se guarda como TEXT.
CREATE TABLE IF NOT EXISTS app_estado (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombres TEXT NOT NULL,
  dni_hash TEXT NOT NULL,          -- SHA-256 del DNI (nunca el DNI en claro)
  dni_mascara TEXT NOT NULL,       -- p. ej. "****4821" para mostrar en pantalla
  telefono TEXT,
  zona TEXT,
  negocio TEXT,
  score INTEGER NOT NULL DEFAULT 70,
  nivel TEXT NOT NULL DEFAULT 'Plata',
  creado_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS creditos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  tipo_credito TEXT NOT NULL,
  monto_desembolsado REAL NOT NULL,
  saldo_capital REAL NOT NULL,
  tea REAL NOT NULL,               -- tasa efectiva anual, p. ej. 0.38
  cuota_mensual REAL NOT NULL,
  cuotas_pendientes INTEGER NOT NULL,
  dias_atraso INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cuotas_vencidas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  credito_id INTEGER NOT NULL REFERENCES creditos(id),
  monto REAL NOT NULL,
  fecha_vencimiento TEXT NOT NULL, -- YYYY-MM-DD
  dias_atraso INTEGER NOT NULL,
  interes_moratorio REAL NOT NULL DEFAULT 0,
  pagada INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS propuestas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  credito_id INTEGER NOT NULL REFERENCES creditos(id),
  n_cuotas INTEGER NOT NULL,
  inicial REAL NOT NULL,
  fecha_primer_pago TEXT NOT NULL,
  cronograma TEXT NOT NULL,        -- JSON
  estado TEXT NOT NULL,            -- aceptada | rechazada | derivada | cumplida | incumplida
  motivo_atraso TEXT,
  creado_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS movimientos_score (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  tipo TEXT NOT NULL,              -- trivia | racha | pago_puntual | promesa_cumplida | chicotazo_mora | promesa_incumplida
  puntos INTEGER NOT NULL,
  saldo_resultante INTEGER NOT NULL,
  detalle TEXT,
  fecha TEXT NOT NULL,             -- día (fecha de la demo) al que pertenece el movimiento
  creado_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trivia_preguntas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  categoria TEXT NOT NULL,
  pregunta TEXT NOT NULL,
  opciones TEXT NOT NULL,          -- JSON array de strings
  correcta INTEGER NOT NULL,       -- índice en opciones
  explicacion TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trivia_respuestas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  pregunta_id INTEGER NOT NULL REFERENCES trivia_preguntas(id),
  acerto INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  creado_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  tipo TEXT NOT NULL,              -- modulo_abierto | simulacion | propuesta_enviada | pago_simulado | chat | trivia_jugada | ayuda_humana
  detalle TEXT,
  creado_en TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_creditos_cliente ON creditos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_credito ON cuotas_vencidas(credito_id);
CREATE INDEX IF NOT EXISTS idx_mov_cliente ON movimientos_score(cliente_id);
CREATE INDEX IF NOT EXISTS idx_eventos_id ON eventos(id);
