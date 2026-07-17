<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $tenant->nombre }}</title>
    <meta name="description" content="{{ data_get($cfg, 'about.text', $tenant->nombre) }}">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.31.0/dist/tabler-icons.min.css">
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    @php
        $primaryColor = $branding['primary_color'] ?? '#1a56db';
        $logo         = $branding['logo'] ?? null;
        $contact      = data_get($cfg, 'contacto', []);
        $whatsappNum  = preg_replace('/\D/', '', $contact['whatsapp'] ?? '');
    @endphp
    <style>
        .hero-bg { background-color: {{ $primaryColor }}; }
        @if(data_get($cfg, 'hero.image'))
        .hero-bg {
            background-image: linear-gradient(rgba(0,0,0,.5), rgba(0,0,0,.65)),
                              url('{{ data_get($cfg, "hero.image") }}');
            background-size: cover; background-position: center;
        }
        @endif
        [x-cloak] { display: none !important; }
    </style>
</head>
<body class="bg-white text-gray-900 antialiased">

{{-- ── NAV ── --}}
<nav class="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
    <div class="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <div class="flex items-center gap-3">
            @if($logo)
                <img src="{{ $logo }}" class="h-8 object-contain" alt="{{ $tenant->nombre }}">
            @else
                <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-sm shrink-0"
                     style="background:{{ $primaryColor }}">
                    {{ strtoupper(substr($tenant->nombre, 0, 1)) }}
                </div>
                <span class="font-bold text-gray-900">{{ $tenant->nombre }}</span>
            @endif
        </div>
        <div class="flex items-center gap-3">
            <a href="{{ route('portal.login', $tenant->slug) }}"
               class="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Iniciar sesión
            </a>
            @if(!empty($whatsappNum))
            <a href="#contacto"
               class="text-sm font-semibold px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90"
               style="background:{{ $primaryColor }}">
                {{ data_get($cfg, 'hero.cta_text', 'Contáctanos') }}
            </a>
            @endif
        </div>
    </div>
</nav>

{{-- ── HERO ── --}}
<section class="hero-bg pt-14 min-h-[70vh] flex items-center">
    <div class="max-w-5xl mx-auto px-6 py-24 text-center text-white">
        @if($logo)
            <img src="{{ $logo }}" alt="{{ $tenant->nombre }}"
                 class="h-24 w-auto max-w-[220px] object-contain mx-auto mb-6 drop-shadow-md">
        @endif
        @if(data_get($cfg, 'hero.show_name', true))
            <h1 class="text-5xl sm:text-6xl font-extrabold mb-4 leading-tight">{{ $tenant->nombre }}</h1>
        @endif
        @if(data_get($cfg, 'hero.tagline'))
            <p class="text-xl sm:text-2xl opacity-90 mb-10 max-w-2xl mx-auto">
                {{ data_get($cfg, 'hero.tagline') }}
            </p>
        @endif
        @if(!empty($whatsappNum))
        <a href="#contacto"
           class="inline-block px-8 py-4 rounded-2xl font-bold text-lg bg-white hover:opacity-90 transition-opacity shadow-lg"
           style="color:{{ $primaryColor }}">
            {{ data_get($cfg, 'hero.cta_text', 'Contáctanos') }} →
        </a>
        @endif
    </div>
</section>

{{-- ── SOBRE NOSOTROS ── --}}
@if(data_get($cfg, 'about.enabled', true) && data_get($cfg, 'about.text'))
<section class="py-20 bg-white">
    <div class="max-w-5xl mx-auto px-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
                <h2 class="text-3xl font-bold mb-5">Sobre nosotros</h2>
                <p class="text-gray-600 text-lg leading-relaxed">{{ data_get($cfg, 'about.text') }}</p>
            </div>
            @if(data_get($cfg, 'about.image'))
            <div>
                <img src="{{ data_get($cfg, 'about.image') }}" alt="{{ $tenant->nombre }}"
                     class="rounded-2xl w-full h-72 object-cover shadow-lg">
            </div>
            @endif
        </div>
    </div>
</section>
@endif

