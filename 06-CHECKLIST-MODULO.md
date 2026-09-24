# ✅ Checklist — agregar un módulo de dominio

Basado en **[04-ARQUITECTURA.md](04-ARQUITECTURA.md)**. Un módulo = un dominio de negocio
(p. ej. `projects`, `invoices`, `clients`).

## Archivos (4 por módulo)

```
src/modules/<dominio>/
├── <dominio>.repository.ts  # SQL + mapeo row→modelo (único lugar con DB)
├── <dominio>.service.ts     # reglas de negocio, límites de plan, permisos
├── <dominio>.schemas.ts     # Zod (create/update/query)
└── <dominio>.routes.ts      # router HTTP (parse, auth, status, response)
```

## Pasos

- [ ] **Repository** — todas las queries filtradas por `user_id` (o `organization_id`). Usa `toCamel`/`toCamelArray` para respuestas.
- [ ] **Service** — valida reglas de negocio; aplica `assertFeature(req, 'x')` y `assertWithinLimit(req, 'key', count)` si el módulo tiene cuota/feature.
- [ ] **Schemas** — `z.object({...})` para `body`/`query`/`params`; usa `parse(schema, data)` en las rutas.
- [ ] **Routes** — `requireAuth` (+ `attachPlan` si hay plan) + `asyncHandler`. Nunca accedas a DB aquí.
- [ ] **Montaje** — importa el router en `src/routes.ts`: `router.use('/<dominio>', dominioRouter)`.
- [ ] **Migración** — si agrega columna/tabla: nuevo archivo `src/db/migrations/0002_<desc>.ts` (nunca editar una aplicada).
- [ ] **Tests** — unit del service + integración de rutas (ver `boilerplate-backend/AGENTS.md`).

## Ejemplo mínimo

`project.routes.ts` (extracto de [05-PATRONES-CODIGO.md](05-PATRONES-CODIGO.md) §11):

```ts
const router = Router();
router.use(requireAuth, attachPlan);

router.post('/', asyncHandler(async (req, res) => {
  const input = parse(createProjectSchema, req.body);
  res.status(201).json(await projectService.create(req, req.user!.id, input));
}));
```

## Errores comunes

- Acceder a `getDb()` desde `routes/` o `middleware/` — solo `repository`.
- Filtrar solo en el frontend — siempre también en SQL (`WHERE user_id = ?`).
- Olvidar montar el router en `routes.ts` (404 silencioso).
- Editar una migración ya aplicada en vez de crear una nueva.
