#!/bin/bash
set -e

php artisan migrate --force
php artisan app:reset-super-admin
php artisan config:cache
php artisan route:cache
php artisan view:cache

php artisan schedule:work &
php artisan queue:work --sleep=3 --tries=3 &

# El servidor embebido de PHP maneja UNA petición a la vez por defecto — con
# sesiones de archivo (flock por request) eso serializa cualquier par de
# peticiones concurrentes de la misma sesión (p.ej. el POST de un formulario
# y el GET de seguimiento que dispara Inertia) y las deja colgadas bajo
# tráfico real. PHP_CLI_SERVER_WORKERS levanta varios procesos worker para
# que sí se atiendan en paralelo.
export PHP_CLI_SERVER_WORKERS=4

php -d upload_max_filesize=25M -d post_max_size=30M -S 0.0.0.0:$PORT -t public
