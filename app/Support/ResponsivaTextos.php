<?php

namespace App\Support;

class ResponsivaTextos
{
    private const GROOMING = <<<'TEXTO'
Autorizo al personal del negocio a realizar el servicio de estética/grooming a mi mascota. Declaro que la información proporcionada sobre su salud y comportamiento es verídica.

Entiendo que, aunque el personal toma todas las precauciones necesarias, existen riesgos inherentes al proceso de baño y corte (estrés, cortes accidentales menores, reacciones alérgicas a productos, entre otros), especialmente en mascotas de edad avanzada, con condiciones médicas preexistentes o con comportamiento agresivo/ansioso.

Por lo anterior, eximo de responsabilidad al negocio y a su personal por cualquier incidente menor derivado del servicio, siempre que se haya actuado con el debido cuidado profesional. En caso de emergencia médica durante el servicio, autorizo al personal a trasladar a mi mascota a atención veterinaria, corriendo los gastos por mi cuenta.
TEXTO;

    private const ENTRENAMIENTO = <<<'TEXTO'
Autorizo al personal del negocio a realizar sesiones de entrenamiento con mi mascota. Declaro que la información proporcionada sobre su salud, comportamiento e historial es verídica.

Entiendo que el entrenamiento conlleva riesgos inherentes (estrés, sobreesfuerzo, reacciones ante estímulos o ante otros animales/personas, entre otros), especialmente en mascotas con comportamiento agresivo/ansioso o condiciones médicas preexistentes.

Por lo anterior, eximo de responsabilidad al negocio y a su personal por cualquier incidente menor derivado de las sesiones, siempre que se haya actuado con el debido cuidado profesional. En caso de emergencia médica durante la sesión, autorizo al personal a trasladar a mi mascota a atención veterinaria, corriendo los gastos por mi cuenta.
TEXTO;

    private const HOTEL = <<<'TEXTO'
Autorizo al negocio a hospedar a mi mascota en sus instalaciones de hotel/guardería. Declaro que la información proporcionada sobre su salud, comportamiento, alimentación y medicación es verídica y completa.

Entiendo que la convivencia con otras mascotas y el cambio de ambiente conllevan riesgos inherentes (estrés, contagios, peleas menores, entre otros), y que el negocio toma las precauciones necesarias para minimizarlos.

Por lo anterior, eximo de responsabilidad al negocio y a su personal por cualquier incidente menor derivado de la estancia, siempre que se haya actuado con el debido cuidado profesional. En caso de emergencia médica durante la estancia, autorizo al personal a trasladar a mi mascota a atención veterinaria, corriendo los gastos por mi cuenta.
TEXTO;

    private const PASEOS = <<<'TEXTO'
Autorizo al negocio a llevar a mi mascota a paseo, ya sea de forma grupal o privada. Declaro que la información proporcionada sobre su salud y comportamiento es verídica.

Entiendo que el paseo conlleva riesgos inherentes propios de la vía pública y la convivencia con otros animales (estrés, peleas menores, accidentes de tránsito, entre otros), y que el personal toma las precauciones necesarias para minimizarlos.

Por lo anterior, eximo de responsabilidad al negocio y a su personal por cualquier incidente menor derivado del paseo, siempre que se haya actuado con el debido cuidado profesional. En caso de emergencia médica durante el paseo, autorizo al personal a trasladar a mi mascota a atención veterinaria, corriendo los gastos por mi cuenta.
TEXTO;

    private const RECOLECCION = <<<'TEXTO'
Autorizo al negocio a recolectar y/o entregar a mi mascota en el domicilio indicado, mediante el servicio de transporte a domicilio. Declaro que la información proporcionada sobre su salud y comportamiento es verídica.

Entiendo que el traslado conlleva riesgos inherentes (estrés, mareo, accidentes de tránsito, entre otros), y que el personal toma las precauciones necesarias para minimizarlos.

Por lo anterior, eximo de responsabilidad al negocio y a su personal por cualquier incidente menor derivado del traslado, siempre que se haya actuado con el debido cuidado profesional. En caso de emergencia médica durante el traslado, autorizo al personal a trasladar a mi mascota a atención veterinaria, corriendo los gastos por mi cuenta.
TEXTO;

    private const MODULOS = [
        'grooming'      => self::GROOMING,
        'entrenamiento' => self::ENTRENAMIENTO,
        'hotel'         => self::HOTEL,
        'paseos'        => self::PASEOS,
        'recoleccion'   => self::RECOLECCION,
    ];

    private const LABELS = [
        'grooming'      => 'Estética',
        'entrenamiento' => 'Entrenamiento',
        'hotel'         => 'Hotel',
        'paseos'        => 'Paseo',
        'recoleccion'   => 'Recolección a domicilio',
    ];

    public static function default(string $modulo): string
    {
        return self::MODULOS[$modulo] ?? self::GROOMING;
    }

    public static function label(string $modulo): string
    {
        return self::LABELS[$modulo] ?? 'Servicio';
    }

    public static function settingKey(string $modulo): string
    {
        return "{$modulo}.responsiva_texto";
    }

    /** @return array<string,string> */
    public static function modulos(): array
    {
        return array_keys(self::MODULOS);
    }
}
