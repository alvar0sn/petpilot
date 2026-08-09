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

    .texto-legal { font-size: 10.5px; line-height: 1.55; white-space: pre-line; text-align: justify; margin-bottom: 30px; }

    .firma { margin-top: 20px; text-align: center; }
    .firma img { max-height: 70px; max-width: 260px; }
    .firma-linea { border-top: 1px solid #18181b; width: 260px; margin: 4px auto 0; padding-top: 5px; font-size: 10px; }
    .firma-meta { font-size: 8.5px; color: #71717a; margin-top: 3px; }
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
        </div>
        <div class="titulo-col">
            <div class="titulo">Carta responsiva</div>
            <div class="fecha">{{ $paciente['fecha'] ?? '' }}</div>
        </div>
    </div>

    <div class="paciente-bar">
        <div class="cell"><div class="lbl">Mascota</div><div class="val">{{ $paciente['mascota'] ?? '—' }}</div></div>
        <div class="cell"><div class="lbl">Propietario</div><div class="val">{{ $paciente['dueño'] ?? '—' }}</div></div>
    </div>

    <div class="texto-legal">{{ $texto }}</div>

    <div class="firma">
        @if($firma)
            <img src="{{ $firma }}">
        @endif
        <div class="firma-linea">{{ $firmante ?? 'Firma del propietario' }}</div>
        @if($firmado_at)
            <div class="firma-meta">Firmado digitalmente el {{ $firmado_at }}</div>
        @endif
    </div>
</body>
</html>
