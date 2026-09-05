<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'whatsapp_gateway' => [
        'url' => env('WHATSAPP_GATEWAY_URL'),
        'token' => env('WHATSAPP_GATEWAY_TOKEN'),
        'app_id' => env('WHATSAPP_GATEWAY_APP_ID', 2),
        'inbound_secret' => env('WHATSAPP_GATEWAY_INBOUND_SECRET'),
    ],

    // Cuenta de MercadoPago de la plataforma (no la del tenant) — cobra las
    // recargas de créditos de WhatsApp, vetrkt le cobra al tenant.
    'whatsapp_credits' => [
        'mp_access_token' => env('WHATSAPP_CREDITS_MP_ACCESS_TOKEN'),
        'mp_webhook_secret' => env('WHATSAPP_CREDITS_MP_WEBHOOK_SECRET'),
    ],

];
