# Sistema de Gestión para Pequeños Negocios

Aplicación web full-stack para administrar pequeños negocios desde un panel sencillo y responsive.

## Funcionalidades

- Login y registro de usuarios con contraseñas cifradas.
- Autenticación mediante JWT.
- Panel administrativo con estadísticas.
- Gestión de clientes.
- Gestión de productos y servicios.
- Registro de ventas y pagos.
- Control básico de stock.
- Reportes mensuales.
- API REST.
- Base de datos SQL mediante SQLite.
- Diseño responsive para computador, tablet y móvil.
- Código separado en backend y frontend.
- `.env.example` para configuración.
- Proyecto listo para publicar en GitHub.

## Tecnologías

- Node.js
- Express
- SQLite / SQL
- Better-SQLite3
- JWT
- bcryptjs
- HTML5
- CSS3
- JavaScript

## Instalación

Requisitos: Node.js 18 o superior.

```bash
git clone TU_REPOSITORIO
cd sistema-gestion-pequenos-negocios
npm install
npm start
```

Luego abre:

`http://localhost:3000`

## Primer acceso

En la pantalla inicial selecciona **Crear cuenta** y registra el usuario administrador.

Las contraseñas no se guardan en texto plano: se almacenan mediante hash.

## API REST

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Registrar usuario |
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/dashboard` | Estadísticas principales |
| GET/POST | `/api/products` | Consultar/crear productos |
| PUT/DELETE | `/api/products/:id` | Editar/eliminar producto |
| GET/POST | `/api/clients` | Consultar/crear clientes |
| PUT/DELETE | `/api/clients/:id` | Editar/eliminar cliente |
| GET/POST | `/api/sales` | Consultar/registrar ventas |
| GET | `/api/reports/monthly` | Reporte mensual |
| GET | `/api/users` | Usuarios del sistema |

Los endpoints protegidos requieren:

`Authorization: Bearer TU_TOKEN`

## Base de datos

La base de datos se crea automáticamente en `database.db` al ejecutar el servidor.

Tablas:

- `users`
- `clients`
- `products`
- `sales`
- `sale_items`

El archivo de base de datos está incluido en `.gitignore` para evitar subir datos locales o credenciales.

## Estructura

```text
sistema-gestion-pequenos-negocios/
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── src/
│   └── db.js
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── server.js
```

## Subir a GitHub

```bash
git init
git add .
git commit -m "Sistema de gestion para pequenos negocios"
git branch -M main
git remote add origin TU_URL_DE_GITHUB
git push -u origin main
```

## Seguridad

Para producción se recomienda definir una clave JWT fuerte mediante la variable `JWT_SECRET`, usar HTTPS, validar y sanitizar entradas, implementar rate limiting y utilizar una base de datos administrada.

## Licencia

MIT