{{-- ── SERVICIOS ── --}}
@php $serviciosItems = data_get($cfg, 'servicios.items', []); @endphp
@if(data_get($cfg, 'servicios.enabled', true) && !empty($serviciosItems))
<section class="py-20 bg-gray-50">
    <div class="max-w-5xl mx-auto px-6">
        <h2 class="text-3xl font-bold text-center mb-10">
            {{ data_get($cfg, 'servicios.title', 'Nuestros servicios') }}
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            @foreach($serviciosItems as $servicio)
            @if(!empty($servicio['titulo']))
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                @if(!empty($servicio['imagen']))
                <img src="{{ $servicio['imagen'] }}" alt="{{ $servicio['titulo'] }}"
                     class="w-full h-48 object-cover">
                @else
                <div class="w-full h-48 flex items-center justify-center"
                     style="background:{{ $primaryColor }}20">
                    <i class="ti ti-paw text-5xl" style="color:{{ $primaryColor }}"></i>
                </div>
                @endif
                <div class="p-5">
                    <h3 class="text-lg font-bold text-gray-900 mb-2">{{ $servicio['titulo'] }}</h3>
                    @if(!empty($servicio['texto']))
                    <p class="text-gray-500 text-sm leading-relaxed">{{ $servicio['texto'] }}</p>
                    @endif
                </div>
            </div>
            @endif
            @endforeach
        </div>
    </div>
</section>
@endif

{{-- ── BENEFICIOS ── --}}
@php $beneficiosItems = data_get($cfg, 'beneficios.items', []); @endphp
@if(data_get($cfg, 'beneficios.enabled', true) && !empty($beneficiosItems))
<section class="py-20 bg-white">
    <div class="max-w-5xl mx-auto px-6">
        <div class="flex gap-6 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth md:grid md:grid-cols-3 md:overflow-visible md:pb-0"
             style="scrollbar-width:none;">
            @foreach($beneficiosItems as $beneficio)
            @if(!empty($beneficio['titulo']))
            <div class="text-center shrink-0 w-64 snap-start md:w-auto">
                <div class="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                     style="background:{{ $primaryColor }}20">
                    <i class="ti {{ $beneficio['icono'] ?? 'ti-star' }} text-2xl"
                       style="color:{{ $primaryColor }}"></i>
                </div>
                <h3 class="text-lg font-bold mb-2">{{ $beneficio['titulo'] }}</h3>
                @if(!empty($beneficio['texto']))
                <p class="text-gray-500">{{ $beneficio['texto'] }}</p>
                @endif
            </div>
            @endif
            @endforeach
        </div>
    </div>
</section>
@endif

{{-- ── EQUIPO ── --}}
@if(data_get($cfg, 'equipo.enabled', true) && $equipo->isNotEmpty())
<section class="py-20 bg-gray-50">
    <div class="max-w-5xl mx-auto px-6">
        <h2 class="text-3xl font-bold text-center mb-10">Nuestro equipo</h2>
        <div class="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth lg:flex-wrap lg:overflow-visible lg:justify-center lg:pb-0"
             style="scrollbar-width:none;">
            @foreach($equipo as $miembro)
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center w-40 shrink-0 snap-start">
                <div class="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl text-white mx-auto mb-3"
                     style="background:{{ $primaryColor }}">
                    {{ strtoupper(substr($miembro->nombre, 0, 1)) }}
                </div>
                <p class="font-semibold text-gray-900 text-sm">{{ $miembro->nombre }}</p>
                @if($miembro->apellido)
                    <p class="text-xs text-gray-400">{{ $miembro->apellido }}</p>
                @endif
            </div>
            @endforeach
        </div>
    </div>
</section>
@endif

{{-- ── MEMBRESÍAS ── --}}
@if(data_get($cfg, 'membresias.enabled', true) && $planes->isNotEmpty())
<section class="py-20 bg-white">
    <div class="max-w-3xl mx-auto px-6">
        <h2 class="text-3xl font-bold text-center mb-3">Planes y membresías</h2>
        <p class="text-center text-gray-500 mb-10">Elige el plan que mejor se adapta a ti</p>
        <div class="space-y-4">
            @foreach($planes as $plan)
            <a href="{{ route('portal.login', $tenant->slug) }}"
               class="flex items-center justify-between bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-5 hover:shadow-md transition-all group">
                <div class="flex-1 min-w-0">
                    <h3 class="text-base font-semibold text-gray-900 group-hover:opacity-80 transition-opacity">
                        {{ $plan->nombre }}
                    </h3>
                    @if($plan->vigencia_dias)
                    <p class="text-sm text-gray-400 mt-0.5">{{ $plan->vigencia_dias }} días de vigencia</p>
                    @endif
                </div>
                <div class="ml-6 text-right shrink-0">
                    <span class="text-2xl font-bold text-gray-900">${{ number_format($plan->precio, 0) }}</span>
                    <p class="text-xs text-gray-400 mt-0.5">Ver más →</p>
                </div>
            </a>
            @endforeach
        </div>
    </div>
