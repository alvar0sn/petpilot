#!/bin/bash
set -e

php artisan migrate --force
php artisan app:reset-super-admin
php artisan config:cache
php artisan route:cache
php artisan view:cache

php artisan schedule:work &
php artisan queue:work --sleep=3 --tries=3 &

php -S 0.0.0.0:$PORT -t public
