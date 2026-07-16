// Controlled component. Props:
//   horaInicio: "HH:MM" | ""
//   duracion: number (minutes) | null
//   onChange(horaInicio, horaFin, duracion) — all three on every change

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 06 – 21
const MINUTES = [0, 15, 30, 45];
const DURATIONS = [
    { label: '30 min', value: 30 },
    { label: '45 min', value: 45 },
    { label: '1 hr',   value: 60 },
    { label: '1½ hr',  value: 90 },
    { label: '2 hrs',  value: 120 },
    { label: '2½ hrs', value: 150 },
    { label: '3 hrs',  value: 180 },
    { label: '4 hrs',  value: 240 },
];

function pad(n) { return String(n).padStart(2, '0'); }

function addMinutes(hhmm, mins) {
    const [h, m] = hhmm.split(':').map(Number);
    const total = h * 60 + m + mins;
    return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

export default function AppointmentTimePicker({ horaInicio, duracion, onChange }) {
    const [h, m] = horaInicio ? horaInicio.split(':').map(Number) : [null, null];

    function emit(newH, newM, newDur) {
        const hi = (newH !== null && newM !== null) ? `${pad(newH)}:${pad(newM)}` : '';
        const hf = (hi && newDur) ? addMinutes(hi, newDur) : '';
        onChange(hi, hf, newDur);
    }

    const horaFin = (horaInicio && duracion) ? addMinutes(horaInicio, duracion) : null;

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
                <label className="text-xs font-medium text-gray-600 w-full">Hora inicio</label>
                <div className="flex items-center gap-1">
                    <select
                        className="border-gray-300 rounded-lg text-sm py-1.5 w-20"
                        value={h ?? ''}
                        onChange={e => emit(Number(e.target.value), m ?? 0, duracion)}
                    >
                        <option value="">hh</option>
                        {HOURS.map(hh => (
                            <option key={hh} value={hh}>{pad(hh)}</option>
                        ))}
                    </select>
                    <span className="text-gray-500 font-semibold">:</span>
                    <select
                        className="border-gray-300 rounded-lg text-sm py-1.5 w-20"
                        value={m ?? ''}
                        onChange={e => emit(h ?? 8, Number(e.target.value), duracion)}
                    >
                        <option value="">mm</option>
                        {MINUTES.map(mm => (
                            <option key={mm} value={mm}>{pad(mm)}</option>
                        ))}
                    </select>
                </div>
                {horaFin && (
                    <span className="text-xs text-gray-400 ml-1">→ termina {horaFin}</span>
                )}
            </div>

            <div>
                <p className="text-xs font-medium text-gray-600 mb-1.5">Duración</p>
                <div className="flex flex-wrap gap-1.5">
                    {DURATIONS.map(d => (
                        <button
                            key={d.value}
                            type="button"
                            onClick={() => emit(h, m, d.value)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                                duracion === d.value
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'border-gray-300 text-gray-600 hover:border-gray-400 bg-white'
                            }`}
                        >
                            {d.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
