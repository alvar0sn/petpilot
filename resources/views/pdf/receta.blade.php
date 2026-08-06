<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page { margin: 44px 46px; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1f2937; }

    .header { display: table; width: 100%; margin-bottom: 12px; border-bottom: 2px solid #18181b; padding-bottom: 10px; }
    .header .logo-col { display: table-cell; width: 70px; vertical-align: middle; }
    .header .logo-col img { max-height: 50px; max-width: 62px; }
    .header .info-col { display: table-cell; vertical-align: middle; padding-left: 12px; }
    .negocio-nombre { font-size: 15px; font-weight: bold; }
    .negocio-detalle { font-size: 9.5px; color: #52525b; margin-top: 1px; }
    .header .titulo-col { display: table-cell; vertical-align: middle; text-align: right; }
    .titulo-col .titulo { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: bold; }
    .titulo-col .fecha { font-size: 10px; color: #52525b; margin-top: 2px; }

    .paciente-bar { display: table; width: 100%; background: #f4f4f5; border-radius: 4px; padding: 7px 10px; margin-bottom: 14px; font-size: 10.5px; }
    .paciente-bar .cell { display: table-cell; padding-right: 10px; }
    .paciente-bar .lbl { color: #71717a; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.3px; }
    .paciente-bar .val { font-weight: bold; }

    .bloque-prominente { margin-bottom: 12px; border: 1px solid #d4d4d8; border-radius: 5px; padding: 9px 11px; }
    .bloque-prominente .bloque-titulo { font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; font-weight: bold; color: #18181b; margin-bottom: 4px; }
    .bloque-prominente .bloque-texto { font-size: 13px; line-height: 1.45; min-height: 16px; }
    .bloque-tratamiento { border: 1.5px solid #18181b; }
    .bloque-tratamiento .bloque-texto { min-height: 60px; white-space: pre-line; }

    .bloque-normal { margin-bottom: 12px; }
    .bloque-normal .bloque-titulo { font-size: 9px; text-transform: uppercase; letter-spacing: 0.3px; color: #71717a; margin-bottom: 3px; }
    .bloque-normal .bloque-texto { font-size: 11px; border-bottom: 1px solid #d4d4d8; padding-bottom: 4px; min-height: 26px; white-space: pre-line; }

    .rutina-box { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 4px; padding: 7px 10px; margin-bottom: 12px; font-size: 9px; color: #3f3f46; }
    .rutina-box .rutina-titulo { font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; color: #a1a1aa; margin-bottom: 3px; }
    .rutina-box .rutina-linea { padding: 1.5px 0; }
    .rutina-box .rutina-linea b { color: #18181b; }

    .firma { margin-top: 46px; text-align: center; }
    .firma-linea { border-top: 1px solid #18181b; width: 240px; margin: 0 auto; padding-top: 5px; font-size: 10px; }
</style>
</head>
<body>
    <div class="header">
        <div class="logo-col">
            @if($negocio['logo'])
                <img src="{{ $negocio['logo'] }}">
            @endif
        </div>
        <div class="info-col">
            <div class="negocio-nombre">{{ $negocio['nombre'] }}</div>
            @if($negocio['direccion'] || $negocio['telefono'])
                <div class="negocio-detalle">{{ $negocio['direccion'] }}{{ $negocio['direccion'] && $negocio['telefono'] ? ' — Tel. ' : ($negocio['telefono'] ? 'Tel. ' : '') }}{{ $negocio['telefono'] }}</div>
            @endif
            @if($negocio['veterinario'])
                <div class="negocio-detalle">{{ $negocio['veterinario'] }}{{ $negocio['cedula'] ? ' — Céd. Prof. ' . $negocio['cedula'] : '' }}</div>
            @endif
        </div>
        <div class="titulo-col">
            <div class="titulo">Receta médica veterinaria</div>
            <div class="fecha">{{ $paciente['fecha'] ?? '' }}</div>
        </div>
    </div>

    <div class="paciente-bar">
        <div class="cell"><div class="lbl">Paciente</div><div class="val">{{ $paciente['mascota'] ?? '—' }}</div></div>
        <div class="cell"><div class="lbl">Propietario</div><div class="val">{{ $paciente['dueño'] ?? '—' }}</div></div>
        @if(!empty($rec['peso']))
            <div class="cell"><div class="lbl">Peso</div><div class="val">{{ $rec['peso'] }} kg</div></div>
        @endif
        @if(!empty($rec['temperatura']))
            <div class="cell"><div class="lbl">Temp.</div><div class="val">{{ $rec['temperatura'] }} °C</div></div>
        @endif
    </div>

    @if(!empty($rec['motivo']))
    <div class="bloque-prominente">
        <div class="bloque-titulo">Motivo de consulta</div>
        <div class="bloque-texto">{{ $rec['motivo'] }}</div>
    </div>
    @endif

    @if(!empty($rec['diagnostico']))
    <div class="bloque-prominente">
        <div class="bloque-titulo">Diagnóstico</div>
        <div class="bloque-texto">{{ $rec['diagnostico'] }}</div>
    </div>
    @endif

    <div class="bloque-prominente bloque-tratamiento">
        <div class="bloque-titulo">Tratamiento / Medicamentos</div>
        <div class="bloque-texto">{{ $rec['medicamentos'] ?? '' }}</div>
    </div>

    @if(!empty($rec['notas']))
    <div class="bloque-normal">
        <div class="bloque-titulo">Notas adicionales</div>
        <div class="bloque-texto">{{ $rec['notas'] }}</div>
    </div>
    @endif

    @if(!empty($rec['vacuna_nombre']) || !empty($rec['despa_producto']) || !empty($rec['consulta_proxima']))
    <div class="rutina-box">
        <div class="rutina-titulo">Vacunación · Desparasitación · Seguimiento</div>
        @if(!empty($rec['vacuna_nombre']))
        <div class="rutina-linea">
            <b>Vacuna:</b> {{ $rec['vacuna_nombre'] }}
            @if(!empty($rec['vacuna_lote'])) · Lote {{ $rec['vacuna_lote'] }} @endif
            @if(!empty($rec['vacuna_laboratorio'])) · Lab {{ $rec['vacuna_laboratorio'] }} @endif
            @if(!empty($rec['vacuna_proxima'])) · Próxima: {{ \Carbon\Carbon::parse($rec['vacuna_proxima'])->translatedFormat('d/m/Y') }} @endif
        </div>
        @endif
        @if(!empty($rec['despa_producto']))
        <div class="rutina-linea">
            <b>Desparasitación:</b> {{ $rec['despa_producto'] }}
            @if(!empty($rec['despa_via'])) · Vía {{ $rec['despa_via'] }} @endif
            @if(!empty($rec['despa_proxima'])) · Próxima: {{ \Carbon\Carbon::parse($rec['despa_proxima'])->translatedFormat('d/m/Y') }} @endif
        </div>
        @endif
        @if(!empty($rec['consulta_proxima']))
        <div class="rutina-linea">
            <b>Próxima consulta:</b> {{ \Carbon\Carbon::parse($rec['consulta_proxima'])->translatedFormat('d/m/Y') }}
        </div>
        @endif
    </div>
    @endif

    <div class="firma">
        <div class="firma-linea">{{ $negocio['veterinario'] ?? 'Firma del veterinario' }}</div>
    </div>
</body>
</html>
