# Diseño de interfaz

- Seguir `DESIGN.md` (estilo Apple): fondo #F2F2F7 / #F5F5F7, widgets con esquinas 28px y sombras en capas, títulos grandes, azul #0A84FF para acciones.
- Iconos: solo los de `components/iconos.tsx` (glifos propios y `FichaApp`). Prohibido usar emojis en la UI o en textos que vea el cliente.
- Componentes de cult-ui en `components/ui/`: copiar solo el archivo necesario desde https://github.com/nolly-studio/cult-ui y anotarlo en `components/ui/README.md`. Los tokens de shadcn ya están en `tailwind.config.ts`.
- Botones ≥ 44 px de alto, `active:scale-[0.96]`, respetar `prefers-reduced-motion`, sin scroll horizontal a 360 px.
- Ver también `.agents/skills/frontend-design` y `.agents/skills/fixing-motion-performance`.
