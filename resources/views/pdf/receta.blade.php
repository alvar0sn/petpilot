<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page { margin: 60px 50px; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #1f2937; }
    .header { display: table; width: 100%; margin-bottom: 20px; border-bottom: 2px solid #18181b; padding-bottom: 14px; }
    .header .logo-col { display: table-cell; width: 90px; vertical-align: middle; }
    .header .logo-col img { max-height: 70px; max-width: 80px; }
    .header .info-col { display: table-cell; vertical-align: middle; padding-left: 14px; }
    .negocio-nombre { font-size: 18px; font-weight: bold; }
    .negocio-detalle { font-size: 10.5px; color: #52525b; margin-top: 2px; }
    h1 { text-align: center; font-size: 15px; text-transform: uppercase; letter-spacing: 1px; margin: 22px 0; }
    .paciente-table { width: 100%; margin-bottom: 22px; border-collapse: collapse; }
    .paciente-table td { padding: 4px 0; font-size: 11.5px; }
    .paciente-table td.label { color: #71717a; width: 90px; }
    .campo { margin-bottom: 13px; }
    .campo .campo-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #71717a; margin-bottom: 2px; }
    .campo .campo-valor { font-size: 12px; border-bottom: 1px solid #d4d4d8; padding-bottom: 4px; min-height: 14px; }
    .firma { margin-top: 70px; text-align: center; }
    .firma-linea { border-top: 1px solid #18181b; width: 260px; margin: 0 auto; padding-top: 6px; font-size: 11px; }
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
            @if($negocio['direccion'])
                <div class="negocio-detalle">{{ $negocio['direccion'] }}{{ $negocio['telefono'] ? ' — Tel. ' . $negocio['telefono'] : '' }}</div>
            @elseif($negocio['telefono'])
                <div class="negocio-detalle">Tel. {{ $negocio['telefono'] }}</div>
            @endif
            @if($negocio['veterinario'])
                <div class="negocio-detalle">{{ $negocio['veterinario'] }}{{ $negocio['cedula'] ? ' — Céd. Prof. ' . $negocio['cedula'] : '' }}</div>
            @endif
        </div>
    </div>

    <h1>Receta médica veterinaria</h1>

    <table class="paciente-table">
        <tr>
            <td class="label">Paciente</td>
            <td>{{ $paciente['mascota'] ?? '—' }}</td>
            <td class="label">Fecha</td>
            <td>{{ $paciente['fecha'] ?? '—' }}</td>
        </tr>
        <tr>
            <td class="label">Propietario</td>
            <td colspan="3">{{ $paciente['dueño'] ?? '—' }}</td>
        </tr>
    </table>

    @if(!empty($rec['peso']))
    <div class="campo">
        <div class="campo-label">Peso</div>
        <div class="campo-valor">{{ $rec['peso'] }} kg</div>
    </div>
    @endif

    @if(!empty($rec['vacuna_nombre']))
    <div class="campo">
        <div class="campo-label">Vacuna aplicada</div>
        <div class="campo-valor">
            {{ $rec['vacuna_nombre'] }}
            @if(!empty($rec['vacuna_lote'])) — Lote: {{ $rec['vacuna_lote'] }} @endif
            @if(!empty($rec['vacuna_laboratorio'])) — Lab: {{ $rec['vacuna_laboratorio'] }} @endif
        </div>
    </div>
    @endif

    @if(!empty($rec['vacuna_proxima']))
    <div class="campo">
        <div class="campo-label">Próxima vacuna</div>
        <div class="campo-valor">{{ \Carbon\Carbon::parse($rec['vacuna_proxima'])->translatedFormat('d/m/Y') }}</div>
    </div>
    @endif

    @if(!empty($rec['despa_producto']))
    <div class="campo">
        <div class="campo-label">Desparasitación</div>
        <div class="campo-valor">
            {{ $rec['despa_producto'] }}
            @if(!empty($rec['despa_via'])) — Vía: {{ $rec['despa_via'] }} @endif
        </div>
    </div>
    @endif

    @if(!empty($rec['despa_proxima']))
    <div class="campo">
        <div class="campo-label">Próxima desparasitación</div>
        <div class="campo-valor">{{ \Carbon\Carbon::parse($rec['despa_proxima'])->translatedFormat('d/m/Y') }}</div>
    </div>
    @endif

    @if(!empty($rec['consulta_proxima']))
    <div class="campo">
        <div class="campo-label">Próxima consulta</div>
        <div class="campo-valor">{{ \Carbon\Carbon::parse($rec['consulta_proxima'])->translatedFormat('d/m/Y') }}</div>
    </div>
    @endif

    <div class="campo">
        <div class="campo-label">Indicaciones / Notas</div>
        <div class="campo-valor" style="min-height: 60px;">{{ $rec['notas'] ?? '' }}</div>
    </div>

    <div class="firma">
        <div class="firma-linea">{{ $negocio['veterinario'] ?? 'Firma del veterinario' }}</div>
    </div>
</body>
</html>
