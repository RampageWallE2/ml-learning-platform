# Frontend de ExploraLab

Angular y Phaser. El arranque completo y reproducible está en el [README principal](../README.md):

```bash
# Desde la raíz del proyecto, sin .env obligatorio:
docker compose up --build
```

Abrir http://localhost:4200 cuando termine la compilación. Compose usa
`proxy.docker.json` para enviar `/api` al backend del mismo proyecto.

## Desarrollo sin Docker (opcional)

Con una versión de Node compatible con Angular 22 (el proyecto usa Node 24):

```bash
# Desde frontend/
npm ci
npm start
```

Este modo requiere la API por separado en http://localhost:5000 y utiliza
`proxy.local.json`. No sustituye el arranque completo con Docker.
Google está deshabilitado salvo que se defina explícitamente su ID público.

## Comprobaciones

```bash
npm run lint
npm run test:ci
npm run build
```

`dist`, `.angular`, `node_modules` y `tmp` son resultados/cachés locales, no parte
de un clon ni requisitos previos. Los archivos de `public` y `tiled` son assets
y fuentes de edición: no deben borrarse para limpiar el código.
