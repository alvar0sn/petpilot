<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Turno cerrado</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .wrapper { max-width: 640px; margin: 40px auto; padding: 0 16px 40px; }
        .card { background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 20px; }
        .header { background: #18181b; padding: 28px 36px; text-align: center; }
        .header-logo-img { max-height: 52px; max-width: 180px; object-fit: contain; }
        .header-logo-text { color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
        .header-title { color: #9ca3af; font-size: 13px; margin-top: 6px; }
        .section { padding: 24px 32px; }
        .section-title { font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 12px; }
        table.rows { width: 100%; border-collapse: collapse; font-size: 14px; }
        table.rows td { padding: 5px 0; color: #111827; }
        table.rows td.label { color: #6b7280; }
        table.rows td.amount { text-align: right; font-weight: 600; }
        table.rows tr.total td { border-top: 1px solid #f3f4f6; padding-top: 10px; font-weight: 700; }
        .green { color: #15803d; }
        .red { color: #dc2626; }
        .orange { color: #c2410c; }
        .blue { color: #2563eb; }
        .divider { border: none; border-top: 1px solid #f3f4f6; margin: 8px 0; }
        table.list { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 6px; }
        table.list th { text-align: left; color: #9ca3af; font-weight: 600; font-size: 11px; text-transform: uppercase; padding: 6px 4px; border-bottom: 1px solid #f3f4f6; }
        table.list td { padding: 7px 4px; border-bottom: 1px solid #f9fafb; color: #374151; }
        table.list td.amount { text-align: right; font-weight: 600; color: #111827; }
        .badge { display: inline-block; font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 999px; background: #fee2e2; color: #b91c1c; }
        .footer { text-align: center; padding: 4px 36px 20px; }
        .footer p { font-size: 12px; color: #9ca3af; line-height: 1.6; }
    </style>
</head>
<body>
@php
    $tz = $tenant->timezone ?? 'America/Mexico_City';
    $fmt = fn($d, $pattern = 'd/m/Y H:i') => $d ? $d->clone()->timezone($tz)->format($pattern) : '—';
    $metodoLabel = fn($m) => match(true) {
        str_contains(strtolower($m ?? ''), 'efectivo') => 'Efectivo',
        str_contains(strtolower($m ?? ''), 'mercado') => 'Mercado Pago',
        default => $m ?: '—',
    };
@endphp
<div class="wrapper">

    <div class="card">
        <div class="header">
            @if($logoUrl)
                <img src="{{ $logoUrl }}" alt="{{ $tenant->nombre }}" class="header-logo-img">
            @else
                <div class="header-logo-text">{{ $tenant->nombre }}</div>
            @endif
            <p class="header-title">
                Turno cerrado · {{ $fmt($shift['fecha_apertura']) }} — {{ $fmt($shift['fecha_cierre']) }}
            </p>
        </div>

        <div class="section">
            <p class="section-title">Información</p>
            <table class="rows">
                <tr><td class="label">Abierto por</td><td class="amount">{{ $shift['abierto_por'] ?: '—' }}</td></tr>
                <tr><td class="label">Cerrado por</td><td class="amount">{{ $shift['cerrado_por'] ?: '—' }}</td></tr>
            </table>
        </div>

        <hr class="divider">

        <div class="section">
            <p class="section-title">Efectivo en caja</p>
            <table class="rows">
                <tr><td class="label">Fondo inicial</td><td class="amount">${{ number_format($efectivo['fondo_inicial'], 2) }}</td></tr>
                <tr><td class="label green">+ Cobros efectivo</td><td class="amount green">${{ number_format($efectivo['cobros_efectivo'], 2) }}</td></tr>
                @if($efectivo['reembolsos_efectivo'] > 0)
                <tr><td class="label red">− Reembolsos efectivo</td><td class="amount red">${{ number_format($efectivo['reembolsos_efectivo'], 2) }}</td></tr>
                @endif
                @if($efectivo['depositos'] > 0)
                <tr><td class="label blue">+ Depositado</td><td class="amount blue">${{ number_format($efectivo['depositos'], 2) }}</td></tr>
                @endif
                @if($efectivo['salidas'] > 0)
                <tr><td class="label orange">− Salidas</td><td class="amount orange">${{ number_format($efectivo['salidas'], 2) }}</td></tr>
                @endif
                <tr class="total"><td>Efectivo teórico</td><td class="amount green">${{ number_format($efectivo['efectivo_teorico'], 2) }}</td></tr>
                <tr><td class="label">Contado al cierre</td><td class="amount">${{ number_format($efectivo['efectivo_contado'] ?? 0, 2) }}</td></tr>
                @if($efectivo['diferencia'] !== null)
                <tr><td class="label">Diferencia</td><td class="amount {{ $efectivo['diferencia'] >= 0 ? 'green' : 'red' }}">{{ $efectivo['diferencia'] >= 0 ? '+' : '' }}${{ number_format($efectivo['diferencia'], 2) }}</td></tr>
                @endif
            </table>
        </div>

        <hr class="divider">

        <div class="section">
            <p class="section-title">Ventas</p>
            <table class="rows">
                <tr><td class="label">Brutas</td><td class="amount">${{ number_format($ventas['brutas'], 2) }}</td></tr>
                @if($ventas['descuentos'] > 0)
                <tr><td class="label orange">− Descuentos</td><td class="amount orange">${{ number_format($ventas['descuentos'], 2) }}</td></tr>
                @endif
                @if($ventas['reembolsos'] > 0)
                <tr><td class="label red">− Reembolsos</td><td class="amount red">${{ number_format($ventas['reembolsos'], 2) }}</td></tr>
                @endif
                <tr class="total"><td>Netas</td><td class="amount">${{ number_format($ventas['netas'], 2) }}</td></tr>
            </table>

            @if(count($ventas['por_metodo']) > 0)
            <table class="rows" style="margin-top: 10px;">
                @foreach($ventas['por_metodo'] as $m)
                <tr>
                    <td class="label">{{ $m->nombre }} ({{ $m->cantidad }})</td>
                    <td class="amount">${{ number_format($m->total, 2) }}</td>
                </tr>
                @endforeach
            </table>
            @endif
        </div>

        @if(count($porCategoria) > 0)
        <hr class="divider">
        <div class="section">
            <p class="section-title">Ventas por categoría</p>
            <table class="list">
                <tr><th>Categoría</th><th>Cant.</th><th style="text-align:right;">Total</th></tr>
                @foreach($porCategoria as $c)
                <tr>
                    <td>{{ $c['nombre'] }}</td>
                    <td>{{ $c['cantidad'] }}</td>
                    <td class="amount">${{ number_format($c['total'], 2) }}</td>
                </tr>
                @endforeach
            </table>
        </div>
        @endif

        @if(count($reembolsos) > 0)
        <hr class="divider">
        <div class="section">
            <p class="section-title">Reembolsos</p>
            <table class="list">
                <tr><th>Ticket</th><th>Cliente</th><th>Hora</th><th style="text-align:right;">Monto</th></tr>
                @foreach($reembolsos as $r)
                <tr>
                    <td>#{{ $r['folio'] }}</td>
                    <td>{{ $r['cliente'] }}</td>
                    <td>{{ $fmt($r['created_at'], 'H:i') }}</td>
                    <td class="amount red">-${{ number_format($r['monto'], 2) }}</td>
                </tr>
                @endforeach
            </table>
        </div>
        @endif

        @if(count($tickets) > 0)
        <hr class="divider">
        <div class="section">
            <p class="section-title">Tickets ({{ count($tickets) }})</p>
            <table class="list">
                <tr><th>Hora</th><th>Cliente</th><th>Método</th><th style="text-align:right;">Desc.</th><th style="text-align:right;">Total</th></tr>
                @foreach($tickets as $t)
                <tr>
                    <td>{{ $fmt($t['cobrado_at'], 'H:i') }}</td>
                    <td>
                        {{ $t['cliente'] }}
                        @if($t['estado_display'] === 'reembolsado')
                            <span class="badge">reembolsado</span>
                        @endif
                    </td>
                    <td>{{ $metodoLabel($t['metodo']) }}</td>
                    <td class="amount">{{ $t['descuento'] > 0 ? '-$' . number_format($t['descuento'], 2) : '—' }}</td>
                    <td class="amount">${{ number_format($t['total'], 2) }}</td>
                </tr>
                @endforeach
            </table>
        </div>
        @endif

        @if(count($shift['cashMovements']) > 0)
        <hr class="divider">
        <div class="section">
            <p class="section-title">Movimientos de caja</p>
            <table class="list">
                <tr><th>Nota</th><th>Hora</th><th style="text-align:right;">Monto</th></tr>
                @foreach($shift['cashMovements'] as $m)
                <tr>
                    <td>{{ $m['comentario'] ?: ucfirst($m['tipo']) }}</td>
                    <td>{{ $fmt($m['created_at'], 'H:i') }}</td>
                    <td class="amount {{ $m['tipo'] === 'deposito' ? 'green' : 'orange' }}">{{ $m['tipo'] === 'deposito' ? '+' : '-' }}${{ number_format($m['monto'], 2) }}</td>
                </tr>
                @endforeach
            </table>
        </div>
        @endif

    </div>

    <div class="footer">
        <p>© {{ date('Y') }} {{ $tenant->nombre }}. Todos los derechos reservados.</p>
    </div>
</div>
</body>
</html>
