<?php

return [
    'receipt' => [
        'label' => 'Recibo de venta',
        'description' => 'Se manda al cobrar un ticket en el POS.',
        'category' => 'utility',
        'variables' => [
            'name' => 'Nombre',
            'full_name' => 'Nombre completo',
            'phone' => 'Teléfono',
            'ticket_url' => 'URL del ticket',
            'total' => 'Total del ticket',
            'folio' => 'Folio del ticket',
            'date' => 'Fecha',
        ],
        'default_body' => 'Hola {{1}}, gracias por tu visita 🐾. Ticket #{{6}}: {{4}}. Total: {{5}}.',
    ],

    'responsiva' => [
        'label' => 'Responsiva de grooming',
        'description' => 'Se manda para que el dueño firme la responsiva antes de una cita de grooming.',
        'category' => 'utility',
        'variables' => [
            'name' => 'Nombre',
            'full_name' => 'Nombre completo',
            'phone' => 'Teléfono',
            'pet_name' => 'Nombre de la mascota',
            'responsiva_url' => 'URL de la responsiva',
        ],
        'default_body' => 'Hola {{1}}, por favor firma la responsiva de {{4}} aquí: {{5}}',
    ],

    'recordatorio' => [
        'label' => 'Recordatorio de servicio',
        'description' => 'Se manda para recordar una próxima vacuna, desparasitación, consulta o cita de grooming.',
        'category' => 'utility',
        'variables' => [
            'name' => 'Nombre',
            'full_name' => 'Nombre completo',
            'phone' => 'Teléfono',
            'pet_name' => 'Nombre de la mascota',
            'pet_breed' => 'Raza',
            'service_type' => 'Tipo de servicio',
            'date' => 'Fecha',
        ],
        'default_body' => 'Hola {{1}}, te recordamos la cita de {{6}} de {{4}} el {{7}}.',
    ],

    'checkin_hotel' => [
        'label' => 'Check-in de hotel',
        'description' => 'Se manda cuando una mascota ingresa al hotel.',
        'category' => 'utility',
        'variables' => [
            'name' => 'Nombre',
            'full_name' => 'Nombre completo',
            'phone' => 'Teléfono',
            'pet_name' => 'Nombre de la mascota',
            'checkin_date' => 'Fecha de entrada',
            'checkout_date' => 'Fecha de salida',
        ],
        'default_body' => '{{4}} ya está registrado en el hotel. Fecha de salida: {{6}}.',
    ],

    'checkout_hotel' => [
        'label' => 'Check-out de hotel',
        'description' => 'Se manda cuando una mascota está lista para ser recogida del hotel.',
        'category' => 'utility',
        'variables' => [
            'name' => 'Nombre',
            'full_name' => 'Nombre completo',
            'phone' => 'Teléfono',
            'pet_name' => 'Nombre de la mascota',
            'checkin_date' => 'Fecha de entrada',
            'checkout_date' => 'Fecha de salida',
        ],
        'default_body' => '{{4}} ya puede ser recogido — ¡gracias por tu confianza!',
    ],

    'cumpleanos' => [
        'label' => 'Cumpleaños de mascota',
        'description' => 'Se manda el día del cumpleaños de una mascota registrada.',
        'category' => 'marketing',
        'variables' => [
            'name' => 'Nombre',
            'full_name' => 'Nombre completo',
            'phone' => 'Teléfono',
            'pet_name' => 'Nombre de la mascota',
            'age_years' => 'Edad (años)',
        ],
        'default_body' => '¡Feliz cumpleaños a {{4}}! 🎂 Hoy cumple {{5}} años. 🐾',
    ],

    'membership_expiring' => [
        'label' => 'Membresía por vencer',
        'description' => 'Se manda antes de que venza una membresía activa — configura con cuántos días de anticipación se avisa.',
        'category' => 'utility',
        'has_days_before' => true,
        'variables' => [
            'name' => 'Nombre',
            'full_name' => 'Nombre completo',
            'phone' => 'Teléfono',
            'pet_name' => 'Nombre de la mascota',
            'plan' => 'Nombre del plan',
            'expires_at' => 'Fecha de vencimiento',
            'days_before' => 'Días antes del vencimiento',
        ],
        'default_body' => 'Hola {{1}}, la membresía {{5}} de {{4}} vence el {{6}}. ¡Renueva a tiempo para no perder tus beneficios!',
    ],

    'reviews' => [
        'label' => 'Solicitud de reseña',
        'description' => 'Se manda después de completar un servicio, para pedir una reseña.',
        'category' => 'utility',
        'variables' => [
            'name' => 'Nombre',
            'full_name' => 'Nombre completo',
            'phone' => 'Teléfono',
            'pet_name' => 'Nombre de la mascota',
            'service_type' => 'Tipo de servicio',
        ],
        'default_body' => 'Hola {{1}}, ¿cómo te fue en la cita de {{5}} de {{4}}? Nos encantaría conocer tu opinión.',
    ],

    'solicitud_pago' => [
        'label' => 'Solicitud de pago',
        'description' => 'Se manda cuando generas un link de cobro para un ticket.',
        'category' => 'utility',
        'variables' => [
            'name' => 'Nombre',
            'full_name' => 'Nombre completo',
            'phone' => 'Teléfono',
            'total' => 'Monto a pagar',
            'payment_link' => 'Link de pago',
        ],
        'default_body' => 'Hola {{1}}, tu total a pagar es {{4}}. Puedes pagar aquí: {{5}}',
    ],
];
