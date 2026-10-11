# MyHealth OS — Demo pública (Alpha 0.1)

Aplicación con seis módulos navegables y datos 100 % sintéticos. **No es una app clínica. No introducir datos de salud reales.**

## Publicación en GitHub Pages

Se incluye un flujo GitHub Actions que publica automáticamente solo los archivos de la web.

1. Crear un repositorio en GitHub llamado, por ejemplo, `myhealth-os-demo`. Puede ser **público** en GitHub Free, ya que solo contiene datos sintéticos. No subir analíticas ni archivos privados.
2. Subir el contenido de esta carpeta a la raíz de la rama `main`, incluyendo `.github/workflows/deploy.yml`. Es importante conservar archivos ocultos y carpetas.
3. En el repositorio, abrir **Settings → Pages → Build and deployment → Source: GitHub Actions**. El flujo se dispara al subir código a main, o manualmente desde **Actions → Publicar MyHealth OS (demo) → Run workflow**.
4. Consultar el enlace HTTPS publicado en **Settings → Pages**. Normalmente tiene forma `https://USUARIO.github.io/myhealth-os-demo/`, pero confirmar la URL real en GitHub.
5. Abrir en Safari iOS → **Compartir → Añadir a pantalla de inicio** (la opción de Safari puede variar con la versión de iOS).

**GitHub Pages es público aunque se publique desde un repositorio privado compatible. No usar GitHub Pages como repositorio de datos médicos.**

## Qué tiene y qué no

Tiene seis secciones: Hoy, Evolución, Actividad, Analíticas, Nutrición y Asistente (motor determinista). Gráficos y formularios con datos ficticios, modo oscuro, exportación de demo JSON, datos guardados en localStorage, PWA básica.

No hay backend, cifrado médico, login, HealthKit ni IA conectada. Los registros locales son accesibles a otras personas con acceso al mismo navegador/perfil y pueden perderse si se borran datos del sitio.

## Requisitos

El proyecto es HTML+CSS+JavaScript sin dependencias. GitHub Actions publica los archivos permitidos por una lista blanca; README, código de pruebas y ficheros ajenos a esta lista no se exponen en el sitio generado.

## Privacidad

Revisados los archivos de la demo: no se realizan llamadas a APIs externas ni se incluyen credenciales. Se ha limitado la política de carga de contenido con CSP de HTML y se evita enviar cabeceras `Referer`. No introducir datos reales, ni siquiera en la demo HTTPS, hasta disponer de autenticación, modelo de amenazas, almacenamiento cifrado y política de copias.