</section>
@endif

{{-- ── CONTACTO ── --}}
@php
    $hasContact = collect($contact)->filter()->isNotEmpty();
    $waMsg = urlencode('Hola ' . $tenant->nombre . ', me gustaría obtener más información.');
@endphp
@if($hasContact)
<section id="contacto" class="py-20 bg-gray-50">
    <div class="max-w-5xl mx-auto px-6">
        <h2 class="text-3xl font-bold text-center mb-10">Contáctanos</h2>

        {{-- Info de contacto --}}
        <div class="flex flex-wrap justify-center gap-6 text-center mb-10">
            @if(!empty($contact['address']))
            <div class="flex flex-col items-center gap-2">
                <i class="ti ti-map-pin text-2xl" style="color:{{ $primaryColor }}"></i>
                <span class="text-sm text-gray-600 max-w-[160px]">{{ $contact['address'] }}</span>
            </div>
            @endif
            @if(!empty($contact['phone']))
            <a href="tel:{{ $contact['phone'] }}" class="flex flex-col items-center gap-2 hover:opacity-70 transition-opacity">
                <i class="ti ti-phone text-2xl" style="color:{{ $primaryColor }}"></i>
                <span class="text-sm text-gray-600">{{ $contact['phone'] }}</span>
            </a>
            @endif
            @if(!empty($contact['instagram']))
            <a href="https://instagram.com/{{ $contact['instagram'] }}" target="_blank"
               class="flex flex-col items-center gap-2 hover:opacity-70 transition-opacity">
                <i class="ti ti-brand-instagram text-2xl" style="color:{{ $primaryColor }}"></i>
                <span class="text-sm text-gray-600">{{ '@' . $contact['instagram'] }}</span>
            </a>
            @endif
            @if(!empty($contact['facebook']))
            <a href="{{ $contact['facebook'] }}" target="_blank"
               class="flex flex-col items-center gap-2 hover:opacity-70 transition-opacity">
                <i class="ti ti-brand-facebook text-2xl" style="color:{{ $primaryColor }}"></i>
                <span class="text-sm text-gray-600">Facebook</span>
            </a>
            @endif
            @if(!empty($contact['website']))
            <a href="{{ $contact['website'] }}" target="_blank"
               class="flex flex-col items-center gap-2 hover:opacity-70 transition-opacity">
                <i class="ti ti-world text-2xl" style="color:{{ $primaryColor }}"></i>
                <span class="text-sm text-gray-600">Sitio web</span>
            </a>
            @endif
        </div>

        {{-- WhatsApp CTA --}}
        @if(!empty($whatsappNum))
        <div class="text-center">
            <p class="text-gray-600 mb-6">¿Tienes preguntas? Escríbenos directamente por WhatsApp.</p>
            <a href="https://wa.me/{{ $whatsappNum }}?text={{ $waMsg }}"
               target="_blank"
               class="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg text-white shadow-lg hover:opacity-90 transition-opacity"
               style="background:#25D366">
                <i class="ti ti-brand-whatsapp text-2xl"></i>
                Enviar mensaje por WhatsApp
            </a>
        </div>
        @endif
    </div>
</section>
@endif

{{-- ── CTA FINAL ── --}}
<section class="py-20 text-white text-center" style="background:{{ $primaryColor }}">
    <div class="max-w-2xl mx-auto px-6">
        <h2 class="text-3xl font-bold mb-4">¿Listo para empezar?</h2>
        <p class="text-lg opacity-90 mb-8">Únete a {{ $tenant->nombre }} hoy.</p>
        @if(!empty($whatsappNum))
        <a href="#contacto"
           class="inline-block bg-white font-bold text-lg px-8 py-4 rounded-2xl hover:opacity-90 transition-opacity"
           style="color:{{ $primaryColor }}">
            {{ data_get($cfg, 'hero.cta_text', 'Contáctanos') }}
        </a>
        @endif
    </div>
</section>

<footer class="bg-black text-white text-center py-6 text-xs">
    <p>{{ $tenant->nombre }} · Powered by <span class="opacity-60">Petpilot</span></p>
</footer>

</body>
</html>
